const express = require('express');
const adminController = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/roleCheck.middleware');
const { validate, staffValidationRules, patientValidationRules, insuranceValidationRules } = require('../utils/validator.utils');

const router = express.Router();

// All admin routes are protected
router.use(authenticate);
router.use(checkRole('admin'));

// Staff routes
router.get('/staff', adminController.getAllStaff);
router.get('/staff/:id', adminController.getStaffById);
router.post('/staff', staffValidationRules, validate, adminController.createStaff);
router.put('/staff/:id', adminController.updateStaff);
router.delete('/staff/:id', adminController.deleteStaff);
router.put('/staff/:id/reset-password', adminController.resetStaffPassword);

// Patient routes
router.get('/patients', adminController.getAllPatients);
router.get('/patients/:id', adminController.getPatientById);
router.post('/patients', patientValidationRules, validate, adminController.createPatient);
router.put('/patients/:id', adminController.updatePatient);
router.delete('/patients/:id', adminController.deletePatient);

// Insurance routes
router.get('/insurance', adminController.getAllInsurance);
router.get('/insurance/:id', adminController.getInsuranceById);
router.post('/insurance', insuranceValidationRules, validate, adminController.createInsurance);
router.put('/insurance/:id', adminController.updateInsurance);
router.delete('/insurance/:id', adminController.deleteInsurance);
router.put('/insurance/:id/reset-password', adminController.resetInsurancePassword);

// Medical records routes
router.get('/records', adminController.getAllRecords);
router.get('/records/:id', adminController.getRecordById);
router.post('/records', adminController.createRecord);

// Medicine routes
router.get('/medicines', adminController.getAllMedicines);
router.get('/medicines/:id', adminController.getMedicineById);
router.post('/medicines', adminController.createMedicine);
router.put('/medicines/:id', adminController.updateMedicine);
router.delete('/medicines/:id', adminController.deleteMedicine);

// Insurance allocations routes
router.get('/insurance-allocations', adminController.getAllInsuranceAllocations);
router.get('/insurance-allocations/:id', adminController.getInsuranceAllocationById);
router.post('/insurance-allocations', adminController.createInsuranceAllocation);
router.put('/insurance-allocations/:id/status', adminController.updateInsuranceAllocationStatus);
router.delete('/insurance-allocations/:id', adminController.deleteInsuranceAllocation);

// Data request routes
router.get('/data-requests', adminController.getAllDataRequests);
router.get('/data-requests/:id', adminController.getDataRequestById);
router.put('/data-requests/:id/approve', adminController.approveDataRequest);
router.put('/data-requests/:id/reject', adminController.rejectDataRequest);

// Dashborad stats
router.get('/dashboard-stats', adminController.getDashboardStats);

// System Settings
router.get('/system-settings', adminController.getSystemSettings);
router.put('/system-settings', adminController.updateSystemSettings);
router.post('/system-diagnostics', adminController.runSystemDiagnostics);


module.exports = router;