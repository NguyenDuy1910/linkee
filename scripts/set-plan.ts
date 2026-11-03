/**
 * Operator utility (no payment gateway exists yet): grant or revoke Linkee Pro.
 *   npm run plan:set -- user@example.com PRO
 *   npm run plan:set -- user@example.com FREE
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

async function main() {
  const [email, plan] = process.argv.slice(2);
  if (!email || (plan !== "PRO" && plan !== "FREE")) {
    console.error("Usage: npm run plan:set -- <email> <PRO|FREE>");
    process.exit(1);
  }
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const user = await db.user.update({ where: { email: email.toLowerCase() }, data: { plan } });
    console.log(`${user.email} is now on ${user.plan}`);
  } catch {
    console.error(`No user with email ${email}`);
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

void main();
