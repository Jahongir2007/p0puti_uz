import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, InlineKeyboard } from 'grammy';
import { TelegramEventJob } from '../infrastructure/telegram/telegramEvent.interface';
import { escapeHtml, formatDate } from '../utils/helpers.js';

type AdDuplicateData = Extract<TelegramEventJob, { type: 'AD_DUPLICATE' }>['data'];
type AdCreatedData = Extract<TelegramEventJob, { type: 'AD_CREATED' }>['data'];
type AdTooCloseData = Extract<TelegramEventJob, { type: 'AD_TOO_CLOSE' }>['data'];
type AdInPastData = Extract<TelegramEventJob, {type: 'AD_IN_PAST'}>['data'];

@Injectable()
export class TelegramBot implements OnModuleInit {
  private readonly bot: Bot;
  private readonly miniAppUrl: string;

  constructor(
    private readonly configService: ConfigService,
  ) {
    console.log('🤖 TelegramBot provider created');
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    const miniAppUrl = this.configService.get<string>('MINI_APP_URL');
  
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is not defined');
    }

    if (!miniAppUrl) {
        throw new Error('MINI_APP_URL is not defined');
    }

    this.bot = new Bot(token);

    this.miniAppUrl = miniAppUrl;
    this.bot = new Bot(token);
    this.registerHandlers(miniAppUrl);

    this.registerHandlers(miniAppUrl);
  }

  private registerHandlers(miniAppUrl: string): void {
    this.bot.command('start', async (ctx) => {
        const keyboard = new InlineKeyboard()
        .webApp(
          '🚗 Open P0Puti.uz',
          miniAppUrl,
        );

      await ctx.reply(
        `🚗 P0Puti.uzga xush kelibsiz

Uzoq masofalarga ketish uchun odamlarni birlashtiramiz

Siz:
• Haydovchilarni topasiz yoki haydovchilar sizni topishadi
• E'lonlar yaratasiz
• Boshqa insonlar bilan sayohat qilasiz

Olg'a! 🚀`,
        {
          reply_markup: keyboard,
        },
      );
    });

    this.bot.command('help', async (ctx) => {
      await ctx.reply(
        `🤝 P0Puti.uz yordam

/start - Botni boshlash
/help - Yordam ko'rsatish`,
      );
    });
  }

  async sendWelcomeMessage(telegramId: string) {
    await this.bot.api.sendMessage(
      telegramId,
      '🎉 P0Puti.uzga xush kelibsiz!',
    );

    console.log('✅ Welcome message sent!');
  }

  async sendAdDuplicateMessage(telegramId: string, data: AdDuplicateData) {
    const text =
    `⚠️ <b>E'lon joylanmadi</b>

    Sizda shu vaqtga allaqachon e'lon mavjud.

    📍 ${escapeHtml(data.from)} → ${escapeHtml(data.to)}
    🗓 ${formatDate(data.date)}, ${data.time} – ${data.arrivalTime}

    Iltimos, boshqa vaqtni tanlang yoki avvalgi e'loningizni tahrirlang.`;

      await this.bot.api.sendMessage(telegramId, text, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard().webApp('🚗 P0Puti.uz ni ochish', this.miniAppUrl),
      });
    }

    async sendAdCreatedMessage(telegramId: string, data: AdCreatedData) {
      const text =
    `✅ <b>E'loningiz joylandi!</b>

    📍 ${escapeHtml(data.from)} → ${escapeHtml(data.to)}
    🗓 ${formatDate(data.date)}, ${data.time}

    Yo'lovchilar sizga tez orada murojaat qilishadi 🚀`;

      await this.bot.api.sendMessage(telegramId, text, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard().webApp("🚗 P0Puti.uz ni ochish", this.miniAppUrl),
      });
    }

    async sendAdTooCloseMessage(telegramId: string, data: AdTooCloseData){
      const text = `⚠️ <b>E'lon joylanmadi</b>
      Sizning oldingi joylashtirgan e'loningizga hali 1 soat bo'lmadi! Iltimos keyinroq urunib ko'ring
      `

      await this.bot.api.sendMessage(telegramId, text, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard().webApp('🚗 P0Puti.uz ni ochish', this.miniAppUrl),
      });
    }

    async sendAdInPastMessage(telegramId: string, data: AdInPastData){
      const text = `⚠️ <b>E'lon joylanmadi</b>
      O'tib ketgan kun yoki vaqt uchun e'lon yarata olmaysiz
      `

      await this.bot.api.sendMessage(telegramId, text, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard().webApp('🚗 P0Puti.uz ni ochish', this.miniAppUrl),
      })
    }

  onModuleInit(): void {
    this.bot.start({
        onStart: (botInfo) => {
        console.log(
            `🤖 Telegram bot started as @${botInfo.username}`,
        );
        },
    }).catch((error) => {
        console.error("❌ Telegram bot failed:", error);
    });
  }
}