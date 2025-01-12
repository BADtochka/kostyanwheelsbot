import { ApiModule } from '@/api/api.module';
import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { session } from 'telegraf';
import { BotHelper } from './bot.interval';
import { BotService } from './bot.service';
import { ReceiptWizard } from './receipt.wizard';

@Module({
  imports: [
    TelegrafModule.forRoot({
      token: process.env.TOKEN,
      middlewares: [session()],
    }),
    ApiModule,
  ],
  controllers: [],
  providers: [BotService, BotHelper, ReceiptWizard],
})
export class BotModule {}
