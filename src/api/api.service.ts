import { BotHelper } from '@/bot/bot.interval';
import { TelegramUserEntity } from '@/entities/telegramUser.entity';
import { UserEntity } from '@/entities/user.entity';
import {
  AdminTokenRequest,
  AdminTokenResponse,
  DisableUserRequest,
  DisableUserResponse,
  PublicUser,
  RenewUserRequest,
  RenewUserResponse,
  User,
  UsersResponse,
} from '@/types/user.api';
import { getPublicUser } from '@/utils/getPublicUser';
import { parseError } from '@/utils/parseError';
import { stringifyData } from '@/utils/stringifyData';
import { tryCatch } from '@/utils/tryCatch';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { addDays, fromUnixTime, getUnixTime } from 'date-fns';
import { User as TelegramUser } from 'telegraf/types';
import { Repository } from 'typeorm';

@Injectable()
export class ApiService {
  private readonly _axioxConfig: AxiosRequestConfig = {
    baseURL: process.env.API_HOST,
  };
  private axiosInstance: AxiosInstance = axios.create(this._axioxConfig);
  private apiClient = <Request, Response>(config: Omit<AxiosRequestConfig<Request>, 'baseURL'>) => {
    return this.axiosInstance<Response, AxiosResponse<Response, Request>, Request>(config);
  };
  private readonly logger = new Logger(ApiService.name);

  public constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(TelegramUserEntity)
    private tgUserRepository: Repository<TelegramUserEntity>,
    @Inject(forwardRef(() => BotHelper))
    private botHelper: BotHelper,
  ) {
    this.init();
  }

  async init() {
    const { error } = await tryCatch(this.authLogin());
    if (!error) return this.updateUsersTable();

    this.botHelper.isCrashed = true;
    this.logger.error(parseError(error));
  }

  async authLogin() {
    const adminCreds = stringifyData({
      username: process.env.API_USERNAME,
      password: process.env.API_PASSWORD,
    });

    const { data } = await this.apiClient<AdminTokenRequest, AdminTokenResponse>({
      method: 'POST',
      url: '/admin/token',
      data: adminCreds,
    });

    this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;
    this.logger.log(`Successfully ${data.token_type} auth`);
  }

  async getAllVpnUsers() {
    const { data, error } = await tryCatch(
      this.apiClient<undefined, UsersResponse>({
        method: 'GET',
        url: `/users`,
      }),
    );
    if (!error) return data.data.users.map(getPublicUser);

    this.logger.error(parseError(error));
    return [];
  }

  async updateUsersTable() {
    const { data: apiUsers, error: apiError } = await tryCatch(this.getAllVpnUsers());
    if (apiError) {
      this.botHelper.isCrashed = true;
      this.logger.error(`Error on getting API users`, parseError(apiError));
      return false;
    }

    const oldUsers = await this.userRepository.find({ relations: ['telegramUser'] });
    const inactiveUsers = oldUsers.filter(
      (oldUser) => !apiUsers!.some((apiUser) => apiUser.username === oldUser.username),
    );
    await this.userRepository.remove(inactiveUsers);
    const userEntities = this.userRepository.create(apiUsers);
    const { error } = await tryCatch(this.userRepository.save(userEntities));
    if (!error) return;

    this.logger.error(`Error on update users`, parseError(error));
    return false;
  }

  async getUserData(username: string) {
    const { data, error } = await tryCatch(
      this.apiClient<undefined, User>({
        method: 'GET',
        url: `/user/${username}`,
      }),
    );
    if (!error) return data.data;

    this.logger.error(parseError(error));
    return null;
  }

  async renewUser(user: PublicUser) {
    const oldDate = user.expire ? fromUnixTime(user.expire) : new Date();
    const newDate = addDays(oldDate, 31);
    const { data, error } = await tryCatch(
      this.apiClient<RenewUserRequest, RenewUserResponse>({
        method: 'PUT',
        url: `/user/${user.username}`,
        data: {
          expire: getUnixTime(newDate),
        },
      }),
    );
    if (error) return this.logger.error(parseError(error));

    const publicUser = getPublicUser(data.data);
    await this.userRepository.update({ username: user.username }, publicUser);
  }

  async getAllTelegramUsers() {
    const { data: users, error } = await tryCatch(this.tgUserRepository.find());
    if (!error) return users;

    this.logger.error(error);
    return [];
  }

  async findUserByTelegramId(id: number) {
    const user = await this.userRepository.findOne({ where: { telegramUser: { id } }, relations: ['telegramUser'] });
    return user;
  }

  async connectTelegramId(username: string, telegramId: number) {
    await this.updateUsersTable();
    await this.userRepository.update({ username }, { telegramUser: { id: telegramId }, status: 'active' });
  }

  async addTelegramUser(user: TelegramUser) {
    await this.tgUserRepository.save({ ...user });
  }

  async disableUser(user: PublicUser) {
    const { data, error } = await tryCatch(
      this.apiClient<DisableUserRequest, DisableUserResponse>({
        method: 'PUT',
        url: `/user/${user.username}`,
        data: {
          status: 'disabled',
        },
      }),
    );

    if (error) return this.logger.error(parseError(error));

    return data;
  }
}
