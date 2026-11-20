import 'dotenv/config';
import "temporal-polyfill/full/global";
import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

export const db = postgres<Contract>({
  contractJson,
  url: process.env['DATABASE_URL']!,
  poolOptions: {
    idleTimeoutMillis: 0,          // keep the warm connection alive
    connectionTimeoutMillis: 5000, // fail fast instead of hanging forever
  },
});
