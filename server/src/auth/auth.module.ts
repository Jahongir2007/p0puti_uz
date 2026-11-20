import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { TelegramModule } from '../telegram/telegram.module.js';
import { UserModule } from '../user/user.module.js';

@Module({
  imports: [TelegramModule, UserModule],
  controllers: [AuthController],
  providers: [AuthService]
})
export class AuthModule {}
