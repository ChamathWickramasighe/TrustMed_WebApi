const express = require('express');
const doctorController = require('../controllers/doctor.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/roleCheck.middleware');

const router = express.Router();

// All doctor routes are protected
router.use(authenticate);
router.use(checkRole('doctor', 'admin'));

// Get all patients
router.get('/patients', doctorController.getAllPatients);

// Get patient records
router.get('/patients/:patientId/records', doctorController.getPatientRecords);

// Get record details
router.get('/records/:recordId', doctorController.getRecordById);

// Other existing routes
router.post('/prescriptions', doctorController.createPrescription);
router.post('/lab-tests', doctorController.createLabTest);
router.get('/medicines', doctorController.getMedicines);
router.get('/lab-tests', doctorController.getLabTests);
router.get('/recent-records', doctorController.getRecentRecords);

module.exports = router;