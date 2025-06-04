const express = require('express');
const router = express.Router();
const registerCAC = require('../controller/cacRegistrationController')

router.post('/register', registerCAC);

module.exports = router;