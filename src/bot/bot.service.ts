import { ApiService } from '@/api/api.service';
import { isDev } from '@/contants/isDev';
import { backKeyboard, mainKeyboard } from '@/contants/keyboards';
import { BOT_DENIED } from '@/contants/messages';
import { requisites } from '@/contants/requisites';
import { SendToOwner } from '@/types/SendToOwner';
import { convertBytes } from '@/utils/convertBytes';
import { escapeMarkdown } from '@/utils/escapeMarkdown';
import { getInviteTag } from '@/utils/getInviteTag';
import { parseEnv } from '@/utils/parceEnv';
import { parseUserLinks } from '@/utils/parseUserLinks';
import { Logger } from '@nestjs/common';
import { differenceInDays, differenceInHours, format, formatDistanceToNowStrict, formatISO } from 'date-fns';
import { Action, Command, Ctx, InjectBot, Start, Update } from 'nestjs-telegraf';
import { Context, Markup, Scenes, Telegraf } from 'telegraf';
import { CallbackQuery, InlineKeyboardButton, Update as TelegrafUpdate } from 'telegraf/typings/core/types/typegram';
import { SceneContext } from 'telegraf/typings/scenes';

@Update()
export class BotService {
  private logger = new Logger(BotService.name);

  constructor(
    private apiService: ApiService,
    @InjectBot() private bot: Telegraf<Context>,
  ) {
    bot.telegram.setMyCommands([{ command: '/menu', description: 'Главное меню' }]);
  }

  @Start()
  @Command('menu')
  @Action('mainMenu')
  async onStart(@Ctx() ctx: SceneContext & Context) {
    if (ctx.scene.current) ctx.scene.leave();
    const availableMenu: InlineKeyboardButton[][] = [...mainKeyboard];
    const inviteCode = getInviteTag(ctx.text);

    let user = await this.apiService.findUserByTelegramId(ctx.from?.id!);

    if (!user && !inviteCode && ctx.chat?.type === 'private') {
      await this.apiService.addTelegramUser(ctx.chat!);
      ctx.reply(BOT_DENIED);
      return;
    }

    if (!user && inviteCode && ctx.chat?.type === 'private') {
      const tgUser = await this.apiService.addTelegramUser(ctx.chat!);
      const newUser = await this.apiService.connectByInviteCode(inviteCode, tgUser);
      if (!newUser) {
        ctx.reply('❌ Неверный код приглашения');
        return;
      }

      user = newUser;
    }

    if (!user) {
      ctx.reply(BOT_DENIED);
      return;
    }

    if (user.telegramUser?.id === Number(parseEnv('BOT_OWNER_ID'))) {
      availableMenu.push(
        [
          {
            text: '✍🏻 Действия с пользователями',
            callback_data: 'userActions',
          },
        ],
        [
          {
            text: '💀 Настройки разработчика',
            callback_data: 'devSettings',
          },
        ],
      );
    }

    if (ctx.callbackQuery) {
      await ctx.editMessageText('Добро пожаловать в меню бота ♿', {
        reply_markup: { inline_keyboard: availableMenu },
      });
      return;
    }

    ctx.reply('Добро пожаловать в меню бота ♿', {
      reply_markup: { inline_keyboard: availableMenu },
    });
  }

  @Action('profile')
  async profile(@Ctx() ctx: Context) {
    const user = await this.apiService.findUserByTelegramId(ctx.from?.id!);
    if (!user) {
      ctx.reply(BOT_DENIED);
      return;
    }

    const parsedDate = formatISO(user.expire!);
    const dateToExpire = user.expire
      ? `${format(parsedDate, 'dd.MM.yyyy')} (${formatDistanceToNowStrict(parsedDate)})`
      : '∞';

    const profileArray = ['\`💡 Статистика обновляется в 0:00 по МСК\`'];

    profileArray.push(escapeMarkdown(`😎 Пользователь: ${user.username}`));
    profileArray.push(`🧑‍💻 Использовано трафика: ${convertBytes(user.used_traffic)}`);

    if (user.status !== 'active') {
      await ctx.editMessageText(profileArray.join('\n\n'), {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [backKeyboard],
        },
      });
      return;
    }
    profileArray.push(`📅 Действует до: ${dateToExpire}`);

    profileArray.push(`🔗 Подписка: \`\`\`${parseEnv('API_HOST')}${user.subscription_url}\`\`\``);

    const linksKeyboard: InlineKeyboardButton[] = [
      { text: '🔗 Ссылки на профили', callback_data: `servers:${user.subscription_url}` },
    ];

    await ctx.editMessageText(profileArray.join('\n\n'), {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [linksKeyboard, backKeyboard],
      },
    });
  }

  @Action(/servers:.+/)
  async servers(@Ctx() ctx: Context<TelegrafUpdate.CallbackQueryUpdate<CallbackQuery.DataQuery>>) {
    const subLink = ctx.callbackQuery?.data?.split(':')?.[1];
    if (!subLink) return;
    const userLinks = await this.apiService.getUserLinks(subLink);
    const parsedUserLinks = parseUserLinks(userLinks);

    await ctx.editMessageText(`🔗 Профили VLESS: \n${parsedUserLinks.join('').replaceAll('>', '\n')}`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [backKeyboard],
      },
    });
  }

  @Action('requisites')
  async requisites(@Ctx() ctx: Context) {
    ctx.editMessageText(requisites, {
      parse_mode: 'Markdown',
      link_preview_options: {
        is_disabled: true,
      },
      reply_markup: {
        inline_keyboard: [backKeyboard],
      },
    });
  }

  @Action('receipt')
  async receipt(@Ctx() ctx: Scenes.SceneContext) {
    const user = await this.apiService.findUserByTelegramId(ctx.callbackQuery?.from.id!);
    if (!user) {
      ctx.reply(BOT_DENIED);
      return;
    }
    if (!user.expire) {
      ctx.editMessageText('У вас нет ограничения на использование', {
        reply_markup: {
          inline_keyboard: [backKeyboard],
        },
      });
      return;
    }
    const expiredDays = differenceInDays(formatISO(user.expire), new Date());
    if (expiredDays > 3 && !isDev) {
      ctx.editMessageText('⚠️ Чтобы продлить подписку она должна заканчиваться не более, чем через 3 дня', {
        reply_markup: {
          inline_keyboard: [backKeyboard],
        },
      });
      return;
    }

    ctx.scene.enter('receiptSend');
  }

  @Action('userActions')
  async userActions(@Ctx() ctx: SceneContext) {
    ctx.scene.enter('userActions');
  }

  async sendToOwner({ type, content, senderName }: SendToOwner) {
    switch (type) {
      case 'document':
        this.bot.telegram.sendDocument(parseEnv('BOT_OWNER_ID'), content, {
          caption: `Вложение от #${senderName}`,
        });
        break;
      case 'photo':
        this.bot.telegram.sendPhoto(parseEnv('BOT_OWNER_ID'), content, {
          caption: `Вложение от #${senderName}`,
        });
        break;
      case 'text':
        this.bot.telegram.sendMessage(parseEnv('BOT_OWNER_ID'), content);
        break;
    }
  }

  @Action('devSettings')
  async devSettings(@Ctx() ctx: SceneContext) {
    await ctx.editMessageText('Чо?', {
      reply_markup: {
        inline_keyboard: [
          [Markup.button.callback('🔃 Проверить срок профилей', 'checkProfiles')],
          [Markup.button.callback('📨 Отправить сообщение всем юзерам в БД', 'sendMessageToAll')],
        ],
      },
    });
  }

  @Action('checkProfiles')
  async checkUsers(@Ctx() ctx: SceneContext) {
    // TODO: add statistic
    await this.checkUsersExpiration();
    await ctx.reply('✅ Проверка профилей завершена');
  }

  @Action('sendMessageToAll')
  async sendMessageToAll(@Ctx() ctx: SceneContext) {
    ctx.scene.enter('messageToAll');
  }

  async checkUsersExpiration() {
    const { users } = await this.apiService.getAllTableUsers();
    const expiredStatistic = { expired: 0, active: 0 };

    users.forEach(async (user) => {
      if (user.expire === '0') return;

      const expireHours = differenceInHours(user.expire, new Date());
      const expireDistance = formatDistanceToNowStrict(user.expire, { addSuffix: true });
      if (user.telegramUser && expireHours <= 24 * 3 && expireHours > 0) {
        await this.bot.telegram.sendMessage(user.telegramUser.id, `⚠️ Ваша подписка закончится ${expireDistance}`);
        this.logger.warn(`Сообщение об окончании подписки отправлено ${user.username} (${expireDistance})`);
        return;
      } else if (expireHours < 0) {
        expiredStatistic.expired++;
        await this.apiService.disableUser(user);
        if (!user.telegramUser || expireHours < -48) return;
        await this.bot.telegram.sendMessage(user.telegramUser.id, `⚠️ Ваша подписка закончилась ${expireDistance}`);
        this.logger.warn(`Сообщение об окончании подписки отправлено ${user.username} (${expireDistance})`);
        return;
      }
      expiredStatistic.active++;
    });
  }

  async sendToAll(message: string) {
    const { users } = await this.apiService.getAllTableUsers();
    let count = 0;
    users.forEach(async (user) => {
      if (!user.telegramUser) return;
      count++;
      await this.bot.telegram.sendMessage(user.telegramUser.id, message);
    });

    return count;
  }
}
