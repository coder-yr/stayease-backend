import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const demoHotels = [
  {
    name: "Sea View Resort Goa",
    location: "Goa",
    price: 4999,
    rating: 4.5,
    amenities: { wifi: true, pool: true, breakfast: true },
    images: [
      "https://images.unsplash.com/photo-1501117716987-c8e9f2a1f41b?auto=format&fit=crop&w=1200&q=80"
    ],
    description: "Comfortable beach resort with pool and complimentary breakfast.",
    category: "Premium",
    mealsIncluded: true
  },
  {
    name: "Hilltop Serenity Manali",
    location: "Manali",
    price: 6999,
    rating: 4.7,
    amenities: { wifi: true, fireplace: true },
    images: [
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80"
    ],
    description: "Cosy mountain hotel with scenic views and guided treks.",
    category: "Premium",
    mealsIncluded: false
  },
  {
    name: "Budget Inn Jaipur",
    location: "Jaipur",
    price: 2499,
    rating: 4.0,
    amenities: { wifi: true, parking: true },
    images: [
      "https://images.unsplash.com/photo-1528909514045-2fa4ac7a08ba?auto=format&fit=crop&w=1200&q=80"
    ],
    description: "Affordable stay in the heart of the city, near major attractions.",
    category: "Budget",
    mealsIncluded: false
  }
];

async function main() {
  const names = demoHotels.map((h) => h.name);

  await prisma.hotel.deleteMany({ where: { name: { in: names } } });

  const created = await prisma.$transaction(
    demoHotels.map((h) =>
      prisma.hotel.create({
        data: {
          name: h.name,
          location: h.location,
          price: h.price,
          rating: h.rating,
          amenities: h.amenities,
          images: h.images,
          description: h.description,
          category: h.category,
          mealsIncluded: h.mealsIncluded
        }
      })
    )
  );

  console.log(
    JSON.stringify({ deleted: names.length, inserted: created.length, names: created.map((c) => c.name) }, null, 2)
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
