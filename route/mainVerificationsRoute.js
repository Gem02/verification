const express = require('express');
const router = express.Router();
const {verifyNin} = require('../controller/ninController');
const {verifyBvn} = require('../controller/bvnController');
const { verifyIPE } = require('../controller/ipeController');
const { personalization } = require('../controller/personalizationController');


router.post('/nin', verifyNin);
router.post('/bvn', verifyBvn);
router.post('/ipe', verifyIPE);
router.post('/personalisation', personalization)

module.exports = router;