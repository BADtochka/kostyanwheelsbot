import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { setDefaultOptions } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ApiModule } from './api/api.module';
import { BotModule } from './bot/bot.module';
import { DB_DEV_CONFIG, DB_PROD_CONFIG } from './contants/dbConfig';
import { isDev } from './contants/isDev';

setDefaultOptions({
  locale: ru,
});

@Module({
  imports: [
    TypeOrmModule.forRoot(isDev ? DB_DEV_CONFIG : DB_PROD_CONFIG),
    ScheduleModule.forRoot(),
    ApiModule,
    BotModule,
  ],
})
export class AppModule {}
