import { PrismaClient } from "@prisma/client";
let prismaInstance = null;
const prisma = new Proxy({}, {
    get: (_target, prop) => {
        if (!prismaInstance) {
            try {
                console.log("Initializing PrismaClient...");
                prismaInstance = new PrismaClient({
                    log: ['query', 'info', 'warn', 'error'],
                });
            }
            catch (e) {
                console.error("Failed to initialize PrismaClient:", e);
                throw e;
            }
        }
        // Handle $connect, $disconnect, etc.
        const value = prismaInstance[prop];
        if (typeof value === 'function') {
            return value.bind(prismaInstance);
        }
        return value;
    }
});
export default prisma;
