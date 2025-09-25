import { ENV } from './env.helpers';

export const isOwner = (id?: number) => id === ENV.BOT_OWNER_ID;
