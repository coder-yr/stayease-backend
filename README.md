# StayEase Backend (Production-Ready)

Node.js + Express backend for a travel platform (MakeMyTrip / Airbnb style) with Supabase PostgreSQL, Supabase Auth, AdminJS, OpenAI chatbot, and external flight/hotel integrations.

## Features

- JWT auth with Supabase Auth
- Role-based access (`user`, `admin`)
- Hotels search with pagination/filtering
- Flights search with Amadeus integration + cache fallback
- Booking workflow for hotel/flight
- AI assistant endpoint (`POST /api/chat`) with optional real data context
- Rule-based recommendation system
- AdminJS dashboard for CRUD (users, hotels, bookings, chat logs, flights)
- Input validation (`zod`), error middleware, rate limiting, structured logging

## Folder Structure

```text
backend/
  src/
    admin/
    config/
    controllers/
    middlewares/
    models/
    routes/
    services/
    types/
    utils/
    app.ts
    server.ts
  prisma/schema.prisma
  supabase/schema.sql
```

## Setup

1. Install backend dependencies:
   - `cd backend`
   - `npm install`
2. Create env file:
   - `copy .env.example .env`
3. Fill `.env` with your Supabase/OpenAI/API credentials.
4. Generate Prisma client:
   - `npm run prisma:generate`
5. Push schema to Supabase DB:
   - `npm run prisma:push`
6. Run SQL bootstrap (tables, indexes, RLS, auth trigger):
   - Execute [supabase/schema.sql](supabase/schema.sql) in Supabase SQL editor.
7. (Optional) Load starter hotel/flight data:
  - Execute [supabase/seed.sql](supabase/seed.sql) in Supabase SQL editor.
8. Start development server:
   - `npm run dev`

Default admin bootstrap:
- If `ADMIN_DEFAULT_EMAIL` and `ADMIN_DEFAULT_PASSWORD` are set in `.env`, backend startup will auto-create (or update) this Supabase user and enforce `role=admin` in `public.users`.
- You can then log into AdminJS at `/admin` with those same credentials.

API base URL: `https://stayease-backend-ma1c.onrender.com`
Admin panel: `https://stayease-backend-ma1c.onrender.com/admin`

## API Routes

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/hotels`
- `GET /api/hotels/:id`
- `GET /api/flights`
- `POST /api/bookings`
- `GET /api/bookings/mine`
- `PATCH /api/bookings/:id/status` (admin)
- `POST /api/chat`
- `GET /api/recommendations`

## Sample JSON Responses

### `GET /api/hotels?location=goa&minPrice=50&maxPrice=200&page=1&limit=10`

```json
{
  "success": true,
  "message": "Hotels fetched",
  "data": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 42,
      "totalPages": 5
    },
    "items": [
      {
        "id": "1cb2...",
        "name": "Sea Breeze Resort",
        "location": "Goa",
        "price": "120.00",
        "rating": "4.60",
        "amenities": ["wifi", "pool"],
        "images": ["https://..."],
        "description": "Beachfront stay",
        "createdAt": "2026-03-28T10:00:00.000Z",
        "updatedAt": "2026-03-28T10:00:00.000Z"
      }
    ],
    "external": []
  }
}
```

### `GET /api/flights?source=BOM&destination=DEL&date=2026-04-11`

```json
{
  "success": true,
  "message": "Flights fetched",
  "data": {
    "source": "amadeus",
    "items": [
      {
        "externalId": "1",
        "airline": "AI",
        "source": "BOM",
        "destination": "DEL",
        "departureTime": "2026-04-11T02:25:00.000Z",
        "arrivalTime": "2026-04-11T04:35:00.000Z",
        "duration": "PT2H10M",
        "stops": 0,
        "cabinClass": "ECONOMY",
        "price": 92.34,
        "currency": "USD"
      }
    ]
  }
}
```

### `POST /api/chat`

```json
{
  "success": true,
  "message": "Chat response generated",
  "data": {
    "message": "For cheap hotels in Goa, focus on Calangute and Candolim. Here are top matches under your budget...",
    "context": {
      "intent": "hotel",
      "hotels": {
        "pagination": { "page": 1, "limit": 5, "total": 30, "totalPages": 6 }
      }
    },
    "chatLogId": "7f55..."
  }
}
```

## Frontend Integration Notes

Current frontend currently uses mock services. To switch to backend:

- Replace in-memory service calls with HTTP calls to these endpoints.
- Pass Supabase session access token in `Authorization: Bearer <token>` for protected routes.
- Keep UI models unchanged where possible by mapping response fields (`price`, `rating`, images).

## Production Notes

- Set `NODE_ENV=production` and strong session secrets.
- Restrict CORS origin to your deployed frontend domain.
- Rotate API keys and use server-side secret stores.
- Add monitoring/alerting (Sentry, Datadog, etc.) and DB backups.
