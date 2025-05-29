const { patientModel, recordModel } = require('../models');
const doctorModel = require('../models/doctor.model');
const { AppError } = require('../utils/error.utils');
const auditService = require('../services/audit.service');

/**
 * Get all patients (for doctor view)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getAllPatients = async (req, res, next) => {
  try {
    const { search, limit = 100, offset = 0 } = req.query;
    
    const patients = await doctorModel.getAllPatients({
      search,
      limit,
      offset
    });
    
    // Log the access - use try/catch to prevent API failures if audit logging fails
    try {
      await auditService.logAudit(
        req.user.id,
        'view',
        'patients_list',
        'global', // Use a non-null value for resource_id
        {}
      );
    } catch (auditError) {
      console.error('Audit logging error:', auditError);
      // Continue processing even if audit logging fails
    }
    
    res.status(200).json({
      status: 'success',
      data: patients
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get patients for a specific doctor
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getDoctorPatients = async (req, res, next) => {
  try {
    const { search, limit = 100, offset = 0 } = req.query;
    
    const patients = await doctorModel.getDoctorPatients(req.user.id, {
      search,
      limit,
      offset
    });
    
    // Log the access
    try {
      await auditService.logAudit(
        req.user.id,
        'view',
        'doctor_patients',
        req.user.id, // Use doctor ID as resource_id
        {}
      );
    } catch (auditError) {
      console.error('Audit logging error:', auditError);
    }
    
    res.status(200).json({
      status: 'success',
      data: patients
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get patient history
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getPatientHistory = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    
    // Check if patient exists
    const patient = await patientModel.getPatientById(patientId);
    
    if (!patient) {
      return next(new AppError('Patient not found', 404));
    }
    
    const history = await patientModel.getPatientHistory(patientId);
    
    // Log the access
    try {
      await auditService.logAudit(
        req.user.id,
        'view',
        'patient_history',
        patientId,
        {}
      );
    } catch (auditError) {
      console.error('Audit logging error:', auditError);
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        patient,
        history
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all records for a specific patient
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getPatientRecords = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    
    // Check if patient exists
    const patient = await patientModel.getPatientById(patientId);
    
    if (!patient) {
      return next(new AppError('Patient not found', 404));
    }
    
    const records = await doctorModel.getPatientRecords(patientId);
    
    // Log the access
    try {
      await auditService.logAudit(
        req.user.id,
        'view',
        'patient_records',
        patientId,
        {}
      );
    } catch (auditError) {
      console.error('Audit logging error:', auditError);
    }
    
    res.status(200).json({
      status: 'success',
      data: records
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get record by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getRecordById = async (req, res, next) => {
  try {
    const { recordId } = req.params;
    
    const record = await doctorModel.getRecordById(recordId);
    
    if (!record) {
      return next(new AppError('Record not found', 404));
    }
    
    // Log the access
    try {
      await auditService.logAudit(
        req.user.id,
        'view',
        'record_details',
        recordId,
        {}
      );
    } catch (auditError) {
      console.error('Audit logging error:', auditError);
    }
    
    res.status(200).json({
      status: 'success',
      data: record
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a prescription
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const createPrescription = async (req, res, next) => {
  try {
    const { patientId, medicineId, dosage, delay, afterMeal, description, diagnosis, symptoms } = req.body;
    
    // Check if patient exists
    const patient = await patientModel.getPatientById(patientId);
    
    if (!patient) {
      return next(new AppError('Patient not found', 404));
    }
    
    // Create prescription
    const prescriptionId = await recordModel.createPrescription({
      med_id: medicineId,
      dosage,
      delay,
      after_meal: afterMeal
    });
    
    // Create record
    const record = await recordModel.createRecord({
      doc_id: req.user.id,
      patient_id: patientId,
      prescription_id: prescriptionId,
      description,
      diagnosis,
      symptoms
    });
    
    // Log the action
    try {
      await auditService.logAudit(
        req.user.id,
        'create',
        'prescription',
        prescriptionId,
        { patient_id: patientId }
      );
    } catch (auditError) {
      console.error('Audit logging error:', auditError);
    }
    
    res.status(201).json({
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
 * Create a lab test
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const createLabTest = async (req, res, next) => {
  try {
    const { patientId, testType, testDescription, description, diagnosis, symptoms } = req.body;
    
    // Check if patient exists
    const patient = await patientModel.getPatientById(patientId);
    
    if (!patient) {
      return next(new AppError('Patient not found', 404));
    }
    
    // Create lab test
    const testId = await recordModel.createLabTest({
      description: testDescription,
      test_type: testType
    });
    
    // Create record
    const record = await recordModel.createRecord({
      doc_id: req.user.id,
      patient_id: patientId,
      test_id: testId,
      description,
      diagnosis,
      symptoms
    });
    
    // Log the action
    try {
      await auditService.logAudit(
        req.user.id,
        'create',
        'lab_test',
        testId,
        { patient_id: patientId }
      );
    } catch (auditError) {
      console.error('Audit logging error:', auditError);
    }
    
    res.status(201).json({
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
 * Get all medicines
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getMedicines = async (req, res, next) => {
  try {
    const { search, limit = 100, offset = 0 } = req.query;
    
    const medicines = await recordModel.getAllMedicines({ search, limit, offset });
    
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
 * Get all lab tests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getLabTests = async (req, res, next) => {
  try {
    const { search, limit = 100, offset = 0 } = req.query;
    
    const labTests = await recordModel.getAllLabTests({ search, limit, offset });
    
    res.status(200).json({
      status: 'success',
      data: {
        labTests
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search patients
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const searchPatients = async (req, res, next) => {
  try {
    const { query, limit = 10, offset = 0 } = req.query;
    
    // Use the existing getAllPatients with search
    const patients = await patientModel.getAllPatients({
      search: query,
      limit,
      offset
    });
    
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
 * Get recent records
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getRecentRecords = async (req, res, next) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    
    const records = await recordModel.getRecentRecords(req.user.id, { limit, offset });
    
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

module.exports = {
  getAllPatients,
  getDoctorPatients,
  getPatientHistory,
  getPatientRecords,
  getRecordById,
  createPrescription,
  createLabTest,
  getMedicines,
  getLabTests,
  searchPatients,
  getRecentRecords
};