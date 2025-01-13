import { ApiService } from '@/api/api.service';
import { backKeyboard } from '@/contants/keyboards';
import { Logger } from '@nestjs/common';
import { Action, Ctx, On, Wizard, WizardStep } from 'nestjs-telegraf';
import { Context, Input } from 'telegraf';
import { Message, Update } from 'telegraf/typings/core/types/typegram';
import { SceneContext, WizardContext } from 'telegraf/typings/scenes';
import { BotService } from './bot.service';

@Wizard('receiptSend')
export class ReceiptWizard {
  private logger = new Logger(ReceiptWizard.name);

  public constructor(
    private botService: BotService,
    private apiService: ApiService,
  ) {}

  @WizardStep(1)
  async receiptInfo(ctx: WizardContext) {
    await ctx.editMessageText('🧾 Отправьте файл с чеком успешной операции об оплате.', {
      reply_markup: {
        inline_keyboard: [backKeyboard],
      },
    });
    ctx.wizard.next();
  }

  @Action('mainMenu')
  backToMainMenu(ctx: WizardContext) {
    this.botService.onStart(ctx);
  }

  @WizardStep(2)
  async receiptSended(ctx: Context) {
    ctx.reply('Пожалуйста отправьте файл с чеком');
  }

  @On('document')
  async document(@Ctx() ctx: Context<Update.MessageUpdate<Message.DocumentMessage>> & SceneContext) {
    const user = await this.apiService.findUserByTelegram(ctx.from.id);
    if (!user) {
      ctx.reply('У вас нет доступа к этому боту.');
      return;
    }

    try {
      const document = Input.fromFileId(ctx.message.document.file_id)!;
      await this.botService.sendToOwner({ document, senderName: user.username });
      await this.apiService.renewUser(user);
      await ctx.reply('✅ Вы успешно продлили подписку на 1 месяц.');
      await ctx.scene.leave();
    } catch (err) {
      ctx.reply('Произошла ошибка');
      this.logger.error(err);
    }
  }

  @On('photo')
  async photo(@Ctx() ctx: Context<Update.MessageUpdate<Message.PhotoMessage>> & SceneContext) {
    const user = await this.apiService.findUserByTelegram(ctx.from.id);
    if (!user) {
      ctx.reply('У вас нет доступа к этому боту.');
      return;
    }

    try {
      const photo = Input.fromFileId(ctx.message.photo.pop()?.file_id!)!;
      await this.botService.sendToOwner({ photo, senderName: user.username });
      await this.apiService.renewUser(user);
      await ctx.reply('✅ Вы успешно продлили подписку на 1 месяц.');
      await ctx.scene.leave();
    } catch (err) {
      ctx.reply('Произошла ошибка');
      this.logger.error(err);
    }
  }
}
