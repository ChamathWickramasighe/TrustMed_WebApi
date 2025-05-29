const express = require('express');
const insuranceController = require('../controllers/insurance.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/roleCheck.middleware');

const router = express.Router();

// All insurance routes are protected
router.use(authenticate);
router.use(checkRole('insurance', 'admin'));

// Connection Management
router.get('/connections', insuranceController.getConnectionRequests);
router.put('/connections/:allocationId', insuranceController.updateConnectionStatus);
router.get('/patients', insuranceController.getConnectedPatients);

// Claims Management
router.post('/claims', insuranceController.createClaim);
router.get('/claims', insuranceController.getClaims);
router.get('/claims/:claimId', insuranceController.getClaimDetails);

// Data Request Management
router.post('/requests', insuranceController.createDataRequest);
router.get('/requests', insuranceController.getAllDataRequests);
router.get('/requests/:id', insuranceController.getDataRequestById);
router.get('/requests/:requestId/records', insuranceController.getApprovedRecords);

module.exports = router;