import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "fraruann159@gmail.com";
  const password = "admin";
  
  // Delete existing if any (just in case)
  await prisma.user.deleteMany({ where: { email } });
  
  // Create a default tenant for the superadmin
  const tenant = await prisma.tenant.create({
    data: {
      name: "Nexus Admin",
      phone: "00000000000",
      plan: "enterprise"
    }
  });

  const password_hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      name: "Ruan Gomes",
      password_hash,
      role: "superadmin",
      tenant_id: tenant.id
    }
  });

  console.log("Superadmin created!");
  console.log("Email:", user.email);
  console.log("Password:", password);
}

main().catch(console.error).finally(() => prisma.$disconnect());
