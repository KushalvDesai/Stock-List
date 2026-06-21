const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const res = await prisma.notification.deleteMany({
    where: { userId: null, role: { in: ['staff', 'owner'] } }
  });
  console.log('Deleted:', res.count);
}
main().catch(console.error).finally(() => prisma.$disconnect());
