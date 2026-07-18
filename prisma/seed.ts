import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

// Mesmos parâmetros usados na aplicação (auth.service).
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

async function main() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@covenbeauty.com';
  const password = process.env.ADMIN_PASSWORD ?? 'Coven@Admin123';
  const fullName = process.env.ADMIN_FULL_NAME ?? 'Suma Sacerdotisa';

  const passwordHash = await argon2.hash(password, ARGON2_OPTIONS);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      // Não sobrescreve a senha em execuções repetidas do seed.
      fullName,
      role: Role.ADMIN,
      isActive: true,
      isProfessional: true,
    },
    create: {
      email,
      passwordHash,
      fullName,
      role: Role.ADMIN,
      isProfessional: true,
    },
  });

  console.log(`🧙 Administrador garantido: ${admin.email} (${admin.role})`);
}

main()
  .catch((e) => {
    console.error('❌ Falha no seed:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
