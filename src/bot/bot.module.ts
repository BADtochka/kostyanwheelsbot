import { ApiModule } from '@/api/api.module';
import { ENV } from '@/utils/env.helpers';
import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { session } from 'telegraf';
import { BotInterval } from './bot.interval';
import { BotService } from './bot.service';
import { MessageToAllWizard } from './messageToAll.wizard';
import { ReceiptWizard } from './receipt.wizard';
import { UserActionsWizard } from './userActions.wizard';

@Module({
  imports: [
    TelegrafModule.forRoot({
      token: ENV.TOKEN,
      middlewares: [session()],
    }),
    ApiModule,
  ],
  controllers: [],
  providers: [BotService, BotInterval, ReceiptWizard, UserActionsWizard, MessageToAllWizard],
})
export class BotModule {}
