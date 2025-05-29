const { recordModel } = require('../models');
const { AppError } = require('../utils/error.utils');
const auditService = require('../services/audit.service');

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
 * Get test types
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getTestTypes = async (req, res, next) => {
  try {
    // Define standard test types if none are available in the database
    const standardTestTypes = [
      "Complete Blood Count (CBC)",
      "Blood Glucose Test",
      "Liver Function Test",
      "Kidney Function Test",
      "Lipid Profile",
      "Thyroid Function Test",
      "Urine Analysis",
      "Electrocardiogram (ECG)",
      "X-Ray",
      "Ultrasound",
      "MRI",
      "CT Scan"
    ];
    
    // Get test types from database
    const labTests = await recordModel.getAllLabTests();
    
    // Extract unique test types, but clean up the format
    const typesFromDB = new Set();
    
    labTests.forEach(test => {
      if (test.test_type) {
        // Clean up the test type - remove "test for patient" suffix if present
        const cleanType = test.test_type.replace(/\s+test\s+for\s+patient$/i, '').trim();
        if (cleanType) {
          typesFromDB.add(cleanType);
        }
      }
    });
    
    // Combine standard types with any unique types from the database
    const allTypes = new Set([...standardTestTypes, ...typesFromDB]);
    
    // Convert to array of objects
    const testTypes = Array.from(allTypes).map(type => ({ test_type: type }));
    
    // Sort alphabetically
    testTypes.sort((a, b) => a.test_type.localeCompare(b.test_type));
    
    res.status(200).json({
      status: 'success',
      data: {
        testTypes
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a prescription record
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const createPrescriptionRecord = async (req, res, next) => {
  try {
    const { patientId, docId, medicines, description } = req.body;
    
    // Create prescriptions for each medicine
    const prescriptionPromises = medicines.map(async (med) => {
      const prescriptionId = await recordModel.createPrescription({
        med_id: med.medicineId,
        dosage: med.dosage,
        delay: med.delay,
        after_meal: med.afterMeal,
      });
      
      return prescriptionId;
    });
    
    const prescriptionIds = await Promise.all(prescriptionPromises);
    
    // Create a record for each prescription
    const recordPromises = prescriptionIds.map(async (prescriptionId) => {
      const record = await recordModel.createRecord({
        doc_id: docId,
        patient_id: patientId,
        prescription_id: prescriptionId,
        description,
      });
      
      return record;
    });
    
    const records = await Promise.all(recordPromises);
    
    // Log the action if auditService is available
    if (req.user) {
      await auditService.logAudit(
        req.user.id,
        'create',
        'prescription_record',
        records.map(r => r.record_id).join(','),
        { patient_id: patientId }
      );
    }
    
    res.status(201).json({
      status: 'success',
      data: {
        records,
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a lab test record
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const createLabTestRecord = async (req, res, next) => {
  try {
    const { patientId, docId, tests, description } = req.body;
    
    // Create lab tests
    const labTestPromises = tests.map(async (test) => {
      const testId = await recordModel.createLabTest({
        description: description || `${test.testType} test results`, // Use a better description
        test_type: test.testType, // Store clean test type
      });
      
      return testId;
    });
    
    const testIds = await Promise.all(labTestPromises);
    
    // Create a record for each lab test
    const recordPromises = testIds.map(async (testId) => {
      const record = await recordModel.createRecord({
        doc_id: docId,
        patient_id: patientId,
        test_id: testId,
        description, // Use the description provided by the user
      });
      
      return record;
    });
    
    const records = await Promise.all(recordPromises);
    
    // Log the action if auditService is available
    if (req.user) {
      await auditService.logAudit(
        req.user.id,
        'create',
        'lab_test_record',
        records.map(r => r.record_id).join(','),
        { patient_id: patientId }
      );
    }
    
    res.status(201).json({
      status: 'success',
      data: {
        records,
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllRecords,
  getRecordById,
  createRecord,
  getTestTypes,
  createPrescriptionRecord,
  createLabTestRecord
};