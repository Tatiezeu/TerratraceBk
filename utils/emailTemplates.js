/**
 * TerraTrace Email Templates
 * Standardized responsive HTML emails rendered for notifications and security.
 */

// 1. Two-Factor Authentication (2FA) Verification Email Template
exports.VerificationEmailTemplate = exports.verificationEmail = (code) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Verification - TerraTrace</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header with Gradient and Official Gold Shield Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #002147 0%, #003d7a 100%); padding: 40px 30px; text-align: center;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <!-- Inline official gold-gradient shield logo -->
                    <div style="width: 64px; height: 64px; margin-bottom: 20px; display: inline-block;">
                      <svg width="64" height="64" viewBox="0 0 48 48" style="display: block;">
                        <defs>
                          <linearGradient id="gold_grad_2fa" x1="8" y1="4" x2="40" y2="44">
                            <stop offset="0%" stop-color="#F4C430"/>
                            <stop offset="50%" stop-color="#D4AF37"/>
                            <stop offset="100%" stop-color="#B8860B"/>
                          </linearGradient>
                        </defs>
                        <path d="M24 4L40 12V36L24 44L8 36V12L24 4Z" fill="url(#gold_grad_2fa)"/>
                        <path d="M24 12V36M16 18H32M18 30L24 36L30 30" stroke="#002147" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <circle cx="24" cy="36" r="4" fill="#002147"/>
                      </svg>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 32px; color: #ffffff; margin: 0; font-weight: 300; letter-spacing: 1px;">
                      <span style="font-weight: 300;">Terra</span><span style="color: #D4AF37; font-weight: 500;">Trace</span>
                    </h1>
                    <p style="color: rgba(255, 255, 255, 0.8); font-size: 11px; letter-spacing: 2px; margin: 8px 0 0 0;">DIGITAL LAND REGISTRY</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Section -->
          <tr>
            <td style="padding: 50px 40px;">
              <h2 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 24px; color: #002147; margin: 0 0 16px 0; font-weight: 600;">
                Two-Factor Security Verification
              </h2>
              <p style="color: #6c757d; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                You are receiving this email because a sign-in attempt was initiated. Please enter the secure code below on the portal login page to complete your access.
              </p>

              <!-- Verification Code Box -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 10px 0;">
                    <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border: 2px dashed #D4AF37; border-radius: 12px; padding: 25px 35px; display: inline-block;">
                      <p style="color: #6c757d; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700;">Your 2FA Verification Code</p>
                      <div style="font-family: 'Courier New', monospace; font-size: 46px; color: #002147; letter-spacing: 12px; font-weight: 800; margin: 0; padding-left: 12px;">
                        ${code}
                      </div>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="color: #6c757d; font-size: 14px; line-height: 1.6; margin: 25px 0 0 0; text-align: center;">
                This code is confidential and will expire in <strong style="color: #002147;">10 minutes</strong>.
              </p>

              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e9ecef; margin: 40px 0;" />

              <p style="color: #6c757d; font-size: 13px; line-height: 1.6; margin: 0;">
                If you did not initiate this login attempt, please immediately change your password or contact our security office.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px 40px; border-top: 1px solid #e9ecef;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <p style="color: #6c757d; font-size: 13px; margin: 0 0 12px 0;">
                      Need assistance? Contact us at <a href="mailto:support@terratrace.cm" style="color: #D4AF37; text-decoration: none; font-weight: 600;">support@terratrace.cm</a>
                    </p>
                    <p style="color: #adb5bd; font-size: 12px; margin: 0;">
                      © ${new Date().getFullYear()} TerraTrace. Powered by MINDCAF. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// 2. Account First-Time Registration & Activation Link Email Template
exports.ActivationEmailTemplate = exports.activationEmail = (activationLink, userName) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Activate Your Account - TerraTrace</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header with Gradient and Official Gold Shield Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #002147 0%, #003d7a 100%); padding: 40px 30px; text-align: center;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <!-- Inline official gold-gradient shield logo -->
                    <div style="width: 64px; height: 64px; margin-bottom: 20px; display: inline-block;">
                      <svg width="64" height="64" viewBox="0 0 48 48" style="display: block;">
                        <defs>
                          <linearGradient id="gold_grad_act" x1="8" y1="4" x2="40" y2="44">
                            <stop offset="0%" stop-color="#F4C430"/>
                            <stop offset="50%" stop-color="#D4AF37"/>
                            <stop offset="100%" stop-color="#B8860B"/>
                          </linearGradient>
                        </defs>
                        <path d="M24 4L40 12V36L24 44L8 36V12L24 4Z" fill="url(#gold_grad_act)"/>
                        <path d="M24 12V36M16 18H32M18 30L24 36L30 30" stroke="#002147" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <circle cx="24" cy="38" r="4" fill="#002147"/>
                      </svg>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 32px; color: #ffffff; margin: 0; font-weight: 300; letter-spacing: 1px; text-align: center;">
                      <span style="font-weight: 300;">Terra</span><span style="color: #D4AF37; font-weight: 500;">Trace</span>
                    </h1>
                    <p style="color: rgba(255, 255, 255, 0.8); font-size: 11px; letter-spacing: 2px; margin: 8px 0 0 0; text-align: center;">DIGITAL LAND REGISTRY</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Section -->
          <tr>
            <td style="padding: 50px 40px;">
              <h2 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 22px; color: #002147; margin: 0 0 20px 0; font-weight: 600; text-align: center;">
                Account Activation
              </h2>
              
              <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0; text-align: justify; text-justify: inter-word;">
                Hello ${userName},<br/><br/>
                Your registry account has been successfully created. To complete your setup and ensure secure portal access, please verify your email address by activating your account below.
              </p>

              <!-- CTA Button Box -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px 0;">
                    <a href="${activationLink}" style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #F4C430 100%); color: #002147; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-size: 15px; font-weight: bold; letter-spacing: 0.5px; box-shadow: 0 6px 20px rgba(212, 175, 55, 0.3); transition: transform 0.2s ease;">
                      Activate Account
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #718096; font-size: 13px; line-height: 1.6; margin: 0 0 10px 0; text-align: justify; text-justify: inter-word;">
                Note: This activation link is strictly secure and will expire automatically in 24 hours. If you did not register for a TerraTrace account, please ignore this communication.
              </p>

              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px 40px; border-top: 1px solid #e9ecef;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <p style="color: #6c757d; font-size: 13px; margin: 0 0 12px 0;">
                      Need help? Contact us at <a href="mailto:support@terratrace.cm" style="color: #D4AF37; text-decoration: none; font-weight: 600;">support@terratrace.cm</a>
                    </p>
                    <p style="color: #adb5bd; font-size: 12px; margin: 0;">
                      © ${new Date().getFullYear()} TerraTrace. Powered by MINDCAF. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
