// this file is in the route/adminRoute

const express = require('express');
const router = express.Router();
const { getAllUsers, getAllTransactions, updateUser, deleteUser, getAllBankAgency,
  getAllBvnLicence,
  getAllCacReg,
  getAllEnrollment,
  getAllNinModifications, addAccountBalance, debitAccountBalance } = require('../controller/adminController');
  const {  updatePriceByKey, createPrice  } = require('../controller/pricesController');

const { verifyAdmin } = require('../middleware/adminMiddleware');

router.get('/users/:adminUserId', verifyAdmin, getAllUsers);
router.get('/transactions/:adminUserId', verifyAdmin, getAllTransactions);
router.patch('/updateUser/:adminUserId',verifyAdmin, updateUser);
router.delete('/deleteUser/:adminUserId',verifyAdmin, deleteUser );
router.get('/bankAgency/:adminUserId', verifyAdmin, getAllBankAgency);
router.get('/bvnlicence/:adminUserId', verifyAdmin, getAllBvnLicence);
router.get('/cacreg/:adminUserId', verifyAdmin, getAllCacReg);
router.get('/enrollment/:adminUserId', verifyAdmin, getAllEnrollment);
router.get('/modification/:adminUserId', verifyAdmin, getAllNinModifications);
router.put('/prices/update/:adminUserId',verifyAdmin, updatePriceByKey);
router.post('/prices/create/:adminUserId',verifyAdmin, createPrice);
router.post('/addBalance/:adminUserId',verifyAdmin, addAccountBalance);
router.post('/debitBalance/:adminUserId',verifyAdmin, debitAccountBalance);


module.exports = router;
