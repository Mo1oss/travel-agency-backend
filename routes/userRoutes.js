// routes/userRoutes.js
const express = require('express');
const users = require('../controllers/usersController');

const router = express.Router();

// /managers must be declared before /:id, otherwise "managers" is treated as an ID
router.get('/managers', users.getUsersWithManagers);

router.get('/', users.getAllUsers);
router.get('/:id', users.getUserById);
router.post('/', users.createUser);
router.put('/:id', users.updateUser);
router.delete('/:id', users.deleteUser);

module.exports = router;
