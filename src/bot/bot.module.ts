import { ApiModule } from '@/api/api.module';
import { ENV } from '@/utils/env.helpers';
import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { session } from 'telegraf';
import { BoostyService } from './boosty.service';
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
      launchOptions: {
        allowedUpdates: [
          'message',
          'callback_query',
          'inline_query',
          'chosen_inline_result',
          'shipping_query',
          'chat_member',
        ],
      },
    }),
    ApiModule,
  ],
  controllers: [],
  providers: [BotService, BotInterval, ReceiptWizard, UserActionsWizard, MessageToAllWizard, BoostyService],
})
export class BotModule {}
