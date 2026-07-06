import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

const globalForPrisma = globalThis;

let prisma;

if (!globalForPrisma.__prisma) {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({
    connectionString,
    ssl: connectionString?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
  });
  const adapter = new PrismaPg(pool);
  globalForPrisma.__prisma = new PrismaClient({ adapter });
}

prisma = globalForPrisma.__prisma;

export default prisma;
