const { query } = require('../config/database');
const { AppError } = require('../utils/error.utils');

/**
 * Get all patients for the system
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Array of patients
 */
const getAllPatients = async (options = {}) => {
  const { search = '', limit = 100, offset = 0 } = options;
  
  try {
    let sql = 'SELECT * FROM patients';
    const params = [];
    
    if (search) {
      sql += ` WHERE 
        name LIKE ? OR
        nic LIKE ? OR
        mobile LIKE ? OR
        email LIKE ?`;
      
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const results = await query(sql, params);
    return results;
  } catch (error) {
    console.error('Error in getAllPatients:', error);
    throw new AppError('Failed to fetch patients', 500);
  }
};

/**
 * Get all patient records for a specific patient
 * @param {string} patientId - The patient's ID
 * @returns {Promise<Array>} - Array of medical records
 */
const getPatientRecords = async (patientId) => {
  try {
    const sql = `
      SELECT 
        r.*,
        CONCAT(s.first_name, ' ', s.last_name) AS doctor_name
      FROM 
        records r
      LEFT JOIN 
        staff s ON r.doc_id = s.staff_id
      WHERE 
        r.patient_id = ?
      ORDER BY 
        r.created_at DESC
    `;
    
    const results = await query(sql, [patientId]);
    
    // Get additional details for each record
    for (const record of results) {
      if (record.record_type === 'prescription' && record.prescription_id) {
        const prescriptionSql = `
          SELECT 
            p.*,
            m.med_name
          FROM 
            prescriptions p
          LEFT JOIN 
            medicines m ON p.med_id = m.med_id
          WHERE 
            p.prescription_id = ?
        `;
        
        const [prescription] = await query(prescriptionSql, [record.prescription_id]);
        record.prescription = prescription || null;
      } else if (record.record_type === 'lab_test' && record.test_id) {
        const labTestSql = `
          SELECT * FROM lab_tests WHERE test_id = ?
        `;
        
        const [labTest] = await query(labTestSql, [record.test_id]);
        record.lab_test = labTest || null;
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error in getPatientRecords:', error);
    throw new AppError('Failed to fetch patient records', 500);
  }
};

/**
 * Get record by ID with full details
 * @param {string} recordId - The record ID
 * @returns {Promise<Object>} - Record details
 */
const getRecordById = async (recordId) => {
  try {
    const sql = `
      SELECT 
        r.*,
        p.name AS patient_name,
        CONCAT(s.first_name, ' ', s.last_name) AS doctor_name
      FROM 
        records r
      LEFT JOIN 
        patients p ON r.patient_id = p.patient_id
      LEFT JOIN 
        staff s ON r.doc_id = s.staff_id
      WHERE 
        r.record_id = ?
    `;
    
    const [record] = await query(sql, [recordId]);
    
    if (!record) {
      return null;
    }
    
    if (record.record_type === 'prescription' && record.prescription_id) {
      const prescriptionSql = `
        SELECT 
          p.*,
          m.med_name
        FROM 
          prescriptions p
        LEFT JOIN 
          medicines m ON p.med_id = m.med_id
        WHERE 
          p.prescription_id = ?
      `;
      
      const [prescription] = await query(prescriptionSql, [record.prescription_id]);
      record.prescription = prescription || null;
    } else if (record.record_type === 'lab_test' && record.test_id) {
      const labTestSql = `
        SELECT * FROM lab_tests WHERE test_id = ?
      `;
      
      const [labTest] = await query(labTestSql, [record.test_id]);
      record.lab_test = labTest || null;
    }
    
    return record;
  } catch (error) {
    console.error('Error in getRecordById:', error);
    throw new AppError('Failed to fetch record details', 500);
  }
};

module.exports = {
  getAllPatients,
  getPatientRecords,
  getRecordById
};