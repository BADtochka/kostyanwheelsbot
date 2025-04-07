import { ApiService } from '@/api/api.service';
import { backKeyboard, backToUserListKeyboard } from '@/contants/keyboards';
import { SelectedIdWizard } from '@/types/SelectedIdWizard';
import { Action, Ctx, Wizard, WizardStep } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { CallbackQuery, InlineKeyboardButton, Update } from 'telegraf/typings/core/types/typegram';
import { WizardContext } from 'telegraf/typings/scenes';
import { BotService } from './bot.service';

@Wizard('editUsers')
export class EditUsersWizard {
  public constructor(
    private botService: BotService,
    private apiService: ApiService,
  ) {}

  @WizardStep(1)
  async getAllUsers(ctx: WizardContext) {
    const keyboards: InlineKeyboardButton[][] = [];
    const createUserKeyboard: InlineKeyboardButton[] = [
      {
        text: 'Создать пользователя',
        callback_data: 'createUser',
      },
    ];
    const users = await this.apiService.getAllTelegramUsers();

    users.map((user) => keyboards.push([{ text: user.username, callback_data: `editUser:${user.id}` }]));
    keyboards.push(createUserKeyboard, backKeyboard);
    await ctx.editMessageText('Выберите пользователя для редактирования', {
      reply_markup: {
        inline_keyboard: keyboards,
      },
    });
  }

  @Action('mainMenu')
  backToMainMenu(ctx: WizardContext) {
    this.botService.onStart(ctx);
  }

  @Action('backToEditUsers')
  backToEditUsers(ctx: WizardContext) {
    this.getAllUsers(ctx);
  }

  @Action(/editUser:.+/)
  async editUser(
    @Ctx()
    ctx: Context<Update.CallbackQueryUpdate<CallbackQuery.DataQuery>> & WizardContext & SelectedIdWizard,
  ) {
    const keyboards: InlineKeyboardButton[][] = [];
    const selectedId = ctx.callbackQuery.data.split(':')[1];
    ctx.wizard.state.selectedId = selectedId;

    const editActionsKeyboard: InlineKeyboardButton[][] = [
      [
        {
          text: '🔗 Привязать аккаунт к Marzban',
          callback_data: `connectUser:${selectedId}`,
        },
      ],
      [
        {
          text: '🗓️ Продлить на 1 месяц',
          callback_data: `updateDate:${selectedId}`,
        },
      ],
      [
        {
          text: '❌ Отключить аккаунт',
          callback_data: `disableUser:${selectedId}`,
        },
      ],
    ];

    keyboards.push(...editActionsKeyboard, backToUserListKeyboard);
    await ctx.editMessageText(`Выберите действие`, {
      reply_markup: {
        inline_keyboard: keyboards,
      },
    });
  }

  @Action(/connectUser:.+/)
  async connectUser(
    @Ctx()
    ctx: Context<Update.CallbackQueryUpdate<CallbackQuery.DataQuery>> & WizardContext,
  ) {
    const keyboards: InlineKeyboardButton[][] = [backToUserListKeyboard];
    const users = await this.apiService.getAllVpnUsers();

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
    ctx: Context<Update.CallbackQueryUpdate<CallbackQuery.DataQuery>> & WizardContext & SelectedIdWizard,
  ) {
    const selectedVpnUsername = ctx.callbackQuery.data.split(':')[1];

    await this.apiService.connectTelegramId(selectedVpnUsername, Number(ctx.wizard.state.selectedId));
    await ctx.editMessageText('✅ Аккаунты успешно связаны');
    await ctx.scene.leave();
  }

  @Action(/disableUser:.+/)
  async deleteVpnUser(
    @Ctx()
    ctx: Context<Update.CallbackQueryUpdate<CallbackQuery.DataQuery>> & WizardContext & SelectedIdWizard,
  ) {
    const selectedId = Number(ctx.wizard.state.selectedId);
    const user = await this.apiService.findUserByTelegramId(selectedId);
    await this.apiService.disableUser(user!);

    await ctx.editMessageText('✅ Аккаунты успешно отключен', {
      reply_markup: {
        inline_keyboard: [backToUserListKeyboard],
      },
    });
  }
}
