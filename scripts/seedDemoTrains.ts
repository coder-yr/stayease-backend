import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const demoTrains = [
  {
    operator: "Rajdhani Express",
    source: "Delhi",
    destination: "Mumbai",
    departureTime: new Date("2026-10-24T16:30:00Z"),
    arrivalTime: new Date("2026-10-25T08:30:00Z"),
    duration: "16h 00m",
    classType: "1AC",
    price: 4500,
    currency: "INR",
    trainNumber: "12952"
  },
  {
    operator: "Shatabdi Express",
    source: "Delhi",
    destination: "Chandigarh",
    departureTime: new Date("2026-10-24T07:40:00Z"),
    arrivalTime: new Date("2026-10-24T11:05:00Z"),
    duration: "3h 25m",
    classType: "CC",
    price: 1200,
    currency: "INR",
    trainNumber: "12045"
  },
  {
    operator: "Tejas Express",
    source: "Mumbai",
    destination: "Ahmedabad",
    departureTime: new Date("2026-10-24T15:40:00Z"),
    arrivalTime: new Date("2026-10-24T21:55:00Z"),
    duration: "6h 15m",
    classType: "EC",
    price: 2200,
    currency: "INR",
    trainNumber: "82901"
  }
];

async function main() {
  const trainNumbers = demoTrains.map((t) => t.trainNumber);

  await prisma.train.deleteMany({
    where: { trainNumber: { in: trainNumbers } }
  });

  const created = await prisma.$transaction(
    demoTrains.map((t) =>
      prisma.train.create({
        data: {
          operator: t.operator,
          source: t.source,
          destination: t.destination,
          departureTime: t.departureTime,
          arrivalTime: t.arrivalTime,
          duration: t.duration,
          classType: t.classType,
          price: t.price,
          currency: t.currency,
          trainNumber: t.trainNumber
        }
      })
    )
  );

  console.log(
    JSON.stringify({ deleted: trainNumbers.length, inserted: created.length, numbers: created.map((c) => c.trainNumber) }, null, 2)
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
