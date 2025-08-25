import { Chat } from 'telegraf/typings/core/types/typegram';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class TelegramUserEntity implements Pick<Chat.PrivateChat, 'id' | 'username' | 'first_name' | 'last_name'> {
  @PrimaryColumn()
  id: number;

  @Column({ nullable: true })
  username?: string;

  @Column()
  first_name: string;

  @Column({ nullable: true })
  last_name?: string;
}
