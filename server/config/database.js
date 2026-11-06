import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis;

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  max: 2,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,
});

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
  });

globalForPrisma.prisma = prisma;