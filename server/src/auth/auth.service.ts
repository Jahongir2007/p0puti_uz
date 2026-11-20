import { Injectable } from '@nestjs/common';
import { TelegramService } from '../telegram/telegram.service.js';
import { UserService } from '../user/user.service.js';

@Injectable()
export class AuthService {
    constructor(
        private readonly telegramService: TelegramService,
        private readonly userService: UserService
    ) {}

    async authenticateTelegram(initData: string) {
        console.log("Receiving initData:", initData);
        const telegramUser = this.telegramService.validateInitData(initData);
        
        const user = await this.userService.createOrFindUserFromTelegram(telegramUser);
        
        return { user }
    }
}