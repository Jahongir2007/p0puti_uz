import { Injectable, OnModuleInit } from '@nestjs/common';

import { RabbitMQService } from '../../infrastructure/rabbitmq/rabbitmq.service.js';
import { MetricsService } from '../../infrastructure/metrics/metrics.service.js';
import { db } from '../../prisma/db.js';
import { UserJob } from './type/user-job.type.js';
import { UserUpdateData } from './type/user-update-data.type.js';
import { Varchar } from '@prisma/orm-postgres/target/codec-types';
import { Temporal } from 'temporal-polyfill';

// Telegram leaves out empty fields, so "missing" and null must compare equal
const orNull = <T>(v: T | null | undefined) => v ?? null;

@Injectable()
export class UserWorkerService implements OnModuleInit {
    constructor(
        private readonly rabbitMQ: RabbitMQService,
        private readonly metrics: MetricsService,
    ){}

    async onModuleInit() {
        await this.rabbitMQ.consume('users', async (job: UserJob) => {
            switch (job.type){
                case 'UPDATE_USER':
                    await this.handleUserUpdate(job);
                    break;
                }
        });
    }

    private async handleUserUpdate(job: UserJob){
        const timer = this.metrics.start(`AdWorker.UPDATE_USER`);
        try{
            const userDataFromLogin = job.data as UserUpdateData;
            const userDataFromDB = await db.orm.public.Users
                .where({ telegramId: BigInt(userDataFromLogin.telegramId) })
                .first();
            
            if(userDataFromDB && (
                userDataFromLogin.firstName !== userDataFromDB.firstName ||
                orNull(userDataFromLogin.lastName) !== orNull(userDataFromDB.lastName) ||
                orNull(userDataFromLogin.username) !== orNull(userDataFromDB.username) ||
                orNull(userDataFromLogin.photoUrl) !== orNull(userDataFromDB.photoUrl)
            )){
                await db.orm.public.Users
                    .where({ telegramId: BigInt(userDataFromLogin.telegramId) })
                    .update({
                        firstName: userDataFromLogin.firstName as Varchar<255>,
                        lastName: orNull(userDataFromLogin.lastName) as Varchar<255> | null,
                        username: orNull(userDataFromLogin.username) as Varchar<255> | null,
                        photoUrl: orNull(userDataFromLogin.photoUrl),
                        updatedAt: Temporal.Now.instant()
                    }) 
            }
        }catch(err: unknown){
            console.error('Error in AdWorker.UPDATE_USER:', err);
        }finally{
            timer.end();
        }
    }
}
