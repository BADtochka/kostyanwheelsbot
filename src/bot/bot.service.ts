import { ApiService } from '@/api/api.service';
import { backKeyboard, mainKeyboard } from '@/contants/keyboards';
import { SendToOwner } from '@/types/sendToOwner';
import { convertBytes } from '@/utils/convertBytes';
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
    if (ctx.scene.current) ctx.scene.leave();

    const user = await this.apiService.findUserByTelegram(ctx.from?.id!);

    if (!user) {
      await this.apiService.addTelegramUser(ctx.from!);
      ctx.reply('У вас нет доступа к этому боту.');
      return;
    }

    const availableMenu: InlineKeyboardButton[][] = [...mainKeyboard];

    if (user.telegramUser.id === Number(process.env.BOT_OWNER_ID)) {
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
    const user = await this.apiService.findUserByTelegram(ctx.from?.id!);
    if (!user) {
      ctx.reply('У вас нет доступа к этому боту.');
      return;
    }
    const { expire, status, subscription_url, used_traffic, username } = user;
    const parsedDate = fromUnixTime(expire!);
    const dateToExpire = expire
      ? `${format(parsedDate, 'dd.MM.yyyy')} (${formatDistanceToNowStrict(parsedDate)})`
      : '∞';

    await ctx.editMessageText(
      `😎 Пользователь: ${username}\n\n🧑‍💻 Использовано трафика: ${convertBytes(used_traffic)}\n\n📍 Статус: ${status}\n\n📅 Действует до: ${dateToExpire}\n\n🔗 Ссылка на подписку \`\`\`${subscription_url}\`\`\``,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [backKeyboard],
        },
      },
    );
  }

  @Action('requisites')
  async requisites(@Ctx() ctx: Context) {
    const { SBER, TBANK, USDT_TRC, USDT_TON, TON, BITCOIN, NOTCOIN, YOOMONEY } = process.env;
    ctx.editMessageText(
      `Стоимость продления одного месяца 300₽\n\n*Сервисы донатов (комиссия ~3%)* \n[Boosty](https://boosty.to/kostyanwheels) (донат или подписка, при оформлении подписки отправляете скрин оплаты) \n[Сбор в YooMoney](${YOOMONEY}) (оплата с кошелька или по данным карты)\n\n*Банковские реквизиты* \nСбербанк: \n\`${SBER}\`\nТБанк: \n\`${TBANK}\` \n\n*Крипто*\nUSDT(TRC20): \n\`${USDT_TRC}\`\nUSDT(TON): \n\`${USDT_TON}\`\nTON: \n\`${TON}\`\nBitcoin: \n\`${BITCOIN}\`\nNotcoin: \n\`${NOTCOIN}\``,
      {
        parse_mode: 'Markdown',
        link_preview_options: {
          is_disabled: true,
        },
        reply_markup: {
          inline_keyboard: [backKeyboard],
        },
      },
    );
  }

  @Action('receipt')
  async receipt(@Ctx() ctx: Scenes.SceneContext) {
    const user = await this.apiService.findUserByTelegram(ctx.callbackQuery?.from.id!);
    if (!user) {
      ctx.reply('У вас нет доступа к этому боту.');
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

  async sendToOwner({ photo, document, senderName }: SendToOwner) {
    if (photo) {
      this.bot.telegram.sendPhoto(process.env.BOT_OWNER_ID, photo, {
        caption: `Вложение от #${senderName}`,
      });
    } else if (document) {
      this.bot.telegram.sendDocument(process.env.BOT_OWNER_ID, document, {
        caption: `Вложение от #${senderName}`,
      });
    }
  }
}
