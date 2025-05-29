const { pool } = require('../config/database');
const { encrypt, decrypt } = require('../middleware/encryption.middleware');

// Fields that should be encrypted/decrypted
const sensitiveFields = ['nic', 'address', 'allergies'];

/**
 * Create a new patient
 * @param {Object} patientData - Patient data
 * @returns {Promise<Object>} - The created patient
 */
const createPatient = async (patientData) => {
  // Encrypt sensitive fields
  const encryptedData = { ...patientData };
  sensitiveFields.forEach(field => {
    if (encryptedData[field]) {
      encryptedData[field] = encrypt(encryptedData[field]);
    }
  });
  
  // Generate patient ID
  const patientId = `PT${Date.now().toString().slice(-6)}`;
  
  const [result] = await pool.query(
    `INSERT INTO patients (
      patient_id, name, name_initials, nic, date_of_birth, gender,
      blood_type, allergies, address, city, district, postal_code,
      mobile, telephone, email, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      patientId,
      patientData.name,
      patientData.name_initials,
      encryptedData.nic,
      patientData.date_of_birth,
      patientData.gender,
      patientData.blood_type,
      encryptedData.allergies,
      encryptedData.address,
      patientData.city,
      patientData.district,
      patientData.postal_code,
      patientData.mobile,
      patientData.telephone,
      patientData.email
    ]
  );
  
  // Return created patient
  return getPatientById(patientId);
};

/**
 * Get all patients
 * @param {Object} options - Query options (search, limit, offset)
 * @returns {Promise<Array>} - Array of patients
 */
const getAllPatients = async (options = { search: '', limit: 10, offset: 0 }) => {
    let query = `
      SELECT patient_id, name, name_initials, gender, blood_type,
      city, district, postal_code, mobile, telephone, email, created_at, date_of_birth
      FROM patients
    `;
    
    const queryParams = [];
    
    if (options.search) {
      query += `
        WHERE name LIKE ? OR name_initials LIKE ? OR mobile LIKE ? 
        OR email LIKE ? OR patient_id LIKE ?
      `;
      const searchTerm = `%${options.search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    
    // Ensure limit and offset are numbers, not strings
    const limit = parseInt(options.limit) || 10;
    const offset = parseInt(options.offset) || 0;
    
    queryParams.push(limit, offset);
    
    const [rows] = await pool.query(query, queryParams);
    
    return rows;
  };
/**
 * Get a patient by ID
 * @param {string} id - Patient ID
 * @returns {Promise<Object|null>} - Patient or null if not found
 */
const getPatientById = async (id) => {
  const [rows] = await pool.query(
    'SELECT * FROM patients WHERE patient_id = ?',
    [id]
  );
  
  if (rows.length === 0) {
    return null;
  }
  
  const patient = rows[0];
  
  // Decrypt sensitive fields
  sensitiveFields.forEach(field => {
    if (patient[field]) {
      patient[field] = decrypt(patient[field]);
    }
  });
  
  return patient;
};

/**
 * Update a patient
 * @param {string} id - Patient ID
 * @param {Object} patientData - Updated patient data
 * @returns {Promise<Object>} - Updated patient
 */
const updatePatient = async (id, patientData) => {
  // Get current patient data
  const [currentPatient] = await pool.query(
    'SELECT * FROM patients WHERE patient_id = ?',
    [id]
  );
  
  if (currentPatient.length === 0) {
    throw new Error('Patient not found');
  }
  
  // Create updated patient object
  const updatedPatient = { ...currentPatient[0], ...patientData };
  
  // Encrypt sensitive fields if they were updated
  sensitiveFields.forEach(field => {
    if (patientData[field]) {
      updatedPatient[field] = encrypt(patientData[field]);
    }
  });
  
  // Update the patient record
  await pool.query(
    `UPDATE patients SET 
      name = ?, name_initials = ?, nic = ?, date_of_birth = ?, gender = ?,
      blood_type = ?, allergies = ?, address = ?, city = ?, district = ?,
      postal_code = ?, mobile = ?, telephone = ?, email = ?
    WHERE patient_id = ?`,
    [
      updatedPatient.name,
      updatedPatient.name_initials,
      updatedPatient.nic,
      updatedPatient.date_of_birth,
      updatedPatient.gender,
      updatedPatient.blood_type,
      updatedPatient.allergies,
      updatedPatient.address,
      updatedPatient.city,
      updatedPatient.district,
      updatedPatient.postal_code,
      updatedPatient.mobile,
      updatedPatient.telephone,
      updatedPatient.email,
      id
    ]
  );
  
  // Get the updated patient
  return getPatientById(id);
};

/**
 * Delete a patient
 * @param {string} id - Patient ID
 * @returns {Promise<boolean>} - True if successfully deleted
 */
const deletePatient = async (id) => {
  const [result] = await pool.query(
    'DELETE FROM patients WHERE patient_id = ?',
    [id]
  );
  
  return result.affectedRows > 0;
};

/**
 * Get patient history (medical records)
 * @param {string} patientId - Patient ID
 * @returns {Promise<Array>} - Array of patient records
 */
const getPatientHistory = async (patientId) => {
  const [rows] = await pool.query(
    `SELECT r.*, 
      CONCAT(s.first_name, ' ', s.last_name) as doctor_name,
      lt.description as test_name
    FROM records r
    LEFT JOIN staff s ON r.doc_id = s.staff_id
    LEFT JOIN lab_tests lt ON r.test_id = lt.test_id
    WHERE r.patient_id = ?
    ORDER BY r.created_at DESC`,
    [patientId]
  );
  
  // Decrypt sensitive information in records
  return rows.map(record => {
    if (record.description) {
      record.description = decrypt(record.description);
    }
    return record;
  });
};

module.exports = {
  createPatient,
  getAllPatients,
  getPatientById,
  updatePatient,
  deletePatient,
  getPatientHistory
};