const express = require('express');
const router = express.Router();
const { purchaseAirtime } = require('../controller/airtimeController');
const {buyData} = require('../controller/dataController');

router.post('/airtime', purchaseAirtime);
router.post('/data',  buyData);

module.exports = router;
