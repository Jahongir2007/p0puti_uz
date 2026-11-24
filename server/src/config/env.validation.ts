import { plainToInstance } from 'class-transformer';
import { Matches, MinLength, IsIn, IsInt, Min, Max, IsOptional, IsString, validateSync } from "class-validator";

class EnvironmentVariables {
    @Matches(/^postgres(ql)?:\/\/.+/, {
        message: 'DATABASE_URL must look like postgresql://user:password@host:5432/db'
    })
    DATABASE_URL: string;

    @Matches(/^amqps?:\/\/.+/, { 
        message: 'RABBITMQ_URL must look like amqp://user:password@host:5672' 

    })
    RABBITMQ_URL: string;

    @MinLength(32, { message: 'JWT_SECRET must be at least 32 characters (generate one, see .env.example)' })
    JWT_SECRET: string;

    @Matches(/^\d+:[A-Za-z0-9_-]+$/, { message: 'TELEGRAM_BOT_TOKEN must be the token from @BotFather, like 123456789:AAE...' })
    TELEGRAM_BOT_TOKEN: string;

    @Matches(/^https:\/\/.+/, { message: 'MINI_APP_URL must be the https:// address of the mini app' })
    MINI_APP_URL: string;

    @Matches(/^https?:\/\/[^/,\s]+(,\s*https?:\/\/[^/,\s]+)*$/, {
        message: 'ALLOWED_ORIGINS must be a comma-separated list like https://p0puti.uz,http://localhost:5173',
    })
    ALLOWED_ORIGINS: string;

    @IsIn(['sync', 'async'], { message: 'AD_WRITE_MODE must be "sync" or "async"' })
    AD_WRITE_MODE: 'sync' | 'async' = 'async';

    @IsInt()
    @Min(1)
    @Max(65535)
    PORT: number = 3000;

    @IsOptional()
    @IsString()
    EXPIRE_ADS_CRON?: string;
}

export function validateEnv(config: Record<string, unknown>) {
    const env = plainToInstance(EnvironmentVariables, config, { enableImplicitConversion: true });
    const errors = validateSync(env);

    if (errors.length > 0) {
        const problems = errors.flatMap((e) =>
            Object.values(e.constraints ?? {}).map((msg) =>
                msg.startsWith(e.property) ? msg : `${e.property}: ${msg}`,
            ),
        );
        throw new Error(`Invalid environment variables:\n  - ${problems.join('\n  - ')}`);
    }

    return env;
}

export const parseOrigins = (value: string) => value.split(',').map((o) => o.trim()).filter(Boolean);