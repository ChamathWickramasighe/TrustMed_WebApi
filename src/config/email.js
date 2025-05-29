module.exports = {
    smtp: {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    },
    from: process.env.SMTP_FROM || 'noreply@trustmed.com',
    templates: {
      newAccount: {
        subject: 'Welcome to TrustMed - Your Account has been Created',
        text: (name, role, tempPassword) => `
          Dear ${name},
          
          Welcome to TrustMed! Your ${role} account has been created successfully.
          
          Your password is: ${tempPassword}
          
          Please log in and change your password immediately.
          
          Best regards,
          The TrustMed Team
        `
      },
      newRequest: {
        subject: 'New Medical Record Request',
        text: (hospitalName, patientName, insuranceName) => `
          Dear ${hospitalName} Administrator,
          
          A new medical record request has been submitted for patient ${patientName} by ${insuranceName}.
          
          Please log in to your TrustMed dashboard to review and process this request.
          
          Best regards,
          The TrustMed Team
        `
      },
      insuranceConnection: {
        subject: 'New Insurance Connection Request',
        text: (insuranceName, patientName, notes) => `
          Dear ${insuranceName},
          
          A new insurance connection request has been created for patient ${patientName}.
          
          Additional notes: ${notes}
          
          Please log in to your TrustMed dashboard to review and respond to this request.
          
          Best regards,
          The TrustMed Team
        `
      },
      dataRequestStatus: {
        subject: (status) => `Medical Record Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        text: (insuranceName, patientName, status, notes) => `
          Dear ${insuranceName},
          
          Your request for medical records for patient ${patientName} has been ${status}.
          
          ${status === 'rejected' ? 'Reason for rejection: ' + notes : 'Additional notes: ' + notes}
          
          ${status === 'approved' ? 'You can now access these records through your TrustMed dashboard.' : ''}
          
          Best regards,
          The TrustMed Team
        `
      }
    }
  };