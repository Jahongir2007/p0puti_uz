import 'reflect-metadata';
import 'dotenv/config';
import { validateEnv } from './env.validation.js';

try{
    validateEnv(process.env);
}catch(err){
    console.error((err as Error).message);
    process.exit(1);
}