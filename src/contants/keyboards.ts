import { Markup } from 'telegraf';
import { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram';

export const mainKeyboard: InlineKeyboardButton[] = [
  Markup.button.callback('🗿 Профиль', 'profile'),
  Markup.button.callback('💳 Реквизиты для оплаты', 'requisites'),
  Markup.button.callback('🧾 Прикрепить чек', 'receipt'),
];

export const backKeyboard: InlineKeyboardButton[] = [Markup.button.callback('🏠 Главная', 'mainMenu')];

export const backToUserListKeyboard: InlineKeyboardButton[] = [Markup.button.callback('👈 Назад', 'userActions')];
