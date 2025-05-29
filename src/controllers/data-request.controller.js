const dataRequestModel = require('../models/dataRequest.model');
const { AppError } = require('../utils/error.utils');
const auditService = require('../services/audit.service');

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
 * Create a new data request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const createDataRequest = async (req, res, next) => {
  try {
    const requestData = {
      ...req.body,
      created_by: req.user.id
    };
    
    const newRequest = await dataRequestModel.createDataRequest(requestData);
    
    // Log the action
    await auditService.logAudit(
      req.user.id,
      'create',
      'data_request',
      newRequest.request_id,
      { patient_id: newRequest.patient_id, company_id: newRequest.company_id }
    );
    
    res.status(201).json({
      status: 'success',
      data: {
        request: newRequest,
        message: 'Data request created successfully.'
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

module.exports = {
  getAllDataRequests,
  getDataRequestById,
  createDataRequest,
  approveDataRequest,
  rejectDataRequest
};