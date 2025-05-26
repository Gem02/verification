const express = require('express');
const router = express.Router();
const {verifyNin} = require('../controller/ninController');

router.post('/nin', verifyNin);

module.exports = router;