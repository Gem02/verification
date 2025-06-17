const express = require('express');
const router = express.Router();
const { getAllUsers, getAllTransactions, updateUser, deleteUser } = require('../controller/adminController');
const { verifyAdmin } = require('../middleware/adminMiddleware');

router.get('/users/:adminUserId', verifyAdmin, getAllUsers);
router.get('/transactions/:adminUserId', verifyAdmin, getAllTransactions);
router.patch('/updateUser/:adminUserId', updateUser);
router.delete('/deleteUser/:adminUserId', deleteUser );

module.exports = router;
