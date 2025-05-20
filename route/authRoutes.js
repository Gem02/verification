const express = require('express');
const { registerUser, login, logout } = require('../controller/authController');
const router = express.Router();

router.post('/register', registerUser);
router.post('/login', login);
router.post('/logout', logout);

module.exports = router;