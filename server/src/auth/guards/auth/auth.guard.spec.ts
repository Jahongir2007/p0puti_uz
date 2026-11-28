import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard.js';

const jwt = new JwtService({ secret: 's'.repeat(32) });
const guard = new AuthGuard(jwt);

const contextWith = (authorization?: string) => {
    const request: any = { headers: authorization ? { authorization } : {} };
    return { request, context: { switchToHttp: () => ({ getRequest: () => request }) } as any };
};

const messageOf = async (authorization?: string) => {
    try {
        await guard.canActivate(contextWith(authorization).context);
        return null;
    } catch (err) {
        expect(err).toBeInstanceOf(UnauthorizedException);
        return (err as Error).message;
    }
};

describe('AuthGuard', () => {
    it('lets a valid token through and puts its payload on request.user', async () => {
        const token = jwt.sign({ sub: '42', telegramId: '700000001' });
        const { request, context } = contextWith(`Bearer ${token}`);
        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(request.user).toMatchObject({ sub: '42', telegramId: '700000001' });
    });

    it('rejects a request without an Authorization header', async () => {
        expect(await messageOf()).toBe('Authorization header is missing');
    });

    it('rejects a header that is not "Bearer <token>"', async () => {
        expect(await messageOf('Basic abc')).toBe('Invalid authorization header');
        expect(await messageOf('Bearer')).toBe('Invalid authorization header');
    });

    it('rejects a fake token and one signed with another secret', async () => {
        expect(await messageOf('Bearer not-a-real-token')).toBe('Invalid or expired token');
        const foreign = new JwtService({ secret: 'o'.repeat(32) }).sign({ sub: '42' });
        expect(await messageOf(`Bearer ${foreign}`)).toBe('Invalid or expired token');
    });

    it('rejects an expired token', async () => {
        const expired = jwt.sign({ sub: '42', exp: Math.floor(Date.now() / 1000) - 10 });
        expect(await messageOf(`Bearer ${expired}`)).toBe('Invalid or expired token');
    });
});
