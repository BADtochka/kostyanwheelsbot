import { InlineKeyboardButton } from 'telegraf/typings/core/types/typegram';

export const mainKeyboard: InlineKeyboardButton[][] = [
  [
    {
      text: '🗿 Профиль',
      callback_data: 'profile',
    },
  ],
  [
    {
      text: '💳 Реквизиты для оплаты',
      callback_data: 'requisites',
    },
  ],
  [
    {
      text: '🧾 Прикрепить чек',
      callback_data: 'receipt',
    },
  ],
];

export const backKeyboard: InlineKeyboardButton[] = [
  {
    text: 'Назад',
    callback_data: 'mainMenu',
  },
];

export const backToUserListKeyboard: InlineKeyboardButton[] = [
  {
    text: 'Назад',
    callback_data: 'backToEditUsers',
  },
];
