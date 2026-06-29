import { prisma } from "../apps/api/src/shared/db/prisma.js";
import { writePayment } from "../apps/api/src/modules/payments/payments.repository.js";
import { buildCasePayments } from "../apps/api/src/modules/payments/payments.service.js";
import { hashPassword } from "../apps/api/src/shared/security/password.js";

const count = 15;

const names = [
  "Ana Martins",
  "Bruno Ferreira",
  "Carla Souza",
  "Daniel Ribeiro",
  "Eduarda Lima",
  "Fabio Gomes",
  "Gabriela Rocha",
  "Henrique Alves",
  "Isabela Costa",
  "Joao Pereira",
  "Karina Nunes",
  "Lucas Almeida",
  "Marina Teixeira",
  "Nicolas Barros",
  "Olivia Mendes",
];

const caseTitles = [
  "Defesa criminal em inquerito",
  "Acompanhamento de audiencia",
  "Revisao de medidas cautelares",
  "Pedido de liberdade provisoria",
  "Resposta a acusacao",
  "Habeas corpus preventivo",
  "Execucao penal",
  "Recurso em sentido estrito",
  "Apelacao criminal",
  "Queixa-crime",
  "Acordo de nao persecucao penal",
  "Investigacao defensiva",
  "Pedido de revogacao de prisao",
  "Memoriais defensivos",
  "Sustentacao oral",
];

const statuses = ["ACTIVE", "ON_HOLD", "CLOSED", "CANCELED"] as const;
const stages = [
  "INITIAL",
  "HEARING_SCHEDULED",
  "WAITING_DECISION",
  "APPEAL",
  "ENFORCEMENT",
] as const;
const timelineTypes = [
  "NOTE",
  "HEARING",
  "PETITION",
  "DECISION",
  "STATUS_CHANGE",
  "OTHER",
] as const;
const deadlineStatuses = [
  "PENDING",
  "PENDING",
  "PENDING",
  "DONE",
  "CANCELED",
] as const;

const timelineTitles = [
  "Cliente enviou documentos",
  "Audiência designada",
  "Petição protocolada",
  "Decisão publicada",
  "Status do processo revisado",
  "Contato com cartório",
];

const pad = (value: number, length: number) =>
  String(value).padStart(length, "0");
const date = (monthOffset: number, day: number) => {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, day),
  );
};

async function seed() {
  const passwordHash = await hashPassword("demo1234");

  const users = await Promise.all(
    names.map((name, index) =>
      prisma.user.upsert({
        where: { email: `demo.user.${index + 1}@jurisflow.local` },
        update: {
          name,
          role:
            index % 5 === 0
              ? "ADMIN"
              : index % 4 === 0
                ? "ASSISTANT"
                : "LAWYER",
          status: "ACTIVE",
        },
        create: {
          name,
          email: `demo.user.${index + 1}@jurisflow.local`,
          passwordHash,
          role:
            index % 5 === 0
              ? "ADMIN"
              : index % 4 === 0
                ? "ASSISTANT"
                : "LAWYER",
          status: "ACTIVE",
        },
      }),
    ),
  );

  const clients = await Promise.all(
    names.map((name, index) =>
      prisma.client.upsert({
        where: { document: `9000000000${pad(index + 1, 3)}` },
        update: {
          name: index % 3 === 0 ? `${name} Advocacia Teste` : name,
          status: index % 7 === 0 ? "INACTIVE" : "ACTIVE",
          phone: `1198${pad(index + 1, 7)}`,
          email: `demo.client.${index + 1}@jurisflow.local`,
          address: `Rua Demo ${index + 1}, ${100 + index}`,
          notes: "[DEMO] Cliente criado para testes locais.",
        },
        create: {
          type: index % 3 === 0 ? "COMPANY" : "INDIVIDUAL",
          status: index % 7 === 0 ? "INACTIVE" : "ACTIVE",
          name: index % 3 === 0 ? `${name} Advocacia Teste` : name,
          document: `9000000000${pad(index + 1, 3)}`,
          phone: `1198${pad(index + 1, 7)}`,
          email: `demo.client.${index + 1}@jurisflow.local`,
          address: `Rua Demo ${index + 1}, ${100 + index}`,
          notes: "[DEMO] Cliente criado para testes locais.",
        },
      }),
    ),
  );

  const cases = await Promise.all(
    clients.map((client, index) =>
      prisma.case.upsert({
        where: { cnjNumber: `000${pad(index + 1, 4)}9820268260100` },
        update: {
          clientId: client.id,
          responsibleUserId: users[index % users.length].id,
          title: `[DEMO] ${caseTitles[index]}`,
          status: statuses[index % statuses.length],
          stage: stages[index % stages.length],
          legalArea: "CRIMINAL",
          opposingParty: `Parte contraria ${index + 1}`,
          court: "TJSP",
          jurisdiction: "Sao Paulo",
          division: `${index + 1}a Vara Criminal`,
          description: "Processo de demonstracao para testes de fluxo.",
          openedAt: date(-index, 5),
          closedAt:
            statuses[index % statuses.length] === "CLOSED" ? date(0, 20) : null,
          totalFeeAmountCents: 300000 + index * 50000,
          createdAt: date(0, 5),
        },
        create: {
          clientId: client.id,
          responsibleUserId: users[index % users.length].id,
          caseType: "JUDICIAL",
          title: `[DEMO] ${caseTitles[index]}`,
          cnjNumber: `000${pad(index + 1, 4)}9820268260100`,
          status: statuses[index % statuses.length],
          stage: stages[index % stages.length],
          legalArea: "CRIMINAL",
          opposingParty: `Parte contraria ${index + 1}`,
          court: "TJSP",
          jurisdiction: "Sao Paulo",
          division: `${index + 1}a Vara Criminal`,
          description: "Processo de demonstracao para testes de fluxo.",
          openedAt: date(-index, 5),
          closedAt:
            statuses[index % statuses.length] === "CLOSED" ? date(0, 20) : null,
          totalFeeAmountCents: 300000 + index * 50000,
          createdAt: date(0, 5),
        },
      }),
    ),
  );

  await prisma.payment.deleteMany({
    where: { description: { startsWith: "[DEMO]" } },
  });
  await prisma.document.deleteMany({
    where: { name: { startsWith: "[DEMO]" } },
  });
  await prisma.caseTimelineEvent.deleteMany({
    where: { title: { startsWith: "[DEMO]" } },
  });
  await prisma.caseDeadline.deleteMany({
    where: { title: { startsWith: "[DEMO]" } },
  });

  const generatedPayments = cases.flatMap((item, index) => {
    const totalFeeAmountCents = 300000 + index * 50000;
    const entryAmountCents = 50000 + (index % 3) * 25000;
    const installmentAmountCents = 50000 + (index % 4) * 25000;
    const firstDueDate = date(1, 10 + (index % 12))
      .toISOString()
      .slice(0, 10);
    return buildCasePayments(
      item.id,
      item.clientId,
      {
        totalFeeAmountCents,
        entryAmountCents,
        installmentAmountCents,
        firstDueDate,
        entryPaymentMethod: "pix",
      },
      item.createdAt,
    ).map((payment) => ({
      ...payment,
      description: `[DEMO] ${payment.description}`,
      notes: "[DEMO] Cronograma financeiro completo.",
    }));
  });

  await prisma.payment.createMany({
    data: generatedPayments.map(writePayment),
  });

  await prisma.document.createMany({
    data: cases.map((item, index) => ({
      clientId: item.clientId,
      caseId: item.id,
      name: `[DEMO] Documento ${index + 1}.pdf`,
      path: `demo/client-${index + 1}/documento-${index + 1}.pdf`,
      mimeType: "application/pdf",
    })),
  });

  await prisma.caseTimelineEvent.createMany({
    data: cases.flatMap((item, caseIndex) =>
      [0, 1, 2].map((eventIndex) => {
        const type =
          timelineTypes[(caseIndex + eventIndex) % timelineTypes.length];
        return {
          caseId: item.id,
          createdByUserId: users[(caseIndex + eventIndex) % users.length].id,
          type,
          title: `[DEMO] ${timelineTitles[(caseIndex + eventIndex) % timelineTitles.length]}`,
          description: `[DEMO] Registro de andamento para validar a linha do tempo do processo ${item.title}.`,
          occurredAt: date(-eventIndex, 8 + ((caseIndex + eventIndex) % 18)),
        };
      }),
    ),
  });

  await prisma.caseDeadline.createMany({
    data: cases.flatMap((item, index) =>
      [0, 1].map((deadlineIndex) => {
        const status =
          deadlineStatuses[(index + deadlineIndex) % deadlineStatuses.length];
        return {
          caseId: item.id,
          title: `[DEMO] ${deadlineIndex === 0 ? "Protocolar manifestação" : "Conferir publicação"}`,
          description:
            "[DEMO] Prazo criado para validar alertas de vencimento.",
          dueAt: date(
            index % 4 === 0 ? -1 : deadlineIndex,
            6 + ((index + deadlineIndex) % 18),
          ),
          status,
          completedAt: status === "DONE" ? date(0, 12) : null,
        };
      }),
    ),
  });

  console.log(
    `Seeded ${count} users, clients, cases, payments, documents, timeline events, and deadlines.`,
  );
  console.log("Demo login: demo.user.1@jurisflow.local / demo1234");
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
