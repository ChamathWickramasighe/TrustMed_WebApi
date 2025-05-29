const express = require('express');
const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const doctorRoutes = require('./doctor.routes');
const insuranceRoutes = require('./insurance.routes');
const recordRoutes = require('./record.routes');

const router = express.Router();

// Base routes
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/doctor', doctorRoutes);
router.use('/insurance', insuranceRoutes);
router.use('/admin',recordRoutes);

module.exports = router;