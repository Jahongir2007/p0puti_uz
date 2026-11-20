import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TelegramWorkerModule } from "./workers/telegram/telegram.module.js";

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TelegramWorkerModule
    ]
})
export class BotModule {}