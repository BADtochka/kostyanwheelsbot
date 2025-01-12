import { ApiService } from '@/api/api.service';
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class BotHelper {
  public constructor(private apiService: ApiService) {}

  @Cron('0 0 * * *')
  updateUsers() {
    this.apiService.updateUsersTable();
  }
}
