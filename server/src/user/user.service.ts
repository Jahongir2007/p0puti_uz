import { Injectable, Inject } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { Varchar } from '@prisma/orm-postgres/target/codec-types';
import { JwtService } from '@nestjs/jwt';
import { RabbitMQService } from '../infrastructure/rabbitmq/rabbitmq.service.js';
import { TelegramEventJob } from '../infrastructure/telegram/telegramEvent.interface.js';

interface TelegramUserData {
    id: number,
    firstName: Varchar<255>,
    lastName?: Varchar<255>,
    username?: Varchar<255>,
    photoUrl?: string
}

@Injectable()
export class UserService {
    
    constructor(
        private readonly rabbitMQ: RabbitMQService,
        private readonly jwtService: JwtService,
    ) {}

    async createOrFindUserFromTelegram(telegramUser: TelegramUserData){
        let user = await db.orm.public.Users.first({
            telegramId: BigInt(telegramUser.id)
        });

        if (!user) {
            user = await db.orm.public.Users.create({
                telegramId: BigInt(telegramUser.id),
                firstName: telegramUser.firstName,
                lastName: telegramUser.lastName,
                username: telegramUser.username,
                photoUrl: telegramUser.photoUrl
            });

            console.log('📤 Emitting user.created');

            this.rabbitMQ.publish('telegram_events', {
                type: 'USER_CREATED',
                data: { telegramId: telegramUser.id.toString() }
            } satisfies TelegramEventJob);
        }

        console.log("Signing JWT token");

        const accessToken = this.jwtService.sign({
            sub: user.id,
            telegramId: telegramUser.id.toString(),
        });

        console.log("JWT token signed:", accessToken);

        return {
            success: true,
            data: {
                user,
                accessToken,
            }
        };
    }
}
