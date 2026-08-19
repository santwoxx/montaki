import { MockPrismaClient } from "./mock-db/client";

const globalForPrisma = globalThis as unknown as {
  prisma: MockPrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new MockPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
