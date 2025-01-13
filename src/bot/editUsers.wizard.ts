import { ApiService } from '@/api/api.service';
import { backKeyboard } from '@/contants/keyboards';
import { Logger } from '@nestjs/common';
import { Action, Ctx, InjectBot, Wizard, WizardStep } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { CallbackQuery, InlineKeyboardButton, Update } from 'telegraf/typings/core/types/typegram';
import { WizardContext } from 'telegraf/typings/scenes';
import { BotService } from './bot.service';

@Wizard('editUsers')
export class EditUsersWizard {
  private logger = new Logger(EditUsersWizard.name);

  public constructor(
    private botService: BotService,
    private apiService: ApiService,
    @InjectBot() private bot: Telegraf<Context>,
  ) {}

  @WizardStep(1)
  async getAllUsers(ctx: WizardContext) {
    const keyboards: InlineKeyboardButton[][] = [backKeyboard];
    const users = await this.apiService.getAllTelegramUsers();

    users.map((user) => keyboards.push([{ text: user.username, callback_data: `connectUser:${user.id}` }]));
    await ctx.editMessageText('Выберите пользователя для привязки', {
      reply_markup: {
        inline_keyboard: keyboards,
      },
    });
  }

  @Action('mainMenu')
  backToMainMenu(ctx: WizardContext) {
    this.botService.onStart(ctx);
  }

  @Action(/connectUser:.+/)
  async connectUser(
    @Ctx()
    ctx: Context<Update.CallbackQueryUpdate<CallbackQuery.DataQuery>> & WizardContext,
  ) {
    const keyboards: InlineKeyboardButton[][] = [backKeyboard];
    const users = await this.apiService.getAllVpnUsers();

    const selectedId = ctx.callbackQuery.data.split(':')[1];
    // @ts-ignore
    ctx.wizard.state.selectedId = selectedId;

    users.map((user) => keyboards.push([{ text: user.username, callback_data: `connectUser-final:${user.username}` }]));
    await ctx.editMessageText(`Выберите marzban аккаунт`, {
      reply_markup: {
        inline_keyboard: keyboards,
      },
    });
  }

  @Action(/connectUser-final:.+/)
  async connectUserFinal(
    @Ctx()
    ctx: Context<Update.CallbackQueryUpdate<CallbackQuery.DataQuery>> & WizardContext,
  ) {
    const selectedVpnUsername = ctx.callbackQuery.data.split(':')[1];
    // @ts-ignore
    await this.apiService.connectTelegram(selectedVpnUsername, ctx.wizard.state.selectedId);
    await ctx.editMessageText('✅ Аккаунты успешно связаны');
    ctx.scene.leave();
  }
}
