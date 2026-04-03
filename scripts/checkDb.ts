import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [hotels, approved, pending, users, bookings, flights, buses, trains] = await Promise.all([
    prisma.hotel.count(),
    prisma.hotel.count({ where: { status: "approved" } }),
    prisma.hotel.count({ where: { status: "pending" } }),
    prisma.user.count(),
    prisma.booking.count(),
    prisma.flight.count(),
    prisma.bus.count(),
    prisma.train.count()
  ]);

  console.log(
    JSON.stringify(
      { hotels, approved, pending, users, bookings, flights, buses, trains },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
