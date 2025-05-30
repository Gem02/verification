const express = require('express');
const router = express.Router();
const { getTransactionHistory } = require('../controller/transactionsController');

router.get('/history/:userId', getTransactionHistory);

module.exports = router;
