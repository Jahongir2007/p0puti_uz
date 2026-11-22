import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TelegramWorkerModule } from "./workers/telegram/telegram.module.js";
import { validateEnv } from "./config/env.validation.js";

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        TelegramWorkerModule
    ]
})
export class BotModule {}