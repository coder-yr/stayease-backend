import { prisma } from "../config/prisma.js";
import { aiDefaultModel, aiProvider, xaiClient } from "../config/openai.js";
import { env } from "../config/env.js";
import { hotelService } from "./hotelService.js";

type ChatInput = {
  userId?: string;
  message: string;
};

const truncateForChatLog = (text: string, maxChars: number) => {
  if (maxChars <= 0) return "";
  if (text.length <= maxChars) return text;
  if (maxChars <= 3) return text.slice(0, maxChars);
  return `${text.slice(0, maxChars - 3)}...`;
};

const detectIntent = (message: string) => {
  const text = message.toLowerCase();

  if (text.includes("hotel") || text.includes("stay")) return "hotel";
  if (text.includes("flight") || text.includes("fly")) return "flight";
  if (text.includes("bus") || text.includes("coach")) return "bus";
  if (text.includes("train") || text.includes("rail")) return "train";
  if (text.includes("itinerary") || text.includes("plan")) return "itinerary";
  return "general";
};

const extractLocation = (message: string) => {
  const locationMatch = message.match(/in\s+([a-zA-Z\s]+)/i);
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
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        return `${label}:\n${jsonToReadableText(val as Record<string, unknown>, indent + 1)}`;
      }
      const prefix = indent > 0 ? '  • ' : '📌 ';
      return `${prefix}${label}: ${val}`;
    })
    .join('\n');
};

const normalizeAssistantResponse = (text: string) => {
  const trimmed = text.trim();
  const fencedJson = trimmed.match(/^```json\s*([\s\S]*?)\s*```$/i);
  const fencedText = trimmed.match(/^```\s*([\s\S]*?)\s*```$/i);
  const candidate = fencedJson?.[1] ?? fencedText?.[1] ?? trimmed;

  try {
    const parsed = JSON.parse(candidate);
    if (typeof parsed === "string") return parsed.trim();
    if (parsed && typeof parsed === "object") {
      // Try known text fields first
      const maybeResponse = (parsed as Record<string, unknown>).response;
      if (typeof maybeResponse === "string") return maybeResponse.trim();
      const maybeMessage = (parsed as Record<string, unknown>).message;
      if (typeof maybeMessage === "string") return maybeMessage.trim();
      // Convert the whole JSON object to readable text as a last resort
      return jsonToReadableText(parsed as Record<string, unknown>);
    }
  } catch {
    // Not JSON, fall through to plain text.
  }

  return candidate.replace(/^\"|\"$/g, "").trim();
};

export const chatService = {
  async respond(input: ChatInput) {
    const intent = detectIntent(input.message);
    const context: Record<string, unknown> = { intent };
    const location = extractLocation(input.message);
    const route = extractRoute(input.message);

    if (intent === "hotel" || intent === "itinerary") {
      context.hotels = await hotelService.search({ location, limit: 5, page: 1 });
    }

    if (intent === "flight" || intent === "itinerary") {
      context.flights = {
        items: await searchFlightsFromDb(route?.source?.toUpperCase(), route?.destination?.toUpperCase())
      };
    }

    if (intent === "bus" || intent === "itinerary") {
      context.buses = await searchBusesFromDb(route?.source, route?.destination);
    }

    if (intent === "train" || intent === "itinerary") {
      context.trains = await searchTrainsFromDb(route?.source, route?.destination);
    }

    const basePrompt = `You are StayEase AI, a warm and helpful travel assistant for an Indian travel platform called StayEase. 
Always respond in clear, natural, conversational language — NEVER use JSON, code blocks, or raw data objects in your response.
Format your answers in a clean, readable way:
- Use bullet points (•) for lists
- Use short paragraphs for explanations
- Use emojis sparingly to make responses friendly
- Include INR (₹) for all prices
- Be concise but helpful
If hotel, flight, bus, or train context data is provided, weave the real details into your natural-language response.`;

    let responseText = "";

    if (xaiClient) {
      try {
        const stream = await xaiClient.chat.completions.create({
          model: aiDefaultModel,
          messages: [
            { role: "system", content: basePrompt },
            {
              role: "user",
              content: `User message: ${input.message}\n\nContext: ${JSON.stringify(context)}`
            }
          ],
          stream: true
        });

        const chunks: string[] = [];
        for await (const chunk of stream) {
          const content = chunk?.choices?.[0]?.delta?.content;
          if (content) chunks.push(content);
        }

        responseText = normalizeAssistantResponse(
          chunks.join("").trim() || "I could not generate a response right now."
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

        // Surface provider details in logs without failing the user request.
        console.warn(`${aiProvider} chat fallback:`, { code, providerMessage });
      }
    } else {
      responseText = "AI is configured in fallback mode. Add XAI_API_KEY for intelligent recommendations.";
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
      chatLogId: log.id
    };
  }
};
