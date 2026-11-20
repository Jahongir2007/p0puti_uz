import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { db } from '../../prisma/db.js';

@Injectable()
export class DbWarmup implements OnModuleInit, OnModuleDestroy {
    async onModuleInit() {
        await db.orm.public.Ads.first();   // builds the pool + opens a real connection
    }

    async onModuleDestroy() {
        await db.close();                  // clean shutdown now that idle timeout is 0
    }
}