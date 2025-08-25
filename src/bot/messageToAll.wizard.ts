import { AppWizard } from '@/types/SelectedIdWizard';
import { Action, Context, On, Wizard, WizardStep } from 'nestjs-telegraf';
import { Markup, Context as TelegrafContext } from 'telegraf';
import { Message, Update } from 'telegraf/types';
import { SceneContext, WizardContext } from 'telegraf/typings/scenes';
import { BotService } from './bot.service';

@Wizard('messageToAll')
export class MessageToAllWizard {
  constructor(private botService: BotService) {}

  @WizardStep(1)
  async messageToAll(@Context() ctx: SceneContext) {
    await ctx.editMessageText('Введите сообщение:');
  }

  @Action('mainMenu')
  backToMainMenu(ctx: WizardContext) {
    this.botService.onStart(ctx);
  }

  @On('message')
  async sendMessageToAll(
    @Context() ctx: TelegrafContext<Update.MessageUpdate<Message.TextMessage>> & AppWizard<{ message: string }>,
  ) {
    ctx.wizard.state.message = ctx.message.text;
    await ctx.reply(`⚠️ Вы уверены, что хотите отправить это сообщение? \`${ctx.message.text}\``, {
      parse_mode: 'MarkdownV2',
      reply_markup: {
        inline_keyboard: [
          [Markup.button.callback('❌ Хочу домой', 'mainMenu')],
          [Markup.button.callback('💀 Отправить', 'сonfirm')],
        ],
      },
    });
  }

  @Action('сonfirm')
  async сonfirm(@Context() ctx: SceneContext & AppWizard<{ message: string }>) {
    const count = await this.botService.sendToAll(ctx.wizard.state.message);
    await ctx.editMessageText(`✅ Сообщение ${ctx.wizard.state.message} отправлено всем пользователям (${count})`);
    await ctx.scene.leave();
  }
}
