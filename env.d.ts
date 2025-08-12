type AppEnv = {
  TOKEN: string;
  BOT_OWNER_ID: number;

  API_HOST: string;
  API_USERNAME: string;
  API_PASSWORD: string;

  POSTGRES_HOST: string;
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;
  POSTGRES_DB: string;

  YOOMONEY: string;
  BOOSTY: string;
  CLOUDTIPS: string;
  SBER: string;
  TBANK: string;
  USDT_TRC: string;
  USDT_TON: string;
  TON: string;
  BITCOIN: string;
  NOTCOIN: string;
};

namespace NodeJS {
  interface ProcessEnv extends AppEnv {}
}
