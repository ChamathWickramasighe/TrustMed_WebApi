const { body, param, query, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Validation error', 
      errors: errors.array() 
    });
  }
  next();
};

const patientValidationRules = [
  body('name').notEmpty().withMessage('Name is required'),
  body('name_initials').notEmpty().withMessage('Name initials are required'),
  body('gender').isIn(['Male', 'Female', 'Other']).withMessage('Gender must be Male, Female, or Other'),
  body('blood_type').notEmpty().withMessage('Blood type is required'),
  body('mobile').notEmpty().withMessage('Mobile number is required'),
  body('email').isEmail().withMessage('Valid email is required')
];

const staffValidationRules = [
  body('first_name').notEmpty().withMessage('First name is required'),
  body('last_name').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('mobile').notEmpty().withMessage('Mobile number is required'),
  body('role').isIn(['admin', 'doctor']).withMessage('Role must be admin or doctor'),
  body('nic').notEmpty().withMessage('NIC is required')
];

const insuranceValidationRules = [
  body('company_name').notEmpty().withMessage('Company name is required'),
  body('hotline').notEmpty().withMessage('Hotline number is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('address').notEmpty().withMessage('Address is required')
];

const loginValidationRules = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  body('role').isIn(['admin', 'doctor', 'insurance']).withMessage('Role must be admin, doctor, or insurance')
];

module.exports = {
  validate,
  patientValidationRules,
  staffValidationRules,
  insuranceValidationRules,
  loginValidationRules
};