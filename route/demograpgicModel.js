// this file is in the route/demographicRoute
const express = require('express');
const router = express.Router();
const { demographic } = require('../controller/demoController');

router.post('/search', demographic);

module.exports = router;