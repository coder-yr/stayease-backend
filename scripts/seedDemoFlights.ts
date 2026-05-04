import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const demoFlights = [
  {
    externalId: "FL-DEL-BOM-001",
    airline: "IndiGo",
    source: "Delhi",
    destination: "Mumbai",
    departureTime: new Date(Date.now() + 1000 * 60 * 60 * 24),
    arrivalTime: new Date(Date.now() + 1000 * 60 * 60 * 25),
    duration: "2h",
    stops: 0,
    cabinClass: "Economy",
    price: 4999,
    currency: "INR"
  },
  {
    externalId: "FL-BLR-DEL-002",
    airline: "Air India",
    source: "Bengaluru",
    destination: "Delhi",
    departureTime: new Date(Date.now() + 1000 * 60 * 60 * 48),
    arrivalTime: new Date(Date.now() + 1000 * 60 * 60 * 51),
    duration: "3h",
    stops: 0,
    cabinClass: "Economy",
    price: 5999,
    currency: "INR"
  },
  {
    externalId: "FL-GOI-DEL-003",
    airline: "SpiceJet",
    source: "Goa",
    destination: "Delhi",
    departureTime: new Date(Date.now() + 1000 * 60 * 60 * 72),
    arrivalTime: new Date(Date.now() + 1000 * 60 * 60 * 75),
    duration: "2.5h",
    stops: 0,
    cabinClass: "Economy",
    price: 6999,
    currency: "INR"
  }
];

async function main() {
  const externalIds = demoFlights.map((f) => f.externalId);

  await prisma.flight.deleteMany({ where: { externalId: { in: externalIds } } });

  const created = await prisma.$transaction(
    demoFlights.map((f) =>
      prisma.flight.create({
        data: {
          externalId: f.externalId,
          airline: f.airline,
          source: f.source,
          destination: f.destination,
          departureTime: f.departureTime,
          arrivalTime: f.arrivalTime,
          duration: f.duration,
          stops: f.stops,
          cabinClass: f.cabinClass,
          price: f.price,
          currency: f.currency
        }
      })
    )
  );

  console.log(JSON.stringify({ deleted: externalIds.length, inserted: created.length, ids: created.map((c) => c.externalId) }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
