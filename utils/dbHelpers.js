// utils/dbHelpers.js - shared helpers for building queries and mapping MySQL errors

// Builds "COL1 = ?, COL2 = ?" for partial updates from a { field: COLUMN } map
function buildUpdateQuery(data, columnMap) {
  const sets = [];
  const values = [];
  Object.entries(data).forEach(([field, value]) => {
    if (columnMap[field]) {
      sets.push(`${columnMap[field]} = ?`);
      values.push(value);
    }
  });
  return { setClause: sets.join(', '), values };
}

// Maps MySQL error codes to HTTP responses (409 for conflicts, 500 otherwise)
function handleDbError(res, err, messages = {}) {
  switch (err.code) {
    case 'ER_DUP_ENTRY':
      return res.status(409).json({ error: messages.duplicate || 'A record with these values already exists' });
    case 'ER_NO_REFERENCED_ROW':
    case 'ER_NO_REFERENCED_ROW_2':
      return res.status(409).json({ error: messages.foreignKey || 'A referenced record does not exist' });
    case 'ER_ROW_IS_REFERENCED':
    case 'ER_ROW_IS_REFERENCED_2':
      return res.status(409).json({ error: messages.referenced || 'Record is in use by other records and cannot be deleted' });
    case 'ER_CHECK_CONSTRAINT_VIOLATED':
      return res.status(400).json({ error: 'Value violates a database constraint' });
    default:
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Unexpected database error' });
  }
}

module.exports = { buildUpdateQuery, handleDbError };
