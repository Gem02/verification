const express = require('express');
const router = express.Router();
const {createAccount, getUserVirtualAccount, setPin} = require('../controller/monnifyAccountController');


router.post('/create/:userId', createAccount);

router.get('/:userId', getUserVirtualAccount);

router.post('/setPin', setPin)


module.exports = router;
