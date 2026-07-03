const { Resend } = require('resend');

const resendApiKey = process.env.RESEND_API_KEY;
const leadNotifyEmail = process.env.LEAD_NOTIFY_EMAIL;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

async function sendLeadEmail(enquiry) {
  if (!resendApiKey || !leadNotifyEmail) {
    console.warn(
      'Lead email skipped: RESEND_API_KEY and LEAD_NOTIFY_EMAIL must both be set.'
    );
    return;
  }

  const body = formatLeadEmail(enquiry);

  try {
    const { error } = await resend.emails.send({
      from: 'Hull Maths Tutor <onboarding@resend.dev>',
      to: [leadNotifyEmail],
      replyTo: enquiry.email,
      subject: '📚 New Hull Maths Tutor Enquiry',
      text: body,
    });

    if (error) {
      console.warn('Lead email failed:', error);
    }
  } catch (error) {
    console.warn('Lead email failed:', error.message);
  }
}

function formatLeadEmail(enquiry) {
  return `📚 New Hull Maths Tutor Enquiry

Student
- Name: ${enquiry.childFirstName || ''}
- Year: ${enquiry.yearGroup || ''}
- School: ${enquiry.school || ''}

Parent
- Name: ${enquiry.parentName || ''}
- Email: ${enquiry.email || ''}
- Phone: ${enquiry.phone || ''}

Notes
${enquiry.anythingElse || ''}`;
}

module.exports = {
  sendLeadEmail,
};
