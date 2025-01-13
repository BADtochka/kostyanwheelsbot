import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { setDefaultOptions } from 'date-fns';
import { ru } from 'date-fns/locale';
import 'dotenv/config';
import { ApiModule } from './api/api.module';
import { BotModule } from './bot/bot.module';
import { TelegramUserEntity } from './entities/telegramUser.entity';
import { UserEntity } from './entities/user.entity';

setDefaultOptions({
  locale: ru,
});

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: '192.168.1.30',
      username: 'dev',
      password: 'dev',
      database: 'dev',
      port: 5433,
      synchronize: true,
      entities: [UserEntity, TelegramUserEntity],
    }),
    ScheduleModule.forRoot(),
    ApiModule,
    BotModule,
  ],
})
export class AppModule {}
