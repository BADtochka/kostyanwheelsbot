import { ApiService } from '@/api/api.service';
import { backKeyboard, mainKeyboard } from '@/contants/keyboards';
import { BOT_DENIED } from '@/contants/messages';
import { requisites } from '@/contants/requisites';
import { SendToOwner } from '@/types/sendToOwner';
import { convertBytes } from '@/utils/convertBytes';
import { escapeMarkdown } from '@/utils/escapeMarkdown';
import { differenceInDays, format, formatDistanceToNowStrict, fromUnixTime } from 'date-fns';
import { Action, Command, Ctx, InjectBot, Start, Update } from 'nestjs-telegraf';
import { Context, Scenes, Telegraf } from 'telegraf';
import { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram';
import { SceneContext } from 'telegraf/typings/scenes';
import { BotHelper } from './bot.interval';

@Update()
export class BotService {
  constructor(
    private botHelper: BotHelper,
    private apiService: ApiService,
    @InjectBot() private bot: Telegraf<Context>,
  ) {}

  @Start()
  @Command('menu')
  @Action('mainMenu')
  async onStart(@Ctx() ctx: SceneContext) {
    const availableMenu: InlineKeyboardButton[][] = [...mainKeyboard];

    if (ctx.scene.current) ctx.scene.leave();
    const user = await this.apiService.findUserByTelegramId(ctx.from?.id!);

    if (!user) {
      await this.apiService.addTelegramUser(ctx.from!);
      ctx.reply(BOT_DENIED);
      return;
    }

    if (user.telegramUser?.id === Number(process.env.BOT_OWNER_ID)) {
      availableMenu.push([
        {
          text: '✍🏻 Редактировать аккаунт',
          callback_data: 'editUsers',
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

    const profile = `\`💡 Статистика обновляется в 0:00 по МСК\`

😎 Пользователь: ${escapeMarkdown(user.username)}

🧑‍💻 Использовано трафика: ${convertBytes(user.used_traffic)}

📍 Статус: ${user.status}

${
  user.status === 'active' &&
  `📅 Действует до: ${dateToExpire}

🔗 Ссылка на подписку \`\`\`${user.subscription_url}\`\`\``
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
    if (expiredDays > 3) {
      ctx.editMessageText('⚠️ Чтобы продлить подписку она должна заканчиваться не более, чем через 3 дня', {
        reply_markup: {
          inline_keyboard: [backKeyboard],
        },
      });
      return;
    }

    ctx.scene.enter('receiptSend');
  }

  @Action('editUsers')
  async editUsers(@Ctx() ctx: SceneContext) {
    ctx.scene.enter('editUsers');
  }

  async sendToOwner({ type, content, senderName }: SendToOwner) {
    switch (type) {
      case 'document':
        this.bot.telegram.sendDocument(process.env.BOT_OWNER_ID, content, {
          caption: `Вложение от #${senderName}`,
        });
      case 'photo':
        this.bot.telegram.sendPhoto(process.env.BOT_OWNER_ID, content, {
          caption: `Вложение от #${senderName}`,
        });
      case 'text':
        this.bot.telegram.sendMessage(process.env.BOT_OWNER_ID, content);
    }
  }
}
