import { BotInterval } from '@/bot/bot.interval';
import { TelegramUserEntity } from '@/entities/telegramUser.entity';
import { UserEntity } from '@/entities/user.entity';
import {
  AdminTokenRequest,
  AdminTokenResponse,
  CreateUserRequest,
  CreateUserResponse,
  PublicUser,
  UpdateUserRequest,
  User,
  UsersResponse,
} from '@/types/User';
import { ENV } from '@/utils/env.helpers';
import { generateCode } from '@/utils/generateCode';
import { getPublicUser } from '@/utils/getPublicUser';
import { parseError } from '@/utils/parseError';
import { stringifyData } from '@/utils/stringifyData';
import { tryCatch } from '@/utils/tryCatch';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { addDays, differenceInDays, formatISO } from 'date-fns';
import { Chat } from 'telegraf/types';
import { Repository } from 'typeorm';
import { ApiHelper } from './api.helper';

@Injectable()
export class ApiService {
  private readonly _axioxConfig: AxiosRequestConfig = {
    baseURL: `${ENV.API_HOST || ENV.BACKUP_API_HOST}/api`,
  };
  private axiosInstance: AxiosInstance = axios.create(this._axioxConfig);
  private apiClient = <Request, Response>(config: AxiosRequestConfig<Request>) => {
    return this.axiosInstance<Response, AxiosResponse<Response, Request>, Request>(config);
  };
  private readonly logger = new Logger(ApiService.name);

  public constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(TelegramUserEntity)
    private tgUserRepository: Repository<TelegramUserEntity>,
    @Inject(forwardRef(() => BotInterval))
    private botHelper: BotInterval,
    private apiHelper: ApiHelper,
  ) {
    this.init();
  }

  async init() {
    this.logger.log('Start initialization');
    const { error } = await tryCatch(this.authLogin());
    if (!error) {
      await this.updateUsersTable();
      await this.apiHelper.initOwnerAccount();
      return;
    }

    this.botHelper.isCrashed = true;
    this.logger.error(parseError(error));
  }

  async authLogin() {
    const adminCreds = stringifyData({
      username: ENV.API_USERNAME,
      password: ENV.API_PASSWORD,
    });

    const { data: apiClientData, error } = await tryCatch(
      this.apiClient<AdminTokenRequest, AdminTokenResponse>({
        method: 'POST',
        url: '/admin/token',
        data: adminCreds,
      }),
    );

    if (error) throw error;

    this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${apiClientData.data.access_token}`;
    this.logger.log(`Successfully ${apiClientData.data.token_type} auth`);
  }

  async createUser(requestData: CreateUserRequest) {
    const { data, error } = await tryCatch(
      this.apiClient<CreateUserRequest, CreateUserResponse>({
        method: 'POST',
        url: '/user',
        data: requestData,
      }),
    );

    if (!error) return data.data;

    this.logger.error(parseError(error));
    return null;
  }

  // async getAllInbounds() {
  //   const { data } = await tryCatch(
  //     this.apiClient({
  //       method: 'POST',
  //       url: '/inbounds',
  //     }),
  //   );
  // }

  async getAllVpnUsers() {
    const { data, error } = await tryCatch(
      this.apiClient<undefined, UsersResponse>({
        method: 'GET',
        url: `/users?load_sub=true`,
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

  async getAllTableUsers() {
    await this.updateUsersTable();
    const [users, count] = await this.userRepository.findAndCount({ relations: ['telegramUser'] });
    return { users, count };
  }

  async getUserData(username: string) {
    const { data, error } = await tryCatch(
      this.apiClient<undefined, User>({
        method: 'GET',
        url: `/user/${username}`,
      }),
    );
    if (!error) return getPublicUser(data.data);

    this.logger.error(parseError(error));
    return null;
  }

  async connectByInviteCode(code: string, telegramUser: Chat.PrivateChat) {
    this.logger.log(`${telegramUser.username} connecting by invite code: ${code}`);

    const user = await this.userRepository.findOneBy({ inviteCode: code });
    if (!user) {
      this.logger.error(`Cannot connect user ${telegramUser.username}`);
      return null;
    }
    return await this.connectTelegramId(user?.username, telegramUser);
  }

  async updateUser(username: string, partialUser: Partial<UserEntity>) {
    await this.updateUsersTable();
    const user = await this.userRepository.findOne({ where: { username }, relations: ['telegramUser'] });
    if (!user) {
      this.logger.error(`Failed to update user: ${username} (no user finded)`);
      return null;
    }

    const { data, error } = await tryCatch(
      this.apiClient<UpdateUserRequest, User>({
        method: 'PUT',
        url: `/user/${username}`,
        data: partialUser,
      }),
    );

    if (error) {
      this.logger.error(`Failed to update user: ${username} (second try)`, error);
      return null;
    }

    await this.userRepository.update({ username }, partialUser);
    const updatedUser = await this.userRepository.findOne({ where: { username }, relations: ['telegramUser'] });
    return updatedUser;
  }

  async renewUser(user: PublicUser) {
    const expiresLessThenNow = user.expire && differenceInDays(formatISO(user.expire), new Date()) > 0;
    const oldDate = user.expire && expiresLessThenNow ? formatISO(user.expire) : new Date();
    const newDate = addDays(oldDate, 31);
    return await this.updateUser(user.username, { expire: formatISO(newDate), status: 'active' });
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

  async connectTelegramId(username: string, telegramUser: Chat.PrivateChat) {
    const existTableUser = await this.userRepository.find({
      where: { telegramUser: { id: telegramUser.id } },
      relations: ['telegramUser'],
    });

    existTableUser.forEach(async (user) => {
      if (user.username === username) return;
      user.telegramUser = null;
      await this.userRepository.save(user);
    });
    const updatedUser = await this.updateUser(username, {
      telegramUser: telegramUser,
      status: 'active',
    });
    return updatedUser;
  }

  async addTelegramUser(user: Chat.PrivateChat) {
    return await this.tgUserRepository.save({ ...user });
  }

  async disableUser(user: PublicUser, removeTelegram = false) {
    this.logger.warn(`Пользователь отключен: ${user.username}`);
    const userEntity = await this.userRepository.findOne({
      where: { username: user.username },
      relations: ['telegramUser'],
    });
    const updatedUser = await this.updateUser(user.username, {
      status: 'disabled',
      telegramUser: removeTelegram ? null : userEntity?.telegramUser,
    });
    if (!updatedUser) return this.logger.error(`failed to disable user: ${user.username}`);
    return updatedUser;
  }

  async addInviteCode(user: PublicUser) {
    const code = generateCode(6);
    const updatedUser = await this.updateUser(user.username, { inviteCode: code });
    if (!updatedUser) {
      this.logger.error(`failed to add invite code: ${user.username}`);
      return { code: null, updatedUser: null };
    }
    return { code, updatedUser };
  }

  async getUserLinks(subToken: string) {
    const { data, error } = await tryCatch(
      this.apiClient<undefined, string>({
        baseURL: ENV.API_HOST,
        method: 'GET',
        url: `${subToken}/links`,
      }),
    );

    if (error) return null;

    return data.data;
  }
}
