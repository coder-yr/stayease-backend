import axios from "axios";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { cache, cacheKey } from "./cacheService.js";

type HotelRow = {
  amenities: unknown;
};

export type HotelSearchParams = {
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  amenities?: string[];
  page?: number;
  limit?: number;
};

export type OwnerHotelInput = {
  name: string;
  location: string;
  price: number;
  rating?: number;
  reviewCount?: number;
  category?: string;
  amenities?: unknown;
  fullAmenities?: unknown;
  images?: unknown;
  description?: string;
  tiers?: unknown;
  nearby?: unknown;
  deposit?: number;
  rules?: string;
  mealsIncluded?: boolean;
  taxRate?: number;
};

const fetchHotelsFromRapidApi = async (params: HotelSearchParams) => {
  if (!env.RAPIDAPI_KEY) return [];

  const cacheLookup = cacheKey("rapid-hotels", params);
  const cached = cache.get(cacheLookup);
  if (cached) return cached as unknown[];

  const response = await axios.get("https://booking-com.p.rapidapi.com/v1/hotels/search", {
    headers: {
      "x-rapidapi-key": env.RAPIDAPI_KEY,
      "x-rapidapi-host": env.RAPIDAPI_HOTELS_HOST
    },
    params: {
      dest_type: "city",
      order_by: "popularity",
      locale: "en-gb",
      units: "metric",
      room_number: 1,
      checkout_date: "2026-12-31",
      filter_by_currency: "USD",
      adults_number: 2,
      checkin_date: "2026-12-25",
      dest_id: "-2092174",
      page_number: 0,
      categories_filter_ids: "class::2,class::4,free_cancellation::1",
      include_adjacency: true
    },
    timeout: 6000
  });

  const items = response.data?.result ?? [];
  cache.set(cacheLookup, items, 900);
  return items;
};

const toJsonInput = (value: unknown): Prisma.InputJsonValue | undefined => {
  if (value === undefined) return undefined;
  return value as Prisma.InputJsonValue;
};

export const hotelService = {
  async search(params: HotelSearchParams) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = {
      status: "approved" as const,
      ...(params.location
        ? {
            location: {
              contains: params.location
            }
          }
        : {}),
      ...(params.minPrice || params.maxPrice
        ? {
            price: {
              gte: params.minPrice,
              lte: params.maxPrice
            }
          }
        : {}),
      ...(params.minRating
        ? {
            rating: {
              gte: params.minRating
            }
          }
        : {})
    };

    const [items, total] = await Promise.all([
      prisma.hotel.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ rating: "desc" }, { price: "asc" }]
      }),
      prisma.hotel.count({ where })
    ]);

    let filtered = items;
    if (params.amenities?.length) {
      filtered = items.filter((hotel: HotelRow) => {
        const hotelAmenities = (hotel.amenities as string[] | null) ?? [];
        return params.amenities!.every((amenity) =>
          hotelAmenities.map((a) => a.toLowerCase()).includes(amenity.toLowerCase())
        );
      });
    }

    const external = await fetchHotelsFromRapidApi(params).catch(() => []);

    return {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      items: filtered,
      external
    };
  },

  async getById(id: string) {
    return prisma.hotel.findUnique({ where: { id } });
  },

  async createByOwner(ownerId: string, data: OwnerHotelInput) {
    return prisma.hotel.create({
      data: {
        name: data.name,
        location: data.location,
        price: Number(data.price),
        rating: Number(data.rating ?? 0),
        reviewCount: Number(data.reviewCount ?? 0),
        category: data.category ?? "Hotel",
        amenities: toJsonInput(data.amenities),
        fullAmenities: toJsonInput(data.fullAmenities),
        images: toJsonInput(data.images),
        description: data.description ?? null,
        tiers: toJsonInput(data.tiers),
        nearby: toJsonInput(data.nearby),
        deposit: data.deposit == null ? null : Number(data.deposit),
        rules: data.rules ?? null,
        mealsIncluded: data.mealsIncluded ?? null,
        taxRate: data.taxRate ?? 12.00,
        ownerId,
        status: "pending"
      }
    });
  },

  async listByOwner(ownerId: string) {
    return prisma.hotel.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" }
    });
  },

  async updateByOwner(ownerId: string, id: string, data: Partial<OwnerHotelInput>) {
    const existing = await prisma.hotel.findFirst({ where: { id, ownerId } });
    if (!existing) return null;

    return prisma.hotel.update({
      where: { id },
      data: {
        ...(data.name != null ? { name: data.name } : {}),
        ...(data.location != null ? { location: data.location } : {}),
        ...(data.price != null ? { price: Number(data.price) } : {}),
        ...(data.rating != null ? { rating: Number(data.rating) } : {}),
        ...(data.reviewCount != null ? { reviewCount: Number(data.reviewCount) } : {}),
        ...(data.category != null ? { category: data.category } : {}),
        ...(data.amenities !== undefined ? { amenities: toJsonInput(data.amenities) } : {}),
        ...(data.fullAmenities !== undefined ? { fullAmenities: toJsonInput(data.fullAmenities) } : {}),
        ...(data.images !== undefined ? { images: toJsonInput(data.images) } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.tiers !== undefined ? { tiers: toJsonInput(data.tiers) } : {}),
        ...(data.nearby !== undefined ? { nearby: toJsonInput(data.nearby) } : {}),
        ...(data.deposit !== undefined ? { deposit: data.deposit == null ? null : Number(data.deposit) } : {}),
        ...(data.rules !== undefined ? { rules: data.rules } : {}),
        ...(data.mealsIncluded !== undefined ? { mealsIncluded: data.mealsIncluded } : {}),
        ...(data.taxRate !== undefined ? { taxRate: Number(data.taxRate) } : {}),
        status: "pending"
      }
    });
  },

  async deleteByOwner(ownerId: string, id: string) {
    const existing = await prisma.hotel.findFirst({ where: { id, ownerId } });
    if (!existing) return false;
    await prisma.hotel.delete({ where: { id } });
    return true;
  },

  async getAllPending() {
    return prisma.hotel.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" }
    });
  },

  async updateStatus(id: string, status: "approved" | "rejected" | "pending") {
    const existing = await prisma.hotel.findUnique({ where: { id } });
    if (!existing) return null;
    return prisma.hotel.update({
      where: { id },
      data: { status }
    });
  }
};
