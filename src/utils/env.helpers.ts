import { ENV_SCHEME } from '@/contants/env';
import { Logger } from '@nestjs/common';
import 'dotenv/config';
import z from 'zod';

const parseEnv = () => {
  const logger = new Logger('parseEnv');
  try {
    // ENV_SCHEME.
    return ENV_SCHEME.parse(process.env);
  } catch (error) {
    if (!(error instanceof z.ZodError)) throw error;
    const erroredFields = error.issues.map((issue) => issue.path.join(', ')).join(', ');
    logger.error(`Not found env fields ${erroredFields}. CHECK .env FILE!`);
    throw new Error(`Not found env fields ${erroredFields}. CHECK .env FILE!`);
  }
};

export const ENV = parseEnv();
