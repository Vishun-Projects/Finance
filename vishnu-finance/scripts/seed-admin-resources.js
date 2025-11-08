#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const path = require('node:path');

const prisma = new PrismaClient();

const SUPERUSER_EMAIL = 'vishun@finance.com';
const ADMIN_DOC_STORAGE_KEY = path.join('docs', 'admin-setup.md').replace(/\\/g, '/');

async function ensureSuperuser() {
  const user = await prisma.user.findUnique({
    where: { email: SUPERUSER_EMAIL },
  });

  if (!user) {
    throw new Error(
      `Superuser ${SUPERUSER_EMAIL} not found. Run "npm run setup" first to create core users.`,
    );
  }

  if (user.role !== 'SUPERUSER') {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'SUPERUSER' },
    });
  }

  return user;
}

async function seedPortalDocument(superuser) {
  const existing = await prisma.document.findFirst({
    where: {
      storageKey: ADMIN_DOC_STORAGE_KEY,
    },
  });

  if (existing) {
    return existing;
  }

  const document = await prisma.document.create({
    data: {
      ownerId: null,
      uploadedById: superuser.id,
      originalName: 'Admin Setup Guide',
      storageKey: ADMIN_DOC_STORAGE_KEY,
      mimeType: 'text/markdown',
      visibility: 'ORGANIZATION',
      sourceType: 'PORTAL_RESOURCE',
      metadata: JSON.stringify({
        summary: 'Overview of superuser features and onboarding steps.',
      }),
    },
  });

  console.log('✅ Created portal document seed:', document.originalName);
  return document;
}

async function seedBankMapping(superuser) {
  const mapping = await prisma.bankFieldMapping.findFirst({
    where: {
      bankCode: 'HDFC',
      fieldKey: 'date_iso',
    },
  });

  if (mapping) {
    return mapping;
  }

  const created = await prisma.bankFieldMapping.create({
    data: {
      bankCode: 'HDFC',
      fieldKey: 'date_iso',
      mappedTo: 'transactionDate',
      description: 'Maps parsed ISO date from HDFC statements to the transaction date.',
      version: 1,
      isActive: true,
      mappingConfig: JSON.stringify({
        parseFormat: 'yyyy-MM-dd',
        timezone: 'Asia/Kolkata',
      }),
      createdById: superuser.id,
    },
  });

  console.log('✅ Created sample bank field mapping for HDFC/date_iso');
  return created;
}

async function main() {
  try {
    const superuser = await ensureSuperuser();
    await seedPortalDocument(superuser);
    await seedBankMapping(superuser);
    console.log('🎉 Admin resources seeded successfully.');
  } catch (error) {
    console.error('❌ Failed to seed admin resources:', error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();

