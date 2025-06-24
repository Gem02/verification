// this file is in the route/mainRoute
const express = require('express');
const router = express.Router();
const {verifyNin} = require('../controller/ninController');
const {verifyBvn} = require('../controller/bvnController');
const { submitIPE, checkIPEStatus, freeStatus } = require('../controller/ipeController');
const { personalization } = require('../controller/personalizationController');


router.post('/nin', verifyNin);
router.post('/bvn', verifyBvn);
router.post('/submit/ipe', submitIPE);
router.post('/checkStatus/ipe', checkIPEStatus);
router.post('/freeStatus/ipe', freeStatus);
router.post('/personalisation', personalization)

module.exports = router;