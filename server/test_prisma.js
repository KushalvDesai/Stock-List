const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const user = await prisma.user.findUnique({
      where: { username: 'admin' },
    });
    console.log("Success:", user);
  } catch (e) {
    console.log("Error Full Details:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
