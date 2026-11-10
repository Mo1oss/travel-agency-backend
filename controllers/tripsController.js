// controllers/tripsController.js - CRUD for TRIP plus the LEFT JOIN
const { pool } = require('../db');
const { validateTrip, parseId } = require('../utils/validation');
const { buildUpdateQuery, handleDbError } = require('../utils/dbHelpers');

const TRIP_COLUMNS = 'ID AS id, DESTINATION AS destination, COUNTRY AS country, COST AS cost';
const COLUMN_MAP = { destination: 'DESTINATION', country: 'COUNTRY', cost: 'COST' };
const DB_MESSAGES = { referenced: 'Trip cannot be deleted because it has reviews' };

async function findTripById(id) {
  const [rows] = await pool.query(`SELECT ${TRIP_COLUMNS} FROM TRIP WHERE ID = ?`, [id]);
  return rows[0];
}

// GET /trips
async function getAllTrips(req, res) {
  try {
    const [rows] = await pool.query(`SELECT ${TRIP_COLUMNS} FROM TRIP ORDER BY ID`);
    res.json(rows);
  } catch (err) {
    handleDbError(res, err);
  }
}

// GET /trips/:id
async function getTripById(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Trip ID must be a positive integer' });

  try {
    const trip = await findTripById(id);
    if (!trip) return res.status(404).json({ error: `Trip ${id} not found` });
    res.json(trip);
  } catch (err) {
    handleDbError(res, err);
  }
}

// POST /trips
async function createTrip(req, res) {
  const { errors, data } = validateTrip(req.body);
  if (errors.length) return res.status(400).json({ errors });

  try {
    const [result] = await pool.query(
      'INSERT INTO TRIP (DESTINATION, COUNTRY, COST) VALUES (?, ?, ?)',
      [data.destination, data.country, data.cost]
    );
    const trip = await findTripById(result.insertId);
    res.status(201).json({ message: 'Trip created', trip });
  } catch (err) {
    handleDbError(res, err, DB_MESSAGES);
  }
}

// PUT /trips/:id  (partial update supported)
async function updateTrip(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Trip ID must be a positive integer' });

  const { errors, data } = validateTrip(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ errors });

  try {
    const { setClause, values } = buildUpdateQuery(data, COLUMN_MAP);
    const [result] = await pool.query(`UPDATE TRIP SET ${setClause} WHERE ID = ?`, [...values, id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: `Trip ${id} not found` });

    const trip = await findTripById(id);
    res.json({ message: 'Trip updated', trip });
  } catch (err) {
    handleDbError(res, err, DB_MESSAGES);
  }
}

// DELETE /trips/:id  (blocked with 409 if the trip has reviews)
async function deleteTrip(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Trip ID must be a positive integer' });

  try {
    const [result] = await pool.query('DELETE FROM TRIP WHERE ID = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: `Trip ${id} not found` });
    res.json({ message: `Trip ${id} deleted` });
  } catch (err) {
    handleDbError(res, err, DB_MESSAGES);
  }
}

// GET /trips/ratings  - LEFT JOIN: every trip, with NULL rating when it has no review
async function getTripsWithRatings(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT t.ID          AS trip_id,
             t.DESTINATION AS destination,
             t.COUNTRY     AS country,
             t.COST        AS cost,
             r.RATING      AS rating
      FROM TRIP t
      LEFT JOIN REVIEW r ON t.ID = r.TRIP_ID
      ORDER BY t.ID, r.ID`);
    res.json(rows);
  } catch (err) {
    handleDbError(res, err);
  }
}

module.exports = { getAllTrips, getTripById, createTrip, updateTrip, deleteTrip, getTripsWithRatings };
