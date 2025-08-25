import { ApiService } from '@/api/api.service';
import { parseEnv } from '@/utils/parceEnv';
import { tryCatch } from '@/utils/tryCatch';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, Interval } from '@nestjs/schedule';
import axios from 'axios';
import { BotService } from './bot.service';

@Injectable()
export class BotInterval {
  isCrashed: boolean = false;
  public constructor(
    private apiService: ApiService,
    private botService: BotService,
  ) {}
  private logger = new Logger(BotInterval.name);

  @Cron('0 0 * * *')
  async updateApi() {
    const { error } = await tryCatch(this.apiService.init());
    if (error) return (this.isCrashed = true);
    await this.botService.checkUsersExpiration();
  }

  @Interval(5000)
  async tryToReconnect() {
    if (!this.isCrashed) return;
    this.logger.warn('Crash detected, tring to reauth.');
    await this.apiService.init();
    this.isCrashed = false;
  }

  @Interval(120 * 1000)
  async pushToKuma() {
    const isEnabled = String(parseEnv('ENABLE_MONITORING')).toLocaleLowerCase() === 'true';

    if (!isEnabled) return;

    const { error } = await tryCatch(
      axios('https://uptime.kostyanwheels.ru/api/push/DxiAnFVSKf?status=up&msg=OK&ping='),
    );

    if (error) {
      this.logger.warn('Error on push to kuma', error);
    }
  }
}
