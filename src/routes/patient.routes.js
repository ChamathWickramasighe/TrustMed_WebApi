const express = require('express');
const { verifyToken, isAdmin, isDoctor } = require('../middleware/auth.middleware');
const controller = require('../controllers/patient.controller');

const router = express.Router();

// Get all patients - Admin and Doctor only
router.get('/', [verifyToken], controller.getAllPatients);

// Get patient by ID - Insurance needs special permission via allocation
router.get('/:patientId', [verifyToken], controller.getPatientById);

// Create patient - Admin and Doctor only
router.post('/', [verifyToken], controller.createPatient);

// Update patient - Admin and Doctor only
router.put('/:patientId', [verifyToken], controller.updatePatient);

// Delete patient - Admin and Doctor only
router.delete('/:patientId', [verifyToken], controller.deletePatient);

module.exports = router;