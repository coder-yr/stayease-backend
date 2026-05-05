import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const demoBuses = [
  {
    operator: "Zingbus",
    source: "Delhi",
    destination: "Manali",
    departureTime: new Date("2026-10-24T20:00:00Z"),
    arrivalTime: new Date("2026-10-25T09:00:00Z"),
    duration: "13h 00m",
    busType: "AC Sleeper (2+1)",
    price: 1350,
    currency: "INR",
    busNumber: "ZB-1024"
  },
  {
    operator: "IntrCity SmartBus",
    source: "Bangalore",
    destination: "Chennai",
    departureTime: new Date("2026-10-24T23:00:00Z"),
    arrivalTime: new Date("2026-10-25T05:30:00Z"),
    duration: "6h 30m",
    busType: "AC Seater (2+2)",
    price: 890,
    currency: "INR",
    busNumber: "IC-5521"
  },
  {
    operator: "VRL Travels",
    source: "Mumbai",
    destination: "Pune",
    departureTime: new Date("2026-10-24T10:00:00Z"),
    arrivalTime: new Date("2026-10-24T13:30:00Z"),
    duration: "3h 30m",
    busType: "Volvo AC Multi-Axle",
    price: 650,
    currency: "INR",
    busNumber: "VRL-992"
  }
];

async function main() {
  const busNumbers = demoBuses.map((b) => b.busNumber);

  await prisma.bus.deleteMany({
    where: { busNumber: { in: busNumbers } }
  });

  const created = await prisma.$transaction(
    demoBuses.map((b) =>
      prisma.bus.create({
        data: {
          operator: b.operator,
          source: b.source,
          destination: b.destination,
          departureTime: b.departureTime,
          arrivalTime: b.arrivalTime,
          duration: b.duration,
          busType: b.busType,
          price: b.price,
          currency: b.currency,
          busNumber: b.busNumber
        }
      })
    )
  );

  console.log(
    JSON.stringify({ deleted: busNumbers.length, inserted: created.length, numbers: created.map((c) => c.busNumber) }, null, 2)
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
