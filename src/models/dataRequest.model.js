const { pool } = require('../config/database');
const { encrypt, decrypt } = require('../middleware/encryption.middleware');
const emailService = require('../services/email.service');
const insuranceModel = require('./insurance.model');
const patientModel = require('./patient.model');

/**
 * Create a new data request
 * @param {Object} requestData - Request data
 * @returns {Promise<Object>} - The created request
 */
const createDataRequest = async (requestData) => {
    const { 
      company_id, 
      patient_id, 
      purpose, 
      date_range_start, 
      date_range_end, 
      created_by,
      request_details
    } = requestData;
    
    // Generate request ID
    const request_id = `REQ${Date.now().toString().slice(-6)}`;
    
    // Insert the new request
    const [result] = await pool.query(
      `INSERT INTO data_requests (
        request_id, company_id, patient_id, purpose, date_range_start, date_range_end, 
        status, request_date, created_by, request_details
      ) VALUES (?, ?, ?, ?, ?, ?, '0', NOW(), ?, ?)`,
      [
        request_id,
        company_id,
        patient_id,
        purpose,
        date_range_start || null,
        date_range_end || null,
        created_by,
        JSON.stringify(request_details || {})
      ]
    );
    
    // Get the created request
    return getDataRequestById(request_id);
  };

/**
 * Get all data requests
 * @param {Object} options - Query options (companyId, patientId, status, limit, offset)
 * @returns {Promise<Array>} - Array of data requests
 */
const getAllDataRequests = async (options = {}) => {
  const { 
    companyId = null, 
    patientId = null, 
    status = null, 
    search = '',
    limit = 10, 
    offset = 0 
  } = options;
  
  let query = `
    SELECT dr.request_id, dr.company_id, dr.patient_id, dr.purpose, 
           dr.date_range_start, dr.date_range_end, dr.status,
           dr.request_date, dr.response_date, dr.response_notes,
           p.name as patient_name,
           ic.company_name
    FROM data_requests dr
    INNER JOIN patients p ON dr.patient_id = p.patient_id
    INNER JOIN insurance_companies ic ON dr.company_id = ic.company_id
    WHERE 1=1
  `;
  
  const queryParams = [];
  
  if (companyId) {
    query += ' AND dr.company_id = ?';
    queryParams.push(companyId);
  }
  
  if (patientId) {
    query += ' AND dr.patient_id = ?';
    queryParams.push(patientId);
  }
  
  if (status !== null) {
    query += ' AND dr.status = ?';
    queryParams.push(status);
  }
  
  if (search) {
    query += ` 
      AND (p.name LIKE ? OR ic.company_name LIKE ? OR dr.purpose LIKE ?)
    `;
    const searchTerm = `%${search}%`;
    queryParams.push(searchTerm, searchTerm, searchTerm);
  }
  
  query += ' ORDER BY dr.request_date DESC LIMIT ? OFFSET ?';
  
  // Ensure limit and offset are integers
  const parsedLimit = parseInt(limit) || 10;
  const parsedOffset = parseInt(offset) || 0;
  
  queryParams.push(parsedLimit, parsedOffset);
  
  const [rows] = await pool.query(query, queryParams);
  
  // Format status
  return rows.map(row => ({
    ...row,
    status: formatStatus(row.status)
  }));
};

/**
 * Get a data request by ID
 * @param {string} id - Request ID
 * @returns {Promise<Object|null>} - Data request or null if not found
 */
const getDataRequestById = async (id) => {
  const [rows] = await pool.query(
    `SELECT dr.request_id, dr.company_id, dr.patient_id, dr.purpose, 
            dr.date_range_start, dr.date_range_end, dr.status,
            dr.request_date, dr.response_date, dr.response_notes,
            p.name as patient_name,
            ic.company_name
     FROM data_requests dr
     INNER JOIN patients p ON dr.patient_id = p.patient_id
     INNER JOIN insurance_companies ic ON dr.company_id = ic.company_id
     WHERE dr.request_id = ?`,
    [id]
  );
  
  if (rows.length === 0) {
    return null;
  }
  
  const request = rows[0];
  
  // Format status
  request.status = formatStatus(request.status);
  
  return request;
};

/**
 * Update data request status
 * @param {string} id - Request ID
 * @param {number} status - New status (0: pending, 1: approved, 2: rejected)
 * @param {string} notes - Response notes
 * @returns {Promise<Object>} - Updated data request
 */
const updateDataRequestStatus = async (id, status, notes) => {
  // Get current request data
  const request = await getDataRequestById(id);
  
  if (!request) {
    throw new Error('Data request not found');
  }
  
  // Update the status
  await pool.query(
    `UPDATE data_requests 
     SET status = ?, response_notes = ?, response_date = NOW()
     WHERE request_id = ?`,
    [status, notes || null, id]
  );
  
  // Get the updated request
  const updatedRequest = await getDataRequestById(id);
  
  // Send email notification
  try {
    const company = await insuranceModel.getInsuranceById(request.company_id);
    const statusText = formatStatus(status);
    
    if (company) {
      await emailService.sendDataRequestStatusUpdateEmail(
        company.email,
        company.company_name,
        request.patient_name,
        statusText,
        notes || 'No additional notes provided'
      );
    }
  } catch (emailError) {
    console.error('Failed to send status update email:', emailError);
    // Continue with returning the request, but log the error
  }
  
  return updatedRequest;
};

/**
 * Format numeric status to string
 * @param {number} status - Status as number
 * @returns {string} - Status as string
 */
const formatStatus = (status) => {
  switch (parseInt(status)) {
    case 0:
      return 'pending';
    case 1:
      return 'approved';
    case 2:
      return 'rejected';
    default:
      return 'unknown';
  }
};

/**
 * Parse string status to number
 * @param {string} status - Status as string
 * @returns {number} - Status as number
 */
const parseStatus = (status) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return 0;
    case 'approved':
      return 1;
    case 'rejected':
      return 2;
    default:
      return 0;
  }
};

module.exports = {
  createDataRequest,
  getAllDataRequests,
  getDataRequestById,
  updateDataRequestStatus,
  formatStatus,
  parseStatus
};