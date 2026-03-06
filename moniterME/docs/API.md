# HealthyFi API Reference

Base URL: `http://localhost:5000/api` (or your deployed URL)

## Authentication

### POST /auth/register

Register a new user.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response (201):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2025-02-28T..."
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### POST /auth/login

Login and receive JWT.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": { "id": "uuid", "name": "John Doe", "email": "john@example.com" },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

## Protected Endpoints

All endpoints below require:
```
Authorization: Bearer <your-jwt-token>
```

---

## Food

### POST /food

Log food with AI-powered macro calculation.

**Request:**
```json
{
  "food_text": "2 dosa with coconut chutney",
  "date": "2025-02-28"
}
```
`date` is optional; defaults to today.

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "foodName": "2 dosa with coconut chutney",
    "calories": 320,
    "protein": 8,
    "carbs": 45,
    "fats": 12,
    "date": "2025-02-28",
    "createdAt": "2025-02-28T..."
  }
}
```

### GET /food

Get food logs for a date.

**Query:** `?date=2025-02-28` (optional, defaults to today)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "food_name": "2 dosa with coconut chutney",
      "calories": 320,
      "protein": 8,
      "carbs": 45,
      "fats": 12,
      "date": "2025-02-28",
      "created_at": "2025-02-28T..."
    }
  ]
}
```

---

## Water

### POST /water

Log water intake.

**Request:**
```json
{
  "amount_ml": 250,
  "date": "2025-02-28"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "amountMl": 250,
    "date": "2025-02-28",
    "createdAt": "2025-02-28T..."
  }
}
```

### GET /water/today

Get total water intake for today.

**Response (200):**
```json
{
  "success": true,
  "data": { "totalMl": 1500 }
}
```

---

## Workout

### POST /workout/session

Create a new workout session.

**Request:**
```json
{ "date": "2025-02-28" }
```
`date` optional.

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "date": "2025-02-28",
    "createdAt": "2025-02-28T..."
  }
}
```

### POST /workout/exercise

Add exercise to a session.

**Request:**
```json
{
  "session_id": "uuid",
  "exercise_name": "Bench Press",
  "sets": 3,
  "reps": 10,
  "weight": 60
}
```
`weight` is optional (in kg).

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "workoutSessionId": "uuid",
    "exerciseName": "Bench Press",
    "sets": 3,
    "reps": 10,
    "weight": 60,
    "createdAt": "2025-02-28T..."
  }
}
```

### GET /workout/history

Get workout history.

**Query:** `?limit=30` (optional, default 30)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "date": "2025-02-28",
      "createdAt": "2025-02-28T...",
      "exercises": [
        {
          "id": "uuid",
          "exerciseName": "Bench Press",
          "sets": 3,
          "reps": 10,
          "weight": 60
        }
      ]
    }
  ]
}
```

---

## Goals

### POST /goals

Create or update goals. Only provided fields are updated.

**Request:**
```json
{
  "calorie_goal": 2000,
  "protein_goal": 150,
  "water_goal": 2500,
  "target_weight": 70.5
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "calorieGoal": 2000,
    "proteinGoal": 150,
    "waterGoal": 2500,
    "targetWeight": 70.5,
    "updatedAt": "2025-02-28T..."
  }
}
```

### GET /goals

Get current goals.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "calorieGoal": 2000,
    "proteinGoal": 150,
    "waterGoal": 2500,
    "targetWeight": 70.5,
    "updatedAt": "2025-02-28T..."
  }
}
```
Returns `null` if no goals set.

---

## Dashboard

### GET /dashboard/today

Get today's aggregated data and goal completion.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "date": "2025-02-28",
    "totals": {
      "calories": 1850,
      "protein": 95,
      "carbs": 220,
      "fats": 65,
      "waterMl": 2000,
      "workoutCount": 1
    },
    "goals": {
      "calorieGoal": 2000,
      "proteinGoal": 150,
      "waterGoal": 2500,
      "targetWeight": 70
    },
    "completion": {
      "calories": 92,
      "protein": 63,
      "water": 80
    }
  }
}
```
`completion` values are percentages (0–100). Null if goal not set.

---

## Error Responses

All errors return:
```json
{
  "success": false,
  "error": "Error message"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request (validation) |
| 401 | Unauthorized (invalid/expired token) |
| 404 | Not found |
| 500 | Server error |
