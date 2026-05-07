# UniSage Admin Dashboard

Next.js 14 admin dashboard for managing UniSage educational content — subjects, units, notes, flashcards, quizzes, and users.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS + hand-written shadcn/ui components
- **UI Primitives:** Radix UI
- **Rich Text Editor:** Tiptap
- **Data Fetching:** SWR
- **Forms:** react-hook-form + Zod validation
- **Charts:** Recharts
- **Toasts:** Sonner
- **Icons:** Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- Backend API running on `http://localhost:3000`

### Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server (port 3001)
npm run dev
```

### Environment Variables

| Variable              | Description     | Default                 |
| --------------------- | --------------- | ----------------------- |
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3000` |

## Project Structure

```
admin/
├── app/
│   ├── layout.tsx              # Root layout (Inter font + Toaster)
│   ├── page.tsx                # Redirects to /login
│   ├── globals.css             # Tailwind + custom styles
│   ├── not-found.tsx           # 404 page
│   ├── login/page.tsx          # Login page
│   ├── (auth)/layout.tsx       # Auth layout wrapper
│   └── (dashboard)/
│       ├── layout.tsx          # Dashboard layout (Sidebar)
│       └── dashboard/
│           ├── page.tsx        # Dashboard home
│           ├── subjects/       # Subjects CRUD
│           ├── users/          # User management
│           └── analytics/      # Analytics charts
├── components/
│   ├── ui/                     # shadcn-style primitives
│   ├── layout/                 # Sidebar, TopBar, Breadcrumb
│   ├── shared/                 # DataTable, StatCard, EmptyState, etc.
│   └── forms/                  # SubjectForm, UnitForm, NotesEditor, etc.
├── lib/
│   ├── api.ts                  # API client with JWT auth
│   ├── auth.ts                 # Token management
│   ├── utils.ts                # Utility functions
│   ├── validations.ts          # Zod schemas
│   ├── design-system.ts        # Design tokens
│   └── hooks/                  # SWR data hooks
└── middleware.ts               # Route protection
```

## Available Scripts

| Script          | Description                   |
| --------------- | ----------------------------- |
| `npm run dev`   | Start dev server on port 3001 |
| `npm run build` | Production build              |
| `npm run start` | Start production server       |
| `npm run lint`  | Run ESLint                    |

## Features

- **Authentication:** JWT-based admin login with role verification
- **Subject Management:** Full CRUD with year/semester filtering
- **Unit Management:** Create and organize units within subjects
- **Content Editor:** Rich text notes (Tiptap), batch flashcards, quiz builder
- **User Management:** View/delete users with role badges
- **Analytics:** Charts for user growth, content breakdown, subject distribution
- **Responsive:** Collapsible sidebar, mobile-friendly layouts

## Deployment

Designed for **Vercel**:

```bash
npm run build
```

Set `NEXT_PUBLIC_API_URL` to your production backend URL in Vercel environment variables.
