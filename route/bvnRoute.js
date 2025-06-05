const express = require('express');
const router = express.Router();
const { submitBvnData } = require('../controller/bvnRegController');
const { submitBvnLicense } = require('../controller/bvnLicenseController')

router.post('/register', submitBvnData);
router.post('/licence', submitBvnLicense)

module.exports = router;