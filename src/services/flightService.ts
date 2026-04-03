import axios from "axios";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { cache, cacheKey } from "./cacheService.js";

type FlightSearchInput = {
  source: string;
  destination: string;
  date: string;
  adults?: number;
  travelClass?: string;
  userId?: string;
};

type ExternalFlight = {
  externalId: string;
  airline: string;
  source: string;
  destination: string;
  departureTime: Date;
  arrivalTime: Date;
  duration: string | null;
  stops: number;
  cabinClass: string;
  price: number;
  currency: string;
  rawPayload: unknown;
};

let amadeusToken: { value: string; expiresAt: number } | null = null;

const getAmadeusToken = async () => {
  if (!env.AMADEUS_API_KEY || !env.AMADEUS_API_SECRET) return null;
  if (amadeusToken && amadeusToken.expiresAt > Date.now()) return amadeusToken.value;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: env.AMADEUS_API_KEY,
    client_secret: env.AMADEUS_API_SECRET
  });

  const response = await axios.post(`${env.AMADEUS_BASE_URL}/v1/security/oauth2/token`, body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 5000
  });

  const accessToken = response.data.access_token as string;
  const expiresIn = Number(response.data.expires_in ?? 900);
  amadeusToken = {
    value: accessToken,
    expiresAt: Date.now() + (expiresIn - 30) * 1000
  };
  return accessToken;
};

const fetchExternalFlights = async (input: FlightSearchInput): Promise<ExternalFlight[]> => {
  const token = await getAmadeusToken();
  if (!token) return [];

  const response = await axios.get(`${env.AMADEUS_BASE_URL}/v2/shopping/flight-offers`, {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      originLocationCode: input.source,
      destinationLocationCode: input.destination,
      departureDate: input.date,
      adults: input.adults ?? 1,
      travelClass: input.travelClass?.toUpperCase() ?? "ECONOMY",
      currencyCode: "USD",
      max: 20
    },
    timeout: 7000
  });

  const offers = response.data?.data ?? [];
  return offers.map((offer: any) => {
    const itinerary = offer.itineraries?.[0];
    const segment = itinerary?.segments?.[0];
    const lastSegment = itinerary?.segments?.[itinerary.segments.length - 1];

    return {
      externalId: offer.id,
      airline: segment?.carrierCode ?? "Unknown",
      source: segment?.departure?.iataCode ?? input.source,
      destination: lastSegment?.arrival?.iataCode ?? input.destination,
      departureTime: new Date(segment?.departure?.at ?? `${input.date}T08:00:00Z`),
      arrivalTime: new Date(lastSegment?.arrival?.at ?? `${input.date}T12:00:00Z`),
      duration: itinerary?.duration ?? null,
      stops: Math.max((itinerary?.segments?.length ?? 1) - 1, 0),
      cabinClass: input.travelClass ?? "ECONOMY",
      price: Number(offer?.price?.grandTotal ?? 0),
      currency: offer?.price?.currency ?? "USD",
      rawPayload: offer
    };
  });
};

export const flightService = {
  async getAll() {
    const key = "flight-all";
    const cached = cache.get(key);
    if (cached) return cached;

    const items = await prisma.flight.findMany({
      orderBy: [{ departureTime: "asc" }, { price: "asc" }],
      take: 200
    });

    const result = {
      source: "database",
      items
    };

    cache.set(key, result, 120);
    return result;
  },

  async search(input: FlightSearchInput) {
    const key = cacheKey("flight-search", input);
    const cached = cache.get(key);
    if (cached) return cached;

    if (input.userId) {
      await prisma.flightSearch.create({
        data: {
          userId: input.userId,
          source: input.source,
          destination: input.destination,
          departure: new Date(input.date),
          adults: input.adults ?? 1,
          cabinClass: input.travelClass ?? "ECONOMY"
        }
      });
    }

    const externalFlights = await fetchExternalFlights(input).catch(() => []);

    if (externalFlights.length) {
      await Promise.all(
        externalFlights.map((flight: ExternalFlight) =>
          prisma.flight.upsert({
            where: { externalId: flight.externalId },
            create: flight as any,
            update: {
              ...(flight as any),
              fetchedAt: new Date()
            }
          })
        )
      );
    }

    const fallback = await prisma.flight.findMany({
      where: {
        source: { equals: input.source },
        destination: { equals: input.destination },
        departureTime: {
          gte: new Date(`${input.date}T00:00:00.000Z`),
          lte: new Date(`${input.date}T23:59:59.999Z`)
        }
      },
      orderBy: [{ price: "asc" }, { departureTime: "asc" }],
      take: 20
    });

    const result = {
      source: externalFlights.length ? "amadeus" : "database-cache",
      items: externalFlights.length ? externalFlights : fallback
    };

    cache.set(key, result, 300);
    return result;
  }
};
