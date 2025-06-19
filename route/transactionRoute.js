// this file is in the route/transactionRoute
const express = require('express');
const router = express.Router();
const { getTransactionHistory, getDataHistory } = require('../controller/transactionsController');

router.get('/history/:userId', getTransactionHistory);
router.get('/dataHistory/:userId', getDataHistory)

module.exports = router;
