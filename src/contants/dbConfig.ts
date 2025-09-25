import { ENV } from '@/utils/env.helpers';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const DB_DEV_CONFIG: TypeOrmModuleOptions = {
  type: 'better-sqlite3',
  database: 'dev.sqlite',
  synchronize: true,
  entities: [`./dist/**/*.entity{.ts,.js}`],
};

export const DB_PROD_CONFIG: TypeOrmModuleOptions = {
  type: 'postgres',
  host: ENV.POSTGRES_HOST,
  username: ENV.POSTGRES_USER,
  password: ENV.POSTGRES_PASSWORD,
  database: ENV.POSTGRES_DB,
  port: 5432,
  synchronize: true,
  entities: [`./dist/**/*.entity{.ts,.js}`],
};
