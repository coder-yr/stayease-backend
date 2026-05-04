import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const demoPackages = [
  {
    name: "Goa Beach Escape",
    destination: "Goa",
    description: "4D/3N beach retreat with breakfast, airport pickup, and sunset cruise.",
    price: 8999,
    inclusions: ["3-star hotel", "Breakfast", "Airport transfer", "Sunset cruise"],
    images: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    name: "Manali Mountain Chill",
    destination: "Manali",
    description: "5D/4N mountain package with local sightseeing and Volvo transfers.",
    price: 12499,
    inclusions: ["Deluxe stay", "Breakfast + dinner", "Local sightseeing", "Volvo tickets"],
    images: [
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    name: "Jaipur Royal Weekend",
    destination: "Jaipur",
    description: "3D/2N heritage stay with city tour, Amber Fort visit, and cultural dinner.",
    price: 7499,
    inclusions: ["Boutique hotel", "City tour", "Amber Fort", "Cultural dinner"],
    images: [
      "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    name: "Kerala Backwater Bliss",
    destination: "Alleppey",
    description: "4D/3N houseboat + resort combo with backwater cruise and local meals.",
    price: 15999,
    inclusions: ["Houseboat stay", "Resort stay", "Cruise", "All meals on houseboat"],
    images: [
      "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80"
    ]
  },
  {
    name: "Udaipur Lake Romance",
    destination: "Udaipur",
    description: "4D/3N premium package with lake-view stay and evening boat ride.",
    price: 13999,
    inclusions: ["Lake-view hotel", "Breakfast", "Boat ride", "City palace entry"],
    images: [
      "https://images.unsplash.com/photo-1599661046827-dacde6976545?auto=format&fit=crop&w=1200&q=80"
    ]
  }
];

async function main() {
  const names = demoPackages.map((item) => item.name);

  const deleted = await prisma.tourPackage.deleteMany({
    where: {
      name: {
        in: names
      }
    }
  });

  const created = await prisma.$transaction(
    demoPackages.map((item) =>
      prisma.tourPackage.create({
        data: {
          name: item.name,
          destination: item.destination,
          description: item.description,
          price: item.price,
          inclusions: item.inclusions,
          images: item.images
        }
      })
    )
  );

  console.log(
    JSON.stringify(
      {
        deleted: deleted.count,
        inserted: created.length,
        names: created.map((item) => item.name)
      },
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