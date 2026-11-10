// controllers/reviewsController.js - CRUD for REVIEW plus the INNER JOIN
const { pool } = require('../db');
const { validateReview, parseId } = require('../utils/validation');
const { handleDbError } = require('../utils/dbHelpers');

const REVIEW_COLUMNS = 'ID AS id, USER_ID AS user_id, TRIP_ID AS trip_id, RATING AS rating';
const DB_MESSAGES = {
  duplicate: 'This user has already reviewed this trip',
  foreignKey: 'user_id or trip_id does not match an existing record'
};

async function findReviewById(id) {
  const [rows] = await pool.query(`SELECT ${REVIEW_COLUMNS} FROM REVIEW WHERE ID = ?`, [id]);
  return rows[0];
}

// GET /reviews
async function getAllReviews(req, res) {
  try {
    const [rows] = await pool.query(`SELECT ${REVIEW_COLUMNS} FROM REVIEW ORDER BY ID`);
    res.json(rows);
  } catch (err) {
    handleDbError(res, err);
  }
}

// GET /reviews/:id
async function getReviewById(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Review ID must be a positive integer' });

  try {
    const review = await findReviewById(id);
    if (!review) return res.status(404).json({ error: `Review ${id} not found` });
    res.json(review);
  } catch (err) {
    handleDbError(res, err);
  }
}

// POST /reviews  (user and trip must exist; one review per user per trip)
async function createReview(req, res) {
  const { errors, data } = validateReview(req.body);
  if (errors.length) return res.status(400).json({ errors });

  try {
    const [result] = await pool.query(
      'INSERT INTO REVIEW (USER_ID, TRIP_ID, RATING) VALUES (?, ?, ?)',
      [data.user_id, data.trip_id, data.rating]
    );
    const review = await findReviewById(result.insertId);
    res.status(201).json({ message: 'Review created', review });
  } catch (err) {
    handleDbError(res, err, DB_MESSAGES);
  }
}

// PUT /reviews/:id  (only the rating can be changed)
async function updateReview(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Review ID must be a positive integer' });

  const { errors, data } = validateReview(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ errors });

  try {
    const [result] = await pool.query('UPDATE REVIEW SET RATING = ? WHERE ID = ?', [data.rating, id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: `Review ${id} not found` });

    const review = await findReviewById(id);
    res.json({ message: 'Review updated', review });
  } catch (err) {
    handleDbError(res, err, DB_MESSAGES);
  }
}

// DELETE /reviews/:id
async function deleteReview(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Review ID must be a positive integer' });

  try {
    const [result] = await pool.query('DELETE FROM REVIEW WHERE ID = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: `Review ${id} not found` });
    res.json({ message: `Review ${id} deleted` });
  } catch (err) {
    handleDbError(res, err);
  }
}

// GET /reviews/details  - INNER JOIN across USERS, REVIEW and TRIP
async function getReviewDetails(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT r.ID          AS review_id,
             u.USERNAME    AS username,
             t.DESTINATION AS destination,
             r.RATING      AS rating
      FROM REVIEW r
      INNER JOIN USERS u ON r.USER_ID = u.ID
      INNER JOIN TRIP  t ON r.TRIP_ID = t.ID
      ORDER BY r.ID`);
    res.json(rows);
  } catch (err) {
    handleDbError(res, err);
  }
}

module.exports = { getAllReviews, getReviewById, createReview, updateReview, deleteReview, getReviewDetails };
