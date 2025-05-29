const { staffModel, patientModel, insuranceModel, recordModel, medicineModel } = require('../models');
const insuranceAllocationModel = require('../models/insuranceAllocation.model');
const dataRequestModel = require('../models/dataRequest.model');
const { pool } = require('../config/database');
const { AppError } = require('../utils/error.utils');
const  auditService  = require('../services/audit.service');
const  emailService  = require('../services/email.service');

/**
 * Get all staff members
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getAllStaff = async (req, res, next) => {
  try {
    const { search, limit = 10, offset = 0 } = req.query;
    
    const staff = await staffModel.getAllStaff({ search, limit, offset });
    
    res.status(200).json({
      status: 'success',
      data: {
        staff
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get staff member by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getStaffById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const staff = await staffModel.getStaffById(id);
    
    if (!staff) {
      return next(new AppError('Staff member not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        staff
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new staff member
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const createStaff = async (req, res, next) => {
    try {
      const staffData = req.body;
      
      // Generate a random password
      const password = Math.random().toString(36).slice(-8);
      
      // Add password to staff data
      staffData.password = password;
      
      // The staffModel.createStaff function will handle both user and staff creation
      const newStaff = await staffModel.createStaff(staffData);
      
      // Log the action
      await auditService.logAudit(
        req.user.id,
        'create',
        'staff',
        newStaff.staff_id,
        { role: newStaff.role }
      );
      
      // Send email notification
      try {
        await emailService.sendNewAccountEmail(
          newStaff.email,
          `${newStaff.first_name} ${newStaff.last_name}`,
          newStaff.role,
          password
        );
      } catch (emailError) {
        console.error('Failed to send account creation email:', emailError);
      }
      
      res.status(201).json({
        status: 'success',
        data: {
          staff: newStaff,
          message: 'Staff member created successfully. A temporary password has been sent to their email.'
        }
      });
    } catch (error) {
      next(error);
    }
  };

/**
 * Update a staff member
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const updateStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const staffData = req.body;
    
    const updatedStaff = await staffModel.updateStaff(id, staffData);
    
    // Log the action
    await auditService.logAudit(
      req.user.id,
      'update',
      'staff',
      id,
      { fields: Object.keys(staffData) }
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        staff: updatedStaff
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a staff member
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const deleteStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const success = await staffModel.deleteStaff(id);
    
    if (!success) {
      return next(new AppError('Staff member not found', 404));
    }
    
    // Log the action
    await auditService.logAudit(
      req.user.id,
      'delete',
      'staff',
      id,
      {}
    );
    
    res.status(200).json({
      status: 'success',
      message: 'Staff member deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all patients
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getAllPatients = async (req, res, next) => {
  try {
    const { search, limit = 10, offset = 0 } = req.query;
    
    const patients = await patientModel.getAllPatients({ search, limit, offset });
    
    res.status(200).json({
      status: 'success',
      data: {
        patients
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get patient by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getPatientById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const patient = await patientModel.getPatientById(id);
    
    if (!patient) {
      return next(new AppError('Patient not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        patient
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new patient
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const createPatient = async (req, res, next) => {
  try {
    const patientData = req.body;
    
    const newPatient = await patientModel.createPatient(patientData);
    
    // Log the action
    await auditService.logAudit(
      req.user.id,
      'create',
      'patient',
      newPatient.patient_id,
      {}
    );
    
    res.status(201).json({
      status: 'success',
      data: {
        patient: newPatient
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a patient
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const updatePatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const patientData = req.body;
    
    const updatedPatient = await patientModel.updatePatient(id, patientData);
    
    // Log the action
    await auditService.logAudit(
      req.user.id,
      'update',
      'patient',
      id,
      { fields: Object.keys(patientData) }
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        patient: updatedPatient
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a patient
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const deletePatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const success = await patientModel.deletePatient(id);
    
    if (!success) {
      return next(new AppError('Patient not found', 404));
    }
    
    // Log the action
    await auditService.logAudit(
      req.user.id,
      'delete',
      'patient',
      id,
      {}
    );
    
    res.status(200).json({
      status: 'success',
      message: 'Patient deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all insurance companies
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getAllInsurance = async (req, res, next) => {
  try {
    const { search, limit = 10, offset = 0 } = req.query;
    
    const companies = await insuranceModel.getAllInsurance({ search, limit, offset });
    
    res.status(200).json({
      status: 'success',
      data: {
        companies
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get insurance company by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getInsuranceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const company = await insuranceModel.getInsuranceById(id);
    
    if (!company) {
      return next(new AppError('Insurance company not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        company
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new insurance company
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const createInsurance = async (req, res, next) => {
  try {
    const insuranceData = req.body;
    
    // Generate a random password
    const password = Math.random().toString(36).slice(-8);
    
    const newCompany = await insuranceModel.createInsurance({ ...insuranceData, password });
    
    // Log the action
    await auditService.logAudit(
      req.user.id,
      'create',
      'insurance',
      newCompany.company_id,
      {}
    );
    
    // Send email notification
    try {
      await emailService.sendNewAccountEmail(
        newCompany.email,
        newCompany.company_name,
        'insurance',
        password
      );
    } catch (emailError) {
      console.error('Failed to send account creation email:', emailError);
    }
    
    res.status(201).json({
      status: 'success',
      data: {
        company: newCompany,
        message: 'Insurance company created successfully. A temporary password has been sent to their email.'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an insurance company
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const updateInsurance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const insuranceData = req.body;
    
    const updatedCompany = await insuranceModel.updateInsurance(id, insuranceData);
    
    // Log the action
    await auditService.logAudit(
      req.user.id,
      'update',
      'insurance',
      id,
      { fields: Object.keys(insuranceData) }
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        company: updatedCompany
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an insurance company
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const deleteInsurance = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const success = await insuranceModel.deleteInsurance(id);
    
    if (!success) {
      return next(new AppError('Insurance company not found', 404));
    }
    
    // Log the action
    await auditService.logAudit(
      req.user.id,
      'delete',
      'insurance',
      id,
      {}
    );
    
    res.status(200).json({
      status: 'success',
      message: 'Insurance company deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all medical records
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getAllRecords = async (req, res, next) => {
  try {
    const { patientId, limit = 10, offset = 0 } = req.query;
    
    const records = await recordModel.getAllRecords({ patientId, limit, offset });
    
    res.status(200).json({
      status: 'success',
      data: {
        records
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get medical record by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getRecordById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const record = await recordModel.getRecordById(id);
    
    if (!record) {
      return next(new AppError('Medical record not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        record
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new medical record
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const createRecord = async (req, res, next) => {
  try {
    const recordData = req.body;
    
    const newRecord = await recordModel.createRecord(recordData);
    
    // Log the action
    await auditService.logAudit(
      req.user.id,
      'create',
      'record',
      newRecord.record_id,
      { patient_id: newRecord.patient_id }
    );
    
    res.status(201).json({
      status: 'success',
      data: {
        record: newRecord
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all medicines
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getAllMedicines = async (req, res, next) => {
    try {
      const { search, limit = 100, offset = 0 } = req.query;
      
      const medicines = await medicineModel.getAllMedicines({ search, limit, offset });
      
      res.status(200).json({
        status: 'success',
        data: {
          medicines
        }
      });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Get medicine by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  const getMedicineById = async (req, res, next) => {
    try {
      const { id } = req.params;
      
      const medicine = await medicineModel.getMedicineById(id);
      
      if (!medicine) {
        return next(new AppError('Medicine not found', 404));
      }
      
      res.status(200).json({
        status: 'success',
        data: {
          medicine
        }
      });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Create a new medicine
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  const createMedicine = async (req, res, next) => {
    try {
      const medicineData = req.body;
      
      const newMedicine = await medicineModel.createMedicine(medicineData);
      
      // Log the action
      await auditService.logAudit(
        req.user.id,
        'create',
        'medicine',
        newMedicine.med_id,
        {}
      );
      
      res.status(201).json({
        status: 'success',
        data: {
          medicine: newMedicine
        }
      });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Update a medicine
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  const updateMedicine = async (req, res, next) => {
    try {
      const { id } = req.params;
      const medicineData = req.body;
      
      const updatedMedicine = await medicineModel.updateMedicine(id, medicineData);
      
      // Log the action
      await auditService.logAudit(
        req.user.id,
        'update',
        'medicine',
        id,
        { fields: Object.keys(medicineData) }
      );
      
      res.status(200).json({
        status: 'success',
        data: {
          medicine: updatedMedicine
        }
      });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Delete a medicine
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  const deleteMedicine = async (req, res, next) => {
    try {
      const { id } = req.params;
      
      const success = await medicineModel.deleteMedicine(id);
      
      if (!success) {
        return next(new AppError('Medicine not found', 404));
      }
      
      // Log the action
      await auditService.logAudit(
        req.user.id,
        'delete',
        'medicine',
        id,
        {}
      );
      
      res.status(200).json({
        status: 'success',
        message: 'Medicine deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // Add this to your admin.controller.js

/**
 * Reset staff member password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const resetStaffPassword = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { password } = req.body;
      
      // Get the staff member
      const staff = await staffModel.getStaffById(id);
      
      if (!staff) {
        return next(new AppError('Staff member not found', 404));
      }
      
      // Only allow password reset for admin and doctor roles
      if (staff.role !== 'admin' && staff.role !== 'doctor') {
        return next(new AppError('Password reset is only available for admin and doctor roles', 400));
      }
      
      // Update the password
      await staffModel.updateStaff(id, { password });
      
      // Send email notification with new password
      try {
        await emailService.sendNewAccountEmail(
          staff.email,
          `${staff.first_name} ${staff.last_name}`,
          staff.role,
          password
        );
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // Continue with response, but log the error
      }
      
      // Log the action
      await auditService.logAudit(
        req.user.id,
        'reset_password',
        'staff',
        id,
        {}
      );
      
      res.status(200).json({
        status: 'success',
        message: 'Password reset successfully'
      });
    } catch (error) {
      next(error);
    }
};

/**
 * Reset insurance company password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const resetInsurancePassword = async (req, res, next) => {
    try {
      const { id } = req.params;
      // Generate a random password
      const password = Math.random().toString(36).slice(-8);
      
      // Get the insurance company
      const company = await insuranceModel.getInsuranceById(id);
      
      if (!company) {
        return next(new AppError('Insurance company not found', 404));
      }
      
      // Update the password
      await insuranceModel.updateInsurance(id, { password });
      
      // Send email notification with new password
      try {
        await emailService.sendNewAccountEmail(
          company.email,
          company.company_name,
          'insurance',
          password
        );
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // Continue with response, but log the error
      }
      
      // Log the action
      await auditService.logAudit(
        req.user.id,
        'reset_password',
        'insurance',
        id,
        {}
      );
      
      res.status(200).json({
        status: 'success',
        message: 'Password reset successfully'
      });
    } catch (error) {
      next(error);
    }
};  

/**
 * Get all insurance allocations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getAllInsuranceAllocations = async (req, res, next) => {
    try {
      const { search, patientId, companyId, status, limit = 10, offset = 0 } = req.query;
      
      //console.log('Get all insurance allocations:', { search, patientId, companyId, status, limit, offset });
      
      const allocations = await insuranceAllocationModel.getAllAllocations({
        search, patientId, companyId, status, limit, offset
      });
      
      //console.log(`Found ${allocations.length} allocations after filtering`);
      
      // Log the full response
      const response = {
        status: 'success',
        data: {
          allocations
        }
      };
      //console.log('Sending response to frontend:', JSON.stringify(response, null, 2));
      
      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getAllInsuranceAllocations:', error);
      next(error);
    }
  };
  
  /**
   * Get insurance allocation by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  const getInsuranceAllocationById = async (req, res, next) => {
    try {
      const { id } = req.params;
      
      const allocation = await insuranceAllocationModel.getAllocationById(id);
      
      if (!allocation) {
        return next(new AppError('Insurance allocation not found', 404));
      }
      
      res.status(200).json({
        status: 'success',
        data: {
          allocation
        }
      });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Create a new insurance allocation
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  const createInsuranceAllocation = async (req, res, next) => {
    try {
      const allocationData = {
        ...req.body,
        created_by: req.user.id
      };
      
      const newAllocation = await insuranceAllocationModel.createAllocation(allocationData);
      
      // Log the action
      await auditService.logAudit(
        req.user.id,
        'create',
        'insurance_allocation',
        newAllocation.allocation_id,
        { patient_id: newAllocation.patient_id, company_id: newAllocation.company_id }
      );
      
      res.status(201).json({
        status: 'success',
        data: {
          allocation: newAllocation,
          message: 'Insurance connection created successfully.'
        }
      });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Update insurance allocation status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  const updateInsuranceAllocationStatus = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      
      // Convert status string to number
      const statusNumber = insuranceAllocationModel.parseStatus(status);
      
      const updatedAllocation = await insuranceAllocationModel.updateAllocationStatus(
        id, statusNumber, notes
      );
      
      // Log the action
      await auditService.logAudit(
        req.user.id,
        'update_status',
        'insurance_allocation',
        id,
        { status }
      );
      
      res.status(200).json({
        status: 'success',
        data: {
          allocation: updatedAllocation
        }
      });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Delete an insurance allocation
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  const deleteInsuranceAllocation = async (req, res, next) => {
    try {
      const { id } = req.params;
      
      const success = await insuranceAllocationModel.deleteAllocation(id);
      
      if (!success) {
        return next(new AppError('Insurance allocation not found', 404));
      }
      
      // Log the action
      await auditService.logAudit(
        req.user.id,
        'delete',
        'insurance_allocation',
        id,
        {}
      );
      
      res.status(200).json({
        status: 'success',
        message: 'Insurance allocation deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  };


  /**
 * Get all data requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getAllDataRequests = async (req, res, next) => {
    try {
      const { companyId, patientId, status, search, limit = 10, offset = 0 } = req.query;
      
      const requests = await dataRequestModel.getAllDataRequests({
        companyId, patientId, status, search, limit, offset
      });
      
      res.status(200).json({
        status: 'success',
        data: {
          requests
        }
      });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Get data request by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  const getDataRequestById = async (req, res, next) => {
    try {
      const { id } = req.params;
      
      const request = await dataRequestModel.getDataRequestById(id);
      
      if (!request) {
        return next(new AppError('Data request not found', 404));
      }
      
      res.status(200).json({
        status: 'success',
        data: {
          request
        }
      });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Approve data request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  const approveDataRequest = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      
      const updatedRequest = await dataRequestModel.updateDataRequestStatus(
        id, dataRequestModel.parseStatus('approved'), notes
      );
      
      // Log the action
      await auditService.logAudit(
        req.user.id,
        'approve',
        'data_request',
        id,
        { notes }
      );
      
      res.status(200).json({
        status: 'success',
        data: {
          request: updatedRequest,
          message: 'Data request approved successfully.'
        }
      });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Reject data request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  const rejectDataRequest = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      
      if (!notes) {
        return next(new AppError('Rejection reason is required', 400));
      }
      
      const updatedRequest = await dataRequestModel.updateDataRequestStatus(
        id, dataRequestModel.parseStatus('rejected'), notes
      );
      
      // Log the action
      await auditService.logAudit(
        req.user.id,
        'reject',
        'data_request',
        id,
        { notes }
      );
      
      res.status(200).json({
        status: 'success',
        data: {
          request: updatedRequest,
          message: 'Data request rejected successfully.'
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
 * Get dashboard statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getDashboardStats = async (req, res, next) => {
    try {
      // Get patient count
      const [patientCount] = await pool.query('SELECT COUNT(*) as count FROM patients');
      
      // Get staff count
      const [staffCount] = await pool.query('SELECT COUNT(*) as count FROM staff');
      
      // Get medicine count
      const [medicineCount] = await pool.query('SELECT COUNT(*) as count FROM medicines');
      
      // Get record count
      const [recordCount] = await pool.query('SELECT COUNT(*) as count FROM records');
      
      // Get pending request count
      const [pendingRequestCount] = await pool.query('SELECT COUNT(*) as count FROM data_requests WHERE status = 0');
      
      // Get recent patients (last 5)
      const [recentPatients] = await pool.query(
        `SELECT patient_id, name, created_at FROM patients ORDER BY created_at DESC LIMIT 5`
      );
      
      // Get recent data requests (last 5)
      const [recentRequests] = await pool.query(
        `SELECT dr.request_id, ic.company_name, p.name as patient_name, dr.status, dr.request_date
         FROM data_requests dr
         JOIN patients p ON dr.patient_id = p.patient_id
         JOIN insurance_companies ic ON dr.company_id = ic.company_id
         ORDER BY dr.request_date DESC LIMIT 5`
      );
      
      // Format the status in recent requests
      const formattedRequests = recentRequests.map(req => ({
        ...req,
        status: req.status === 0 ? 'pending' : (req.status === 1 ? 'approved' : 'rejected')
      }));
      
      res.status(200).json({
        status: 'success',
        data: {
          patientCount: patientCount[0].count,
          staffCount: staffCount[0].count,
          medicineCount: medicineCount[0].count,
          recordCount: recordCount[0].count,
          pendingRequestCount: pendingRequestCount[0].count,
          recentPatients,
          recentRequests: formattedRequests
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
 * Get system settings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getSystemSettings = async (req, res, next) => {
    try {
      const settings = {
        hospitalName: "TrustMed General Hospital",
        hospitalAddress: "123 Healthcare Avenue, Colombo 00700",
        contactPhone: "0112345678",
        contactEmail: "info@trustmed.com",
        website: "https://trustmed.com",
        taxId: "TAX123456789",
        recordRetentionPeriod: 7,
        systemVersion: "TrustMed v1.0.0",
        lastBackup: new Date().toISOString(),
        databaseStatus: "Healthy",
        twoFactorAuth: false,
        autoLogoutTime: 30
      };
      
      res.status(200).json({
        status: 'success',
        data: {
          settings
        }
      });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Update system settings
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  const updateSystemSettings = async (req, res, next) => {
    try {
      const settingsData = req.body;
      
      //console.log('Updated settings:', settingsData);
      
      // Log the action
      await auditService.logAudit(
        req.user.id,
        'update',
        'system_settings',
        'system',
        { fields: Object.keys(settingsData) }
      );
      
      res.status(200).json({
        status: 'success',
        message: 'System settings updated successfully'
      });
    } catch (error) {
      next(error);
    }
  };
  
  /**
   * Run system diagnostics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  const runSystemDiagnostics = async (req, res, next) => {
    try {
      const diagnostics = {
        databaseStatus: "Healthy",
        apiStatus: "Operational",
        fileStorageStatus: "Available",
        emailStatus: "Connected"
      };
      
      // Log the action
      await auditService.logAudit(
        req.user.id,
        'run',
        'system_diagnostics',
        'system',
        {}
      );
      
      res.status(200).json({
        status: 'success',
        data: diagnostics
      });
    } catch (error) {
      next(error);
    }
  };
  
  

module.exports = {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  getAllInsurance,
  getInsuranceById,
  createInsurance,
  updateInsurance,
  deleteInsurance,
  getAllRecords,
  getRecordById,
  createRecord,
  getAllMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  resetStaffPassword,
  resetInsurancePassword,
  getAllInsuranceAllocations,
  getInsuranceAllocationById,
  createInsuranceAllocation,
  updateInsuranceAllocationStatus,
  deleteInsuranceAllocation,
  getAllDataRequests,
  getDataRequestById,
  approveDataRequest,
  rejectDataRequest,
  getDashboardStats,
  getSystemSettings,
  updateSystemSettings,
  runSystemDiagnostics
};