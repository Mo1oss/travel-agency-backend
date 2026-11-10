# Travel Agency Backend (Lab 7)

A database-driven Express API for the Travel Agency app, built with MVC, MySQL relationships, JOINs and reusable input validation.

## Required tools

- Node.js 18 or newer, plus npm
- MySQL Server 8.0.16 or newer (needed for CHECK constraints) and MySQL Workbench
- Postman
- Git and a GitHub account

## Project structure

```
travel-agency-backend/
├── controllers/
│   ├── authController.js
│   ├── usersController.js
│   ├── tripsController.js
│   └── reviewsController.js
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── tripRoutes.js
│   └── reviewRoutes.js
├── utils/
│   ├── validation.js      # reusable validators (required, email, password, IDs, cost, rating, trimming)
│   └── dbHelpers.js       # partial-update builder + MySQL error -> HTTP status mapping
├── sql/joins.sql          # the three JOIN queries for MySQL Workbench
├── db.js                  # connection pool, CREATE TABLE statements, USERS migration
├── index.js               # Express app + router mounting
├── server.js              # creates tables in order, seeds data, then starts listening
├── .env.example
├── .gitignore
└── package.json
```

## Database

- **Database name:** `travel_agency`. It is created automatically if it does not exist.
- **Tables:** these are created in order on startup: `USERS` → `TRIP` → `REVIEW`.

| Table  | Columns |
|--------|---------|
| USERS  | ID (PK, AI), USERNAME, EMAIL (unique), PASSWORD, ROLE (default `user`), MANAGER_ID (nullable FK → USERS.ID) |
| TRIP   | ID (PK, AI), DESTINATION, COUNTRY, COST (> 0) |
| REVIEW | ID (PK, AI), USER_ID (FK → USERS.ID), TRIP_ID (FK → TRIP.ID), RATING (1–5), UNIQUE (USER_ID, TRIP_ID) |

**Migration:** if `USERS` already exists from an earlier lab without `ROLE` or `MANAGER_ID`, `migrateUsersTable()` in `db.js` adds the missing columns with `ALTER TABLE`. This is needed because `CREATE TABLE IF NOT EXISTS` never adds columns.

**Seed data:** this is inserted only on the first run, while all three tables are empty, so your changes are kept after a restart.

| Users | Trips | Reviews |
|-------|-------|---------|
| alice (admin, **no manager**) | Paris, France, 1200 | bob → Paris: 5 |
| bob (manager, manager = alice) | Tokyo, Japan, 2500 | carol → Paris: 4 |
| carol (user, manager = bob) | Cairo, Egypt, 800 | carol → Tokyo: 3 |
| dan (user, manager = bob) | Rome, Italy, 1100 (**no review**) | dan → Cairo: 5 |

All seeded users have the fictional password `Passw0rd!`.

## Environment variables

Copy `.env.example` to `.env` and fill in your own values. `.env` is git-ignored.

| Variable | Example |
|----------|---------|
| DB_HOST | localhost |
| DB_USER | root |
| DB_PASSWORD | *(your local MySQL password)* |
| DB_NAME | travel_agency |
| PORT | 3000 |

## Setup and run

```bash
npm install
cp .env.example .env     # then edit .env
npm start                # or: npm run dev  (auto-restart on file changes)
```

Expected console output:

```
Tables ready: USERS, TRIP, REVIEW
Seeded 4 users, 4 trips and 4 reviews
Travel Agency API running on http://localhost:3000
```

## API endpoints

Request bodies are JSON. Field names: `username, email, password, role, manager_id`, `destination, country, cost` and `user_id, trip_id, rating`.

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Register a user (`username`, `email`, `password` required; ROLE is always `user`) |
| POST | /auth/login | Log in with `email` and `password`. Returns the user without the password, or 401 |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /users | All users |
| GET | /users/:id | One user |
| POST | /users | Create user (`role`, `manager_id` optional) |
| PUT | /users/:id | Partial update: send only the fields to change |
| DELETE | /users/:id | Delete. Returns 409 if the user has reviews or manages others |
| GET | /users/managers | **SELF JOIN**: EmployeeName + ManagerName |

### Trips
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /trips | All trips |
| GET | /trips/:id | One trip |
| POST | /trips | Create trip |
| PUT | /trips/:id | Update trip (partial updates allowed) |
| DELETE | /trips/:id | Delete. Returns 409 if the trip has reviews |
| GET | /trips/ratings | **LEFT JOIN**: all trips with rating(s), including unrated trips |

### Reviews
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /reviews | All reviews |
| GET | /reviews/:id | One review |
| POST | /reviews | Create review for an existing user and trip |
| PUT | /reviews/:id | Update the rating |
| DELETE | /reviews/:id | Delete review |
| GET | /reviews/details | **INNER JOIN**: username, destination, rating |

### Status codes
| Code | When |
|------|------|
| 200 / 201 | Success / created |
| 400 | Missing or invalid input (bad email, weak password, invalid ID, cost ≤ 0, rating outside 1–5, malformed JSON) |
| 401 | Wrong login credentials |
| 404 | Record or route not found |
| 409 | Duplicate email, duplicate review, a foreign key that does not exist, or a delete blocked by a foreign key |
| 500 | Unexpected database error |

## Validation rules (`utils/validation.js`)

- `checkRequiredFields`: missing, null or blank values are rejected.
- `trimFields`: trims username, email, role, destination and country. **The password is never trimmed or changed.**
- `isValidEmail`: checks for a basic `name@domain.tld` format. Emails are stored in lowercase.
- `isStrongPassword`: requires at least 8 characters, with an uppercase letter, a lowercase letter and a digit.
- `parseId` / `isPositiveInteger`: route IDs, `user_id`, `trip_id` and `manager_id` must be positive integers.
- `isPositiveNumber`: `cost` must be greater than 0.
- `isValidRating`: `rating` must be an integer from 1 to 5.

## JOIN queries and what `ON` does

The same queries are in `sql/joins.sql` for MySQL Workbench.

**1. SELF JOIN: `GET /users/managers`**
```sql
SELECT e.ID AS EmployeeID, e.USERNAME AS EmployeeName, m.USERNAME AS ManagerName
FROM USERS e
LEFT JOIN USERS m ON e.MANAGER_ID = m.ID;
```
`USERS` is used twice, once with the alias `e` (employee) and once with `m` (manager). `ON e.MANAGER_ID = m.ID` pairs each employee row with the row whose ID equals that employee's MANAGER_ID. A LEFT JOIN is used so that users with `MANAGER_ID = NULL` (alice) still appear, with `ManagerName = NULL`.

**2. LEFT JOIN: `GET /trips/ratings`**
```sql
SELECT t.ID, t.DESTINATION, t.COUNTRY, t.COST, r.RATING
FROM TRIP t
LEFT JOIN REVIEW r ON t.ID = r.TRIP_ID;
```
`ON t.ID = r.TRIP_ID` matches each trip with the reviews written for it. A trip with several reviews appears once per review. Because it is a LEFT JOIN, every trip is kept, and trips with no matching review (Rome) show `RATING = NULL`.

**3. INNER JOIN: `GET /reviews/details`**
```sql
SELECT u.USERNAME, t.DESTINATION, r.RATING
FROM REVIEW r
INNER JOIN USERS u ON r.USER_ID = u.ID
INNER JOIN TRIP  t ON r.TRIP_ID = t.ID;
```
The first `ON` links each review to the user who wrote it. The second `ON` links it to the trip being reviewed. An INNER JOIN returns only rows that match on both conditions, so unrated trips like Rome do not appear.

## Sample test steps (Postman)

Base URL: `http://localhost:3000`. Use **Body → raw → JSON**.

| # | Request | Body | Expected |
|---|---------|------|----------|
| 1 | POST /auth/register | `{"username":"eve","email":"eve@example.com","password":"Travel123"}` | 201, role `user`, no password |
| 2 | POST /auth/register | `{"username":"x","email":"not-an-email","password":"Travel123"}` | 400 invalid email |
| 3 | POST /auth/register | `{"username":"weak","email":"weak@example.com","password":"abc"}` | 400 weak password |
| 4 | POST /auth/register | `{"email":"a@example.com","password":"Travel123"}` | 400 username is required |
| 5 | POST /auth/register | repeat request 1 | 409 email already exists |
| 6 | POST /auth/login | `{"email":"alice@example.com","password":"Passw0rd!"}` | 200 login successful |
| 7 | POST /auth/login | `{"email":"alice@example.com","password":"wrong"}` | 401 |
| 8 | GET /users/abc | – | 400 invalid ID |
| 9 | GET /users/999 | – | 404 not found |
| 10 | PUT /users/5 | `{"role":"manager"}` | 200, only role changes |
| 11 | DELETE /users/2 | – | 409 (bob has reviews / manages users) |
| 12 | POST /trips | `{"destination":"Lisbon","country":"Portugal","cost":950}` | 201 |
| 13 | POST /trips | `{"destination":"Oslo","country":"Norway","cost":-10}` | 400 invalid cost |
| 14 | PUT /trips/4 | `{"cost":1150.5}` | 200 |
| 15 | DELETE /trips/1 | – | 409 (Paris has reviews) |
| 16 | POST /reviews | `{"user_id":1,"trip_id":4,"rating":4}` | 201 |
| 17 | POST /reviews | `{"user_id":2,"trip_id":1,"rating":4}` | 409 duplicate review |
| 18 | POST /reviews | `{"user_id":1,"trip_id":2,"rating":6}` | 400 rating 1–5 |
| 19 | POST /reviews | `{"user_id":999,"trip_id":1,"rating":3}` | 409 user/trip does not exist |
| 20 | PUT /reviews/1 | `{"rating":2}` | 200 |
| 21 | DELETE /reviews/999 | – | 404 |
| 22 | GET /users/managers | – | alice listed with `ManagerName: null` |
| 23 | GET /trips/ratings | – | Rome listed with `rating: null` (run before step 16) |
| 24 | GET /reviews/details | – | username, destination, rating rows only |
| 25 | Restart the server, then GET /trips | – | Lisbon from step 12 is still there |

## Test evidence

Add your Postman screenshots under `screenshots/` and link them here. Include at least one successful and one unsuccessful request for each resource.

| Test | Screenshot |
|------|------------|
| Register success (201) | `screenshots/register-success.png` |
| Invalid email (400) | `screenshots/invalid-email.png` |
| Duplicate review (409) | `screenshots/duplicate-review.png` |
| SELF JOIN with managerless user | `screenshots/users-managers.png` |
| LEFT JOIN with unrated trip | `screenshots/trips-ratings.png` |

## Git workflow

```bash
git init
git add .
git commit -m "MVC structure and Express setup"
# ...commit after each stage: database setup, CRUD APIs, JOIN APIs, validation, README
git branch -M main
git remote add origin https://github.com/<your-username>/travel-agency-backend.git
git push -u origin main
```

Before pushing, run `git status` and check that `.env` and `node_modules/` are **not** listed.

> Note: passwords are stored as plain text because hashing is outside the scope of this lab. Use fictional credentials only.
