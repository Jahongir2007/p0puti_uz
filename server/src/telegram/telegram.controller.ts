import { Controller, Get } from '@nestjs/common';
import { TelegramService } from './telegram.service.js';

@Controller()
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Get('/telegram/auth/me')
  async getTelegramUserData(){
    
  }
}
