import { ApiService } from '@/api/api.service';
import { ENV } from '@/utils/env.helpers';
import { parseError } from '@/utils/parseError';
import { tryCatch } from '@/utils/tryCatch';
import { Logger } from '@nestjs/common';
import { addDays, formatISO } from 'date-fns';
import { Ctx, InjectBot, On, Update } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { Update as TelegrafUpdate, User } from 'telegraf/typings/core/types/typegram';

@Update()
export class BoostyService {
  private logger = new Logger(BoostyService.name);
  private disabled = false;

  constructor(
    private apiService: ApiService,
    @InjectBot() private bot: Telegraf<Context>,
  ) {
    if (!ENV.BOOSTY_GROUP_ID) {
      this.logger.error('BoostyService is disabled because BOOSTY_GROUP_ID is not set');
      this.disabled = true;
    }
  }

  @On('chat_member')
  async onChatMember(@Ctx() ctx: Context<TelegrafUpdate.ChatMemberUpdate>) {
    if (ctx.chat.id !== ENV.BOOSTY_GROUP_ID || this.disabled) return;
    const chatMember = ctx.update.chat_member.new_chat_member;

    switch (chatMember.status) {
      case 'member':
        return await this.onJoinAction(chatMember.user);
      case 'left':
        return await this.onLeftAction(chatMember.user);
      case 'kicked':
        return await this.onLeftAction(chatMember.user);
    }
  }

  async onJoinAction(user: User) {
    const { data: findedUser } = await tryCatch(this.apiService.findUserByTelegramId(user.id));
    const createdUsername = (user.username || user.first_name).replaceAll(' ', '').trim().toLowerCase();
    const { data: existingVpnUser } = await tryCatch(this.apiService.getUserData(createdUsername));
    this.logger.log(`User ${user.first_name} (${findedUser?.username}) joined group`);

    if (!findedUser && !existingVpnUser) {
      console.log('not existed');

      const { data: createdUser, error } = await tryCatch(
        this.apiService.createUser({
          username: createdUsername,
          expire: 0,
        }),
      );

      if (!createdUser && !String(parseError(error)).includes('exists')) {
        this.logger.fatal('Failed to create user', user);
        return;
      }

      await this.apiService.connectTelegramId(createdUsername, user);

      const { error: sendMessageError } = await tryCatch(
        this.bot.telegram.sendMessage(
          user.id,
          '✅ Вы присоединились к группе бустеров, для вас создан новый профиль, воспользуйтесь /menu для просмотра информации о подписке.',
        ),
      );

      if (!sendMessageError) return;
      this.bot.telegram.sendMessage(
        ENV.BOOSTY_GROUP_ID!,
        `[${user.first_name}](tg://user?id=${user.id}) чтобы получить доступ, запустите бота [${this.bot.botInfo?.first_name}](tg://user?id=${this.bot.botInfo?.id})`,
        {
          parse_mode: 'MarkdownV2',
        },
      );
      return;
    } else if (!findedUser) {
      await this.apiService.updateUser(createdUsername, {
        expire: 0,
        status: 'active',
      });
      await this.apiService.connectTelegramId(createdUsername, user);

      const { error } = await tryCatch(
        this.bot.telegram.sendMessage(
          user.id,
          `✅ Вы присоединились к группе бустеров, ваш аккаунт привязан к аккаунту ${createdUsername}, подписка продлена.`,
        ),
      );

      if (!error) return;
      this.bot.telegram.sendMessage(
        ENV.BOOSTY_GROUP_ID!,
        `[${user.first_name}](tg://user?id=${user.id}) чтобы получить доступ, запустите бота [${this.bot.botInfo?.first_name}](tg://user?id=${this.bot.botInfo?.id})`,
        {
          parse_mode: 'MarkdownV2',
        },
      );
      return;
    }

    await this.apiService.updateUser(findedUser!.username, {
      expire: 0,
      status: 'active',
    });

    const { error } = await tryCatch(
      this.bot.telegram.sendMessage(user.id, '✅ Вы присоединились к группе бустеров, ваша подписка продлена.'),
    );

    if (!error) return;
    this.sendTempMessage(
      ENV.BOOSTY_GROUP_ID!,
      `[${user.first_name}](tg://user?id=${user.id}) чтобы получить доступ, запустите бота [${this.bot.botInfo?.first_name}](tg://user?id=${this.bot.botInfo?.id})`,
    );
  }

  async sendTempMessage(chatId: number, message: string) {
    const { data } = await tryCatch(this.bot.telegram.sendMessage(chatId, message, { parse_mode: 'MarkdownV2' }));

    setTimeout(() => {
      this.bot.telegram.deleteMessage(chatId, data!.message_id);
    }, 60 * 1000);
  }

  async onLeftAction(user: User) {
    const { data: tgUser } = await tryCatch(this.apiService.findUserByTelegramId(user.id));
    this.logger.log(`User ${user.first_name} (${tgUser?.username}) left group`);
    if (!tgUser) return;

    await this.apiService.updateUser(tgUser.username, { expire: formatISO(addDays(new Date(), 1)) });
    tryCatch(
      this.bot.telegram.sendMessage(user.id, '⚠️ Вы покинули группу бустеров, ваша подписка закончится, через 1 день.'),
    );
  }
}
