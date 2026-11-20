import { JwtPayload } from 'jsonwebtoken';

export interface AuthUser {
    sub: bigint;
    telegramId: bigint;
}

declare global {
    namespace Express {
        interface Request {
            user: AuthUser;
        }
    }
}