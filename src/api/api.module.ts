import { BotHelper } from '@/bot/bot.interval';
import { TelegramUserEntity } from '@/entities/telegramUser.entity';
import { UserEntity } from '@/entities/user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiHelper } from './api.helper';
import { ApiService } from './api.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, TelegramUserEntity])],
  providers: [ApiService, ApiHelper, BotHelper],
  exports: [ApiService],
})
export class ApiModule {}
