import { ApiModule } from '@/api/api.module';
import { parseEnv } from '@/utils/parceEnv';
import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { session } from 'telegraf';
import { BotHelper } from './bot.interval';
import { BotService } from './bot.service';
import { ReceiptWizard } from './receipt.wizard';
import { UserActionsWizard } from './userActions.wizard';

@Module({
  imports: [
    TelegrafModule.forRoot({
      token: parseEnv('TOKEN'),
      middlewares: [session()],
    }),
    ApiModule,
  ],
  controllers: [],
  providers: [BotService, BotHelper, ReceiptWizard, UserActionsWizard],
})
export class BotModule {}
