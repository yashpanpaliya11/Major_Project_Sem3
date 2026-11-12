import nodemailer from 'nodemailer';

let transporter = null;
let testAccount = null;

/**
 * Initializes and returns the active Nodemailer transporter.
 * Falls back to an automatic Ethereal test account if SMTP credentials
 * are not explicitly supplied in the environment.
 */
async function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    console.log(`📧 Configured production SMTP transporter via ${SMTP_HOST}`);
  } else {
    // Generate an automatic Ethereal test account (real SMTP with web inbox preview)
    testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log(`📧 Ethereal Test SMTP active: ${testAccount.user}`);
  }

  return transporter;
}

/**
 * Sends a formal attendance notice / intervention email.
 * Returns { success, messageId, previewUrl, recipient }
 */
export async function sendInterventionEmail({
  toEmail,
  studentName,
  rollNumber,
  courseName,
  courseCode,
  attendancePercentage,
  missedCount,
  totalLectures,
  facultyName,
  notes,
}) {
  try {
    const mailer = await getTransporter();

    const subject = `[URGENT] Formal Attendance Warning: ${courseCode} (${attendancePercentage}% Aggregate)`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; margin: 0; }
    .card { background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; max-width: 600px; margin: 0 auto; overflow: hidden; }
    .header { background: linear-gradient(135deg, #4f46e5, #0ea5e9); padding: 24px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; }
    .header p { margin: 6px 0 0; color: #e0e7ff; font-size: 13px; font-weight: 500; }
    .body { padding: 24px; }
    .badge { display: inline-block; background-color: #ef4444; color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-weight: 700; font-size: 12px; }
    .metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0; background: #0f172a; padding: 16px; border-radius: 12px; border: 1px solid #334155; }
    .metric-item { text-align: center; }
    .metric-val { font-size: 20px; font-weight: 800; color: #f87171; }
    .metric-lbl { font-size: 11px; color: #94a3b8; text-transform: uppercase; margin-top: 2px; }
    .footer { padding: 16px 24px; background-color: #0f172a; border-top: 1px solid #334155; font-size: 12px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>EduPulse University Academic Notice</h1>
      <p>Institutional Attendance & Compliance Division</p>
    </div>
    <div class="body">
      <div style="margin-bottom: 16px;">
        <span class="badge">Critical Attendance Warning</span>
      </div>
      <p style="font-size: 15px; line-height: 1.5; color: #e2e8f0;">
        Dear <strong>${studentName}</strong> (Roll: ${rollNumber || 'N/A'}),
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #94a3b8;">
        This automated communication is issued regarding your course enrollment in <strong>${courseName} (${courseCode})</strong> instructed by <strong>${facultyName || 'Course Instructor'}</strong>.
      </p>
      <div class="metrics">
        <div class="metric-item">
          <div class="metric-val">${attendancePercentage}%</div>
          <div class="metric-lbl">Current Attendance</div>
        </div>
        <div class="metric-item">
          <div class="metric-val">${missedCount} / ${totalLectures}</div>
          <div class="metric-lbl">Lectures Missed</div>
        </div>
      </div>
      <p style="font-size: 13px; color: #cbd5e1; line-height: 1.6;">
        University statutory bylaws mandate a minimum of <strong>75% attendance</strong> to maintain examination eligibility. Continued unexcused absences will result in automatic debarment.
      </p>
      ${notes ? `<div style="background:#1e1b4b; border-left:4px solid #6366f1; padding:12px; border-radius:4px; margin:16px 0; font-size:13px; color:#c7d2fe;"><strong>Faculty Note:</strong> ${notes}</div>` : ''}
    </div>
    <div class="footer">
      EduPulse Automated Academic Notification • Generated at ${new Date().toUTCString()}
    </div>
  </div>
</body>
</html>
`;

    const info = await mailer.sendMail({
      from: '"EduPulse Academic Compliance" <academic-compliance@edupulse.univ>',
      to: toEmail,
      subject,
      html: htmlContent,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || null;

    return {
      success: true,
      messageId: info.messageId,
      previewUrl,
      recipient: toEmail,
    };
  } catch (error) {
    console.error('Failed to dispatch academic intervention email:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

