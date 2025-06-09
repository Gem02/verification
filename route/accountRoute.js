const express = require('express');
const router = express.Router();
const {createAccount, getUserVirtualAccount, setPin, checkPin, resetPin} = require('../controller/monnifyAccountController');


router.post('/create/:userId', createAccount);

router.get('/:userId', getUserVirtualAccount);

router.post('/setPin', setPin);

router.post('/checkPin', checkPin);

router.post('/resetPin', resetPin);


module.exports = router;
