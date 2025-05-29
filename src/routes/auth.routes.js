const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate, loginValidationRules } = require('../utils/validator.utils');

const router = express.Router();

// Public routes
router.post('/login', loginValidationRules, validate, authController.login);

// Protected routes
router.use(authenticate);

router.get('/profile', authController.getProfile);
router.post('/change-password', authController.changePassword);

module.exports = router;