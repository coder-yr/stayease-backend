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
  category?: string;
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

export type MultiStepHotelInput = {
  basicInfo: {
    name: string;
    city: string;
    state: string;
    description: string;
    email: string;
    phone: string;
    address: string;
    coverImage: string;
  };
  facilities: string[];
  rooms: Array<{
    type: string;
    price: number;
    capacity: number;
    totalRooms: number;
  }>;
  documents: {
    idProof: string;
    license: string;
    videoUrl: string;
  };
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

const isMultiStepHotelInput = (value: unknown): value is MultiStepHotelInput => {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return Boolean(payload.basicInfo && payload.rooms && payload.documents);
};

const normalizeHotelInput = (data: OwnerHotelInput | MultiStepHotelInput): OwnerHotelInput => {
  if (!isMultiStepHotelInput(data)) {
    return data as OwnerHotelInput;
  }

  const location = `${data.basicInfo.city}, ${data.basicInfo.state}`;

  const lowestRoomPrice = data.rooms.reduce((min, room) => Math.min(min, Number(room.price)), Number(data.rooms[0]?.price ?? 0));

  return {
    name: data.basicInfo.name,
    location,
    price: lowestRoomPrice,
    description: data.basicInfo.description,
    amenities: data.facilities,
    fullAmenities: {
      facilities: data.facilities,
      contact: {
        email: data.basicInfo.email,
        phone: data.basicInfo.phone
      },
      address: data.basicInfo.address
    },
    images: [data.basicInfo.coverImage],
    tiers: data.rooms.map((room) => ({
      name: room.type,
      price: Number(room.price),
      capacity: Number(room.capacity),
      totalRooms: Number(room.totalRooms)
    })),
    nearby: {
      documents: {
        idProof: data.documents.idProof,
        license: data.documents.license,
        videoUrl: data.documents.videoUrl
      },
      submissionType: "multi-step"
    },
    category: "Hotel",
    status: "pending" as never
  } as OwnerHotelInput;
};

export const hotelService = {
  async search(params: HotelSearchParams) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = {
      status: "approved" as const,
      ...(params.category ? { category: params.category } : {}),
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

  async createByOwner(ownerId: string, data: OwnerHotelInput | MultiStepHotelInput) {
    const normalized = normalizeHotelInput(data);

    return prisma.$transaction(async (tx) => {
      return tx.hotel.create({
        data: {
          name: normalized.name,
          location: normalized.location,
          price: Number(normalized.price),
          rating: Number(normalized.rating ?? 0),
          reviewCount: Number(normalized.reviewCount ?? 0),
          category: normalized.category ?? "Hotel",
          amenities: toJsonInput(normalized.amenities),
          fullAmenities: toJsonInput(normalized.fullAmenities),
          images: toJsonInput(normalized.images),
          description: normalized.description ?? null,
          tiers: toJsonInput(normalized.tiers),
          nearby: toJsonInput(normalized.nearby),
          deposit: normalized.deposit == null ? null : Number(normalized.deposit),
          rules: normalized.rules ?? null,
          mealsIncluded: normalized.mealsIncluded ?? null,
          taxRate: normalized.taxRate ?? 12.00,
          ownerId,
          status: "pending"
        }
      });
    });
  },

  async listByOwner(ownerId: string) {
    return prisma.hotel.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" }
    });
  },

  async updateByOwner(ownerId: string, id: string, data: Partial<OwnerHotelInput> | MultiStepHotelInput) {
    const existing = await prisma.hotel.findFirst({ where: { id, ownerId } });
    if (!existing) return null;

    let updateData = data as Partial<OwnerHotelInput>;
    if (isMultiStepHotelInput(data)) {
      updateData = normalizeHotelInput(data);
    }

    return prisma.hotel.update({
      where: { id },
      data: {
        ...(updateData.name != null ? { name: updateData.name } : {}),
        ...(updateData.location != null ? { location: updateData.location } : {}),
        ...(updateData.price != null ? { price: Number(updateData.price) } : {}),
        ...(updateData.rating != null ? { rating: Number(updateData.rating) } : {}),
        ...(updateData.reviewCount != null ? { reviewCount: Number(updateData.reviewCount) } : {}),
        ...(updateData.category != null ? { category: updateData.category } : {}),
        ...(updateData.amenities !== undefined ? { amenities: toJsonInput(updateData.amenities) } : {}),
        ...(updateData.fullAmenities !== undefined ? { fullAmenities: toJsonInput(updateData.fullAmenities) } : {}),
        ...(updateData.images !== undefined ? { images: toJsonInput(updateData.images) } : {}),
        ...(updateData.description !== undefined ? { description: updateData.description } : {}),
        ...(updateData.tiers !== undefined ? { tiers: toJsonInput(updateData.tiers) } : {}),
        ...(updateData.nearby !== undefined ? { nearby: toJsonInput(updateData.nearby) } : {}),
        ...(updateData.deposit !== undefined ? { deposit: updateData.deposit == null ? null : Number(updateData.deposit) } : {}),
        ...(updateData.rules !== undefined ? { rules: updateData.rules } : {}),
        ...(updateData.mealsIncluded !== undefined ? { mealsIncluded: updateData.mealsIncluded } : {}),
        ...(updateData.taxRate !== undefined ? { taxRate: Number(updateData.taxRate) } : {}),
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
