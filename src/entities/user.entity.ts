import { PublicUser } from '@/types/user.api';
import { Column, Entity, PrimaryColumn } from 'typeorm';

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

  @Column('bigint', { nullable: true })
  telegramId: number;
}
