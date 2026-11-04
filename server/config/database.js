import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

export const prisma = new PrismaClient({ adapter });

export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log("PostgreSQL Connected Successfully");
  } catch (error) {
    console.error("Database Connection Failed:", error);
    process.exit(1);
  }
}