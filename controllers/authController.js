// controllers/authController.js - register and login
const { pool } = require('../db');
const { validateUser, validateLogin } = require('../utils/validation');
const { handleDbError } = require('../utils/dbHelpers');

// POST /auth/register
async function register(req, res) {
  // Only these three fields are accepted - ROLE is always 'user' on registration
  const { username, email, password } = req.body || {};
  const { errors, data } = validateUser({ username, email, password });
  if (errors.length) return res.status(400).json({ errors });

  try {
    const [result] = await pool.query(
      'INSERT INTO USERS (USERNAME, EMAIL, PASSWORD, ROLE) VALUES (?, ?, ?, ?)',
      [data.username, data.email, data.password, 'user']
    );
    res.status(201).json({
      message: 'User registered successfully',
      user: { id: result.insertId, username: data.username, email: data.email, role: 'user', manager_id: null }
    });
  } catch (err) {
    handleDbError(res, err, { duplicate: 'An account with this email already exists' });
  }
}

// POST /auth/login
async function login(req, res) {
  const { errors, data } = validateLogin(req.body);
  if (errors.length) return res.status(400).json({ errors });

  try {
    const [rows] = await pool.query(
      'SELECT ID, USERNAME, EMAIL, PASSWORD, ROLE, MANAGER_ID FROM USERS WHERE EMAIL = ?',
      [data.email]
    );
    const user = rows[0];

    // Plain-text comparison is acceptable for this lab only (hashing is out of scope)
    if (!user || user.PASSWORD !== data.password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({
      message: `Login successful. Welcome back, ${user.USERNAME}!`,
      user: { id: user.ID, username: user.USERNAME, email: user.EMAIL, role: user.ROLE, manager_id: user.MANAGER_ID }
    });
  } catch (err) {
    handleDbError(res, err);
  }
}

module.exports = { register, login };
