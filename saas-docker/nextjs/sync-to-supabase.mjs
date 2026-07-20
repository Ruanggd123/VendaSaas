import { PrismaClient } from '@prisma/client';

async function withPrisma(url, fn) {
  process.env.DATABASE_URL = url;
  const prisma = new PrismaClient();
  try {
    return await fn(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const LOCAL_URL = "postgresql://admin:MudeEstaSenhaAgora@2026@localhost:5432/saas";
  const SUPABASE_URL = "postgresql://postgres:kXBhJUxvo7kPLqVM@db.wegpjbirwhuiahrhsiyl.supabase.co:5432/postgres";

  const localData = await withPrisma(LOCAL_URL, async (p) => {
    const tenants = await p.$queryRawUnsafe("SELECT * FROM tenants");
    const users = await p.$queryRawUnsafe("SELECT * FROM users");
    const partners = await p.$queryRawUnsafe("SELECT * FROM partners");
    const leads = await p.$queryRawUnsafe("SELECT * FROM leads");
    const sales = await p.$queryRawUnsafe("SELECT * FROM sales");
    const appointments = await p.$queryRawUnsafe("SELECT * FROM appointments");
    return { tenants, users, partners, leads, sales, appointments };
  });

  const nexusTenant = localData.tenants.find(t => t.name === "Nexus AI");
  const nexusUsers = localData.users.filter(u => u.tenant_id === nexusTenant.id);
  const nexusPartners = localData.partners.filter(p => p.tenant_id === nexusTenant.id);
  const nexusLeads = localData.leads.filter(l => l.tenant_id === nexusTenant.id);
  const nexusSales = localData.sales.filter(s => s.tenant_id === nexusTenant.id);
  const nexusAppts = localData.appointments.filter(a => a.tenant_id === nexusTenant.id);

  console.log(`Local Nexus AI: ${nexusUsers.length} users, ${nexusPartners.length} partners, ${nexusLeads.length} leads, ${nexusSales.length} sales, ${nexusAppts.length} appointments`);

  await withPrisma(SUPABASE_URL, async (p) => {
    const prodTenants = await p.$queryRawUnsafe("SELECT * FROM tenants");
    const prodTenant = prodTenants[0];
    console.log(`Prod: "${prodTenant.name}" (${prodTenant.id})`);

    // 1. Sync tenant settings
    await p.$executeRawUnsafe(
      `UPDATE tenants SET settings = $1::jsonb, plan = $2, phone = $3, name = $4 WHERE id = $5`,
      typeof nexusTenant.settings === 'string' ? nexusTenant.settings : JSON.stringify(nexusTenant.settings),
      nexusTenant.plan, nexusTenant.phone,
      nexusTenant.name, prodTenant.id
    );
    console.log("✓ Tenant synced");

    // 2. Sync partners
    for (const partner of nexusPartners) {
      const exists = await p.$queryRawUnsafe("SELECT id FROM partners WHERE email = $1", partner.email);
      if (exists.length === 0) {
        await p.$executeRawUnsafe(
          `INSERT INTO partners (id, tenant_id, name, email, "whatsappNumber", "referralCode", "commissionRate", created_at, updated_at, password_hash, trial_ends_at, access_expires_at, settings)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)`,
          partner.id, prodTenant.id, partner.name, partner.email,
          partner.whatsappNumber, partner.referralCode, partner.commissionRate,
          partner.created_at, partner.updated_at, partner.password_hash,
          partner.trial_ends_at, partner.access_expires_at,
          typeof partner.settings === 'string' ? partner.settings : JSON.stringify(partner.settings || {})
        );
        console.log(`✓ Partner "${partner.name}" created`);
      }
    }

    // 3. Sync users
    const prodUsers = await p.$queryRawUnsafe("SELECT * FROM users");
    for (const u of nexusUsers) {
      const existing = prodUsers.find(pu => pu.email === u.email);
      if (existing) {
        await p.$executeRawUnsafe(
          `UPDATE users SET name = $1, role = $2, password_hash = $3, tenant_id = $4 WHERE id = $5`,
          u.name, u.role, u.password_hash, prodTenant.id, existing.id
        );
        console.log(`✓ User "${u.email}" updated`);
      } else {
        await p.$executeRawUnsafe(
          `INSERT INTO users (id, tenant_id, email, password_hash, role, name) VALUES ($1, $2, $3, $4, $5, $6)`,
          u.id, prodTenant.id, u.email, u.password_hash, u.role, u.name
        );
        console.log(`✓ User "${u.email}" created`);
      }
    }

    // 4. Sync leads
    const prodLeads = await p.$queryRawUnsafe("SELECT phone FROM leads WHERE tenant_id = $1", prodTenant.id);
    const prodLeadPhones = new Set(prodLeads.map(l => l.phone));
    let leadCount = 0;
    for (const lead of nexusLeads) {
      if (lead.phone && prodLeadPhones.has(lead.phone)) continue;
      await p.$executeRawUnsafe(
        `INSERT INTO leads (id, tenant_id, conversation_id, name, phone, email, status, interested_product, value, category, city, estado, source, "lastContactedAt", "nextContactAt", "contactAttempts", partner_id, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
        lead.id, prodTenant.id, null, lead.name, lead.phone,
        lead.email, lead.status, lead.interested_product, lead.value,
        lead.category, lead.city, lead.estado, lead.source,
        lead.lastContactedAt, lead.nextContactAt, lead.contactAttempts,
        null, lead.notes, lead.created_at
      );
      leadCount++;
    }
    console.log(`✓ ${leadCount} leads synced`);

    // 5. Sync sales
    const prodSales = await p.$queryRawUnsafe("SELECT payment_id FROM sales WHERE tenant_id = $1", prodTenant.id);
    const prodSalePayIds = new Set(prodSales.map(s => s.payment_id).filter(Boolean));
    let saleCount = 0;
    for (const sale of nexusSales) {
      if (sale.payment_id && prodSalePayIds.has(sale.payment_id)) continue;
      await p.$executeRawUnsafe(
        `INSERT INTO sales (id, tenant_id, lead_id, product_name, amount, status, payment_link, payment_id, subscription_id, is_recurring, due_date, paid_at, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        sale.id, prodTenant.id, sale.lead_id, sale.product_name, sale.amount,
        sale.status, sale.payment_link, sale.payment_id, sale.subscription_id,
        sale.is_recurring, sale.due_date, sale.paid_at, sale.notes,
        sale.created_at, sale.updated_at
      );
      saleCount++;
    }
    console.log(`✓ ${saleCount} sales synced`);

    // 6. Sync appointments
    const prodApps = await p.$queryRawUnsafe("SELECT id FROM appointments WHERE tenant_id = $1", prodTenant.id);
    const prodAppIds = new Set(prodApps.map(a => a.id));
    let appCount = 0;
    for (const appt of nexusAppts) {
      if (prodAppIds.has(appt.id)) continue;
      await p.$executeRawUnsafe(
        `INSERT INTO appointments (id, tenant_id, lead_id, service_name, duration_min, scheduled_at, status, notes, reminder_sent, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        appt.id, prodTenant.id, appt.lead_id, appt.service_name, appt.duration_min,
        appt.scheduled_at, appt.status, appt.notes, appt.reminder_sent,
        appt.created_at, appt.updated_at
      );
      appCount++;
    }
    console.log(`✓ ${appCount} appointments synced`);
  });

  console.log("\n✅ Sync complete!");
}

main().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
