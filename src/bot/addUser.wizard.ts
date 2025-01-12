import { ApiService } from '@/api/api.service';
import { Logger } from '@nestjs/common';
import { Action, Wizard, WizardStep } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { WizardContext } from 'telegraf/typings/scenes';
import { BotService } from './bot.service';

@Wizard('adminUserAdd')
export class AddUserWizard {
  private logger = new Logger(AddUserWizard.name);

  public constructor(
    private botService: BotService,
    private apiService: ApiService,
  ) {}

  @WizardStep(1)
  async getAllUsers(ctx: WizardContext) {}

  @Action('mainMenu')
  backToMainMenu(ctx: WizardContext) {
    this.botService.onStart(ctx);
  }

  @WizardStep(2)
  async receiptSended(ctx: Context) {
    ctx.reply('Пожалуйста отправьте файл с чеком');
  }
}
