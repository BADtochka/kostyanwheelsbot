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
import { differenceInDays, format, formatDistanceToNowStrict, fromUnixTime } from 'date-fns';
import { Action, Command, Ctx, InjectBot, Start, Update } from 'nestjs-telegraf';
import { Context, Scenes, Telegraf } from 'telegraf';
import { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram';
import { SceneContext } from 'telegraf/typings/scenes';

@Update()
export class BotService {
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

    if (!user && !inviteCode) {
      await this.apiService.addTelegramUser(ctx.from!);
      ctx.reply(BOT_DENIED);
      return;
    }

    if (!user && inviteCode) {
      const tgUser = await this.apiService.addTelegramUser(ctx.from!);
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
      availableMenu.push([
        {
          text: '✍🏻 Действия с пользователями',
          callback_data: 'userActions',
        },
      ]);
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

    const parsedDate = fromUnixTime(user.expire!);
    const dateToExpire = user.expire
      ? `${format(parsedDate, 'dd.MM.yyyy')} (${formatDistanceToNowStrict(parsedDate)})`
      : '∞';

    const subPath = new URL(user.subscription_url).pathname;

    const profile = `\`💡 Статистика обновляется в 0:00 по МСК\`

😎 Пользователь: ${escapeMarkdown(user.username)}

🧑‍💻 Использовано трафика: ${convertBytes(user.used_traffic)}

📍 Статус: ${user.status}

${
  user.status === 'active' &&
  `📅 Действует до: ${dateToExpire}

🔗 Ссылка на подписку \`\`\`${user.subscription_url}\`\`\`

🔗 Зеркало \`\`\`${parseEnv('API_HOST')}${subPath}\`\`\`
`
}`.replace(/true|false/, '');

    await ctx.editMessageText(profile, {
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
    const expiredDays = differenceInDays(fromUnixTime(user.expire), new Date());
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
}
