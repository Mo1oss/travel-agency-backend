// db.js - MySQL connection pool, table definitions and schema migration
require('dotenv').config();
const mysql = require('mysql2/promise');

const DB_NAME = process.env.DB_NAME || 'travel_agency';

// Connection pool used by every controller
const pool = mysql.createPool({
  host: process.env.DB_HOST='localhost',
  user: process.env.DB_USER='root',
  password: process.env.DB_PASSWORD='mosama2007',
  database: DB_NAME='travel_agency',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ---------- Table definitions (created in this order: USERS -> TRIP -> REVIEW) ----------

const createUsersTable = `
  CREATE TABLE IF NOT EXISTS USERS (
    ID          INT AUTO_INCREMENT PRIMARY KEY,
    USERNAME    VARCHAR(50)  NOT NULL,
    EMAIL       VARCHAR(100) NOT NULL UNIQUE,
    PASSWORD    VARCHAR(255) NOT NULL,
    ROLE        VARCHAR(20)  NOT NULL DEFAULT 'user',
    MANAGER_ID  INT NULL,
    CONSTRAINT fk_users_manager FOREIGN KEY (MANAGER_ID) REFERENCES USERS(ID)
  )`;

const createTripTable = `
  CREATE TABLE IF NOT EXISTS TRIP (
    ID           INT AUTO_INCREMENT PRIMARY KEY,
    DESTINATION  VARCHAR(100)  NOT NULL,
    COUNTRY      VARCHAR(100)  NOT NULL,
    COST         DECIMAL(10,2) NOT NULL,
    CONSTRAINT chk_trip_cost CHECK (COST > 0)
  )`;

const createReviewTable = `
  CREATE TABLE IF NOT EXISTS REVIEW (
    ID       INT AUTO_INCREMENT PRIMARY KEY,
    USER_ID  INT NOT NULL,
    TRIP_ID  INT NOT NULL,
    RATING   TINYINT NOT NULL,
    CONSTRAINT fk_review_user FOREIGN KEY (USER_ID) REFERENCES USERS(ID),
    CONSTRAINT fk_review_trip FOREIGN KEY (TRIP_ID) REFERENCES TRIP(ID),
    CONSTRAINT uq_review_user_trip UNIQUE (USER_ID, TRIP_ID),
    CONSTRAINT chk_review_rating CHECK (RATING BETWEEN 1 AND 5)
  )`;

// Creates the database itself if it does not exist yet (the pool needs it to exist)
async function ensureDatabaseExists() {
  if (!/^\w+$/.test(DB_NAME)) {
    throw new Error('DB_NAME may only contain letters, numbers and underscores');
  }
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  });
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await connection.end();
}

// CREATE TABLE IF NOT EXISTS will not add new columns to an existing table.
// If USERS was created in an earlier lab without ROLE / MANAGER_ID, add them here.
async function migrateUsersTable() {
  const [columns] = await pool.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'USERS'`,
    [DB_NAME]
  );
  const existing = columns.map((c) => c.COLUMN_NAME.toUpperCase());

  if (!existing.includes('ROLE')) {
    await pool.query(`ALTER TABLE USERS ADD COLUMN ROLE VARCHAR(20) NOT NULL DEFAULT 'user'`);
    console.log('Migration: added ROLE column to USERS');
  }
  if (!existing.includes('MANAGER_ID')) {
    await pool.query(
      `ALTER TABLE USERS
         ADD COLUMN MANAGER_ID INT NULL,
         ADD CONSTRAINT fk_users_manager FOREIGN KEY (MANAGER_ID) REFERENCES USERS(ID)`
    );
    console.log('Migration: added MANAGER_ID column to USERS');
  }
}

module.exports = {
  pool,
  DB_NAME,
  createUsersTable,
  createTripTable,
  createReviewTable,
  ensureDatabaseExists,
  migrateUsersTable
};
