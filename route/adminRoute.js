// this file is in the route/adminRoute

const express = require('express');
const router = express.Router();
const { getAllUsers, getAllTransactions, updateUser, deleteUser, getAllBankAgency,
  getAllBvnLicence,
  getAllCacReg,
  getAllEnrollment,
  getAllNinModifications } = require('../controller/adminController');
  const { getAllPrices, updatePriceByKey, createPrice  } = require('../controller/pricesController');

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
router.get('/prices/:adminUserId', getAllPrices);
router.put('/prices/:adminUserId', updatePriceByKey);
router.post('/prices/:adminUserId', createPrice);


module.exports = router;
