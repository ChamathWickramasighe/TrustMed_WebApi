const { pool } = require('../config/database');
const emailService = require('../services/email.service');

/**
 * Create a new insurance claim
 * @param {Object} claimData - Claim data
 * @returns {Promise<Object>} - The created claim with ID
 */
const createClaim = async (claimData) => {
  const { company_id, patient_id, claim_details } = claimData;
  
  // Insert the new claim
  const [result] = await pool.query(
    `INSERT INTO claims 
     (company_id, patient_id, claim_details, status, created_at) 
     VALUES (?, ?, ?, 'pending', NOW())`,
    [company_id, patient_id, JSON.stringify(claim_details)]
  );
  
  const claimId = result.insertId;
  
  // Get claim with patient information
  const [claims] = await pool.query(
    `SELECT c.*, p.name as patient_name 
     FROM claims c
     JOIN patients p ON c.patient_id = p.patient_id
     WHERE c.id = ?`,
    [claimId]
  );
  
  if (claims.length === 0) {
    throw new Error('Failed to retrieve created claim');
  }
  
  const claim = claims[0];
  
  // Send notification to admins
  try {
    // Get hospital admin emails for notification
    const [admins] = await pool.query(
      'SELECT email, first_name, last_name FROM staff WHERE role = "admin"'
    );
    
    // Get insurance company name
    const [companies] = await pool.query(
      'SELECT company_name FROM insurance_companies WHERE company_id = ?',
      [company_id]
    );
    
    if (admins.length > 0 && companies.length > 0) {
      const companyName = companies[0].company_name;
      const patientName = claim.patient_name;
      const claimDetailsObj = JSON.parse(claim.claim_details);
      const totalAmount = claimDetailsObj.totalAmount || 0;
      
      // Notify admins about new claim
      for (const admin of admins) {
        await emailService.sendNewClaimNotification(
          admin.email,
          `${admin.first_name} ${admin.last_name}`,
          patientName,
          companyName,
          claimId,
          totalAmount
        );
      }
    }
  } catch (emailError) {
    console.error('Failed to send claim notification:', emailError);
    // Continue processing - don't fail if email fails
  }
  
  return {
    ...claim,
    claim_details: JSON.parse(claim.claim_details)
  };
};

/**
 * Get all claims or filtered by company/patient/status
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Array of claims
 */
const getAllClaims = async (options = {}) => {
  const { 
    companyId = null, 
    patientId = null, 
    status = null, 
    limit = 50, 
    offset = 0 
  } = options;
  
  let query = `
    SELECT c.*, p.name as patient_name 
    FROM claims c
    JOIN patients p ON c.patient_id = p.patient_id
    WHERE 1=1
  `;
  
  const queryParams = [];
  
  if (companyId) {
    query += ' AND c.company_id = ?';
    queryParams.push(companyId);
  }
  
  if (patientId) {
    query += ' AND c.patient_id = ?';
    queryParams.push(patientId);
  }
  
  if (status) {
    query += ' AND c.status = ?';
    queryParams.push(status);
  }
  
  query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
  queryParams.push(parseInt(limit), parseInt(offset));
  
  const [claims] = await pool.query(query, queryParams);
  
  // Parse claim details for each claim
  return claims.map(claim => ({
    ...claim,
    claim_details: JSON.parse(claim.claim_details || '{}')
  }));
};

/**
 * Get a claim by ID
 * @param {number} id - Claim ID
 * @returns {Promise<Object|null>} - Claim with details or null
 */
const getClaimById = async (id) => {
  const [claims] = await pool.query(
    `SELECT c.*, p.name as patient_name, p.gender, p.date_of_birth, p.email, p.mobile
     FROM claims c
     JOIN patients p ON c.patient_id = p.patient_id
     WHERE c.id = ?`,
    [id]
  );
  
  if (claims.length === 0) {
    return null;
  }
  
  const claim = claims[0];
  
  return {
    ...claim,
    claim_details: JSON.parse(claim.claim_details || '{}')
  };
};

/**
 * Update claim status
 * @param {number} id - Claim ID
 * @param {string} status - New status ('pending', 'approved', 'rejected', 'partial')
 * @param {string} notes - Notes about the status change
 * @param {string} rejectionReason - Reason for rejection (if status is 'rejected')
 * @returns {Promise<Object>} - Updated claim
 */
const updateClaimStatus = async (id, status, notes, rejectionReason = null) => {
  let updateFields = { status, notes };
  
  if (status === 'rejected' && rejectionReason) {
    updateFields.rejection_reason = rejectionReason;
  }
  
  if (status === 'approved' || status === 'partial') {
    updateFields.approval_date = new Date();
  }
  
  // Build update query dynamically based on provided fields
  const fieldEntries = Object.entries(updateFields).filter(([_, value]) => value !== null);
  
  if (fieldEntries.length === 0) {
    throw new Error('No fields to update');
  }
  
  const fields = fieldEntries.map(([key]) => `${key} = ?`).join(', ');
  const values = fieldEntries.map(([_, value]) => value);
  
  // Add claim ID to values
  values.push(id);
  
  // Update claim
  await pool.query(
    `UPDATE claims SET ${fields}, updated_at = NOW() WHERE id = ?`,
    values
  );
  
  // Get updated claim
  return getClaimById(id);
};

module.exports = {
  createClaim,
  getAllClaims,
  getClaimById,
  updateClaimStatus
};