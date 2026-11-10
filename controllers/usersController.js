// controllers/usersController.js - CRUD for USERS plus the SELF JOIN
const { pool } = require('../db');
const { validateUser, parseId } = require('../utils/validation');
const { buildUpdateQuery, handleDbError } = require('../utils/dbHelpers');

// PASSWORD is never selected, so it can never appear in a response
const USER_COLUMNS = 'ID AS id, USERNAME AS username, EMAIL AS email, ROLE AS role, MANAGER_ID AS manager_id';
const COLUMN_MAP = { username: 'USERNAME', email: 'EMAIL', password: 'PASSWORD', role: 'ROLE', manager_id: 'MANAGER_ID' };

const DB_MESSAGES = {
  duplicate: 'A user with this email already exists',
  foreignKey: 'manager_id does not match an existing user',
  referenced: 'User cannot be deleted because they have reviews or manage other users'
};

async function findUserById(id) {
  const [rows] = await pool.query(`SELECT ${USER_COLUMNS} FROM USERS WHERE ID = ?`, [id]);
  return rows[0];
}

// GET /users
async function getAllUsers(req, res) {
  try {
    const [rows] = await pool.query(`SELECT ${USER_COLUMNS} FROM USERS ORDER BY ID`);
    res.json(rows);
  } catch (err) {
    handleDbError(res, err);
  }
}

// GET /users/:id
async function getUserById(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'User ID must be a positive integer' });

  try {
    const user = await findUserById(id);
    if (!user) return res.status(404).json({ error: `User ${id} not found` });
    res.json(user);
  } catch (err) {
    handleDbError(res, err);
  }
}

// POST /users
async function createUser(req, res) {
  const { errors, data } = validateUser(req.body);
  if (errors.length) return res.status(400).json({ errors });

  try {
    const [result] = await pool.query(
      'INSERT INTO USERS (USERNAME, EMAIL, PASSWORD, ROLE, MANAGER_ID) VALUES (?, ?, ?, ?, ?)',
      [data.username, data.email, data.password, data.role || 'user', data.manager_id ?? null]
    );
    const user = await findUserById(result.insertId);
    res.status(201).json({ message: 'User created', user });
  } catch (err) {
    handleDbError(res, err, DB_MESSAGES);
  }
}

// PUT /users/:id  (partial update - only supplied fields change)
async function updateUser(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'User ID must be a positive integer' });

  const { errors, data } = validateUser(req.body, { partial: true });
  if (data.manager_id === id) errors.push('A user cannot be their own manager');
  if (errors.length) return res.status(400).json({ errors });

  try {
    const { setClause, values } = buildUpdateQuery(data, COLUMN_MAP);
    const [result] = await pool.query(`UPDATE USERS SET ${setClause} WHERE ID = ?`, [...values, id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: `User ${id} not found` });

    const user = await findUserById(id);
    res.json({ message: 'User updated', user });
  } catch (err) {
    handleDbError(res, err, DB_MESSAGES);
  }
}

// DELETE /users/:id  (blocked with 409 if reviews or managed users reference this user)
async function deleteUser(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'User ID must be a positive integer' });

  try {
    const [result] = await pool.query('DELETE FROM USERS WHERE ID = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: `User ${id} not found` });
    res.json({ message: `User ${id} deleted` });
  } catch (err) {
    handleDbError(res, err, DB_MESSAGES);
  }
}

// GET /users/managers  - SELF JOIN (LEFT so users without a manager are included)
async function getUsersWithManagers(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT e.ID       AS EmployeeID,
             e.USERNAME AS EmployeeName,
             m.USERNAME AS ManagerName
      FROM USERS e
      LEFT JOIN USERS m ON e.MANAGER_ID = m.ID
      ORDER BY e.ID`);
    res.json(rows);
  } catch (err) {
    handleDbError(res, err);
  }
}

module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser, getUsersWithManagers };
