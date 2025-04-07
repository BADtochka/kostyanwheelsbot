const { TBANK, USDT_TRC, USDT_TON, TON, BITCOIN, NOTCOIN, YOOMONEY } = process.env;
export const requisites = `Стоимость продления одного месяца 300₽

*Банковские реквизиты* 
ТБанк: 
\`${TBANK}\` 

*Сервисы донатов (комиссия ~3%)* 
[Boosty](https://boosty.to/kostyanwheels) (донат или подписка, при оформлении подписки отправляете скрин оплаты) 
[Сбор в YooMoney](${YOOMONEY}) (оплата с кошелька или по данным карты)

*Крипто*
USDT(TRC20): 
\`${USDT_TRC}\`
USDT(TON): 
\`${USDT_TON}\`
TON: 
\`${TON}\`
Bitcoin: 
\`${BITCOIN}\`
Notcoin: 
\`${NOTCOIN}\``;
