import { prisma } from "../apps/api/src/shared/db/prisma.js";

// Seeds sample process-update notifications so the bell/popover and the
// notifications page can be exercised in the frontend.
//
// Target user: NOTIFY_USER_EMAIL env, else the demo login, else the first
// active user. Notifications are tagged with the [DEMO] prefix so re-running
// the script replaces the previous batch instead of piling up.

const targetEmail = process.env.NOTIFY_USER_EMAIL ?? "demo.user.1@magistrum.local";
const DEMO_PREFIX = "[DEMO]";

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const samples = [
  { newMovements: 3, read: false, ageDays: 0 },
  { newMovements: 1, read: false, ageDays: 0 },
  { newMovements: 5, read: false, ageDays: 1 },
  { newMovements: 2, read: true, ageDays: 3 },
  { newMovements: 1, read: true, ageDays: 6 }
];

async function seed() {
  const user =
    (await prisma.user.findUnique({ where: { email: targetEmail } })) ??
    (await prisma.user.findFirst({ where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" } }));

  if (!user) {
    console.error("No user found. Run `npm run seed:demo` first (or set NOTIFY_USER_EMAIL).");
    process.exitCode = 1;
    return;
  }

  const cases = await prisma.case.findMany({
    where: { cnjNumber: { not: null } },
    orderBy: { updatedAt: "desc" },
    take: samples.length,
    select: { id: true, title: true }
  });

  if (cases.length === 0) {
    console.error("No cases with a CNJ found. Run `npm run seed:demo` first to create sample cases.");
    process.exitCode = 1;
    return;
  }

  // Reset the previous demo batch for this user (idempotent re-runs).
  await prisma.notification.deleteMany({ where: { userId: user.id, title: { startsWith: DEMO_PREFIX } } });

  const data = samples.map((sample, index) => {
    const item = cases[index % cases.length];
    const movementsLabel = sample.newMovements === 1 ? "1 novo andamento" : `${sample.newMovements} novos andamentos`;
    return {
      userId: user.id,
      caseId: item.id,
      title: `${DEMO_PREFIX} Atualização em ${item.title}`,
      body: `${movementsLabel} encontrado(s) no DataJud.`,
      newMovements: sample.newMovements,
      readAt: sample.read ? daysAgo(sample.ageDays) : null,
      createdAt: daysAgo(sample.ageDays)
    };
  });

  const result = await prisma.notification.createMany({ data });
  const unread = data.filter((item) => item.readAt === null).length;

  console.log(`Seeded ${result.count} notifications for ${user.name} <${user.email}> (${unread} unread).`);
  console.log("Log in as this user to see them. Set NOTIFY_USER_EMAIL to target another account.");
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
