import { ApiService } from '@/api/api.service';
import { tryCatch } from '@/utils/tryCatch';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, Interval } from '@nestjs/schedule';

@Injectable()
export class BotHelper {
  isCrashed: boolean = false;
  public constructor(private apiService: ApiService) {}
  private logger = new Logger(BotHelper.name);

  @Cron('0 0 * * *')
  async reinitApi() {
    const { error } = await tryCatch(this.apiService.init());
    if (error) return (this.isCrashed = true);
  }

  @Interval(5000)
  async tryToReconnect() {
    if (!this.isCrashed) return;
    this.logger.warn('Crash detected, tring to reauth.');
    await this.apiService.init();
    this.isCrashed = false;
  }
}
