import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export async function sendInviteEmail(
  to: string,
  data: { token: string; role: string; teamId: string }
) {
  await getResend().emails.send({
    from: "Coachboard Pro <noreply@coachboard.pro>",
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
    from: "Coachboard Pro <noreply@coachboard.pro>",
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
    from: "Coachboard Pro <noreply@coachboard.pro>",
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
