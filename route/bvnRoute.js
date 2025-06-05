const express = require('express');
const router = express.Router();
const { submitBvnData } = require('../controller/bvnRegController');

router.post('/register', submitBvnData);

module.exports = router;