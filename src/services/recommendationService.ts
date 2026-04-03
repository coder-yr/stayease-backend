import { prisma } from "../config/prisma.js";

type HotelLike = {
  id: string;
  location: string;
  price: unknown;
  rating: unknown;
};

type BookingLike = {
  metadata: unknown;
};

type PreferenceInput = {
  userId: string;
  location?: string;
  maxBudget?: number;
  minRating?: number;
};

const scoreHotel = (hotel: HotelLike, input: PreferenceInput, historyLocations: string[]) => {
  let score = 0;

  const price = Number(hotel.price);
  const rating = Number(hotel.rating);

  if (input.maxBudget && price <= input.maxBudget) score += 3;
  if (input.minRating && rating >= input.minRating) score += 3;
  if (input.location && hotel.location.toLowerCase().includes(input.location.toLowerCase())) score += 2;
  if (historyLocations.some((loc) => hotel.location.toLowerCase().includes(loc.toLowerCase()))) score += 2;

  return score;
};

export const recommendationService = {
  async getRecommendations(input: PreferenceInput) {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      include: { bookings: true }
    });

    if (!user) return [];

    const historyLocations = (user.travelHistory as string[] | null) ??
      user.bookings
        .map((booking: BookingLike) => {
          const metadata = booking.metadata as Record<string, unknown> | null;
          return (metadata?.location as string) ?? null;
        })
        .filter((value: string | null): value is string => Boolean(value));

    const hotels = await prisma.hotel.findMany({ take: 100 });

    return hotels
      .map((hotel: HotelLike) => ({
        hotel,
        score: scoreHotel(hotel, input, historyLocations)
      }))
      .filter((item: { hotel: HotelLike; score: number }) => item.score > 0)
      .sort(
        (a: { hotel: HotelLike; score: number }, b: { hotel: HotelLike; score: number }) =>
          b.score - a.score
      )
      .slice(0, 10)
      .map((item: { hotel: HotelLike; score: number }) => item.hotel);
  }
};
