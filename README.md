# Sweety – Blood Glucose Tracker

A small web app where a diabetes patient records up to four blood glucose readings a day and views daily, month-to-date and previous-month reports.

**Stack:** Node.js + Express API · PostgreSQL · React (Vite) · Jest/Supertest · Vitest/React Testing Library

**Bonus tasks done:** pagination on `GET /readings`, Docker Compose, frontend tests for the reading form.

## Features

- Sign up / log in (passwords hashed with bcrypt, sessions via JWT). Each user only sees their own data.
- Add, view, edit and delete readings (date, one of 4 slots, value in mg/dl).
- Validation on both client and server, with clear messages (see the table below).
- Reports: **Daily** (with each reading and its slot), **Month-to-date**, and **Previous month**. Each shows highest, lowest, average (1 decimal) and count, with an empty state when there is no data.

| Rule | Message |
|---|---|
| Value required | Please enter a glucose value. |
| Whole number 40–600 | Value must be between 40 and 600 mg/dl. |
| One reading per slot per day | You already have an After lunch reading for this date. |
| Max 4 per day | You can add only 4 readings per day. |
| No future dates | Date cannot be in the future. |

## Project layout

```
server/   Express API  (src/, db/schema.sql, scripts/migrate.js, scripts/seed.js, tests/)
client/   React app    (src/components, src/*.js helpers, tests next to components)
docker-compose.yml     PostgreSQL + API + client (bonus)
```

## Requirements

Node.js 18+ and PostgreSQL 14+ (or Docker, see below).

## 1. Install

```bash
cd server && npm install
cd ../client && npm install
```

## 2. Set up the database

Option A – Docker (easiest): `docker compose up -d db` (creates both `sweety` and `sweety_test` databases).

Option B – local PostgreSQL:

```bash
psql -U postgres -c "CREATE USER sweety WITH PASSWORD 'sweety';"
psql -U postgres -c "CREATE DATABASE sweety OWNER sweety;"
psql -U postgres -c "CREATE DATABASE sweety_test OWNER sweety;"
```

Then configure and create the tables:

```bash
cd server
cp .env.example .env        # edit values if yours differ
npm run migrate             # creates the tables (safe to re-run)
npm run seed                # demo user + ~45 days of sample readings
```

Demo login: **demo@sweety.app** / **Demo@1234**

## 3. Run

```bash
# terminal 1 - API on http://localhost:4000
cd server && npm run dev

# terminal 2 - React app on http://localhost:5173
cd client && cp .env.example .env && npm run dev
```

### Everything in Docker (bonus)

```bash
docker compose up --build
# app: http://localhost:8080   api: http://localhost:4000
docker compose exec api npm run seed     # optional demo data
```

## 4. Tests

```bash
cd server && npm test      # needs PostgreSQL + TEST_DATABASE_URL (a separate DB, tables are wiped)
cd client && npm test      # no database needed
```

Server tests cover: date-range maths (including January → December), every validation rule, the 4-per-day limit, duplicate slots (also when editing), report numbers and empty state, bcrypt hashing, login, and that one user can't read, edit, delete or report on another user's readings.
Client tests cover the reading form's validation messages and server-error display.

## API summary

All routes except `/auth/register` and `/auth/login` need `Authorization: Bearer <token>`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` | `{ name, email, password }` → `{ token, user }` |
| POST | `/auth/login` | `{ email, password }` → `{ token, user }` |
| GET | `/auth/me` | current user |
| GET | `/readings?page=1&limit=20` | paginated list (`{ data, page, limit, total }`) |
| POST | `/readings` | `{ date, slot, value }` |
| PUT | `/readings/:id` | same body; updates your reading |
| DELETE | `/readings/:id` | deletes your reading |
| GET | `/reports/daily?date=YYYY-MM-DD` | stats + list of that day's readings |
| GET | `/reports/month-to-date?date=…` | 1st of the month → selected date |
| GET | `/reports/monthly?date=…` | the whole previous month |

Slots: `morning`, `after_breakfast`, `after_lunch`, `after_dinner`.

## Notes

### Assumptions
- **Dates are plain `YYYY-MM-DD` strings** end to end (Postgres `DATE`, no JS `Date` objects for logic) so a reading can never move to another day because of a timezone. "Today" for the future-date rule is the server's local date.
- **Monthly report = the whole month before the selected date's month** (for a January date, that is December of the previous year), exactly as in the brief's example.
- **Check order on save:** value required → whole number 40–600 → slot → date valid/not in future → duplicate slot → max 4 per day. Because there are exactly 4 slots, a duplicate slot is detected before the "max 4" rule on a full day; the max-4 rule remains as a guard and is unit-tested directly. A database unique constraint `(user_id, reading_date, slot)` backs this up against race conditions.
- **Editing** a reading may change its date, slot and value; the edited reading is excluded from the duplicate/limit checks so saving it unchanged doesn't clash with itself.
- Values are whole numbers only; decimals like `99.5` are rejected with the range message.
- The "Low / In range / High" chips (below 70, above 180 mg/dl) are only a display hint with arbitrary thresholds, not medical advice.
- Passwords need at least 8 characters. Login errors don't reveal whether the email exists.
- The JWT is stored in `localStorage` for simplicity.
- Report "average" is computed in SQL with `ROUND(AVG(value), 1)`.

### What I'd improve with more time
- Charts (e.g. Recharts line chart of the month), and a custom month picker for the monthly report.
- Refresh tokens / httpOnly cookies instead of `localStorage`; rate limiting on login.
- Input validation with a schema library (e.g. Zod) shared by client and server; ESLint/Prettier.
- Frontend tests for the whole app flow (login → add → report) and end-to-end tests (Playwright).
- Per-user timezones for the "future date" rule, and CSV/PDF export for doctors.
- Bonus items not done: Redis report caching, BullMQ reminder job, doctor role.
