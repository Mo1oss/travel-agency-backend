// utils/validation.js - reusable input validation helpers

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ALLOWED_ROLES = ['user', 'manager', 'admin'];
const MAX_INT = 2147483647; // MySQL INT upper limit
const MAX_COST = 99999999.99; // DECIMAL(10,2) upper limit

// ---------- Generic helpers ----------

function isBlank(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

// Returns a list of error messages for fields that are missing or empty
function checkRequiredFields(data, fields) {
  return fields.filter((field) => isBlank(data[field])).map((field) => `${field} is required`);
}

// Trims only the listed text fields (never pass 'password' here)
function trimFields(data, fields) {
  const result = { ...data };
  fields.forEach((field) => {
    if (typeof result[field] === 'string') {
      result[field] = result[field].trim();
    }
  });
  return result;
}

function isValidEmail(email) {
  return typeof email === 'string' && email.length <= 100 && EMAIL_REGEX.test(email);
}

// At least 8 characters with an uppercase letter, a lowercase letter and a digit
function isStrongPassword(password) {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password)
  );
}

// Accepts 5 or "5"; rejects 0, -1, 1.5, "abc", "5abc"
function isPositiveInteger(value) {
  let ok = false;
  if (typeof value === 'number') ok = Number.isInteger(value) && value > 0;
  else if (typeof value === 'string') ok = /^[1-9]\d*$/.test(value.trim());
  return ok && Number(value) <= MAX_INT;
}

function isPositiveNumber(value) {
  let n = value;
  if (typeof value === 'string' && value.trim() !== '') n = Number(value);
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

function isValidRating(value) {
  return isPositiveInteger(value) && Number(value) <= 5;
}

// Converts a route :id into a number, or null if it is not a positive integer
function parseId(value) {
  return isPositiveInteger(value) ? Number(value) : null;
}

function isValidLength(value, min, max) {
  return typeof value === 'string' && value.length >= min && value.length <= max;
}

// ---------- Entity validators: each returns { errors, data } ----------
// "data" contains only the fields that were supplied, already normalised.

function validateUser(body = {}, { partial = false } = {}) {
  const input = trimFields(body, ['username', 'email', 'role']);
  if (typeof input.email === 'string') input.email = input.email.toLowerCase();
  if (typeof input.role === 'string') input.role = input.role.toLowerCase();

  const errors = partial ? [] : checkRequiredFields(input, ['username', 'email', 'password']);
  const data = {};

  if (!isBlank(input.username)) {
    if (!isValidLength(input.username, 2, 50)) errors.push('username must be 2-50 characters');
    else data.username = input.username;
  } else if (partial && input.username !== undefined) {
    errors.push('username cannot be empty');
  }

  if (!isBlank(input.email)) {
    if (!isValidEmail(input.email)) errors.push('email must be a valid email address');
    else data.email = input.email;
  } else if (partial && input.email !== undefined) {
    errors.push('email cannot be empty');
  }

  // Password is validated as typed - it is never trimmed or changed
  if (input.password !== undefined && input.password !== null && input.password !== '') {
    if (!isStrongPassword(input.password)) {
      errors.push('password must be at least 8 characters and include uppercase, lowercase and a number');
    } else {
      data.password = input.password;
    }
  } else if (partial && input.password !== undefined) {
    errors.push('password cannot be empty');
  }

  if (input.role !== undefined) {
    if (!ALLOWED_ROLES.includes(input.role)) errors.push(`role must be one of: ${ALLOWED_ROLES.join(', ')}`);
    else data.role = input.role;
  }

  if (input.manager_id !== undefined) {
    if (input.manager_id === null || input.manager_id === '') data.manager_id = null;
    else if (!isPositiveInteger(input.manager_id)) errors.push('manager_id must be a positive integer or null');
    else data.manager_id = Number(input.manager_id);
  }

  if (partial && errors.length === 0 && Object.keys(data).length === 0) {
    errors.push('Provide at least one field to update: username, email, password, role, manager_id');
  }

  return { errors, data };
}

function validateLogin(body = {}) {
  const input = trimFields(body, ['email']);
  const errors = checkRequiredFields(input, ['email', 'password']);
  if (!isBlank(input.email) && !isValidEmail(input.email)) errors.push('email must be a valid email address');
  return {
    errors,
    data: { email: typeof input.email === 'string' ? input.email.toLowerCase() : input.email, password: input.password }
  };
}

function validateTrip(body = {}, { partial = false } = {}) {
  const input = trimFields(body, ['destination', 'country']);
  const errors = partial ? [] : checkRequiredFields(input, ['destination', 'country', 'cost']);
  const data = {};

  ['destination', 'country'].forEach((field) => {
    if (!isBlank(input[field])) {
      if (!isValidLength(input[field], 2, 100)) errors.push(`${field} must be 2-100 characters`);
      else data[field] = input[field];
    } else if (partial && input[field] !== undefined) {
      errors.push(`${field} cannot be empty`);
    }
  });

  if (!isBlank(input.cost)) {
    if (!isPositiveNumber(input.cost) || Number(input.cost) > MAX_COST) errors.push('cost must be a positive number');
    else data.cost = Math.round(Number(input.cost) * 100) / 100;
  } else if (partial && input.cost !== undefined) {
    errors.push('cost cannot be empty');
  }

  if (partial && errors.length === 0 && Object.keys(data).length === 0) {
    errors.push('Provide at least one field to update: destination, country, cost');
  }

  return { errors, data };
}

// Create: user_id, trip_id and rating are required. Update (partial): only rating can change.
function validateReview(body = {}, { partial = false } = {}) {
  const input = { ...body };
  const errors = checkRequiredFields(input, partial ? ['rating'] : ['user_id', 'trip_id', 'rating']);
  const data = {};

  if (!partial) {
    ['user_id', 'trip_id'].forEach((field) => {
      if (!isBlank(input[field])) {
        if (!isPositiveInteger(input[field])) errors.push(`${field} must be a positive integer`);
        else data[field] = Number(input[field]);
      }
    });
  }

  if (!isBlank(input.rating)) {
    if (!isValidRating(input.rating)) errors.push('rating must be an integer from 1 to 5');
    else data.rating = Number(input.rating);
  }

  return { errors, data };
}

module.exports = {
  ALLOWED_ROLES,
  isBlank,
  checkRequiredFields,
  trimFields,
  isValidEmail,
  isStrongPassword,
  isPositiveInteger,
  isPositiveNumber,
  isValidRating,
  parseId,
  validateUser,
  validateLogin,
  validateTrip,
  validateReview
};
