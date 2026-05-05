import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding PGs...');

  const pgs = [
    {
      name: 'Oxford Elite Student Living',
      location: 'South Delhi, Near IIT',
      price: 18000,
      rating: 4.8,
      category: 'PG',
      amenities: ['Gigabit WiFi', 'Food Included', 'Gym', 'Biometric Security'],
      description: 'Premium student living with curated meals and high-speed internet for engineering students.',
      images: ['https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80'],
      status: 'approved'
    },
    {
      name: 'Serene Female Sanctuary',
      location: 'Mumbai, Near NMIMS',
      price: 22000,
      rating: 4.9,
      category: 'PG',
      amenities: ['Female Only', 'Organic Meals', 'Yoga Studio', '24/7 Security'],
      description: 'A masterwork of architectural serenity designed exclusively for female students.',
      images: ['https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80'],
      status: 'approved'
    },
    {
      name: 'The Scholar Hub',
      location: 'Kharagpur, Near IIT KGP',
      price: 12000,
      rating: 4.5,
      category: 'PG',
      amenities: ['Study Hall', 'Laundry', 'Tiffin Service', 'Near Campus'],
      description: 'Budget-friendly yet premium coliving space for IIT aspirants and students.',
      images: ['https://images.unsplash.com/photo-1555854816-809d28f00044?auto=format&fit=crop&w=800&q=80'],
      status: 'approved'
    }
  ];

  for (const pg of pgs) {
    await prisma.hotel.create({
      data: {
        ...pg,
        amenities: pg.amenities,
        images: pg.images,
        price: pg.price,
        rating: pg.rating
      } as any
    });
  }

  console.log('✅ PGs seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
