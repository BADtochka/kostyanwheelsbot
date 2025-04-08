import { ApiService } from '@/api/api.service';
import { backKeyboard, backToUserListKeyboard } from '@/contants/keyboards';
import { SelectedIdWizard } from '@/types/SelectedIdWizard';
import { escapeMarkdown } from '@/utils/escapeMarkdown';
import { Action, Ctx, Wizard, WizardStep } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { CallbackQuery, InlineKeyboardButton, Update, User } from 'telegraf/typings/core/types/typegram';
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
        text: 'Создать пользователя [TODO]',
        callback_data: 'createUser',
      },
    ];
    const users = await this.apiService.getAllVpnUsers();

    users.map((user) => keyboards.push([{ text: user.username, callback_data: `editUser:${user.username}` }]));
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
          text: '🔗 Привязать аккаунт к Telegram',
          callback_data: 'connectUser',
        },
      ],
      [
        {
          text: 'Сгенерировать код приглашения',
          callback_data: `inviteCode:${selectedId}`,
        },
      ],
      [
        {
          text: '🗓️ Продлить на 1 месяц [TODO]',
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

  @Action('connectUser')
  async connectUser(
    @Ctx()
    ctx: Context<Update.CallbackQueryUpdate<CallbackQuery.DataQuery>> & WizardContext,
  ) {
    const keyboards: InlineKeyboardButton[][] = [];
    const tgUsers = await this.apiService.getAllTelegramUsers();

    tgUsers.map((tgUser) =>
      keyboards.push([{ text: tgUser.username, callback_data: `connectUser-final:${tgUser.id}` }]),
    );
    keyboards.push(backToUserListKeyboard);
    await ctx.editMessageText(`Выберите telegram аккаунт`, {
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
    const selectedTelegramId = ctx.callbackQuery.data.split(':')[1];
    const tgUser = await ctx.getChatMember(Number(selectedTelegramId));

    await this.apiService.connectTelegramId(ctx.wizard.state.selectedId as string, tgUser.user as Required<User>);
    await ctx.editMessageText('✅ Аккаунты успешно связаны');
    await ctx.scene.leave();
  }

  @Action(/disableUser:.+/)
  async deleteVpnUser(
    @Ctx()
    ctx: Context<Update.CallbackQueryUpdate<CallbackQuery.DataQuery>> & WizardContext & SelectedIdWizard,
  ) {
    const selectedId = ctx.wizard.state.selectedId as string;
    const user = await this.apiService.getUserData(selectedId);

    await this.apiService.disableUser(user!);

    await ctx.scene.leave();
    await ctx.editMessageText('✅ Аккаунт успешно отключен', {
      reply_markup: {
        inline_keyboard: [backToUserListKeyboard],
      },
    });
  }

  @Action(/inviteCode:.+/)
  async inviteCodeGenerate(
    @Ctx()
    ctx: Context<Update.CallbackQueryUpdate<CallbackQuery.DataQuery>> & WizardContext & SelectedIdWizard,
  ) {
    const selectedId = ctx.wizard.state.selectedId as string;
    const user = await this.apiService.getUserData(selectedId);
    const { code } = await this.apiService.addInviteCode(user!);

    await ctx.scene.leave();
    await ctx.editMessageText(
      `Пользователь: ${escapeMarkdown(user?.username)} \n[Принять приглашение](https://t.me/KostyanWheelsBot?start=${code})`,
      {
        reply_markup: {
          inline_keyboard: [backToUserListKeyboard],
        },
        parse_mode: 'Markdown',
      },
    );
  }
}
