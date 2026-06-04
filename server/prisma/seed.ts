import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Running database seed...');

  // Check if any admin already exists
  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'admin' },
  });

  if (existingAdmin) {
    console.log('✅ Admin user already exists in the database. Skipping seed.');
    return;
  }

  // Create default admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  await prisma.user.create({
    data: {
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
    },
  });

  console.log('🎉 Default admin user created successfully!');
  console.log('👉 Username: admin');
  console.log('👉 Password: admin123');
  console.log('⚠️ Please change this password in the Security Dashboard immediately upon logging in.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
