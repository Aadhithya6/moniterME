# HealthyFi - AI-Powered Fitness Tracking

A production-ready multi-user health tracking system with AI-based macro calculation, workout logging, water tracking, and goal monitoring.

## Architecture Overview

### Clean Architecture

The project follows clean architecture principles with clear separation of concerns:

```
moniterme/
├── backend/                 # Express.js API
│   ├── config/              # Database, app config
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Auth, error handling
│   ├── routes/             # API route definitions
│   ├── services/           # Business logic
│   ├── utils/              # Helpers (AppError)
│   ├── app.js              # Express app setup
│   └── server.js           # Entry point
├── frontend/               # React (Vite)
│   └── src/
│       ├── pages/          # Page components
│       ├── components/     # Reusable UI
│       ├── contexts/       # Auth context
│       └── lib/            # API client
└── database/
    └── schema.sql          # PostgreSQL schema
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express.js |
| Database | PostgreSQL (pg driver) |
| Auth | JWT, bcrypt |
| AI | OpenAI API (macro calculation) |
| Frontend | React 18 (Vite), Tailwind CSS, Recharts |
| HTTP Client | Axios |

### Data Flow

1. **Authentication**: JWT stored in localStorage, sent via `Authorization: Bearer <token>` header
2. **User Isolation**: All queries filter by `user_id` from decoded JWT
3. **Food AI**: User input → OpenAI → JSON macros → validated → stored
4. **Dashboard**: Aggregates food, water, workouts for today; compares to goals

---

## Environment Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- OpenAI API key

### 1. Database Setup

```bash
# Create database
createdb healthyfi

# Run schema
psql -d healthyfi -f database/schema.sql
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your values:
# - DATABASE_URL=postgresql://user:password@localhost:5432/healthyfi
# - JWT_SECRET=<strong-random-secret>
# - OPENAI_API_KEY=sk-...

npm install
npm run dev
```

Backend runs at `http://localhost:5000`.

### 3. Frontend Setup

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local:
# - VITE_API_URL=http://localhost:5000

npm install
npm run dev
```

Frontend runs at `http://localhost:3000`.

---

## API Documentation

Base URL: `http://localhost:5000/api`

### Authentication

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | `{ name, email, password }` | Register new user |
| POST | `/auth/login` | `{ email, password }` | Login, returns JWT |

**Protected routes** require header: `Authorization: Bearer <token>`

### Food

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/food` | `{ food_text, date? }` | Log food (AI calculates macros) |
| GET | `/food?date=YYYY-MM-DD` | - | Get food logs for date |

### Water

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/water` | `{ amount_ml, date? }` | Log water intake |
| GET | `/water/today` | - | Get today's total water |

### Workout

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/workout/session` | `{ date? }` | Create workout session |
| POST | `/workout/exercise` | `{ session_id, exercise_name, sets, reps, weight? }` | Add exercise |
| GET | `/workout/history?limit=30` | - | Get workout history |

### Goals

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/goals` | `{ calorie_goal?, protein_goal?, water_goal?, target_weight? }` | Set/update goals |
| GET | `/goals` | - | Get current goals |

### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard/today` | Today's totals + goal completion % |

**Dashboard response:**
```json
{
  "success": true,
  "data": {
    "date": "2025-02-28",
    "totals": {
      "calories": 450,
      "protein": 12,
      "carbs": 65,
      "fats": 15,
      "waterMl": 500,
      "workoutCount": 1
    },
    "goals": { "calorieGoal": 2000, "proteinGoal": 150, "waterGoal": 2500 },
    "completion": { "calories": 22, "protein": 8, "water": 20 }
  }
}
```

---

## Deployment

### Backend

- Set `NODE_ENV=production`
- Use a process manager (PM2) or container (Docker)
- Ensure `DATABASE_URL` uses SSL in production
- Use a strong `JWT_SECRET`

### Frontend

```bash
npm run build
npm run preview
```

Set `VITE_API_URL` to your production API URL.

### Database

- Run migrations (schema.sql) on production DB
- Ensure indexes exist for performance
- Consider connection pooling (PgBouncer) for scale

---

## License

MIT
