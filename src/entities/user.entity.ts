import { PublicUser } from '@/types/User';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { TelegramUserEntity } from './telegramUser.entity';

@Entity()
export class UserEntity implements PublicUser {
  @PrimaryColumn()
  username: string;

  @Column('varchar', { nullable: true, default: () => 'CURRENT_TIMESTAMP' })
  expire: string | 0;

  @Column('varchar')
  status: PublicUser['status'];

  @Column()
  subscription_url: string;

  @Column()
  used_traffic: string;

  @ManyToOne(() => TelegramUserEntity, { nullable: true })
  @JoinColumn({ name: 'telegramId' })
  telegramUser: TelegramUserEntity | null;

  @Column({ type: 'varchar', nullable: true })
  inviteCode: string | null;
}
