import { PrismaClient } from "@prisma/client";

import { gestecCostCenters } from "../prisma/gestec-cost-centers.mjs";

const prisma = new PrismaClient();

function normalizeName(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

async function main() {
  let created = 0;
  let updated = 0;

  for (const costCenter of gestecCostCenters) {
    const existing = await prisma.costCenter.findUnique({
      where: { code: costCenter.code },
      select: { id: true },
    });

    await prisma.costCenter.upsert({
      where: { code: costCenter.code },
      create: {
        code: costCenter.code,
        name: costCenter.name,
        normalizedName: normalizeName(costCenter.name),
        active: true,
      },
      update: {
        name: costCenter.name,
        normalizedName: normalizeName(costCenter.name),
        active: true,
      },
    });

    if (existing) updated += 1;
    else created += 1;
  }

  console.table({
    catalog: gestecCostCenters.length,
    created,
    updated,
  });
}

main()
  .catch((error) => {
    console.error("Não foi possível restaurar os centros de custo.", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
