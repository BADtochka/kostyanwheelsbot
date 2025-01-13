import { PublicUser } from '@/types/user.api';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { TelegramUserEntity } from './telegramUser.entity';

@Entity()
export class UserEntity implements PublicUser {
  @PrimaryColumn()
  username: string;

  @Column('bigint', { nullable: true })
  expire: number | null;

  @Column()
  status: string;

  @Column()
  subscription_url: string;

  @Column('bigint')
  used_traffic: number;

  @ManyToOne(() => TelegramUserEntity, { nullable: true })
  @JoinColumn({ name: 'telegramId' })
  telegramUser: TelegramUserEntity;
}
