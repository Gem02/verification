const express = require('express');
const router = express.Router();
const { purchaseAirtime } = require('../controller/airtimeController');
//const { purchaseData } = require('../controllers/dataController');

router.post('/airtime', purchaseAirtime);
//router.post('/data', purchaseData);

module.exports = router;
