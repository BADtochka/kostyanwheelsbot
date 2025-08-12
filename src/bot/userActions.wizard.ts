import { ApiService } from '@/api/api.service';
import { backKeyboard, backToUserListKeyboard } from '@/contants/keyboards';
import { AppWizard } from '@/types/SelectedIdWizard';
import { convertBytes } from '@/utils/convertBytes';
import { escapeMarkdown } from '@/utils/escapeMarkdown';
import { randomUUID } from 'crypto';
import { addDays, format, formatDistanceToNowStrict, formatISO } from 'date-fns';
import { Action, Ctx, InjectBot, Wizard, WizardStep } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { CallbackQuery, InlineKeyboardButton, Update, User } from 'telegraf/typings/core/types/typegram';
import { WizardContext } from 'telegraf/typings/scenes';
import { BotService } from './bot.service';

@Wizard('userActions')
export class UserActionsWizard {
  public constructor(
    private botService: BotService,
    private apiService: ApiService,
    @InjectBot() private bot: Telegraf<Context>,
  ) {}

  @WizardStep(0)
  async getAllUsers(ctx: WizardContext) {
    const keyboards: InlineKeyboardButton[][] = [];
    const createUserKeyboard: InlineKeyboardButton[] = [
      {
        text: 'Создать пользователя',
        callback_data: 'createUser',
      },
    ];
    const users = await this.apiService.getAllVpnUsers();

    users.map((user) => keyboards.push([{ text: user.username, callback_data: `editUser:${user.username}` }]));
    keyboards.push(createUserKeyboard, backKeyboard);
    if (ctx.callbackQuery) {
      ctx.editMessageText('Выберите пользователя для редактирования', {
        reply_markup: {
          inline_keyboard: keyboards,
        },
      });
      return;
    }

    ctx.sendMessage('Выберите пользователя для редактирования', {
      reply_markup: {
        inline_keyboard: keyboards,
      },
    });
  }

  @Action('mainMenu')
  backToMainMenu(ctx: WizardContext) {
    this.botService.onStart(ctx);
  }

  @Action('createUser')
  async createUser(
    @Ctx()
    ctx: Context<Update.CallbackQueryUpdate<CallbackQuery.DataQuery>> & WizardContext & AppWizard,
  ) {
    await ctx.editMessageText('Отправьте новый username пользователя.');
    ctx.wizard.next();
  }

  @WizardStep(1)
  async enterUsername(
    @Ctx()
    ctx: WizardContext,
  ) {
    if (!ctx.text) return ctx.sendMessage('❌ Не удалось создать пользователя.');

    const user = await this.apiService.createUser({
      username: ctx.text.replaceAll(' ', ''),
      proxies: {
        vless: {
          id: randomUUID(),
          flow: 'xtls-rprx-vision',
        },
      },
      inbounds: {
        vless: ['VLESS TCP REALITY'],
      },
      expire: formatISO(addDays(new Date(), 31)),
    });
    !user
      ? await ctx.sendMessage('❌ Не удалось создать пользователя.')
      : await ctx.sendMessage(`✅ Пользователь ${user?.username} успешно создан`);

    await ctx.scene.reenter();
  }

  @Action(/editUser:.+/)
  async editUser(
    @Ctx()
    ctx: Context<Update.CallbackQueryUpdate<CallbackQuery.DataQuery>> & WizardContext & AppWizard,
  ) {
    const keyboards: InlineKeyboardButton[][] = [];
    const vpnUsername = ctx.callbackQuery.data.split(':')[1];
    const user = await this.apiService.getUserData(vpnUsername);
    if (!user) return ctx.sendMessage('Произошла ошибка');
    ctx.wizard.state.vpnUsername = vpnUsername;

    const editActionsKeyboard: InlineKeyboardButton[][] = [
      [
        {
          text: '🔗 Привязать аккаунт к Telegram',
          callback_data: 'connectUser',
        },
      ],
      [
        {
          text: '🎟️ Сгенерировать код приглашения',
          callback_data: `inviteCode:${vpnUsername}`,
        },
      ],
      [
        {
          text: '🗓️ Продлить на 1 месяц',
          callback_data: `updateDate:${vpnUsername}`,
        },
      ],
      [
        {
          text: '❌ Отключить аккаунт',
          callback_data: `disableUser:${vpnUsername}`,
        },
      ],
    ];

    keyboards.push(...editActionsKeyboard, backToUserListKeyboard);
    const parsedDate = formatISO(user.expire!);
    const dateToExpire = user.expire
      ? `${format(parsedDate, 'dd.MM.yyyy')} (${formatDistanceToNowStrict(parsedDate)})`
      : '∞';
    await ctx.editMessageText(
      `\`${user.username} / ${convertBytes(user.used_traffic)} / ${dateToExpire}\` \nВыберите действие `,
      {
        parse_mode: 'MarkdownV2',
        reply_markup: {
          inline_keyboard: keyboards,
        },
      },
    );
  }

  @Action(/updateDate:.+/)
  async updateUserDate(
    @Ctx()
    ctx: Context<Update.CallbackQueryUpdate<CallbackQuery.DataQuery>> & WizardContext & AppWizard,
  ) {
    const user = await this.apiService.getUserData(ctx.wizard.state.vpnUsername);

    if (!user) return ctx.sendMessage('❌ Ошибка');
    await this.apiService.renewUser(user);
    await ctx.reply(`✅ Вы успешно продлили подписку ${user.username} на 1 месяц.`);
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
    ctx: Context<Update.CallbackQueryUpdate<CallbackQuery.DataQuery>> & WizardContext & AppWizard,
  ) {
    const telegramId = ctx.callbackQuery.data.split(':')[1];
    const tgUser = await this.bot.telegram.getChatMember(Number(telegramId), Number(telegramId));

    await this.apiService.connectTelegramId(ctx.wizard.state.vpnUsername, tgUser.user as Required<User>);
    await ctx.editMessageText('✅ Аккаунты успешно связаны');
    await ctx.scene.leave();
  }

  @Action(/disableUser:.+/)
  async deleteVpnUser(
    @Ctx()
    ctx: Context<Update.CallbackQueryUpdate<CallbackQuery.DataQuery>> & WizardContext & AppWizard,
  ) {
    const user = await this.apiService.getUserData(ctx.wizard.state.vpnUsername);

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
    ctx: Context<Update.CallbackQueryUpdate<CallbackQuery.DataQuery>> & WizardContext & AppWizard,
  ) {
    const user = await this.apiService.getUserData(ctx.wizard.state.vpnUsername);
    const { code } = await this.apiService.addInviteCode(user!);
    const inviteMessage = `Для доступа к боту примите приглашение для привязки аккаунта. \nПользователь: ${escapeMarkdown(user?.username)} \n[Принять приглашение](https://t.me/${ctx.botInfo.username}?start=${code})`;

    await ctx.scene.leave();
    await ctx.editMessageText(inviteMessage, {
      reply_markup: { inline_keyboard: [backToUserListKeyboard] },
      parse_mode: 'Markdown',
    });
  }
}
