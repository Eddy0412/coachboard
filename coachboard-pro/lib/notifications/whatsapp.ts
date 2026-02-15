import twilio from "twilio";

function getClient() {
  return twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
}

export async function sendInviteWhatsApp(
  to: string,
  data: { token: string; role: string }
) {
  const from = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const phone = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

  await getClient().messages.create({
    from,
    to: phone,
    body: `You've been invited to Coachboard Pro as ${data.role}! Accept your invitation here: ${APP_URL}/invite/${data.token}`,
  });
}

export async function sendNotificationWhatsApp(
  to: string,
  message: string
) {
  const from = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";
  const phone = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

  await getClient().messages.create({
    from,
    to: phone,
    body: message,
  });
}
