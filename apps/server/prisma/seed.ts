import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await argon2.hash('Password123', { type: argon2.argon2id });

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      displayName: 'MeCHAT Admin',
      email: 'admin@mechat.app',
      passwordHash,
      isAdmin: true,
      emailVerifiedAt: new Date(),
      bio: 'Platform administrator',
      settings: { create: {} },
    },
  });

  const alice = await prisma.user.upsert({
    where: { username: 'alice' },
    update: {},
    create: {
      username: 'alice',
      displayName: 'Alice Johnson',
      email: 'alice@mechat.app',
      passwordHash,
      emailVerifiedAt: new Date(),
      bio: 'Hey there, I am using MeCHAT!',
      settings: { create: {} },
    },
  });

  const bob = await prisma.user.upsert({
    where: { username: 'bob' },
    update: {},
    create: {
      username: 'bob',
      displayName: 'Bob Smith',
      email: 'bob@mechat.app',
      passwordHash,
      emailVerifiedAt: new Date(),
      bio: 'Available',
      settings: { create: {} },
    },
  });

  const existingChat = await prisma.chat.findFirst({
    where: { type: 'DIRECT', AND: [{ participants: { some: { userId: alice.id } } }, { participants: { some: { userId: bob.id } } }] },
  });

  if (!existingChat) {
    await prisma.chat.create({
      data: {
        type: 'DIRECT',
        createdById: alice.id,
        participants: { create: [{ userId: alice.id }, { userId: bob.id }] },
      },
    });
  }

  console.log('Seed complete:');
  console.log(`  admin / Password123 (${admin.email})`);
  console.log(`  alice / Password123 (${alice.email})`);
  console.log(`  bob   / Password123 (${bob.email})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
