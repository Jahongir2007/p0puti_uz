import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { UserModule } from '../user/user.module.js';
import { TelegramAuthModule } from '../telegram/telegram-auth.module.js';

@Module({
  imports: [TelegramAuthModule, UserModule],
  controllers: [AuthController],
  providers: [AuthService]
})
export class AuthModule {}
