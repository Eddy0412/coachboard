import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

// Sender addresses by purpose
const FROM_APP = "Coachboard Pro <app@coachboard.kkmsports.xyz>";
const FROM_INVITE = "Coachboard Pro <invite@coachboard.kkmsports.xyz>";

export async function sendInviteEmail(
  to: string,
  data: { token: string; role: string; teamId: string }
) {
  await getResend().emails.send({
    from: FROM_INVITE,
    to,
    subject: `You've been invited to join Coachboard Pro as ${data.role}`,
    html: `
      <h2>You've been invited!</h2>
      <p>A coach has invited you to join their team on Coachboard Pro as <strong>${data.role}</strong>.</p>
      <p><a href="${getAppUrl()}/invite/${data.token}" style="display:inline-block;padding:12px 24px;background:#3457ff;color:white;text-decoration:none;border-radius:8px;">Accept Invitation</a></p>
      <p style="color:#999;font-size:12px;">This invitation expires in 7 days.</p>
    `,
  });
}

export async function sendProjectSharedEmail(
  to: string,
  data: { projectTitle: string; shareToken?: string; senderName: string }
) {
  await getResend().emails.send({
    from: FROM_APP,
    to,
    subject: `${data.senderName} shared "${data.projectTitle}" with you`,
    html: `
      <h2>Project Shared</h2>
      <p><strong>${data.senderName}</strong> shared the project "<strong>${data.projectTitle}</strong>" with you on Coachboard Pro.</p>
      <p><a href="${getAppUrl()}/dashboard" style="display:inline-block;padding:12px 24px;background:#3457ff;color:white;text-decoration:none;border-radius:8px;">View Project</a></p>
    `,
  });
}

export async function sendCommentEmail(
  to: string,
  data: { projectTitle: string; commenterName: string; comment: string }
) {
  await getResend().emails.send({
    from: FROM_APP,
    to,
    subject: `New comment on "${data.projectTitle}"`,
    html: `
      <h2>New Comment</h2>
      <p><strong>${data.commenterName}</strong> commented on "<strong>${data.projectTitle}</strong>":</p>
      <blockquote style="border-left:3px solid #3457ff;padding-left:12px;color:#666;">${data.comment}</blockquote>
      <p><a href="${getAppUrl()}/dashboard" style="display:inline-block;padding:12px 24px;background:#3457ff;color:white;text-decoration:none;border-radius:8px;">View</a></p>
    `,
  });
}

export async function sendBookingNotificationEmail(
  to: string,
  data: {
    customerName: string;
    customerEmail: string;
    teamName: string;
    teamId: string;
    serviceName: string;
    serviceCategory: string;
    servicePrice: number;
    location: string;
    date: string;
    time: string;
    notes: string;
  }
) {
  await getResend().emails.send({
    from: FROM_APP,
    to,
    subject: `New Footage Booking: ${data.serviceName} — ${data.date}`,
    html: `
      <h2>New Footage Booking Request</h2>
      <table style="border-collapse:collapse;width:100%;max-width:500px;">
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Service</td><td style="padding:8px;border-bottom:1px solid #eee;">${data.serviceName} (${data.serviceCategory})</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Price</td><td style="padding:8px;border-bottom:1px solid #eee;">$${data.servicePrice}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Customer</td><td style="padding:8px;border-bottom:1px solid #eee;">${data.customerName} (${data.customerEmail})</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Team</td><td style="padding:8px;border-bottom:1px solid #eee;">${data.teamName}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Team ID</td><td style="padding:8px;border-bottom:1px solid #eee;font-family:monospace;font-size:12px;">${data.teamId}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Location</td><td style="padding:8px;border-bottom:1px solid #eee;">${data.location}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Date</td><td style="padding:8px;border-bottom:1px solid #eee;">${data.date}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Time</td><td style="padding:8px;border-bottom:1px solid #eee;">${data.time}</td></tr>
        ${data.notes ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Notes</td><td style="padding:8px;border-bottom:1px solid #eee;">${data.notes}</td></tr>` : ""}
      </table>
      <p style="margin-top:16px;"><a href="${getAppUrl()}/settings/footage" style="display:inline-block;padding:12px 24px;background:#3457ff;color:white;text-decoration:none;border-radius:8px;">Review in Coachboard</a></p>
    `,
  });
}

export async function sendBookingStatusEmail(
  to: string,
  data: {
    status: "approved" | "declined";
    serviceName: string;
    date: string;
    time: string;
    location: string;
    adminNotes: string;
  }
) {
  const isApproved = data.status === "approved";
  await getResend().emails.send({
    from: FROM_APP,
    to,
    subject: isApproved
      ? `Booking Approved: ${data.serviceName} — ${data.date}`
      : `Booking Update: ${data.serviceName} — ${data.date}`,
    html: isApproved
      ? `
      <h2>Your Booking is Confirmed!</h2>
      <p>Great news! Your <strong>${data.serviceName}</strong> footage booking has been approved.</p>
      <table style="border-collapse:collapse;width:100%;max-width:500px;">
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Service</td><td style="padding:8px;border-bottom:1px solid #eee;">${data.serviceName}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Date</td><td style="padding:8px;border-bottom:1px solid #eee;">${data.date}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Time</td><td style="padding:8px;border-bottom:1px solid #eee;">${data.time}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Location</td><td style="padding:8px;border-bottom:1px solid #eee;">${data.location}</td></tr>
        ${data.adminNotes ? `<tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Notes</td><td style="padding:8px;border-bottom:1px solid #eee;">${data.adminNotes}</td></tr>` : ""}
      </table>
      <p style="margin-top:12px;">Our video team will be at <strong>${data.location}</strong> on <strong>${data.date}</strong> at <strong>${data.time}</strong>.</p>
      <p style="margin-top:16px;"><a href="${getAppUrl()}/settings/footage" style="display:inline-block;padding:12px 24px;background:#3457ff;color:white;text-decoration:none;border-radius:8px;">View Booking</a></p>
    `
      : `
      <h2>Booking Update</h2>
      <p>Unfortunately, your <strong>${data.serviceName}</strong> footage booking for <strong>${data.date}</strong> could not be accommodated.</p>
      ${data.adminNotes ? `<p><strong>Reason:</strong> ${data.adminNotes}</p>` : ""}
      <p>Please try rebooking for a different date or contact us for assistance.</p>
      <p style="margin-top:16px;"><a href="${getAppUrl()}/settings/footage" style="display:inline-block;padding:12px 24px;background:#3457ff;color:white;text-decoration:none;border-radius:8px;">Book Again</a></p>
    `,
  });
}

export async function sendYappyPaymentRequestEmail(
  to: string,
  data: {
    requesterName: string;
    requesterEmail: string;
    yappyPhone: string;
    teamId: string;
    teamName: string;
    userId: string;
  }
) {
  const crypto = await import("crypto");
  const secret = process.env.CRON_SECRET || "";
  const token = crypto
    .createHmac("sha256", secret)
    .update(`yappy-approve:${data.userId}`)
    .digest("hex");
  const approveUrl = `${getAppUrl()}/api/yappy/approve?userId=${data.userId}&token=${token}`;

  await getResend().emails.send({
    from: FROM_APP,
    to,
    subject: `Yappy Payment Request: ${data.requesterName}`,
    html: `
      <h2>New Yappy Payment Request</h2>
      <p>A coach has requested to pay for the <strong>Pro Annual Plan ($240/yr)</strong> via Yappy.</p>
      <table style="border-collapse:collapse;width:100%;max-width:500px;">
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Name</td><td style="padding:8px;border-bottom:1px solid #eee;">${data.requesterName}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Email</td><td style="padding:8px;border-bottom:1px solid #eee;">${data.requesterEmail}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Yappy Phone</td><td style="padding:8px;border-bottom:1px solid #eee;">${data.yappyPhone}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Team</td><td style="padding:8px;border-bottom:1px solid #eee;">${data.teamName}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">Team ID</td><td style="padding:8px;border-bottom:1px solid #eee;font-family:monospace;font-size:12px;">${data.teamId}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;border-bottom:1px solid #eee;">User ID</td><td style="padding:8px;border-bottom:1px solid #eee;font-family:monospace;font-size:12px;">${data.userId}</td></tr>
      </table>
      <p style="margin-top:16px;">After confirming the Yappy payment was received, click the button below to activate their Pro plan:</p>
      <p><a href="${approveUrl}" style="display:inline-block;padding:14px 28px;background:#22c55e;color:white;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">Approve &amp; Activate Pro</a></p>
      <p style="margin-top:8px;color:#999;font-size:12px;">This link is secure and does not expire.</p>
    `,
  });
}

export async function sendYappyApprovalEmail(
  to: string,
  data: { name: string }
) {
  await getResend().emails.send({
    from: FROM_APP,
    to,
    subject: "Your Pro Plan is Now Active!",
    html: `
      <h2>Welcome to Pro, ${data.name}!</h2>
      <p>Your Yappy payment has been confirmed and your <strong>Pro Annual Plan</strong> is now active.</p>
      <p>You now have access to all Pro features:</p>
      <ul>
        <li>Unlimited projects</li>
        <li>Unlimited athletes</li>
        <li>Email &amp; WhatsApp notifications</li>
        <li>Share links, comments &amp; collaboration</li>
        <li>Full telestration (all colors)</li>
        <li>CSV import/export</li>
        <li>Priority support</li>
      </ul>
      <p style="margin-top:16px;"><a href="${getAppUrl()}/dashboard" style="display:inline-block;padding:12px 24px;background:#3457ff;color:white;text-decoration:none;border-radius:8px;">Go to Dashboard</a></p>
    `,
  });
}

export async function sendAthleteTaggedEmail(
  to: string,
  data: {
    athleteName: string;
    timestampTitle: string;
    projectTitle: string;
    taggedByName: string;
    projectId: string;
  }
) {
  await getResend().emails.send({
    from: FROM_APP,
    to,
    subject: `You've been tagged in "${data.projectTitle}"`,
    html: `
      <h2>You've been tagged!</h2>
      <p>Hi ${data.athleteName},</p>
      <p><strong>${data.taggedByName}</strong> tagged you in the coaching point "<strong>${data.timestampTitle}</strong>" on the project "<strong>${data.projectTitle}</strong>".</p>
      <p>Log in to review the film and see your coaching notes.</p>
      <p style="margin-top:16px;"><a href="${getAppUrl()}/projects/${data.projectId}" style="display:inline-block;padding:12px 24px;background:#3457ff;color:white;text-decoration:none;border-radius:8px;">View Project</a></p>
    `,
  });
}
