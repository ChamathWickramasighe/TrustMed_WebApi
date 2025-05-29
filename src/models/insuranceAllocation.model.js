const { pool } = require('../config/database');

/**
 * Create a new insurance allocation (connection)
 * @param {Object} allocationData - Allocation data
 * @returns {Promise<Object>} - The created allocation
 */
const createAllocation = async (allocationData) => {
    const { company_id, patient_id, notes, created_by } = allocationData;
    
    // Check for existing allocation
    const [existing] = await pool.query(
      'SELECT * FROM insurance_allocations WHERE company_id = ? AND patient_id = ?',
      [company_id, patient_id]
    );
    
    if (existing.length > 0) {
      throw new Error('Connection already exists between this patient and insurance company');
    }
    
    // Get patient and company details for email notification
    const [patientRows] = await pool.query(
      'SELECT * FROM patients WHERE patient_id = ?',
      [patient_id]
    );
    
    const [companyRows] = await pool.query(
      'SELECT * FROM insurance_companies WHERE company_id = ?',
      [company_id]
    );
    
    if (patientRows.length === 0) {
      throw new Error('Patient not found');
    }
    
    if (companyRows.length === 0) {
      throw new Error('Insurance company not found');
    }
    
    const patient = patientRows[0];
    const company = companyRows[0];
    
    // Insert the new allocation
    const [result] = await pool.query(
      `INSERT INTO insurance_allocations (
        company_id, patient_id, status, notes, created_by, created_at
      ) VALUES (?, ?, 0, ?, ?, NOW())`,
      [company_id, patient_id, notes || null, created_by]
    );
    
    const allocation_id = result.insertId;
    
    // Send email notification to insurance company
    try {
      const emailService = require('../services/email.service');
      await emailService.sendInsuranceConnectionEmail(
        company.email,
        company.company_name,
        patient.name,
        notes || 'No additional notes provided'
      );
    } catch (emailError) {
      console.error('Failed to send connection notification email:', emailError);
      // Continue with returning the allocation, but log the error
    }
    
    return getAllocationById(allocation_id);
  };

/**
 * Get all insurance allocations
 * @param {Object} options - Query options (search, patientId, companyId, status, limit, offset)
 * @returns {Promise<Array>} - Array of allocations
 */
const getAllAllocations = async (options = {}) => {
    const { 
      search = '', 
      patientId = null, 
      companyId = null, 
      status = null, 
      limit = 10, 
      offset = 0 
    } = options;
    
    let query = `
      SELECT a.id as allocation_id, a.company_id, a.patient_id, a.status, a.notes, a.created_at,
             p.name as patient_name, 
             ic.company_name as company_name
      FROM insurance_allocations a
      INNER JOIN patients p ON a.patient_id = p.patient_id
      INNER JOIN insurance_companies ic ON a.company_id = ic.company_id
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    if (search) {
      query += `
        AND (p.name LIKE ? OR ic.company_name LIKE ?)
      `;
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm);
    }
    
    if (patientId) {
      query += ' AND a.patient_id = ?';
      queryParams.push(patientId);
    }
    
    if (companyId) {
      query += ' AND a.company_id = ?';
      queryParams.push(companyId);
    }
    
    if (status !== null) {
      query += ' AND a.status = ?';
      queryParams.push(status);
    }
    
    query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    
    // Ensure limit and offset are integers
    const parsedLimit = parseInt(limit) || 10;
    const parsedOffset = parseInt(offset) || 0;
    
    queryParams.push(parsedLimit, parsedOffset);
    
    //console.log('Executing query:', query);
    // console.log('With parameters:', queryParams);
    
    try {
      const [rows] = await pool.query(query, queryParams);
      
    //   console.log(`Query returned ${rows.length} rows`);
      if (rows.length > 0) {
        //console.log('First row sample:', rows[0]);
      }
      
      // Format status
      const formattedRows = rows.map(row => ({
        ...row,
        status: formatStatus(row.status)
      }));
      
      return formattedRows;
    } catch (error) {
      console.error('Database error in getAllAllocations:', error);
      throw error;
    }
  };

/**
 * Get an allocation by ID
 * @param {number} id - Allocation ID
 * @returns {Promise<Object|null>} - Allocation or null if not found
 */
const getAllocationById = async (id) => {
  const [rows] = await pool.query(
    `SELECT a.id as allocation_id, a.company_id, a.patient_id, a.status, a.notes, a.created_at,
            p.name as patient_name, 
            ic.company_name as company_name
     FROM insurance_allocations a
     INNER JOIN patients p ON a.patient_id = p.patient_id
     INNER JOIN insurance_companies ic ON a.company_id = ic.company_id
     WHERE a.id = ?`,
    [id]
  );
  
  if (rows.length === 0) {
    return null;
  }
  
  const allocation = rows[0];
  
  // Format status
  allocation.status = formatStatus(allocation.status);
  
  return allocation;
};

/**
 * Update an allocation status
 * @param {number} id - Allocation ID
 * @param {number} status - New status (0: pending, 1: approved, 2: rejected)
 * @param {string} notes - Optional notes
 * @returns {Promise<Object>} - Updated allocation
 */
const updateAllocationStatus = async (id, status, notes) => {
  // Get current allocation data
  const [rows] = await pool.query('SELECT * FROM insurance_allocations WHERE id = ?', [id]);
  
  if (rows.length === 0) {
    throw new Error('Insurance allocation not found');
  }
  
  // Update the status
  await pool.query(
    'UPDATE insurance_allocations SET status = ?, notes = ? WHERE id = ?',
    [status, notes || rows[0].notes, id]
  );
  
  // Get the updated allocation
  return getAllocationById(id);
};

/**
 * Delete an allocation
 * @param {number} id - Allocation ID
 * @returns {Promise<boolean>} - True if successfully deleted
 */
const deleteAllocation = async (id) => {
  const [result] = await pool.query(
    'DELETE FROM insurance_allocations WHERE id = ?',
    [id]
  );
  
  return result.affectedRows > 0;
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
  createAllocation,
  getAllAllocations,
  getAllocationById,
  updateAllocationStatus,
  deleteAllocation,
  formatStatus,
  parseStatus
};