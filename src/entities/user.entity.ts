import { PublicUser } from '@/types/user.api';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { TelegramUserEntity } from './telegramUser.entity';

@Entity()
export class UserEntity implements PublicUser {
  @PrimaryColumn()
  username: string;

  @Column('bigint', { nullable: true })
  expire: number | null;

  @Column('varchar')
  status: PublicUser['status'];

  @Column()
  subscription_url: string;

  @Column()
  used_traffic: string;

  @ManyToOne(() => TelegramUserEntity, { nullable: true })
  @JoinColumn({ name: 'telegramId' })
  telegramUser: TelegramUserEntity | null;
}
