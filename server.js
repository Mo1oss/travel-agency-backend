// server.js - initialises the database, then starts the HTTP server
require('dotenv').config();
const app = require('./index');
const {
  pool,
  createUsersTable,
  createTripTable,
  createReviewTable,
  ensureDatabaseExists,
  migrateUsersTable
} = require('./db');

const PORT = process.env.PORT || 3000;

// Fictional test records - inserted only on the very first run (when all tables are empty)
async function seedDatabase() {
  const [[{ users }]] = await pool.query('SELECT COUNT(*) AS users FROM USERS');
  const [[{ trips }]] = await pool.query('SELECT COUNT(*) AS trips FROM TRIP');
  const [[{ reviews }]] = await pool.query('SELECT COUNT(*) AS reviews FROM REVIEW');

  if (users > 0 || trips > 0 || reviews > 0) {
    console.log('Existing data found - skipping seed');
    return;
  }

  // USERS - Alice has no manager (needed for the SELF JOIN test)
  const insertUser = 'INSERT INTO USERS (USERNAME, EMAIL, PASSWORD, ROLE, MANAGER_ID) VALUES (?, ?, ?, ?, ?)';
  const [alice] = await pool.query(insertUser, ['alice', 'alice@example.com', 'Passw0rd!', 'admin', null]);
  const [bob] = await pool.query(insertUser, ['bob', 'bob@example.com', 'Passw0rd!', 'manager', alice.insertId]);
  const [carol] = await pool.query(insertUser, ['carol', 'carol@example.com', 'Passw0rd!', 'user', bob.insertId]);
  const [dan] = await pool.query(insertUser, ['dan', 'dan@example.com', 'Passw0rd!', 'user', bob.insertId]);

  // TRIP - Rome will have no review (needed for the LEFT JOIN test)
  const insertTrip = 'INSERT INTO TRIP (DESTINATION, COUNTRY, COST) VALUES (?, ?, ?)';
  const [paris] = await pool.query(insertTrip, ['Paris', 'France', 1200.0]);
  const [tokyo] = await pool.query(insertTrip, ['Tokyo', 'Japan', 2500.0]);
  const [cairo] = await pool.query(insertTrip, ['Cairo', 'Egypt', 800.0]);
  await pool.query(insertTrip, ['Rome', 'Italy', 1100.0]);

  // REVIEW
  const insertReview = 'INSERT INTO REVIEW (USER_ID, TRIP_ID, RATING) VALUES (?, ?, ?)';
  await pool.query(insertReview, [bob.insertId, paris.insertId, 5]);
  await pool.query(insertReview, [carol.insertId, paris.insertId, 4]);
  await pool.query(insertReview, [carol.insertId, tokyo.insertId, 3]);
  await pool.query(insertReview, [dan.insertId, cairo.insertId, 5]);

  console.log('Seeded 4 users, 4 trips and 4 reviews');
}

async function initDatabase() {
  await ensureDatabaseExists();

  // Order matters: REVIEW references USERS and TRIP, so they must exist first
  await pool.query(createUsersTable);
  await migrateUsersTable();
  await pool.query(createTripTable);
  await pool.query(createReviewTable);
  console.log('Tables ready: USERS, TRIP, REVIEW');

  await seedDatabase();
}

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Travel Agency API running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialise the database:', err.message);
    process.exit(1);
  });
