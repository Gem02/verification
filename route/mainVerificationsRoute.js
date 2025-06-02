const express = require('express');
const router = express.Router();
const {verifyNin} = require('../controller/ninController');
const {verifyBvn} = require('../controller/bvnController');


router.post('/nin', verifyNin);
router.post('/bvn', verifyBvn);

module.exports = router;