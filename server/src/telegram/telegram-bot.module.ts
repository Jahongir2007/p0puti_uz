import { Module } from "@nestjs/common";
import { TelegramBot } from "./telegram.bot.js";

@Module({
    providers: [TelegramBot],
    exports: [TelegramBot]
})
export class TelegramBotModule {}