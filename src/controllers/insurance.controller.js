const { pool } = require('../config/database');
const { patientModel, recordModel, dataRequestModel } = require('../models');
const { AppError } = require('../utils/error.utils');
const  auditService  = require('../services/audit.service');
const  emailService  = require('../services/email.service');

/**
 * Get connection requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getConnectionRequests = async (req, res, next) => {
  try {
    const { status, limit = 10, offset = 0 } = req.query;
    const insuranceId = req.user.id;
    
    let query = `
      SELECT ia.*, p.name as patient_name, p.nic, p.gender, p.date_of_birth
      FROM insurance_allocations ia
      JOIN patients p ON ia.patient_id = p.patient_id
      WHERE ia.company_id = ?
    `;
    
    const queryParams = [insuranceId];
    
    if (status) {
      query += ' AND ia.status = ?';
      queryParams.push(status === 'approved' ? 1 : 0);
    }
    
    query += ' ORDER BY ia.created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(limit), parseInt(offset));
    
    const [connections] = await pool.query(query, queryParams);
    
    res.status(200).json({
      status: 'success',
      data: {
        connections: connections.map(conn => ({
          ...conn,
          status: conn.status === 1 ? 'approved' : 'pending'
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update connection status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const updateConnectionStatus = async (req, res, next) => {
  try {
    const { allocationId } = req.params;
    const { status, notes } = req.body;
    const insuranceId = req.user.id;
    
    // Check if the allocation exists and belongs to this insurance company
    const [allocation] = await pool.query(
      'SELECT * FROM insurance_allocations WHERE id = ? AND company_id = ?',
      [allocationId, insuranceId]
    );
    
    if (allocation.length === 0) {
      return next(new AppError('Connection request not found', 404));
    }
    
    // Convert status string to numeric value for database
    const statusValue = status === 'approved' ? 1 : 2;
    
    // Update the status
    await pool.query(
      'UPDATE insurance_allocations SET status = ?, notes = ? WHERE id = ?',
      [statusValue, notes || null, allocationId]
    );
    
    // Log the action
    await auditService.logAudit(
      req.user.id,
      'update',
      'insurance_allocation',
      allocationId,
      { status, notes }
    );
    
    // Get the insurance company name
    const [companyResult] = await pool.query(
      'SELECT company_name FROM insurance_companies WHERE company_id = ?',
      [insuranceId]
    );
    
    // Get patient info
    const [patientResult] = await pool.query(
      'SELECT p.name, p.email FROM patients p JOIN insurance_allocations ia ON p.patient_id = ia.patient_id WHERE ia.id = ?',
      [allocationId]
    );
    
    // Get admin emails
    const [admins] = await pool.query('SELECT email, first_name FROM staff WHERE role = "admin"');
    
    // Send notifications
    if (patientResult.length > 0 && companyResult.length > 0) {
      const patientName = patientResult[0].name;
      const patientEmail = patientResult[0].email;
      const companyName = companyResult[0].company_name;
      
      // Notify patient
      if (status === 'approved') {
        try {
          // Send email notification to patient
          await emailService.sendEmail(
            patientEmail,
            'Insurance Connection Approved',
            `Dear ${patientName},\n\nYour insurance connection with ${companyName} has been approved. You can now submit claims through the TrustMed platform.\n\nBest regards,\nThe TrustMed Team`
          );
        } catch (emailError) {
          console.error('Failed to send approval email to patient:', emailError);
        }
      }
      
      // Notify admins
      if (admins.length > 0) {
        try {
          for (const admin of admins) {
            await emailService.sendConnectionStatusUpdateEmail(
              admin.email,
              admin.first_name,
              patientName,
              companyName,
              status
            );
          }
        } catch (emailError) {
          console.error('Failed to send notification to admins:', emailError);
        }
      }
    }
    
    res.status(200).json({
      status: 'success',
      message: `Connection ${status === 'approved' ? 'approved' : 'rejected'} successfully`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get connected patients
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getConnectedPatients = async (req, res, next) => {
  try {
    const { search, limit = 10, offset = 0 } = req.query;
    const insuranceId = req.user.id;
    
    let query = `
      SELECT p.patient_id, p.name, p.gender, p.date_of_birth, p.mobile, p.email,
      ia.created_at as connected_since
      FROM patients p
      JOIN insurance_allocations ia ON p.patient_id = ia.patient_id
      WHERE ia.company_id = ? AND ia.status = 1
    `;
    
    const queryParams = [insuranceId];
    
    if (search) {
      query += ' AND (p.name LIKE ? OR p.mobile LIKE ? OR p.email LIKE ?)';
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    query += ' ORDER BY p.name LIMIT ? OFFSET ?';
    queryParams.push(parseInt(limit), parseInt(offset));
    
    const [patients] = await pool.query(query, queryParams);
    
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
 * Request medical records
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const requestMedicalRecords = async (req, res, next) => {
  try {
    const { patientId, requestDetails } = req.body;
    const insuranceId = req.user.id;
    
    console.log('Request details:', patientId,insuranceId,requestDetails);
    
    // Check if patient is connected to this insurance company
    const [connection] = await pool.query(
      'SELECT * FROM insurance_allocations WHERE patient_id = ? AND company_id = ? AND status = 1',
      [patientId, insuranceId]
    );

    console.log('Connection:', connection);
    
    if (connection.length === 0) {
      return next(new AppError('Patient is not connected to your insurance company', 403));
    }
    
    // Create the request
    const [result] = await pool.query(
      `INSERT INTO record_requests 
       (company_id, patient_id, request_details, status, created_at) 
       VALUES (?, ?, ?, 'pending', NOW())`,
      [insuranceId, patientId, JSON.stringify(requestDetails)]
    );
    
    const requestId = result.insertId;
    
    // Log the action
    await auditService.logAudit(
      req.user.id,
      'create',
      'record_request',
      requestId,
      { patient_id: patientId }
    );
    
    // Get hospital admin emails for notification
    const [admins] = await pool.query(
      'SELECT email FROM staff WHERE role = "admin"'
    );
    
    // Get patient name
    const [patientResult] = await pool.query(
      'SELECT name FROM patients WHERE patient_id = ?',
      [patientId]
    );
    
    if (admins.length > 0 && patientResult.length > 0) {
      try {
        // Send email notification to hospital admins
        for (const admin of admins) {
          await emailService.sendNewRequestEmail(
            admin.email,
            'Hospital Administrator',
            patientResult[0].name,
            req.user.name
          );
        }
      } catch (emailError) {
        console.error('Failed to send request notification:', emailError);
      }
    }
    
    res.status(201).json({
      status: 'success',
      data: {
        requestId,
        message: 'Medical record request submitted successfully'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get data requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getDataRequests = async (req, res, next) => {
  try {
    const { status, limit = 10, offset = 0 } = req.query;
    const insuranceId = req.user.id;
    
    let query = `
      SELECT rr.*, p.name as patient_name
      FROM record_requests rr
      JOIN patients p ON rr.patient_id = p.patient_id
      WHERE rr.company_id = ?
    `;
    
    const queryParams = [insuranceId];
    
    if (status) {
      query += ' AND rr.status = ?';
      queryParams.push(status);
    }
    
    query += ' ORDER BY rr.created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(limit), parseInt(offset));
    
    const [requests] = await pool.query(query, queryParams);
    
    // Parse request details
    const formattedRequests = requests.map(req => ({
      ...req,
      request_details: JSON.parse(req.request_details || '{}')
    }));
    
    res.status(200).json({
      status: 'success',
      data: {
        requests: formattedRequests
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get approved records
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
/**
 * Get approved records
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getApprovedRecords = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const insuranceId = req.user.id;
    
    // console.log('Getting approved records for request:', requestId);
    
    // Check if the request exists and belongs to this insurance company
    const [request] = await pool.query(
      'SELECT * FROM data_requests WHERE request_id = ? AND company_id = ? AND status = 1',
      [requestId, insuranceId]
    );
    
    if (request.length === 0) {
      return next(new AppError('Approved request not found', 404));
    }
    
    // Get the approved records
    const [records] = await pool.query(
      `SELECT r.*, 
        p.name as patient_name, 
        CONCAT(s.first_name, ' ', s.last_name) as doctor_name,
        lt.description as test_name,
        m.med_name,
        pr.dosage, pr.delay, pr.after_meal
       FROM records r
       JOIN patients p ON r.patient_id = p.patient_id
       JOIN staff s ON r.doc_id = s.staff_id
       LEFT JOIN lab_tests lt ON r.test_id = lt.test_id
       LEFT JOIN prescriptions pr ON r.prescription_id = pr.prescription_id
       LEFT JOIN medicines m ON pr.med_id = m.med_id
       WHERE r.patient_id = ? AND r.record_id IN (
         SELECT record_id FROM approved_records WHERE request_id = ?
       )`,
      [request[0].patient_id, requestId]
    );
    
    console.log(`Found ${records.length} approved records`);
    
    // Log the access
    await auditService.logAudit(
      req.user.id,
      'view',
      'approved_records',
      requestId,
      { count: records.length }
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        request: request[0],
        records
      }
    });
  } catch (error) {
    console.error('Error getting approved records:', error);
    next(error);
  }
};



/**
 * Create claim
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const createClaim = async (req, res, next) => {
  try {
    const { patientId, claimDetails } = req.body;
    const insuranceId = req.user.id;
    
    // Check if patient is connected to this insurance company
    const [connection] = await pool.query(
      'SELECT * FROM insurance_allocations WHERE patient_id = ? AND company_id = ? AND status = 1',
      [patientId, insuranceId]
    );
    
    if (connection.length === 0) {
      return next(new AppError('Patient is not connected to your insurance company', 403));
    }
    
    // Create the claim
    const [result] = await pool.query(
      `INSERT INTO claims 
       (company_id, patient_id, claim_details, status, created_at) 
       VALUES (?, ?, ?, 'pending', NOW())`,
      [insuranceId, patientId, JSON.stringify(claimDetails)]
    );
    
    const claimId = result.insertId;
    
    // Log the action
    await auditService.logAudit(
      req.user.id,
      'create',
      'claim',
      claimId,
      { patient_id: patientId }
    );
    
    res.status(201).json({
      status: 'success',
      data: {
        claimId,
        message: 'Claim submitted successfully'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get claims
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getClaims = async (req, res, next) => {
  try {
    const { status, limit = 10, offset = 0 } = req.query;
    const insuranceId = req.user.id;
    
    let query = `
      SELECT c.*, p.name as patient_name
      FROM claims c
      JOIN patients p ON c.patient_id = p.patient_id
      WHERE c.company_id = ?
    `;
    
    const queryParams = [insuranceId];
    
    if (status) {
      query += ' AND c.status = ?';
      queryParams.push(status);
    }
    
    query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(limit), parseInt(offset));
    
    const [claims] = await pool.query(query, queryParams);
    
    // Parse claim details
    const formattedClaims = claims.map(claim => ({
      ...claim,
      claim_details: JSON.parse(claim.claim_details || '{}')
    }));
    
    res.status(200).json({
      status: 'success',
      data: {
        claims: formattedClaims
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get claim details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getClaimDetails = async (req, res, next) => {
  try {
    const { claimId } = req.params;
    const insuranceId = req.user.id;
    
    // Check if the claim exists and belongs to this insurance company
    const [claim] = await pool.query(
      'SELECT c.*, p.name as patient_name, p.nic, p.gender, p.date_of_birth FROM claims c JOIN patients p ON c.patient_id = p.patient_id WHERE c.id = ? AND c.company_id = ?',
      [claimId, insuranceId]
    );
    
    if (claim.length === 0) {
      return next(new AppError('Claim not found', 404));
    }
    
    // Log the access
    await auditService.logAudit(
      req.user.id,
      'view',
      'claim',
      claimId,
      {}
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        claim: {
          ...claim[0],
          claim_details: JSON.parse(claim[0].claim_details || '{}')
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new data request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const createDataRequest = async (req, res, next) => {
  try {
    //console.log('Request body:', req.body);
    
    const { patient_id, purpose, date_range_start, date_range_end, request_details } = req.body;
    const insuranceId = req.user.id;
    
    if (!patient_id) {
      return next(new AppError('Patient ID is required', 400));
    }
    
    // Check if patient is connected to this insurance company
    const [connection] = await pool.query(
      'SELECT * FROM insurance_allocations WHERE patient_id = ? AND company_id = ? AND status = 1',
      [patient_id, insuranceId]
    );
    
    // console.log('Patient connection check:', { 
    //   patient_id,
    //   insuranceId,
    //   connectionFound: connection.length > 0 
    // });
    
    // TEMPORARY for testing 
    const validateConnection = true; 
    
    if (validateConnection && connection.length === 0) {
      const [allConnections] = await pool.query(
        'SELECT * FROM insurance_allocations WHERE patient_id = ? OR company_id = ?',
        [patient_id, insuranceId]
      );
      console.log('Available connections:', allConnections);
      
      return next(new AppError('Patient is not connected to your insurance company', 403));
    }
    
    // Create a new data request
    const requestData = {
      company_id: insuranceId,
      patient_id,
      purpose,
      date_range_start,
      date_range_end,
      request_details,
      created_by: req.user.id
    };
    
    console.log('Creating data request with:', requestData);
    
    const newRequest = await dataRequestModel.createDataRequest(requestData);
    
    // Log the action
    await auditService.logAudit(
      req.user.id,
      'create',
      'data_request',
      newRequest.request_id,
      { purpose, date_range: `${date_range_start || 'any'} to ${date_range_end || 'any'}` }
    );
    
    // Get hospital admin emails for notification
    const [admins] = await pool.query(
      'SELECT email, first_name, last_name FROM staff WHERE role = "admin"'
    );
    
    // Get patient name
    const [patientResult] = await pool.query(
      'SELECT name FROM patients WHERE patient_id = ?',
      [patient_id]
    );
    
    if (admins.length > 0 && patientResult.length > 0) {
      try {
        // Send email notification to hospital admins
        for (const admin of admins) {
          if (emailService.sendDataRequestNotificationEmail) {
            await emailService.sendDataRequestNotificationEmail(
              admin.email,
              `${admin.first_name} ${admin.last_name}`,
              patientResult[0].name,
              req.user.name,
              purpose,
              date_range_start ? new Date(date_range_start).toLocaleDateString() : 'any',
              date_range_end ? new Date(date_range_end).toLocaleDateString() : 'any'
            );
          } else {
            console.warn('sendDataRequestNotificationEmail function not found');
            // Fallback to generic email
            await emailService.sendEmail(
              admin.email,
              'New Data Request',
              `A new data request has been submitted for patient ${patientResult[0].name} by ${req.user.name}.`
            );
          }
        }
      } catch (emailError) {
        console.error('Failed to send data request notification:', emailError);
      }
    }
    
    res.status(201).json({
      status: 'success',
      data: {
        request: newRequest,
        message: 'Data request created successfully'
      }
    });
  } catch (error) {
    console.error('Create data request error:', error);
    next(error);
  }
};

/**
 * Get all data requests for the current insurance company
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getAllDataRequests = async (req, res, next) => {
  try {
    const { status, limit = 10, offset = 0 } = req.query;
    const insuranceId = req.user.id;
    
    const requests = await dataRequestModel.getAllDataRequests({
      companyId: insuranceId,
      status,
      limit,
      offset
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
 * Get a specific data request by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getDataRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const insuranceId = req.user.id;
    
    const request = await dataRequestModel.getDataRequestById(id);
    
    if (!request) {
      return next(new AppError('Data request not found', 404));
    }
    
    // Check if the request belongs to this insurance company
    if (request.company_id !== insuranceId) {
      return next(new AppError('You do not have permission to access this data request', 403));
    }
    
    // Log access
    await auditService.logAudit(
      req.user.id,
      'view',
      'data_request',
      id,
      {}
    );
    
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

module.exports = {
  getConnectionRequests,
  updateConnectionStatus,
  getConnectedPatients,
  requestMedicalRecords,
  getDataRequests,
  getApprovedRecords,
  createClaim,
  getClaims,
  getClaimDetails,
  createDataRequest,
  getAllDataRequests,
  getDataRequestById
};