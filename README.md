# BeautyVillage

**עברית:** BeautyVillage היא פלטפורמת הזמנת תורים מקומית לעסקי יופי (מספרות, קוסמטיקאיות, מניקור-פדיקור ועוד). לקוחות יכולים לחפש עסקים, לצפות בשירותים ובביקורות, ולקבוע תורים באופן מקוון. בעלי עסקים מנהלים את פרופיל העסק, השירותים והתורים שלהם דרך דשבורד ייעודי, ומנהל המערכת מפקח על אישור עסקים, ניהול משתמשים וניהול תוכן.

**English:** BeautyVillage is a local beauty-business appointment booking platform (hair salons, cosmeticians, nail studios, etc.). Customers can search businesses, view services and reviews, and book appointments online. Business owners manage their business profile, services, and appointments through a dedicated dashboard, and an admin oversees business approval, user management, and content moderation.

This project is a solo student final project for an Advanced Full Stack course. It extends a lecturer-provided Node.js/Express/TypeScript/MongoDB backend scaffold and a React/Vite/TypeScript frontend scaffold with a complete application built on top.

## Features

- Public business search/browsing with category and text filters
- Business detail pages with services, working hours, portfolio images, and reviews
- Online appointment booking with time-slot selection
- Customer reviews and star ratings for completed appointments
- Business owner dashboard: business profile, services, portfolio media, appointment management
- Business submission and admin approval workflow (pending / approved / rejected / suspended)
- Admin dashboard: platform stats, business approval, user activation/suspension, review moderation, category management
- Role-based access control (customer, business owner, admin)
- RTL, Hebrew-first UI

## Roles

| Role | Capabilities |
|---|---|
| Customer | Browse businesses, book appointments, leave reviews, submit a business for approval |
| Business owner | Everything a customer can do, plus manage their own business profile, services, portfolio, and incoming appointments |
| Admin | Approve/reject/suspend businesses, activate/suspend users, moderate reviews, manage categories, view platform stats |

## Frontend Tech

React 18, TypeScript, Vite, React Router v7 (with `React.lazy`/`Suspense` code-splitting), Redux Toolkit, React Context (auth), React Hook Form + Zod validation, Axios, Bootstrap 5.

## Backend Tech

Node.js, Express, TypeScript, MongoDB with Mongoose, JWT access/refresh authentication, Joi validation, Multer (in-DB media storage), Jest + Supertest, Swagger (partial coverage — see below).

## Folder Structure

```
beautyVillage/
├── Backend/
│   └── src/
│       ├── controllers/    # Route handler logic per resource
│       ├── middleware/     # Auth, optional-auth, upload, error handling
│       ├── models/         # Mongoose schemas
│       ├── routes/         # Express routers
│       ├── scripts/        # seed_admin, migrate_users (run manually)
│       ├── tests/          # Jest + Supertest suites
│       ├── types/          # Shared TypeScript types
│       ├── utils/          # Slugify, rating calc, appointment/business helpers
│       └── validations/    # Joi schemas
└── Fronend/                # (folder name as provided by the course scaffold)
    └── src/
        ├── Componnents/     # Shared UI components (name as provided by the scaffold)
        ├── contexts/        # AuthContext
        ├── custom_hooks/    # Data-fetching hooks per resource
        ├── pages/
        │   ├── public/      # Home, business list/detail, login/register
        │   ├── account/     # Profile, my appointments, submit business
        │   ├── dashboard/   # Business owner dashboard pages
        │   └── admin/       # Admin dashboard pages
        ├── redux/           # Store + slices
        ├── services/        # Axios-based API service modules
        ├── styles/          # Global theme (RTL, Assistant font)
        ├── types/           # Shared TypeScript types
        └── utils/           # Formatting/label helpers
```

## Installation

Requires **Node.js 22.x (recommended)** and access to a MongoDB database (Atlas or local).

```bash
git clone <this-repo>
cd beautyVillage/Backend && npm install
cd ../Fronend && npm install
```

## Backend Environment Setup

Copy `Backend/.env.example` to `Backend/.env_dev` (for development) and `Backend/.env_test` (for running tests), then fill in real values:

| Key | Purpose |
|---|---|
| `DB_CONNECT` | MongoDB connection string |
| `TOKEN_SECRET` | Secret used to sign JWT access/refresh tokens |
| `TOKEN_EXPIRATION` | Access token lifetime (e.g. `15m`) |
| `REFRESH_TOKEN_EXPIRATION` | Refresh token lifetime (e.g. `7d`) |
| `DOMAIN_BASE` | Base URL used to build absolute file links |
| `PORT` | Port the backend listens on (default `3000`) |
| `CLIENT_ORIGIN` | Frontend origin allowed by CORS (default `http://localhost:5173`) |

`.env_dev`/`.env_test`/`.env` are all git-ignored and must never be committed. Use **two separate MongoDB databases** (dev vs test) — the test suite clears its collections between runs.

## Frontend Environment Setup

Copy `Fronend/.env.example` to `Fronend/.env` and set:

| Key | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Base URL of the running backend (e.g. `http://localhost:3000`) |

## Running the Backend

```bash
cd Backend
npm run dev
```

This copies `.env_dev` over `.env` and starts the server with `nodemon` against your development database.

## Running the Frontend

```bash
cd Fronend
npm run dev
```

Opens the Vite dev server (default `http://localhost:5173`).

## Testing

```bash
cd Backend
npm test
```

This copies `.env_test` over `.env`, compiles, and runs the full Jest + Supertest suite (`--runInBand`) against the test database. **Do not run live manual/browser smoke tests concurrently with `npm test`** — they share the same test database and will race each other.

## Build

Backend:
```bash
cd Backend
npm run start   # copies .env_dev, compiles with tsc, runs the compiled app
```

Frontend:
```bash
cd Fronend
npm run build    # tsc -b && vite build
```

## Admin Bootstrap

To create the first admin account, set temporary shell variables (never stored in source) and run the seed script. In PowerShell:

```powershell
$env:SEED_ADMIN_EMAIL = "admin@example.com"
$env:SEED_ADMIN_PASSWORD = "choose-a-strong-password"
cd Backend
npm run seed:admin
```

The script is idempotent — it does nothing if an admin user already exists — and connects to whatever database is currently active in `.env` (by convention, the dev database, since `seed:admin` copies `.env_dev` first). Do not run it against a database you don't intend to seed.

## Optional: Legacy User Migration

`npm run migrate:users` backfills missing `role`/`isActive`/`name` fields on **pre-existing legacy user documents** created before those fields existed in the schema. It is **not needed on a freshly created database** — all users created through the current registration flow already have these fields. Only run it if importing an older dataset.

## API Overview

Full route list, grouped by resource. See the **Swagger** section below for the subset with live interactive docs.

### Auth (`/auth`)
| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public | Register a new user |
| POST | `/auth/login` | Public | Login, returns access + refresh tokens |
| POST | `/auth/logout` | Public | Logout |
| POST | `/auth/refresh` | Public | Refresh access token |
| GET | `/auth/me` | Authenticated | Get current user |

### Users (`/users`)
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/users` | Admin | List all users |
| GET | `/users/:id` | Authenticated | Get a user by id |
| PUT | `/users/:id` | Authenticated | Update own profile |
| PUT | `/users/:id/status` | Admin | Activate/suspend a user |

### Categories (`/categories`)
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/categories` | Public (admin sees inactive too) | List categories |
| POST | `/categories` | Admin | Create category |
| PUT | `/categories/:id` | Admin | Update / reactivate category |
| DELETE | `/categories/:id` | Admin | Soft-deactivate category |

### Businesses (`/businesses`)
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/businesses` | Public | List approved businesses |
| GET | `/businesses/:id` | Public | Business detail |
| GET | `/businesses/mine` | Business owner | Caller's own business |
| GET | `/businesses/pending` | Admin | Pending-approval list |
| GET | `/businesses/admin` | Admin | Full admin listing (any status) |
| POST | `/businesses` | Customer/Business owner | Submit a new business |
| PUT | `/businesses/:id` | Owner | Edit own business |
| PUT | `/businesses/:id/approve` | Admin | Approve business |
| PUT | `/businesses/:id/reject` | Admin | Reject business |
| PUT | `/businesses/:id/suspend` | Admin | Suspend business |
| POST | `/businesses/:id/logo` | Owner | Upload logo |
| POST | `/businesses/:id/cover` | Owner | Upload cover image |
| POST | `/businesses/:id/portfolio` | Owner | Add portfolio image |
| DELETE | `/businesses/:id/portfolio/:mediaId` | Owner | Remove portfolio image |

### Services (`/services`)
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/services/business/:businessId` | Public | List a business's services |
| POST | `/services` | Business owner | Create service |
| PUT | `/services/:id` | Owner | Update / reactivate service |
| DELETE | `/services/:id` | Owner | Soft-deactivate service |

### Media (`/media`)
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/media/business/:businessId` | Public | List a business's media |
| GET | `/media/:id` | Public | Fetch media bytes |

### Appointments (`/appointments`)
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/appointments/mine` | Authenticated | Caller's own appointments |
| GET | `/appointments/business/:businessId` | Business owner | Business's appointments |
| POST | `/appointments` | Customer/Business owner | Book an appointment |
| PUT | `/appointments/:id/status` | Business owner | Update appointment status |
| PUT | `/appointments/:id/cancel` | Authenticated | Cancel own appointment |

### Reviews (`/reviews`)
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/reviews/business/:businessId` | Public | Reviews for a business |
| GET | `/reviews/mine` | Customer/Business owner | Caller's own reviews |
| GET | `/reviews/admin` | Admin | All reviews for moderation |
| POST | `/reviews` | Customer/Business owner | Create review |
| PUT | `/reviews/:id/visibility` | Admin | Hide/show a review |

### Admin (`/admin`)
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/admin/stats` | Admin | Dashboard aggregate stats |

## Swagger

Interactive API docs are served at **`/api-docs`** when the backend is running (e.g. `http://localhost:3000/api-docs`).

**Limitation:** Swagger annotations were kept as originally scoped from the course scaffold (`Auth` routes and the legacy demo `Posts` routes only) and were **not expanded to the rest of the BeautyVillage API** in this project's final stage, to avoid unnecessary churn this late in development. The **API Overview** table above is the authoritative, complete reference for all BeautyVillage endpoints; Swagger covers only the `/auth` and legacy `/posts` subset.

## Course Requirement Evidence

| Requirement | Where it's demonstrated |
|---|---|
| React SPA | [Fronend/src/main.tsx](Fronend/src/main.tsx), [Fronend/src/router.tsx](Fronend/src/router.tsx) |
| `useState` | e.g. [Fronend/src/pages/public/Login.tsx](Fronend/src/pages/public/Login.tsx), [Fronend/src/pages/public/BusinessDetail.tsx](Fronend/src/pages/public/BusinessDetail.tsx) |
| `useEffect` | e.g. [Fronend/src/pages/public/BusinessDetail.tsx](Fronend/src/pages/public/BusinessDetail.tsx), [Fronend/src/pages/public/Home.tsx](Fronend/src/pages/public/Home.tsx) |
| Axios | [Fronend/src/services/api-client.ts](Fronend/src/services/api-client.ts) |
| React Hook Form + validation | e.g. [Fronend/src/pages/public/Login.tsx](Fronend/src/pages/public/Login.tsx), [Fronend/src/pages/public/Register.tsx](Fronend/src/pages/public/Register.tsx), [Fronend/src/Componnents/BookingModal.tsx](Fronend/src/Componnents/BookingModal.tsx) |
| Context API | [Fronend/src/contexts/AuthContext.tsx](Fronend/src/contexts/AuthContext.tsx) |
| Redux Toolkit | [Fronend/src/redux/store.ts](Fronend/src/redux/store.ts) + [Fronend/src/redux/businessesSlice.ts](Fronend/src/redux/businessesSlice.ts) (and 3 other slices) |
| Protected routes | [Fronend/src/Componnents/ProtectedRoute.tsx](Fronend/src/Componnents/ProtectedRoute.tsx), [Fronend/src/Componnents/RoleProtectedRoute.tsx](Fronend/src/Componnents/RoleProtectedRoute.tsx), [Fronend/src/Componnents/GuestOnlyRoute.tsx](Fronend/src/Componnents/GuestOnlyRoute.tsx) |
| `React.lazy` / `Suspense` | [Fronend/src/router.tsx](Fronend/src/router.tsx) |
| `React.memo` | [Fronend/src/Componnents/StarRating.tsx](Fronend/src/Componnents/StarRating.tsx), [Fronend/src/Componnents/BusinessCard.tsx](Fronend/src/Componnents/BusinessCard.tsx) |
| Loading states | [Fronend/src/Componnents/LoadingSpinner.tsx](Fronend/src/Componnents/LoadingSpinner.tsx), used across ~20 pages (e.g. Home, BusinessList, BusinessDetail, DashboardOverview, all Admin pages) |
| Error states | [Fronend/src/Componnents/ErrorMessage.tsx](Fronend/src/Componnents/ErrorMessage.tsx), used across the same pages plus Redux slice error state |
| Responsive UI | Bootstrap responsive grid/utility classes (`col-`, `d-md-`) throughout `Fronend/src/pages/` and `Fronend/src/Componnents/`; verified manually at 375px/768px/desktop widths |

## Known v1 Limitations

- Swagger documents only `/auth` and the legacy `/posts` demo routes, not the full BeautyVillage API (see API Overview table above for the complete reference).
- No payment integration — booking is a reservation only, no online payment is collected.
- No real-time notifications (email/SMS) for appointment status changes.
- Media files are stored as binary data in MongoDB rather than a dedicated object store — acceptable for course-project scale, not recommended for production volume.
- No automated CI pipeline; verification is run manually per the Testing section above.

## Safe Submission Notes

- `Backend/.env`, `Backend/.env_dev`, and `Backend/.env_test` contain real database credentials and **must never** be committed or included in a submitted ZIP. They are git-ignored; only `Backend/.env.example` (placeholders) is tracked.
- Same for `Fronend/.env` — only `Fronend/.env.example` is tracked.
- **Safe ZIP procedure**: build the submission ZIP from tracked repository content only, not a raw copy of the working folder. From the repo root:
  ```bash
  git archive --format=zip -o beautyVillage-submission.zip HEAD
  ```
  This exports exactly what's committed to git (no `.env*`, `node_modules`, `dist`, or local-only files), which is the safest way to guarantee no secrets are included. Do not zip the working directory directly.
