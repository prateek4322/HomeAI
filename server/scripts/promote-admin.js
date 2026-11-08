import "dotenv/config";
import { prisma } from "../config/database.js";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
try {
  if (!email) throw new Error("Set ADMIN_EMAIL in the server environment first.");
  const existing = await prisma.user.findUnique({
    where: { email }, select: { id: true, name: true, email: true, role: true },
  });
  if (!existing) throw new Error(`No account found for ${email}. Sign up normally first.`);
  const admin = await prisma.user.update({
    where: { id: existing.id }, data: { role: "ADMIN" },
    select: { id: true, name: true, email: true, role: true },
  });
  console.log("Admin role assigned:", admin);
} catch (error) {
  console.error("ADMIN PROMOTION FAILED:", error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
