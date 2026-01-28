import { PrismaClient } from "@prisma/client";

let prismaInstance: PrismaClient | null = null;

const prisma = new Proxy({} as PrismaClient, {
  get: (_target, prop) => {
    if (!prismaInstance) {
      try {
        console.log("Initializing PrismaClient...");
        prismaInstance = new PrismaClient({
          log: ['query', 'info', 'warn', 'error'],
        });
      } catch (e) {
        console.error("Failed to initialize PrismaClient:", e);
        throw e;
      }
    }
    // Handle $connect, $disconnect, etc.
    const value = (prismaInstance as any)[prop];
    if (typeof value === 'function') {
      return value.bind(prismaInstance);
    }
    return value;
  }
});

export default prisma;
