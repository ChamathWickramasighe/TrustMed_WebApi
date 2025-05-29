const nodemailer = require('nodemailer');
const emailConfig = require('../config/email');

// Create reusable transporter
const transporter = nodemailer.createTransport(emailConfig.smtp);

// Verify connection
transporter.verify()
  .then(() => {
    console.log('Email service is ready');
    // console.log('SMTP Configuration:', {
    //   host: emailConfig.smtp.host,
    //   port: emailConfig.smtp.port,
    //   secure: emailConfig.smtp.secure,
    //   user: emailConfig.smtp.auth.user,
    //   from: emailConfig.from
    // });
  })
  .catch(error => {
    console.error('Error setting up email service:', error);
    // console.error('SMTP Configuration:', {
    //   host: emailConfig.smtp.host,
    //   port: emailConfig.smtp.port,
    //   secure: emailConfig.smtp.secure,
    //   user: emailConfig.smtp.auth.user,
    //   from: emailConfig.from
    // });
  });

/**
 * Send an email
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text content
 * @param {string} html - HTML content (optional)
 * @returns {Promise} - Resolves with mail info or rejects with error
 */
const sendEmail = async (to, subject, text, html) => {
  const mailOptions = {
    from: emailConfig.from,
    to,
    subject,
    text,
    ...(html && { html })
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Send a new account notification
 * @param {string} email - Recipient email
 * @param {string} name - Recipient name
 * @param {string} role - User role
 * @param {string} password - Temporary password
 */
const sendNewAccountEmail = async (email, name, role, password) => {
  const template = emailConfig.templates.newAccount;
  return sendEmail(
    email,
    template.subject,
    template.text(name, role, password)
  );
};

/**
 * Send a new request notification
 * @param {string} hospitalEmail - Hospital email
 * @param {string} hospitalName - Hospital name
 * @param {string} patientName - Patient name
 * @param {string} insuranceName - Insurance company name
 */
const sendNewRequestEmail = async (hospitalEmail, hospitalName, patientName, insuranceName) => {
  const template = emailConfig.templates.newRequest;
  return sendEmail(
    hospitalEmail,
    template.subject,
    template.text(hospitalName, patientName, insuranceName)
  );
};

/**
 * Send an insurance connection notification
 * @param {string} insuranceEmail - Insurance company email
 * @param {string} insuranceName - Insurance company name
 * @param {string} patientName - Patient name
 * @param {string} notes - Additional notes
 */
const sendInsuranceConnectionEmail = async (insuranceEmail, insuranceName, patientName, notes) => {
    const template = emailConfig.templates.insuranceConnection;
    return sendEmail(
      insuranceEmail,
      template.subject,
      template.text(insuranceName, patientName, notes)
    );
  };

/**
 * Send a data request status update notification
 * @param {string} insuranceEmail - Insurance company email
 * @param {string} insuranceName - Insurance company name
 * @param {string} patientName - Patient name
 * @param {string} status - Request status (approved/rejected)
 * @param {string} notes - Additional notes
 */
const sendDataRequestStatusUpdateEmail = async (insuranceEmail, insuranceName, patientName, status, notes) => {
    const subject = `Medical Record Request ${status.charAt(0).toUpperCase() + status.slice(1)}`;
    
    const text = `
      Dear ${insuranceName},
      
      Your request for medical records for patient ${patientName} has been ${status}.
      
      ${status === 'rejected' ? 'Reason for rejection: ' + notes : 'Additional notes: ' + notes}
      
      ${status === 'approved' ? 'You can now access these records through your TrustMed dashboard.' : ''}
      
      Best regards,
      The TrustMed Team
    `;
    
    return sendEmail(insuranceEmail, subject, text);
  };

  /**
 * Send connection status update email to hospital admins
 * @param {string} adminEmail - Admin email address
 * @param {string} adminName - Admin name
 * @param {string} patientName - Patient name
 * @param {string} insuranceCompany - Insurance company name
 * @param {string} status - Connection status (approved/rejected)
 * @returns {Promise} - Email sending result
 */
const sendConnectionStatusUpdateEmail = async (
    adminEmail,
    adminName,
    patientName,
    insuranceCompany,
    status
  ) => {
    try {
      const subject = `Insurance Connection ${status === 'approved' ? 'Approved' : 'Rejected'}`;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Insurance Connection Update</h2>
          <p>Dear ${adminName},</p>
          
          <p>
            We're writing to inform you that the insurance connection request for patient 
            <strong>${patientName}</strong> has been <strong>${status.toUpperCase()}</strong> 
            by <strong>${insuranceCompany}</strong>.
          </p>
          
          <div style="padding: 15px; background-color: ${status === 'approved' ? '#e8f5e9' : '#ffebee'}; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold; color: ${status === 'approved' ? '#2e7d32' : '#c62828'};">
              Status: ${status === 'approved' ? 'APPROVED' : 'REJECTED'}
            </p>
          </div>
          
          <p>
            Please log in to the TrustMed platform to view the updated status and take any necessary actions.
          </p>
          
          <p>
            Best regards,<br>
            The TrustMed Team
          </p>
        </div>
      `;
      
      const result = await sendEmail(adminEmail, subject, null, html);
      return result;
    } catch (error) {
      console.error('Email sending failed:', error);
      throw error;
    }
  };

/**
 * Send data request notification email to hospital admins
 * @param {string} email - Admin email
 * @param {string} adminName - Admin name
 * @param {string} patientName - Patient name
 * @param {string} insuranceCompany - Insurance company name
 * @param {string} purpose - Purpose of the request
 * @param {string} startDate - Start date (or 'any')
 * @param {string} endDate - End date (or 'any')
 * @returns {Promise} - Email sending result
 */
const sendDataRequestNotificationEmail = async (
    email,
    adminName,
    patientName,
    insuranceCompany,
    purpose,
    startDate,
    endDate
  ) => {
    try {
      const subject = 'New Data Access Request';
      
      const formattedPurpose = 
        purpose === 'claim_verification' ? 'Claim Verification' :
        purpose === 'policy_update' ? 'Policy Update' :
        purpose === 'policy_enrollment' ? 'Policy Enrollment' :
        purpose === 'policy_renewal' ? 'Policy Renewal' : purpose;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Data Access Request</h2>
          <p>Dear ${adminName},</p>
          
          <p>
            A new data access request has been submitted by <strong>${insuranceCompany}</strong> 
            for patient <strong>${patientName}</strong>.
          </p>
          
          <div style="background-color: #f8f9fa; border-left: 4px solid #4a6cf7; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #4a6cf7;">Request Details</h3>
            <p><strong>Purpose:</strong> ${formattedPurpose}</p>
            <p><strong>Date Range:</strong> ${startDate} to ${endDate}</p>
          </div>
          
          <p>
            Please log in to the TrustMed platform to review this request and take appropriate action.
          </p>
          
          <p>
            Best regards,<br>
            The TrustMed Team
          </p>
        </div>
      `;
      
      return await sendEmail(email, subject, null, html);
    } catch (error) {
      console.error('Email sending failed:', error);
      // Don't throw - just log the error so it doesn't interrupt the flow
      return false;
    }
  };
  
module.exports = {
  sendEmail,
  sendNewAccountEmail,
  sendNewRequestEmail,
  sendInsuranceConnectionEmail,
  sendDataRequestStatusUpdateEmail,
  sendConnectionStatusUpdateEmail,
  sendDataRequestNotificationEmail
};