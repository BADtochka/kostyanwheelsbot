import { ENV_SCHEME } from '@/contants/env';

export type AppEnv = z.infer<typeof ENV_SCHEME>;

namespace NodeJS {
  interface ProcessEnv extends AppEnv {}
}
