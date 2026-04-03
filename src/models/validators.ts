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
    type: z.enum(["hotel", "flight"]),
    travelDate: z.string().datetime(),
    hotelId: z.string().min(1).optional(),
    flightData: z.record(z.unknown()).optional(),
    totalAmount: z.coerce.number().positive(),
    currency: z.string().length(3).optional(),
    metadata: z.record(z.unknown()).optional()
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
    message: z.string().min(1).max(3000)
  })
});

export const recommendationSchema = z.object({
  query: z.object({
    location: z.string().optional(),
    maxBudget: z.coerce.number().positive().optional(),
    minRating: z.coerce.number().min(0).max(5).optional()
  })
});
