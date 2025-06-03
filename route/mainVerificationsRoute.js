const express = require('express');
const router = express.Router();
const {verifyNin} = require('../controller/ninController');
const {verifyBvn} = require('../controller/bvnController');
const { verifyIPE } = require('../controller/ipeController');


router.post('/nin', verifyNin);
router.post('/bvn', verifyBvn);
router.post('/ipe', verifyIPE);

module.exports = router;