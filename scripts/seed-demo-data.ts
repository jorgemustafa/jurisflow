import { prisma } from "../apps/api/src/shared/db/prisma.js";
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
  "Olivia Mendes"
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
  "Sustentacao oral"
];

const statuses = ["ACTIVE", "ON_HOLD", "CLOSED", "CANCELED"] as const;
const stages = ["INITIAL", "HEARING_SCHEDULED", "WAITING_DECISION", "APPEAL", "ENFORCEMENT"] as const;
const methods = ["PIX", "CASH", "BANK_TRANSFER", "CREDIT_CARD", "DEBIT_CARD", "BOLETO", "OTHER"] as const;

const pad = (value: number, length: number) => String(value).padStart(length, "0");
const date = (monthOffset: number, day: number) => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, day));
};

async function seed() {
  const passwordHash = await hashPassword("demo1234");

  const users = await Promise.all(
    names.map((name, index) =>
      prisma.user.upsert({
        where: { email: `demo.user.${index + 1}@jurisflow.local` },
        update: {
          name,
          role: index % 5 === 0 ? "ADMIN" : index % 4 === 0 ? "ASSISTANT" : "LAWYER",
          status: "ACTIVE"
        },
        create: {
          name,
          email: `demo.user.${index + 1}@jurisflow.local`,
          passwordHash,
          role: index % 5 === 0 ? "ADMIN" : index % 4 === 0 ? "ASSISTANT" : "LAWYER",
          status: "ACTIVE"
        }
      })
    )
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
          notes: "[DEMO] Cliente criado para testes locais."
        },
        create: {
          type: index % 3 === 0 ? "COMPANY" : "INDIVIDUAL",
          status: index % 7 === 0 ? "INACTIVE" : "ACTIVE",
          name: index % 3 === 0 ? `${name} Advocacia Teste` : name,
          document: `9000000000${pad(index + 1, 3)}`,
          phone: `1198${pad(index + 1, 7)}`,
          email: `demo.client.${index + 1}@jurisflow.local`,
          address: `Rua Demo ${index + 1}, ${100 + index}`,
          notes: "[DEMO] Cliente criado para testes locais."
        }
      })
    )
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
          closedAt: statuses[index % statuses.length] === "CLOSED" ? date(0, 20) : null,
          totalFeeAmountCents: 300000 + index * 50000
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
          closedAt: statuses[index % statuses.length] === "CLOSED" ? date(0, 20) : null,
          totalFeeAmountCents: 300000 + index * 50000
        }
      })
    )
  );

  await prisma.payment.deleteMany({ where: { description: { startsWith: "[DEMO]" } } });
  await prisma.document.deleteMany({ where: { name: { startsWith: "[DEMO]" } } });

  await prisma.payment.createMany({
    data: cases.map((item, index) => {
      const paid = index % 4 === 0;
      const canceled = index % 11 === 0;
      return {
        clientId: item.clientId,
        caseId: item.id,
        source: index % 2 === 0 ? "GENERATED" : "MANUAL",
        description: `[DEMO] Honorarios ${index + 1}`,
        amountCents: 75000 + index * 12500,
        dueDate: date(index % 6 === 0 ? -1 : index % 4, 10 + (index % 12)),
        paidAt: paid ? date(0, 12 + (index % 10)) : null,
        paymentMethod: paid ? methods[index % methods.length] : null,
        status: canceled ? "CANCELED" : paid ? "PAID" : "PENDING",
        installmentNumber: (index % 5) + 1,
        installmentTotal: 5,
        notes: "[DEMO] Pagamento criado para validar a tela financeira.",
        canceledAt: canceled ? date(0, 15) : null,
        cancelReason: canceled ? "Registro de teste cancelado" : null
      };
    })
  });

  await prisma.document.createMany({
    data: cases.map((item, index) => ({
      clientId: item.clientId,
      caseId: item.id,
      name: `[DEMO] Documento ${index + 1}.pdf`,
      path: `demo/client-${index + 1}/documento-${index + 1}.pdf`,
      mimeType: "application/pdf"
    }))
  });

  console.log(`Seeded ${count} users, clients, cases, payments, and documents.`);
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
