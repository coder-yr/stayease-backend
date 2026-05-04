import { prisma } from "../config/prisma.js";
import { aiDefaultModel, aiProvider, xaiClient } from "../config/openai.js";
import { hotelService } from "./hotelService.js";

type ChatInput = {
  userId?: string;
  sessionId?: string;
  message: string;
  mode?: "assistant" | "trip_planner";
};

type TravelIntent = {
  intent: "hotel" | "package" | "flight" | "bus" | "train" | "itinerary" | "general";
  destination?: string;
  source?: string;
  budget?: number;
  currency?: string;
  checkIn?: string;
  checkOut?: string;
  nights?: number;
  preferences?: string[];
  packageTheme?: string;
};

type RecommendationCard = {
  id: string;
  kind: "hotel" | "package" | "flight" | "bus" | "train";
  title: string;
  subtitle: string;
  price: number;
  priceLabel: string;
  rating?: number;
  image?: string;
  routePath?: string;
};

type RecommendationBuckets = {
  budget: RecommendationCard[];
  bestValue: RecommendationCard[];
  premium: RecommendationCard[];
};

type AiFlowAction = {
  id: string;
  label: string;
  type: "question" | "navigate";
  value: string;
};

type ChatHistoryEntry = {
  query: string;
  response: string;
  createdAt: Date;
};

const toDestinationSlug = (value?: string) => {
  if (!value) return "india";
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-") || "india";
};

const buildExternalBookingCards = (intent: TravelIntent["intent"], destination?: string, budget?: number): RecommendationCard[] => {
  const place = destination?.trim() || "India";
  const encodedPlace = encodeURIComponent(place);
  const placeSlug = toDestinationSlug(place);
  const budgetLabel = budget ? `under ${toCurrencyLabel(budget)}` : "best available price";
  const nightlyPrice = budget && budget > 0 ? Math.max(1, Math.round(budget / 2)) : 2500;

  const cards: RecommendationCard[] = [
    {
      id: `external-booking-${placeSlug}`,
      kind: "hotel",
      title: `Booking.com stays in ${place}`,
      subtitle: `Compare guest houses and budget hotels ${budgetLabel}`,
      price: nightlyPrice,
      priceLabel: "Open external site",
      image: "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=900&q=80",
      routePath: `https://www.booking.com/searchresults.html?ss=${encodedPlace}`
    },
    {
      id: `external-airbnb-${placeSlug}`,
      kind: "hotel",
      title: `Airbnb rooms in ${place}`,
      subtitle: `Find homestays and private rooms ${budgetLabel}`,
      price: nightlyPrice,
      priceLabel: "Open external site",
      image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
      routePath: `https://www.airbnb.co.in/s/${encodedPlace}/homes`
    },
    {
      id: `external-expedia-${placeSlug}`,
      kind: intent === "package" ? "package" : "hotel",
      title: `Expedia deals for ${place}`,
      subtitle: intent === "package" ? `Check package + stay bundles ${budgetLabel}` : `Compare stay options ${budgetLabel}`,
      price: budget && budget > 0 ? budget : 5000,
      priceLabel: "Open external site",
      image: "https://images.unsplash.com/photo-1468824357306-a439d58ccb1c?auto=format&fit=crop&w=900&q=80",
      routePath: `https://www.expedia.co.in/Hotel-Search?destination=${encodedPlace}`
    }
  ];

  if (intent === "package" || intent === "itinerary") {
    cards.unshift({
      id: `external-mmt-${placeSlug}`,
      kind: "package",
      title: `MakeMyTrip holidays for ${place}`,
      subtitle: `Explore curated travel packages ${budgetLabel}`,
      price: budget && budget > 0 ? budget : 7000,
      priceLabel: "Open external site",
      image: "https://images.unsplash.com/photo-1488085061387-422e29b40080?auto=format&fit=crop&w=900&q=80",
      routePath: "https://www.makemytrip.com/holidays-india/"
    });
  }

  return cards.slice(0, 4);
};

const buildExternalPackageCards = (destination?: string, budget?: number): RecommendationCard[] => {
  const place = destination?.trim() || "India";
  const encodedPlace = encodeURIComponent(place);
  const placeSlug = toDestinationSlug(place);
  const budgetLabel = budget ? `under ${toCurrencyLabel(budget)}` : "best available package";

  return [
    {
      id: `external-mmt-package-${placeSlug}`,
      kind: "package",
      title: `MakeMyTrip holidays for ${place}`,
      subtitle: `Package deals ${budgetLabel}`,
      price: budget && budget > 0 ? budget : 12000,
      priceLabel: "Open external site",
      image: "https://images.unsplash.com/photo-1488085061387-422e29b40080?auto=format&fit=crop&w=900&q=80",
      routePath: "https://www.makemytrip.com/holidays-india/"
    },
    {
      id: `external-thrillophilia-${placeSlug}`,
      kind: "package",
      title: `Thrillophilia trips for ${place}`,
      subtitle: `Adventure and curated itineraries ${budgetLabel}`,
      price: budget && budget > 0 ? budget : 15000,
      priceLabel: "Open external site",
      image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=900&q=80",
      routePath: `https://www.thrillophilia.com/search?query=${encodedPlace}`
    },
    {
      id: `external-yatra-${placeSlug}`,
      kind: "package",
      title: `Yatra package deals for ${place}`,
      subtitle: `Compare lowest package prices ${budgetLabel}`,
      price: budget && budget > 0 ? budget : 13000,
      priceLabel: "Open external site",
      image: "https://images.unsplash.com/photo-1530521954074-e64f6810b32d?auto=format&fit=crop&w=900&q=80",
      routePath: "https://www.yatra.com/holiday-packages"
    }
  ];
};

const loadRecentChatHistory = async (userId?: string, sessionId?: string, limit = 6): Promise<ChatHistoryEntry[]> => {
  if (!userId || !sessionId) return [];

  const logs = await prisma.chatLog.findMany({
    where: {
      userId,
      context: {
        path: ["sessionId"],
        equals: sessionId
      }
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      query: true,
      response: true,
      createdAt: true
    }
  });

  return logs.reverse().map((entry) => ({
    query: entry.query,
    response: entry.response,
    createdAt: entry.createdAt
  }));
};

const formatChatHistoryForPrompt = (history: ChatHistoryEntry[]) => {
  if (!history.length) return "No previous chat history.";

  return history
    .map((entry, index) => {
      const timestamp = entry.createdAt.toISOString().slice(0, 10);
      return `${index + 1}. User: ${entry.query}\n   Assistant: ${entry.response}\n   Date: ${timestamp}`;
    })
    .join("\n");
};

const truncateForChatLog = (text: string, maxChars: number) => {
  if (maxChars <= 0) return "";
  if (text.length <= maxChars) return text;
  if (maxChars <= 3) return text.slice(0, maxChars);
  return `${text.slice(0, maxChars - 3)}...`;
};

const detectIntent = (message: string): TravelIntent["intent"] => {
  const text = message.toLowerCase();

  if (text.includes("package") || text.includes("tour") || text.includes("itinerary") || text.includes("plan")) return "package";
  if (text.includes("hotel") || text.includes("stay") || text.includes("resort") || text.includes("pg")) return "hotel";
  if (text.includes("flight") || text.includes("fly")) return "flight";
  if (text.includes("bus") || text.includes("coach")) return "bus";
  if (text.includes("train") || text.includes("rail")) return "train";
  return "general";
};

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const extractLocation = (message: string) => {
  const locationMatch = message.match(/(?:in|near|around|to)\s+([a-zA-Z\s]+?)(?:\s+for|\s+under|\s+within|\s+with|\s+near|\.|,|$)/i);
  return locationMatch?.[1]?.trim();
};

const extractRoute = (message: string) => {
  const routeMatch = message.match(/from\s+([a-zA-Z\s]+?)\s+to\s+([a-zA-Z\s]+)/i);
  if (!routeMatch) return null;
  return {
    source: routeMatch[1].trim(),
    destination: routeMatch[2].trim()
  };
};

const extractBudget = (message: string) => {
  const budgetMatch = message.match(/(?:₹|rs\.?|inr|usd|\$)\s?([0-9][0-9,]{2,7})/i);
  if (!budgetMatch) return undefined;
  const normalized = Number(budgetMatch[1].replace(/,/g, ""));
  return Number.isFinite(normalized) ? normalized : undefined;
};

const extractNights = (message: string) => {
  const weeksMatch = message.match(/(\d+)\s*(?:week|weeks)/i);
  if (weeksMatch) return Number(weeksMatch[1]) * 7;

  const nightsMatch = message.match(/(\d+)\s*(?:night|nights)/i);
  if (nightsMatch) return Number(nightsMatch[1]);

  if (/weekend/i.test(message)) return 2;
  if (/week/i.test(message)) return 7;

  return undefined;
};

const extractPreferences = (message: string) => {
  const lowered = message.toLowerCase();
  const preferences = ["beach", "mountain", "family", "couple", "adventure", "budget", "luxury", "student", "food", "nightlife"]
    .filter((word) => lowered.includes(word));
  return preferences.length ? preferences : undefined;
};

const guessCheckIn = (message: string) => {
  const dates = message.match(/\b\d{4}-\d{2}-\d{2}\b/g);
  if (dates?.length) return dates[0];
  return undefined;
};

const guessCheckOut = (message: string) => {
  const dates = message.match(/\b\d{4}-\d{2}-\d{2}\b/g);
  if (dates?.length && dates[1]) return dates[1];
  return undefined;
};

const extractJsonObject = (text: string) => {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```json\s*([\s\S]*?)\s*```$/i)?.[1] ?? trimmed.match(/^```\s*([\s\S]*?)\s*```$/i)?.[1] ?? trimmed;

  try {
    return JSON.parse(fenced) as Record<string, unknown>;
  } catch {
    const start = fenced.indexOf("{");
    const end = fenced.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(fenced.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
};

const normalizeIntent = (value: unknown): TravelIntent["intent"] | undefined => {
  if (typeof value !== "string") return undefined;
  const lowered = value.toLowerCase();
  if (lowered === "hotel" || lowered === "package" || lowered === "flight" || lowered === "bus" || lowered === "train" || lowered === "itinerary") {
    return lowered;
  }
  return undefined;
};

const normalizeExtractedIntent = (raw: Record<string, unknown> | null, fallbackMessage: string): TravelIntent => {
  const route = extractRoute(fallbackMessage);
  const fallbackIntent = detectIntent(fallbackMessage);
  const rawPreferences = Array.isArray(raw?.preferences)
    ? raw.preferences.filter((item): item is string => typeof item === "string")
    : undefined;

  return {
    intent: normalizeIntent(raw?.intent) ?? fallbackIntent,
    destination: typeof raw?.destination === "string" ? raw.destination.trim() : extractLocation(fallbackMessage),
    source: typeof raw?.source === "string" ? raw.source.trim() : route?.source,
    budget: typeof raw?.budget === "number" ? raw.budget : extractBudget(fallbackMessage),
    currency: typeof raw?.currency === "string" ? raw.currency : undefined,
    checkIn: typeof raw?.checkIn === "string" ? raw.checkIn : guessCheckIn(fallbackMessage),
    checkOut: typeof raw?.checkOut === "string" ? raw.checkOut : guessCheckOut(fallbackMessage),
    nights: typeof raw?.nights === "number" ? raw.nights : extractNights(fallbackMessage),
    preferences: rawPreferences ?? extractPreferences(fallbackMessage),
    packageTheme: typeof raw?.packageTheme === "string" ? raw.packageTheme : undefined
  };
};

const getProviderErrorCode = (error: any): number | undefined => {
  if (typeof error?.status === "number") return error.status;
  if (typeof error?.statusCode === "number") return error.statusCode;
  if (typeof error?.error?.code === "number") return error.error.code;
  if (typeof error?.data$?.error?.code === "number") return error.data$.error.code;
  return undefined;
};

const getProviderErrorMessage = (error: any): string | undefined => {
  return (
    error?.error?.message ||
    error?.error?.metadata?.raw ||
    error?.data$?.error?.metadata?.raw ||
    error?.message
  );
};

const jsonToReadableText = (obj: Record<string, unknown>, indent = 0): string => {
  return Object.entries(obj)
    .map(([key, val]) => {
      const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      if (val && typeof val === "object" && !Array.isArray(val)) {
        return `${label}:\n${jsonToReadableText(val as Record<string, unknown>, indent + 1)}`;
      }
      const prefix = indent > 0 ? "  • " : "📌 ";
      return `${prefix}${label}: ${val}`;
    })
    .join("\n");
};

const normalizeAssistantResponse = (text: string) => {
  const trimmed = text.trim();
  const parsed = extractJsonObject(trimmed);

  if (parsed) {
    const maybeResponse = parsed.response;
    if (typeof maybeResponse === "string") return maybeResponse.trim();
    const maybeMessage = parsed.message;
    if (typeof maybeMessage === "string") return maybeMessage.trim();
    return jsonToReadableText(parsed);
  }

  return trimmed.replace(/^\"|\"$/g, "").trim();
};

const getFollowUpQuestions = (intent: TravelIntent) => {
  const questions: string[] = [];

  if (intent.intent === "hotel" || intent.intent === "package" || intent.intent === "itinerary") {
    if (!intent.destination) questions.push("Which destination should I plan for?");
    if (!intent.budget) questions.push("What budget should I optimize for?");
    if (!intent.checkIn) questions.push("What are your travel dates?");
  }

  if (intent.intent === "flight" && (!intent.source || !intent.destination)) {
    if (!intent.source) questions.push("Where are you starting from?");
    if (!intent.destination) questions.push("Where do you want to fly to?");
  }

  return questions.slice(0, 3);
};

const getMissingFields = (intent: TravelIntent) => {
  const missing: string[] = [];
  if ((intent.intent === "hotel" || intent.intent === "package" || intent.intent === "itinerary") && !intent.destination) {
    missing.push("destination");
  }
  if ((intent.intent === "hotel" || intent.intent === "package" || intent.intent === "itinerary") && !intent.checkIn) {
    missing.push("travel_dates");
  }
  if (!intent.budget && (intent.intent === "hotel" || intent.intent === "package" || intent.intent === "itinerary")) {
    missing.push("budget");
  }
  if (intent.intent === "flight" && !intent.source) {
    missing.push("source");
  }
  if ((intent.intent === "flight" || intent.intent === "bus" || intent.intent === "train") && !intent.destination) {
    missing.push("destination");
  }
  return missing;
};

const getUiActions = (cards: RecommendationCard[], followUpQuestions: string[]): AiFlowAction[] => {
  if (followUpQuestions.length) {
    return followUpQuestions.slice(0, 3).map((question, index) => ({
      id: `question-${index + 1}`,
      label: question,
      type: "question",
      value: question
    }));
  }

  const actionableCards = cards.filter((card) => typeof card.routePath === "string" && card.routePath.length > 0);
  if (!actionableCards.length) return [];

  const primary = actionableCards.slice(0, 2).map((card, index) => ({
    id: `action-${index + 1}-${card.id}`,
    label: index === 0 ? "Start booking" : "Compare option",
    type: "navigate" as const,
    value: card.routePath!
  }));

  const hasCheckout = actionableCards.some((card) => (card.routePath ?? "").startsWith("/checkout"));
  if (hasCheckout) {
    primary.push({
      id: "action-payment",
      label: "Go to payment step",
      type: "navigate",
      value: actionableCards.find((card) => (card.routePath ?? "").startsWith("/checkout"))!.routePath!
    });
  }

  return primary.slice(0, 3);
};

const searchFlightsFromDb = async (source?: string, destination?: string) => {
  return prisma.flight.findMany({
    where: {
      ...(source ? { source: { contains: source } } : {}),
      ...(destination ? { destination: { contains: destination } } : {})
    },
    orderBy: [{ price: "asc" }, { departureTime: "asc" }],
    take: 5
  });
};

const searchBusesFromDb = async (source?: string, destination?: string) => {
  return prisma.bus.findMany({
    where: {
      ...(source ? { source: { contains: source } } : {}),
      ...(destination ? { destination: { contains: destination } } : {})
    },
    orderBy: [{ price: "asc" }, { departureTime: "asc" }],
    take: 5
  });
};

const searchTrainsFromDb = async (source?: string, destination?: string) => {
  return prisma.train.findMany({
    where: {
      ...(source ? { source: { contains: source } } : {}),
      ...(destination ? { destination: { contains: destination } } : {})
    },
    orderBy: [{ price: "asc" }, { departureTime: "asc" }],
    take: 5
  });
};

const searchPackagesFromDb = async (destination?: string, budget?: number) => {
  return prisma.tourPackage.findMany({
    where: {
      ...(destination ? { destination: { contains: destination } } : {}),
      ...(budget ? { price: { lte: budget } } : {})
    },
    orderBy: [{ price: "asc" }, { createdAt: "desc" }],
    take: 5
  });
};

const buildRecommendationBuckets = (cards: RecommendationCard[]): RecommendationBuckets => {
  const sorted = [...cards].sort((a, b) => a.price - b.price);
  if (!sorted.length) {
    return { budget: [], bestValue: [], premium: [] };
  }

  if (sorted.length === 1) {
    return { budget: [sorted[0]], bestValue: [sorted[0]], premium: [sorted[0]] };
  }

  const firstSplit = Math.max(1, Math.floor(sorted.length / 3));
  const secondSplit = Math.max(firstSplit + 1, Math.floor((sorted.length * 2) / 3));

  return {
    budget: sorted.slice(0, firstSplit),
    bestValue: sorted.slice(firstSplit, secondSplit),
    premium: sorted.slice(secondSplit)
  };
};

const toCurrencyLabel = (value: number, currency = "INR") => {
  if (currency.toUpperCase() === "USD") return `$${Math.round(value).toLocaleString("en-US")}`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
};

const mapHotelCards = (hotels: unknown[]): RecommendationCard[] => {
  return hotels.slice(0, 5).map((hotel: any) => {
    const imageList = Array.isArray(hotel.images) ? hotel.images : [];
    return {
      id: String(hotel.id ?? hotel.name ?? Math.random()),
      kind: "hotel",
      title: String(hotel.name ?? "Hotel Option"),
      subtitle: String(hotel.location ?? "Great location"),
      price: Number(hotel.price ?? 0),
      priceLabel: `₹${Number(hotel.price ?? 0).toLocaleString()}/night`,
      rating: typeof hotel.rating === "number" ? hotel.rating : undefined,
      image: imageList[0] ? String(imageList[0]) : undefined,
      routePath: hotel.id ? `/checkout/${hotel.id}?checkIn=${toIsoDate(addDays(new Date(), 1))}&checkOut=${toIsoDate(addDays(new Date(), 8))}` : undefined
    };
  });
};

const mapPackageCards = (packages: unknown[]): RecommendationCard[] => {
  return packages.slice(0, 5).map((travelPackage: any) => {
    const imageList = Array.isArray(travelPackage.images) ? travelPackage.images : [];
    const inclusions = Array.isArray(travelPackage.inclusions)
      ? travelPackage.inclusions.filter((item: unknown): item is string => typeof item === "string").slice(0, 2)
      : [];
    const subtitleParts = [String(travelPackage.destination ?? "Curated trip"), ...inclusions];
    return {
      id: String(travelPackage.id ?? travelPackage.name ?? Math.random()),
      kind: "package",
      title: String(travelPackage.name ?? "Tour Package"),
      subtitle: subtitleParts.filter(Boolean).join(" • "),
      price: Number(travelPackage.price ?? 0),
      priceLabel: `₹${Number(travelPackage.price ?? 0).toLocaleString()}`,
      image: imageList[0] ? String(imageList[0]) : undefined,
      routePath: travelPackage.id
        ? `/packages/${encodeURIComponent(String(travelPackage.id))}`
        : undefined
    };
  });
};

const mapGenericCards = (items: unknown[], kind: RecommendationCard["kind"]): RecommendationCard[] => {
  return items.slice(0, 5).map((item: any) => {
    const price = Number(item.price ?? 0);
    const source = String(item.source ?? item.origin ?? "Source");
    const destination = String(item.destination ?? item.to ?? "Destination");
    return {
      id: String(item.id ?? `${source}-${destination}-${Math.random()}`),
      kind,
      title: `${source} → ${destination}`,
      subtitle: String(item.operator ?? item.airline ?? item.duration ?? "Travel option"),
      price,
      priceLabel: toCurrencyLabel(price, String(item.currency ?? "INR")),
      routePath: undefined
    };
  });
};

const summarizeRecommendations = (cards: RecommendationCard[]) => {
  if (!cards.length) return "";

  const buckets = buildRecommendationBuckets(cards);
  const parts = [
    buckets.budget[0] ? `Budget pick: ${buckets.budget[0].title}` : null,
    buckets.bestValue[0] ? `Best value: ${buckets.bestValue[0].title}` : null,
    buckets.premium[0] ? `Premium: ${buckets.premium[0].title}` : null
  ].filter(Boolean);

  return parts.join(" | ");
};

const formatCardForAdvisor = (card: RecommendationCard, index: number) => {
  const rating = typeof card.rating === "number" ? ` | rating ${card.rating.toFixed(1)}` : "";
  const link = card.routePath ? ` | action ${card.routePath}` : "";
  return `${index + 1}. ${card.title} | ${card.subtitle} | ${card.priceLabel}${rating}${link}`;
};

const buildAdvisorGrounding = (
  cards: RecommendationCard[],
  buckets: RecommendationBuckets,
  externalSuggestions: RecommendationCard[],
  followUpQuestions: string[]
) => {
  const topPicks = cards.slice(0, 3).map(formatCardForAdvisor).join("\n") || "No direct picks available.";
  const bucketSummary = [
    buckets.budget[0] ? `Budget: ${buckets.budget[0].title}` : null,
    buckets.bestValue[0] ? `Best value: ${buckets.bestValue[0].title}` : null,
    buckets.premium[0] ? `Premium: ${buckets.premium[0].title}` : null
  ].filter(Boolean).join(" | ") || "No bucket split available.";

  const external = externalSuggestions.slice(0, 2).map((card, index) => formatCardForAdvisor(card, index)).join("\n") || "None";
  const nextQuestion = followUpQuestions[0] ?? "None";

  return [
    `Top picks:\n${topPicks}`,
    `Bucket summary: ${bucketSummary}`,
    `External fallback options:\n${external}`,
    `Preferred next question: ${nextQuestion}`
  ].join("\n\n");
};

const extractStructuredIntent = async (message: string, chatHistoryText = ""): Promise<TravelIntent> => {
  const fallback = normalizeExtractedIntent(null, message);

  if (!xaiClient) {
    return fallback;
  }

  try {
    const completion = await xaiClient.chat.completions.create({
      model: aiDefaultModel,
      temperature: 0,
      messages: [
        {
          role: "system",
          content: [
            "Extract travel intent from the user's message.",
            "Return only JSON with these keys: intent, destination, source, budget, currency, checkIn, checkOut, nights, preferences, packageTheme.",
            "Use intent values from: hotel, package, flight, bus, train, itinerary, general.",
            "If a value is missing, omit it or use null.",
            chatHistoryText ? `Use this saved chat history as context when the latest message is a follow-up:\n${chatHistoryText}` : ""
          ].join(" ")
        },
        { role: "user", content: message }
      ]
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const parsed = extractJsonObject(content);
    return normalizeExtractedIntent(parsed, message);
  } catch (error) {
    const code = getProviderErrorCode(error);
    const providerMessage = getProviderErrorMessage(error);
    console.warn(`${aiProvider} intent extraction fallback:`, { code, providerMessage });
    return fallback;
  }
};

export const chatService = {
  async respond(input: ChatInput) {
    const chatHistory = await loadRecentChatHistory(input.userId, input.sessionId, 6);
    const chatHistoryText = formatChatHistoryForPrompt(chatHistory);
    const extracted = await extractStructuredIntent(input.message, chatHistoryText);
    const intent = extracted.intent;
    const context: Record<string, unknown> = {
      intent,
      extracted,
      sessionId: input.sessionId,
      chatHistory,
      recommendations: {
        budget: [],
        bestValue: [],
        premium: []
      }
    };

    const followUpQuestions = getFollowUpQuestions(extracted);
    const missingFields = getMissingFields(extracted);
    const destination = extracted.destination ?? extracted.source;
    const route = extracted.source && extracted.destination ? { source: extracted.source, destination: extracted.destination } : null;

    const hotelsPromise = (intent === "hotel" || intent === "package" || intent === "itinerary") && extracted.destination
      ? hotelService.search({
          location: extracted.destination,
          maxPrice: extracted.budget,
          limit: 5,
          page: 1
        })
      : Promise.resolve(null);

    const packagesPromise = (intent === "package" || intent === "itinerary") && destination
      ? searchPackagesFromDb(destination, extracted.budget)
      : Promise.resolve([] as unknown[]);

    const [hotelResults, packageResults, flightResults, busResults, trainResults] = await Promise.all([
      hotelsPromise,
      packagesPromise,
      intent === "flight" || intent === "itinerary" ? searchFlightsFromDb(route?.source?.toUpperCase(), route?.destination?.toUpperCase()) : Promise.resolve([]),
      intent === "bus" || intent === "itinerary" ? searchBusesFromDb(route?.source, route?.destination) : Promise.resolve([]),
      intent === "train" || intent === "itinerary" ? searchTrainsFromDb(route?.source, route?.destination) : Promise.resolve([])
    ]);

    if (hotelResults) {
      context.hotels = hotelResults;
    }

    if (packageResults.length) {
      context.packages = packageResults;
    }

    if (flightResults.length) {
      context.flights = { items: flightResults };
    }

    if (busResults.length) {
      context.buses = busResults;
    }

    if (trainResults.length) {
      context.trains = trainResults;
    }

    const packageCards = mapPackageCards(packageResults);
    const hotelCards = hotelResults ? mapHotelCards(hotelResults.items ?? []) : [];
    const travelCards = [
      ...mapGenericCards(flightResults, "flight"),
      ...mapGenericCards(busResults, "bus"),
      ...mapGenericCards(trainResults, "train")
    ];

    const hasBudget = typeof extracted.budget === "number" && extracted.budget > 0;
    const affordableHotelCards = hasBudget ? hotelCards.filter((card) => card.price <= extracted.budget!) : hotelCards;
    const affordablePackageCards = hasBudget ? packageCards.filter((card) => card.price <= extracted.budget!) : packageCards;
    let externalSuggestions: RecommendationCard[] = [];
    const isTripPlannerMode = input.mode === "trip_planner";
    const shouldAskFirst = isTripPlannerMode && (intent === "package" || intent === "itinerary") && followUpQuestions.length > 0;
    const hasAffordableStayOption = affordableHotelCards.length > 0 || affordablePackageCards.length > 0;

    // For package intent, keep recommendations package-first so UI buckets don't get dominated by hotels.
    const cards: RecommendationCard[] = (() => {
      if (shouldAskFirst) {
        return [];
      }

      if (intent === "package") {
        if (affordablePackageCards.length) return affordablePackageCards;
        if (hasBudget) {
          externalSuggestions = buildExternalPackageCards(destination, extracted.budget);
          return externalSuggestions;
        }
        if (packageCards.length) return packageCards;
        externalSuggestions = buildExternalPackageCards(destination, extracted.budget);
        return externalSuggestions;
      }

      if (intent === "hotel") {
        if (affordableHotelCards.length) return affordableHotelCards;
        if (hasBudget) {
          externalSuggestions = buildExternalBookingCards(intent, destination, extracted.budget);
          return externalSuggestions;
        }
        return hotelCards;
      }

      if (intent === "itinerary") {
        const itineraryCards = isTripPlannerMode
          ? [...affordablePackageCards, ...travelCards]
          : [...affordablePackageCards, ...affordableHotelCards, ...travelCards];
        if (itineraryCards.length) return itineraryCards;
        if (hasBudget) {
          externalSuggestions = isTripPlannerMode
            ? buildExternalPackageCards(destination, extracted.budget)
            : buildExternalBookingCards(intent, destination, extracted.budget);
          return externalSuggestions;
        }
        return isTripPlannerMode ? [...packageCards, ...travelCards] : [...packageCards, ...hotelCards, ...travelCards];
      }

      return [...travelCards, ...packageCards, ...hotelCards];
    })();

    // If user asked with a budget but no affordable stay/package exists, always surface external stay links.
    if (hasBudget && !hasAffordableStayOption && !externalSuggestions.length && (intent === "hotel" || intent === "package" || intent === "itinerary")) {
      externalSuggestions = buildExternalBookingCards(intent, destination, extracted.budget);
    }

    const buckets = buildRecommendationBuckets(cards);
    context.recommendations = buckets;
    if (externalSuggestions.length) {
      context.externalSuggestions = externalSuggestions;
      context.fallbackReason = "no_budget_match_in_inventory";
    }

    const recommendationSummary = summarizeRecommendations(cards);
    const dynamicUiActions = getUiActions(cards, followUpQuestions);
    context.aiFlow = {
      stage: missingFields.length ? "collecting_requirements" : cards.length ? "ready_to_book" : "researching_options",
      mode: input.mode ?? "assistant",
      userMessage: input.message,
      structuredIntent: extracted,
      missingFields,
      executedServices: {
        hotelSearch: Boolean(hotelResults),
        packageSearch: packageResults.length > 0,
        flightSearch: flightResults.length > 0,
        busSearch: busResults.length > 0,
        trainSearch: trainResults.length > 0
      },
      actions: dynamicUiActions
    };

    const basePrompt = `You are StayEase AI, a practical travel advisor inspired by TripAdvisor-style guidance.
  Always respond in clear, natural language and never output JSON.
  Use this exact response structure when options are available:
  Quick Take: one short summary sentence.
  Top Picks: 2-3 bullets with cheapest first, then best value, then premium.
  Why These Work: one short line linking picks to user budget/dates/preferences.
  Smart Tips: 1-2 actionable travel tips (timing, area, booking strategy).
  Next Step: one clear action to continue booking.
  If key details are missing, ask exactly one short follow-up question and stop.
  Ask missing requirements in this order: destination, dates, budget, travellers, preferences.
  Use INR (₹) unless user asks another currency.`;

    const tripPlannerPrompt = `You are StayEase Trip Planner AI with a TripAdvisor-like advisor tone.
  Goal: convert user messages into guided planning with clear, ranked recommendations.
  Be concise and useful, not salesy.
  If details are missing, ask one crisp question and wait.
  If options exist, rank cheapest first and explain why in plain language.
  Always end with a concrete next click/action (compare, open details, or checkout).`;

    let responseText = "";

    const advisorGrounding = buildAdvisorGrounding(cards, buckets, externalSuggestions, followUpQuestions);

    if (xaiClient) {
      try {
        const completion = await xaiClient.chat.completions.create({
          model: aiDefaultModel,
          temperature: 0.4,
          messages: [
            { role: "system", content: input.mode === "trip_planner" ? tripPlannerPrompt : basePrompt },
            { role: "system", content: `Recent chat history from this active session only:\n${chatHistoryText}` },
            {
              role: "user",
              content: `User message: ${input.message}\n\nStructured intent: ${JSON.stringify(extracted)}\n\nMissing fields: ${missingFields.join(", ") || "none"}\n\nAvailable recommendation summary: ${recommendationSummary}\n\nAdvisor grounding:\n${advisorGrounding}\n\nUI actions: ${JSON.stringify(dynamicUiActions)}`
            }
          ]
        });

        responseText = normalizeAssistantResponse(
          completion.choices[0]?.message?.content ?? "I could not generate a response right now."
        );
      } catch (error: any) {
        const code = getProviderErrorCode(error);
        const providerMessage = getProviderErrorMessage(error);

        const invalidApiKey =
          code === 400 &&
          typeof providerMessage === "string" &&
          providerMessage.toLowerCase().includes("incorrect api key");

        if (invalidApiKey) {
          responseText =
            "AI authentication failed. Please set a valid API key for the configured provider and restart the backend.";
        } else if (code === 429) {
          responseText =
            "The AI provider is currently rate-limited. Please retry in a few seconds.";
        } else {
          responseText =
            "The AI provider is temporarily unavailable. Please try again shortly.";
        }

        console.warn(`${aiProvider} chat fallback:`, { code, providerMessage });
      }
    } else {
      responseText = "AI is configured in fallback mode. Add XAI_API_KEY for intelligent recommendations.";
    }

    if (externalSuggestions.length) {
      responseText = `I could not find matching StayEase options in your budget, so I added trusted external choices with links and images below.\n\n${responseText}`;
    }

    if (followUpQuestions.length && !responseText.match(/\?|choose|share|tell me|what|where/i)) {
      responseText = followUpQuestions[0];
    }

    let log;
    const responseCandidates = [
      responseText,
      truncateForChatLog(responseText, 120),
      truncateForChatLog(responseText, 60),
      truncateForChatLog(responseText, 30),
      "Response truncated"
    ];

    let lastError: unknown;
    for (const candidate of responseCandidates) {
      try {
        log = await prisma.chatLog.create({
          data: {
            userId: input.userId,
            query: input.message,
            response: candidate,
            context: context as any
          }
        });
        lastError = undefined;
        break;
      } catch (error: any) {
        if (error?.code === "P2000") {
          lastError = error;
          continue;
        }
        throw error;
      }
    }

    if (!log) {
      if (lastError) {
        try {
          log = await prisma.chatLog.create({
            data: {
              userId: input.userId,
              query: input.message,
              response: "OK",
              context: context as any
            }
          });
        } catch {
          throw lastError;
        }
      } else {
        throw new Error("Failed to persist chat log");
      }
    }

    return {
      message: responseText,
      context,
      followUpQuestions,
      chatLogId: log.id
    };
  }
};
