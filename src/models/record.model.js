const { pool } = require('../config/database');
const { encrypt, decrypt, isLikelyEncrypted } = require('../middleware/encryption.middleware');

// Fields that should be encrypted/decrypted
const sensitiveFields = ['description'];

/**
 * Create a new medical record
 * @param {Object} recordData - Record data
 * @returns {Promise<Object>} - The created record
 */
const createRecord = async (recordData) => {
  // Encrypt sensitive fields
  const encryptedData = { ...recordData };

  if (sensitiveFields.includes('description') && encryptedData.description) {
    encryptedData.description = encrypt(encryptedData.description);
  }
  
  // Generate record ID
  const recordId = `REC${Date.now().toString().slice(-6)}`;
  
  const [result] = await pool.query(
    `INSERT INTO records (
      record_id, doc_id, patient_id, prescription_id, description,
      test_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [
      recordId,
      recordData.doc_id,
      recordData.patient_id,
      recordData.prescription_id || null,
      encryptedData.description || null,
      recordData.test_id || null
    ]
  );
  
  // Return created record
  const record = await getRecordById(recordId);
  return record;
};

/**
 * Get all medical records
 * @param {Object} options - Query options (patientId, limit, offset)
 * @returns {Promise<Array>} - Array of records
 */
const getAllRecords = async (options = { patientId: null, limit: 100, offset: 0 }) => {
    let query = `
      SELECT r.record_id, r.doc_id, r.patient_id, r.prescription_id,
        r.test_id, r.description, r.created_at,
        p.name as patient_name,
        CONCAT(s.first_name, ' ', s.last_name) as doctor_name,
        CASE
          WHEN r.prescription_id IS NOT NULL THEN 'Prescription'
          WHEN r.test_id IS NOT NULL THEN 'Lab Test'
          ELSE 'Consultation'
        END as record_type
      FROM records r
      JOIN patients p ON r.patient_id = p.patient_id
      JOIN staff s ON r.doc_id = s.staff_id
    `;
    
    const queryParams = [];
    
    if (options.patientId) {
      query += ' WHERE r.patient_id = ?';
      queryParams.push(options.patientId);
    }
    
    query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(options.limit, options.offset);
    
    const [rows] = await pool.query(query, queryParams);
    
    // Decrypt sensitive fields
    return rows.map(record => {
      // Only try to decrypt if the field is encrypted
      if (record.description && isLikelyEncrypted(record.description)) {
        try {
          record.description = decrypt(record.description);
        } catch (error) {
          console.error('Error decrypting field in getAllRecords:', error);
          record.description = '[Encrypted content]';
        }
      }
      return record;
    });
};

/**
 * Get a record by ID
 * @param {string} id - Record ID
 * @returns {Promise<Object|null>} - Record or null if not found
 */
const getRecordById = async (id) => {
    try {
      const [rows] = await pool.query(
        `SELECT r.*,
          p.name as patient_name, CONCAT(s.first_name, ' ', s.last_name) as doctor_name,
          lt.description as test_name, lt.test_type,
          m.med_name, pr.dosage, pr.delay, pr.after_meal
        FROM records r
        JOIN patients p ON r.patient_id = p.patient_id
        JOIN staff s ON r.doc_id = s.staff_id
        LEFT JOIN lab_tests lt ON r.test_id = lt.test_id
        LEFT JOIN prescriptions pr ON r.prescription_id = pr.prescription_id
        LEFT JOIN medicines m ON pr.med_id = m.med_id
        WHERE r.record_id = ?`,
        [id]
      );
      
      if (rows.length === 0) {
        return null;
      }
      
      const record = rows[0];
      
      // Log the encrypted description for debugging
      console.log('Before decryption - Description:', record.description);
      
      // Properly handle description field with extra care
      if (record.description && typeof record.description === 'string') {
        try {
          // If it looks like a hex string, try to decrypt it
          if (/^[0-9a-f]{32,}$/i.test(record.description)) {
            const decrypted = decrypt(record.description);
            console.log('After decryption - Description result:', decrypted);
            record.description = decrypted;
          } else {
            console.log('Description does not appear to be encrypted');
          }
        } catch (error) {
          console.error('Error handling description decryption:', error);
          record.description = "Description unavailable";
        }
      }
      
      return record;
    } catch (error) {
      console.error('Error in getRecordById:', error);
      throw error;
    }
  };

/**
 * Create a prescription
 * @param {Object} prescriptionData - Prescription data
 * @returns {Promise<string>} - Prescription ID
 */
const createPrescription = async (prescriptionData) => {
  // Generate prescription ID
  const prescriptionId = `PRE${Date.now().toString().slice(-6)}`;
  
  const [result] = await pool.query(
    `INSERT INTO prescriptions (
      prescription_id, med_id, dosage, delay, after_meal, created_at
    ) VALUES (?, ?, ?, ?, ?, NOW())`,
    [
      prescriptionId,
      prescriptionData.med_id,
      prescriptionData.dosage,
      prescriptionData.delay,
      prescriptionData.after_meal ? 1 : 0
    ]
  );
  
  return prescriptionId;
};

/**
 * Create a lab test
 * @param {Object} labTestData - Lab test data
 * @returns {Promise<string>} - Lab test ID
 */
const createLabTest = async (labTestData) => {
    // Generate lab test ID
    const testId = `TEST${Date.now().toString().slice(-6)}`;
    
    // Format the description if none is provided
    const description = labTestData.description || `${labTestData.test_type} test results`;
    
    const [result] = await pool.query(
      `INSERT INTO lab_tests (
        test_id, description, test_type, created_at
      ) VALUES (?, ?, ?, NOW())`,
      [
        testId,
        description,
        labTestData.test_type // Store just the test type without adding "test for patient"
      ]
    );
    
    return testId;
  };

/**
 * Get recent records for a doctor
 * @param {string} doctorId - Doctor ID
 * @param {Object} options - Query options (limit, offset)
 * @returns {Promise<Array>} - Array of recent records
 */
const getRecentRecords = async (doctorId, options = { limit: 10, offset: 0 }) => {
  const [rows] = await pool.query(
    `SELECT r.record_id, r.patient_id, r.created_at,
      p.name as patient_name, 
      CASE 
        WHEN r.prescription_id IS NOT NULL THEN 'Prescription'
        WHEN r.test_id IS NOT NULL THEN 'Lab Test'
        ELSE 'Consultation'
      END as record_type
     FROM records r
     JOIN patients p ON r.patient_id = p.patient_id
     WHERE r.doc_id = ?
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    [doctorId, options.limit, options.offset]
  );
  
  return rows;
};

/**
 * Get a medicine by ID
 * @param {string} id - Medicine ID
 * @returns {Promise<Object|null>} - Medicine or null if not found
 */
const getMedicineById = async (id) => {
  const [rows] = await pool.query(
    'SELECT * FROM medicines WHERE med_id = ?',
    [id]
  );
  
  return rows.length > 0 ? rows[0] : null;
};

/**
 * Get all medicines
 * @param {Object} options - Query options (search, limit, offset)
 * @returns {Promise<Array>} - Array of medicines
 */
const getAllMedicines = async (options = { search: '', limit: 100, offset: 0 }) => {
  let query = 'SELECT * FROM medicines';
  const queryParams = [];
  
  if (options.search) {
    query += ' WHERE med_name LIKE ? OR dosages LIKE ?';
    const searchTerm = `%${options.search}%`;
    queryParams.push(searchTerm, searchTerm);
  }
  
  query += ' ORDER BY med_name LIMIT ? OFFSET ?';
  queryParams.push(options.limit, options.offset);
  
  const [rows] = await pool.query(query, queryParams);
  
  return rows;
};

/**
 * Get all lab tests
 * @param {Object} options - Query options (search, limit, offset)
 * @returns {Promise<Array>} - Array of lab tests
 */
const getAllLabTests = async (options = { search: '', limit: 100, offset: 0 }) => {
  let query = 'SELECT * FROM lab_tests';
  const queryParams = [];
  
  if (options.search) {
    query += ' WHERE description LIKE ? OR test_type LIKE ?';
    const searchTerm = `%${options.search}%`;
    queryParams.push(searchTerm, searchTerm);
  }
  
  query += ' ORDER BY description LIMIT ? OFFSET ?';
  queryParams.push(options.limit, options.offset);
  
  const [rows] = await pool.query(query, queryParams);
  
  return rows;
};

module.exports = {
  createRecord,
  getAllRecords,
  getRecordById,
  createPrescription,
  createLabTest,
  getRecentRecords,
  getMedicineById,
  getAllMedicines,
  getAllLabTests
};