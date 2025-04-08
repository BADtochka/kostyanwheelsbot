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
      host: process.env.NODE_ENV === 'development' ? '192.168.1.30' : 'db',
      username: 'dev',
      password: 'dev',
      database: 'dev',
      port: process.env.NODE_ENV === 'development' ? 5433 : 5432,
      synchronize: true,
      entities: [UserEntity, TelegramUserEntity],
    }),
    ScheduleModule.forRoot(),
    ApiModule,
    BotModule,
  ],
})
export class AppModule {}
