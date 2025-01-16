import { TelegramUserEntity } from '@/entities/telegramUser.entity';
import { UserEntity } from '@/entities/user.entity';
import {
  AdminTokenRequest,
  AdminTokenResponse,
  PublicUser,
  RenewUserRequest,
  RenewUserResponse,
  User,
  UsersResponse,
} from '@/types/user.api';
import { getPublicUser } from '@/utils/getPublicUser';
import { parseError } from '@/utils/parseError';
import { stringifyData } from '@/utils/stringifyData';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
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
  private readonly logger = new Logger(ApiService.name);

  public constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(TelegramUserEntity)
    private tgUserRepository: Repository<TelegramUserEntity>,
  ) {
    this.init();
  }

  private apiClient = <Request, Response>(config: Omit<AxiosRequestConfig<Request>, 'baseURL'>) => {
    return this.axiosInstance<Response, AxiosResponse<Response, Request>, Request>(config);
  };

  async init() {
    try {
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
      this.updateUsersTable();
    } catch (err) {
      throw new UnauthorizedException(parseError(err));
    }
  }

  async addTelegramUser(user: TelegramUser) {
    await this.tgUserRepository.save({ ...user });
  }

  async getAllVpnUsers() {
    try {
      const { data } = await this.apiClient<undefined, UsersResponse>({
        method: 'GET',
        url: `/users`,
      });

      return data.users.map(getPublicUser);
    } catch (err) {
      this.logger.error(parseError(err));
      return [];
    }
  }

  async getAllTelegramUsers() {
    try {
      const users = await this.tgUserRepository.find();
      return users;
    } catch (error) {
      this.logger.error(error);
      return [];
    }
  }

  async updateUsersTable() {
    try {
      const users = await this.getAllVpnUsers();
      const usersEntities = this.userRepository.create(users);
      await this.userRepository.save(usersEntities);
      this.logger.log('Successfully update users');
      return true;
    } catch (err) {
      this.logger.error(`Something went error`, parseError(err));
      return false;
    }
  }

  async getUserData(username: string) {
    try {
      const { data } = await this.apiClient<undefined, User>({
        method: 'GET',
        url: `/user/${username}`,
      });

      return data;
    } catch (err) {
      this.logger.error(parseError(err));
      return null;
    }
  }

  async findUserByTelegram(id: number) {
    const user = await this.userRepository.findOne({ where: { telegramUser: { id } }, relations: ['telegramUser'] });
    return user;
  }

  async renewUser(user: PublicUser) {
    try {
      const oldDate = user.expire ? fromUnixTime(user.expire) : new Date();
      const newDate = addDays(oldDate, 31);
      const { data } = await this.apiClient<RenewUserRequest, RenewUserResponse>({
        method: 'PUT',
        url: `/user/${user.username}`,
        data: {
          expire: getUnixTime(newDate),
        },
      });

      const publicUser = getPublicUser(data);

      await this.userRepository.update({ username: user.username }, publicUser);
    } catch (err) {
      this.logger.error(parseError(err));
    }
  }

  async connectTelegram(username: string, telegramId: number) {
    await this.userRepository.update({ username }, { telegramUser: { id: telegramId } });
  }
}
