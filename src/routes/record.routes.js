const express = require('express');
const recordController = require('../controllers/record.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/roleCheck.middleware');

const router = express.Router();


//console.log('Record controller functions:', Object.keys(recordController));

// Basic record routes
router.get('/records', recordController.getAllRecords);
router.get('/records/:id', recordController.getRecordById);
router.post('/records', recordController.createRecord);

// Lab test types
router.get('/lab-tests/types', recordController.getTestTypes);

// Create prescription record
router.post('/records/prescription', 
  authenticate, 
  checkRole(['admin', 'doctor']), 
  recordController.createPrescriptionRecord
);

// Create lab test record
router.post('/records/lab-test', 
  authenticate, 
  checkRole(['admin', 'doctor']), 
  recordController.createLabTestRecord
);

module.exports = router;