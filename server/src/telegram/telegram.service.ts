import {
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'node:crypto';

@Injectable()
export class TelegramService {

    constructor(
        private readonly configService: ConfigService,
    ) {}

    validateInitData(initData: string) {
        const params = new URLSearchParams(initData);

        const receivedHash = params.get('hash');

        if (!receivedHash) {
            throw new UnauthorizedException(
                'Telegram hash is missing',
            );
        }

        params.delete('hash');

        const dataCheckString = [...params.entries()]
            .sort(([keyA], [keyB]) =>
                keyA.localeCompare(keyB),
            )
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        const botToken = this.configService.getOrThrow<string>(
            'TELEGRAM_BOT_TOKEN',
        );

        const secretKey = crypto
            .createHmac('sha256', 'WebAppData')
            .update(botToken)
            .digest();

        const calculatedHash = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

        const receivedHashBuffer = Buffer.from(
            receivedHash,
            'hex',
        );

        const calculatedHashBuffer = Buffer.from(
            calculatedHash,
            'hex',
        );

        if (
            receivedHashBuffer.length !==
                calculatedHashBuffer.length ||
            !crypto.timingSafeEqual(
                receivedHashBuffer,
                calculatedHashBuffer,
            )
        ) {
            console.log('Invalid Telegram initData');
            throw new UnauthorizedException(
                'Invalid Telegram initData',
            );
        }

        const authDate = params.get('auth_date');

        if (!authDate) {
            console.log('Telegram auth_date is missing');
            throw new UnauthorizedException(
                'Telegram auth_date is missing',
            );
        }

        const authTimestamp = Number(authDate);
        const now = Math.floor(Date.now() / 1000);

        const maxAge = 60 * 60 * 24; // 1 day in seconds

        if (
            !Number.isFinite(authTimestamp) ||
            authTimestamp > now + 60 ||
            now - authTimestamp > maxAge
        ) {
            console.log('Telegram initData has expired');
            throw new UnauthorizedException(
                'Telegram initData has expired',
            );
        }

        const userData = params.get('user');

        if (!userData) {
            console.log('Telegram user is missing');
            throw new UnauthorizedException(
                'Telegram user is missing',
            );
        }

        try {
            const user = JSON.parse(userData);

            return {
                id: user.id,
                firstName: user.first_name,
                lastName: user.last_name,
                username: user.username,
                photoUrl: user.photo_url,
            };
        } catch {
            console.log('Invalid Telegram user data');
            throw new UnauthorizedException(
                'Invalid Telegram user data',
            );
        }
    }
}