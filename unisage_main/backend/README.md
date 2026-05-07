# UniSage Backend API

> REST API for UniSage — a study platform for UPES Computer Science Engineering students.

## Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js 4.x
- **Database:** Supabase (PostgreSQL)
- **Auth:** Custom JWT (bcrypt + jsonwebtoken)
- **Validation:** Joi
- **Logging:** Winston with daily rotate files
- **Cache:** node-cache (in-memory)
- **Deployment:** Railway.app

---

## Quick Start

### 1. Clone and Install

```bash
cd backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your Supabase credentials:

| Variable               | Description                                                        |
| ---------------------- | ------------------------------------------------------------------ |
| `SUPABASE_URL`         | Your Supabase project URL (e.g., `https://abc123.supabase.co`)     |
| `SUPABASE_SERVICE_KEY` | Service role key from Supabase dashboard → Settings → API          |
| `SUPABASE_ANON_KEY`    | Anon/public key from Supabase dashboard → Settings → API           |
| `JWT_SECRET`           | Random 32+ character string (generate with `openssl rand -hex 32`) |
| `JWT_EXPIRES_IN`       | Token expiry (default: `7d`)                                       |
| `CORS_ORIGIN`          | Comma-separated allowed origins                                    |
| `PORT`                 | Server port (default: `3000`)                                      |

### 3. Set Up Database

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `database/schema.sql`
4. Run the SQL to create all tables, indexes, and RLS policies

### 4. Run Locally

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

The server starts at `http://localhost:3000`. Test the health check:

```bash
curl http://localhost:3000/health
```

---

## Deploy to Railway

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### 2. Deploy on Railway

1. Go to [railway.app](https://railway.app) and create a new project
2. Select **Deploy from GitHub repo**
3. Add the following environment variables in Railway dashboard:
   - `NODE_ENV=production`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `SUPABASE_ANON_KEY`
   - `JWT_SECRET`
   - `CORS_ORIGIN` (your frontend URL)
4. Railway auto-detects the `railway.json` and deploys

The health check at `/health` is used by Railway to verify the deployment.

---

## API Documentation

### Base URL

- **Local:** `http://localhost:3000`
- **Production:** Your Railway URL

### Response Format

**Success:**

```json
{
  "success": true,
  "data": { ... },
  "pagination": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 }
}
```

**Error:**

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "User-friendly message"
  }
}
```

### Authentication

All protected endpoints require the `Authorization` header:

```
Authorization: Bearer <JWT_TOKEN>
```

---

### Endpoints

#### Auth

| Method | Endpoint           | Auth | Description              |
| ------ | ------------------ | ---- | ------------------------ |
| POST   | `/api/auth/signup` | No   | Register new user        |
| POST   | `/api/auth/login`  | No   | Login (returns JWT)      |
| POST   | `/api/auth/logout` | Yes  | Logout                   |
| GET    | `/api/auth/me`     | Yes  | Get current user profile |
| PUT    | `/api/auth/me`     | Yes  | Update profile           |

#### Subjects

| Method | Endpoint                  | Auth | Description                          |
| ------ | ------------------------- | ---- | ------------------------------------ |
| GET    | `/api/subjects`           | No   | List subjects (`?year=1&semester=1`) |
| GET    | `/api/subjects/:id`       | No   | Get subject with units               |
| GET    | `/api/subjects/:id/units` | No   | Get units for a subject              |

#### Units

| Method | Endpoint                 | Auth | Description                 |
| ------ | ------------------------ | ---- | --------------------------- |
| GET    | `/api/units/:id`         | No   | Get single unit             |
| GET    | `/api/units/:id/content` | No   | Get content grouped by type |

#### Content

| Method | Endpoint                 | Auth | Description             |
| ------ | ------------------------ | ---- | ----------------------- |
| GET    | `/api/content?type=quiz` | No   | Get content by type     |
| GET    | `/api/content/:id`       | No   | Get single content item |

#### Progress

| Method | Endpoint                           | Auth | Description            |
| ------ | ---------------------------------- | ---- | ---------------------- |
| GET    | `/api/progress`                    | Yes  | Get all progress       |
| GET    | `/api/progress/subject/:subjectId` | Yes  | Progress for a subject |
| POST   | `/api/progress`                    | Yes  | Mark content completed |
| PUT    | `/api/progress/:id`                | Yes  | Update progress        |

#### Quiz

| Method | Endpoint                                | Auth | Description          |
| ------ | --------------------------------------- | ---- | -------------------- |
| POST   | `/api/quiz/attempt`                     | Yes  | Submit quiz attempt  |
| GET    | `/api/quiz/attempts/user`               | Yes  | Get user's attempts  |
| GET    | `/api/quiz/attempts/content/:contentId` | Yes  | Attempts for content |

#### Bookmarks

| Method | Endpoint             | Auth | Description     |
| ------ | -------------------- | ---- | --------------- |
| GET    | `/api/bookmarks`     | Yes  | List bookmarks  |
| POST   | `/api/bookmarks`     | Yes  | Add bookmark    |
| DELETE | `/api/bookmarks/:id` | Yes  | Remove bookmark |

#### Study Sessions

| Method | Endpoint                | Auth | Description      |
| ------ | ----------------------- | ---- | ---------------- |
| POST   | `/api/sessions/start`   | Yes  | Start session    |
| PUT    | `/api/sessions/:id/end` | Yes  | End session      |
| GET    | `/api/sessions/stats`   | Yes  | Study statistics |

#### Admin (requires admin role)

| Method | Endpoint                         | Description        |
| ------ | -------------------------------- | ------------------ |
| POST   | `/api/admin/subjects`            | Create subject     |
| PUT    | `/api/admin/subjects/:id`        | Update subject     |
| DELETE | `/api/admin/subjects/:id`        | Delete subject     |
| POST   | `/api/admin/units`               | Create unit        |
| PUT    | `/api/admin/units/:id`           | Update unit        |
| DELETE | `/api/admin/units/:id`           | Delete unit        |
| POST   | `/api/admin/content`             | Create content     |
| PUT    | `/api/admin/content/:id`         | Update content     |
| DELETE | `/api/admin/content/:id`         | Delete content     |
| PUT    | `/api/admin/content/:id/publish` | Publish/unpublish  |
| GET    | `/api/admin/users`               | List all users     |
| GET    | `/api/admin/analytics`           | Platform analytics |

---

## Testing with curl

### Register

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@test.com",
    "password": "Test1234",
    "fullName": "Test Student",
    "year": 2
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "student@test.com", "password": "Test1234"}'
```

### Get Subjects (with filter)

```bash
curl http://localhost:3000/api/subjects?year=1&semester=1
```

### Get Profile (authenticated)

```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Mark Content Completed

```bash
curl -X POST http://localhost:3000/api/progress \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"contentId": "CONTENT_UUID", "timeSpent": 120}'
```

### Submit Quiz

```bash
curl -X POST http://localhost:3000/api/quiz/attempt \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "contentId": "QUIZ_CONTENT_UUID",
    "score": 8,
    "totalQuestions": 10,
    "answers": {"0": 1, "1": 3, "2": 0},
    "timeTaken": 300
  }'
```

### Admin: Create Subject

```bash
curl -X POST http://localhost:3000/api/admin/subjects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{
    "branchId": "BRANCH_UUID",
    "name": "Data Structures",
    "code": "CS201",
    "year": 2,
    "semester": 3,
    "credits": 4,
    "description": "Introduction to data structures and algorithms"
  }'
```

---

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js          # Supabase client setup
│   │   └── env.js               # Environment variable validation
│   ├── middleware/
│   │   ├── auth.js              # JWT auth middleware
│   │   ├── adminAuth.js         # Admin role check
│   │   ├── errorHandler.js      # Global error handler
│   │   ├── validation.js        # Joi validation middleware
│   │   └── rateLimiter.js       # Rate limiting
│   ├── routes/                  # Route definitions (9 files)
│   ├── controllers/             # Request handlers (9 files)
│   ├── services/                # Business logic
│   │   ├── auth.service.js      # Auth operations
│   │   ├── content.service.js   # Content + caching
│   │   └── analytics.service.js # Stats aggregation
│   ├── utils/
│   │   ├── jwt.js               # Token helpers
│   │   ├── validators.js        # Joi schemas
│   │   ├── logger.js            # Winston setup
│   │   └── errors.js            # Custom error classes
│   └── app.js                   # Express entry point
├── database/
│   └── schema.sql               # Complete database schema
├── .env.example
├── .gitignore
├── package.json
├── railway.json
└── README.md
```

---

## License

ISC
