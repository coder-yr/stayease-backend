import { z } from "zod";

export const authSignupSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(2).max(80).optional(),
    accountType: z.enum(["user", "owner"]).optional()
  })
});

export const authLoginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8)
  })
});

export const hotelSearchSchema = z.object({
  query: z.object({
    location: z.string().optional(),
    minPrice: z.coerce.number().optional(),
    maxPrice: z.coerce.number().optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    amenities: z.string().optional(),
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(50).optional()
  })
});

export const hotelCreateSchema = z.object({
  body: z.object({
    basicInfo: z.object({
      name: z.string().min(2).max(150),
      city: z.string().min(2).max(120),
      state: z.string().min(2).max(120),
      description: z.string().min(10).max(5000),
      email: z.string().email(),
      phone: z.string().min(7).max(30),
      address: z.string().min(5).max(300),
      coverImage: z.string().min(1)
    }),
    facilities: z.array(z.string().min(1)).default([]),
    rooms: z.array(
      z.object({
        type: z.string().min(1).max(100),
        price: z.coerce.number().positive(),
        capacity: z.coerce.number().int().positive(),
        totalRooms: z.coerce.number().int().positive()
      })
    ).min(1),
    documents: z.object({
      idProof: z.string().min(1),
      license: z.string().min(1),
      videoUrl: z.string().min(1)
    })
  })
});

export const flightSearchSchema = z.object({
  query: z.object({
    source: z.string().length(3),
    destination: z.string().length(3),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    adults: z.coerce.number().min(1).max(9).optional(),
    travelClass: z.enum(["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"]).optional()
  })
});

export const bookingCreateSchema = z.object({
  body: z.object({
    type: z.enum(["hotel", "flight", "train", "bus", "package"]),
    travelDate: z.union([
      z.string().datetime(),
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    ]),
    hotelId: z.string().min(1).optional(),
    packageId: z.string().min(1).optional(),
    flightData: z.record(z.unknown()).optional(),
    packageData: z.record(z.unknown()).optional(),
    busData: z.record(z.unknown()).optional(),
    trainData: z.record(z.unknown()).optional(),
    totalAmount: z.coerce.number().positive(),
    currency: z.string().length(3).optional(),
    metadata: z.record(z.unknown()).optional()
  })
});

export const tourPackageCreateSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120),
    destination: z.string().min(2).max(120),
    description: z.string().max(2000).optional(),
    price: z.coerce.number().positive(),
    inclusions: z.unknown().optional(),
    images: z.unknown().optional()
  })
});

export const tourPackageUpdateSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120).optional(),
    destination: z.string().min(2).max(120).optional(),
    description: z.string().max(2000).optional(),
    price: z.coerce.number().positive().optional(),
    inclusions: z.unknown().optional(),
    images: z.unknown().optional()
  })
});

export const bookingStatusSchema = z.object({
  body: z.object({
    status: z.enum(["pending", "confirmed", "cancelled"])
  }),
  params: z.object({
    id: z.string().min(1)
  })
});

export const chatSchema = z.object({
  body: z.object({
    message: z.string().min(1).max(3000),
    mode: z.enum(["assistant", "trip_planner"]).optional(),
    sessionId: z.string().min(1).max(100).optional()
  })
});

export const recommendationSchema = z.object({
  query: z.object({
    location: z.string().optional(),
    maxBudget: z.coerce.number().positive().optional(),
    minRating: z.coerce.number().min(0).max(5).optional()
  })
});
