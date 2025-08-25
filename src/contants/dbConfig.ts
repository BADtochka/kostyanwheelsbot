import { parseEnv } from '@/utils/parceEnv';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const DB_DEV_CONFIG: TypeOrmModuleOptions = {
  type: 'better-sqlite3',
  database: 'dev.sqlite',
  synchronize: true,
  entities: [`./dist/**/*.entity{.ts,.js}`],
};

export const DB_PROD_CONFIG: TypeOrmModuleOptions = {
  type: 'postgres',
  host: parseEnv('POSTGRES_HOST'),
  username: parseEnv('POSTGRES_USER'),
  password: parseEnv('POSTGRES_PASSWORD'),
  database: parseEnv('POSTGRES_DB'),
  port: 5432,
  synchronize: true,
  entities: [`./dist/**/*.entity{.ts,.js}`],
};
