import nodemailer from 'nodemailer';

// Move validation to a function that's called when needed
const validateEmailConfig = () => {
  const requiredEnvVars = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASSWORD',
    'SMTP_FROM_EMAIL',
    'NEXT_PUBLIC_APP_URL'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
};

// Create transporter only when needed
const createTransporter = () => {
  validateEmailConfig();
  
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

export const sendPasswordResetEmail = async (email, resetToken) => {
  if (!email || !resetToken) {
    throw new Error('Email and reset token are required');
  }

  try {
    validateEmailConfig();
  } catch (configError) {
    console.error('Email config validation error:', configError);
    throw new Error('Email service configuration error');
  }

  try {
    const transporter = createTransporter();
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: process.env.SMTP_FROM_EMAIL,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                .container { padding: 20px; font-family: Arial, sans-serif; }
                .button { 
                    display: inline-block;
                    padding: 10px 20px;
                    background-color: #0066cc;
                    color: white !important;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 20px 0;
                }
                .warning { color: #666; font-size: 0.9em; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Password Reset Request</h1>
                <p>A password reset was requested for your account <strong>${email}</strong>. Click the button below to reset your password. This link will expire in 1 hour.</p>
                <a href="${resetUrl}" class="button">Reset Password</a>
                <p class="warning">If you didn't request this, please ignore this email and make sure you can still login to your account.</p>
            </div>
        </body>
        </html>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    return result;
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error(`Failed to send reset email: ${error.message}`);
  }
};