const bcrypt = require('bcrypt');
const pool = require('../config/database');
const  staffModel  = require('../models/staff.model');
const  insuranceModel  = require('../models/insurance.model');
const { generateToken } = require('../utils/jwt.utils');
const { AppError } = require('../utils/error.utils');
const emailService = require('../services/email.service');

/**
 * Login controller
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;
    
    let user;
    
    // Find user based on role
    if (role === 'admin' || role === 'doctor') {
      user = await staffModel.findStaffByEmail(email);
    } else if (role === 'insurance') {
      user = await insuranceModel.findInsuranceByEmail(email);
    } else {
      return next(new AppError('Invalid role specified', 400));
    }
    
    if (!user) {
      return next(new AppError('Invalid email or password', 401));
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return next(new AppError('Invalid email or password', 401));
    }
    
    // Get first_login status for admin/doctor users
    const userId = role === 'insurance' ? user.company_id : user.staff_id;
    let requiresPasswordChange = false;
    
    if (role === 'admin' || role === 'doctor') {
      const [userRow] = await pool.query(
        'SELECT first_login FROM users WHERE id = ?',
        [userId]
      );
      
      if (userRow.length > 0) {
        requiresPasswordChange = !!userRow[0].first_login;
      }
    }
    
    // Generate JWT token
    const token = generateToken({
      id: userId,
      email: user.email,
      role: role,
      name: role === 'insurance' ? user.company_name : `${user.first_name} ${user.last_name}`
    });
    
    // Send response
    res.status(200).json({
      status: 'success',
      data: {
        token,
        user: {
          id: userId,
          email: user.email,
          role: role,
          name: role === 'insurance' ? user.company_name : `${user.first_name} ${user.last_name}`
        },
        requiresPasswordChange
      }
    });
  } catch (error) {
    next(error);
  }
};
/**
 * Generate a random password
 * @param {number} length - Password length
 * @returns {string} - Random password
 */
const generateRandomPassword = (length = 10) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

/**
 * Create a new user account
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const createAccount = async (req, res, next) => {
  try {
    const { role, ...userData } = req.body;
    
    // Generate a random password
    const password = generateRandomPassword();
    const userData_with_password = { ...userData, password };
    
    let user;
    let name;
    
    // Create user based on role
    if (role === 'admin' || role === 'doctor') {
      user = await staffModel.createStaff(userData_with_password);
      name = `${user.first_name} ${user.last_name}`;
    } else if (role === 'insurance') {
      user = await insuranceModel.createInsurance(userData_with_password);
      name = user.company_name;
    } else {
      return next(new AppError('Invalid role specified', 400));
    }
    
    // Send email notification with temporary password
    try {
      await emailService.sendNewAccountEmail(
        user.email,
        name,
        role,
        password
      );
    } catch (emailError) {
      console.error('Failed to send account creation email:', emailError);
    }
    
    // Remove sensitive data before sending response
    if (user.password) delete user.password;
    
    res.status(201).json({
      status: 'success',
      data: {
        user,
        message: 'Account created successfully. A temporary password has been sent to the user\'s email.'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { id, role } = req.user;

    console.log('Change Password Request:', { id, role, hasCurrentPwd: !!currentPassword, hasNewPwd: !!newPassword });
    
    let user;
    
    // Find user based on role
    if (role === 'admin' || role === 'doctor') {
      user = await staffModel.getStaffById(id, true);
    } else if (role === 'insurance') {
      user = await insuranceModel.getInsuranceById(id, true);
    } else {
      return next(new AppError('Invalid role specified', 400));
    }
    
    if (!user) {
      return next(new AppError('User not found', 404));
    }
    
    console.log('User found:', { 
      hasUser: !!user, 
      hasPassword: !!user.password,
      passwordLength: user.password ? user.password.length : 0
    });

    if (!user.password) {
      return next(new AppError('Password reset required. Contact administrator.', 400));
    }
    
    // Check current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      return next(new AppError('Current password is incorrect', 401));
    }
    
    // Update password
    if (role === 'admin' || role === 'doctor') {
      await staffModel.updateStaff(id, { password: newPassword });
      
      // Update first_login status
      await pool.query(
        'UPDATE users SET first_login = FALSE WHERE id = ?',
        [id]
      );
    } else if (role === 'insurance') {
      await insuranceModel.updateInsurance(id, { password: newPassword });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Password updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getProfile = async (req, res, next) => {
  try {
    const { id, role } = req.user;
    
    let user;
    
    // Get user profile based on role
    if (role === 'admin' || role === 'doctor') {
      user = await staffModel.getStaffById(id);
    } else if (role === 'insurance') {
      user = await insuranceModel.getInsuranceById(id);
    } else {
      return next(new AppError('Invalid role specified', 400));
    }
    
    if (!user) {
      return next(new AppError('User not found', 404));
    }
    
    // Remove sensitive data
    if (user.password) delete user.password;
    
    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  createAccount,
  changePassword,
  getProfile
};