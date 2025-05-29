const staffModel = require('./staff.model');
const patientModel = require('./patient.model');
const insuranceModel = require('./insurance.model');
const recordModel = require('./record.model');
const medicineModel = require('./medicine.model');
//const auditLogModel = require('./audit.model');
const insuranceAllocationModel  = require('./insuranceAllocation.model');
const dataRequestModel = require('./dataRequest.model');
const insuranceClaimModel = require('./insuranceClaim.model');
const doctorModel = require('./doctor.model');

module.exports = {
  staffModel,
  patientModel,
  insuranceModel,
  recordModel,
  medicineModel,
  insuranceAllocationModel,
  dataRequestModel,
  insuranceClaimModel,
  doctorModel
};