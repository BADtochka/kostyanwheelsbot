import z from 'zod';

const stringToNumber = () =>
  z.string().transform((val) => {
    const num = Number(val);
    if (isNaN(num)) throw new Error(`Invalid number: ${val}`);
    return num;
  });

const stringToBoolean = () =>
  z.string().transform((val) => {
    const lower = val.toLowerCase();
    return lower === 'true' || lower === '1' || lower === 'yes';
  });

export const ENV_SCHEME = z.object({
  TOKEN: z.string(),
  BOT_OWNER_ID: stringToNumber(),
  API_HOST: z.string(),
  BACKUP_API_HOST: z.string().optional(),
  API_USERNAME: z.string(),
  API_PASSWORD: z.string(),
  POSTGRES_HOST: z.string(),
  POSTGRES_USER: z.string(),
  POSTGRES_PASSWORD: z.string(),
  POSTGRES_DB: z.string(),
  ENABLE_MONITORING: stringToBoolean().optional(),
  YOOMONEY: z.string(),
  BOOSTY: z.string(),
  CLOUDTIPS: z.string(),
  TBANK: z.string(),
});
