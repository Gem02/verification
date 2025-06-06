const express = require('express');
const router = express.Router();
const { requestNinModification } = require('../controller/ninModificationController');

router.post('/register', requestNinModification);

module.exports = router;