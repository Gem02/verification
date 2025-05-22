const express = require('express');
const { registerUser, login, logout, sendForgotPasswordCode, verifyCode, newPassword } = require('../controller/authController');
const router = express.Router();

router.post('/register', registerUser);
router.post('/login', login);
router.post('/logout', logout);
router.post('/forgotPassword', sendForgotPasswordCode);
router.post('/verifyCode', verifyCode);
router.post('/setPassword', newPassword);

module.exports = router;