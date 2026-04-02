import crypto from "crypto";

const PF_ENVIRONMENTS = {
  development: "https://sandbox.paguelofacil.com",
  production: "https://secure.paguelofacil.com",
} as const;

function getBaseUrl(): string {
  const env = (process.env.PAGUELOFACIL_ENVIRONMENT || "development") as keyof typeof PF_ENVIRONMENTS;
  return PF_ENVIRONMENTS[env] || PF_ENVIRONMENTS.development;
}

function getCCLW(): string {
  const cclw = process.env.PAGUELOFACIL_CCLW;
  if (!cclw) throw new Error("PAGUELOFACIL_CCLW is not set");
  return cclw;
}

function getToken(): string {
  const token = process.env.PAGUELOFACIL_TOKEN;
  if (!token) throw new Error("PAGUELOFACIL_TOKEN is not set");
  return token;
}

function getHmacSecret(): string {
  // Use CRON_SECRET as HMAC key for callback signing (avoids another env var)
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error("CRON_SECRET is not set");
  return secret;
}

/** Hex-encode a string (PagueloFacil requirement for RETURN_URL) */
function hexEncode(str: string): string {
  return Buffer.from(str, "utf-8").toString("hex");
}

/** Sign userId + interval with HMAC-SHA256 for callback verification */
export function signParm(userId: string, interval: string): string {
  const hmac = crypto
    .createHmac("sha256", getHmacSecret())
    .update(userId + interval)
    .digest("hex");
  return `${userId}:${hmac}`;
}

/** Verify HMAC signature on PARM_1 from callback */
export function verifyParm(parm1: string, interval: string): string | null {
  const colonIdx = parm1.indexOf(":");
  if (colonIdx === -1) return null;
  const userId = parm1.substring(0, colonIdx);
  const providedHmac = parm1.substring(colonIdx + 1);
  const expectedHmac = crypto
    .createHmac("sha256", getHmacSecret())
    .update(userId + interval)
    .digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(providedHmac), Buffer.from(expectedHmac))) {
    return null;
  }
  return userId;
}

interface CreatePaymentLinkParams {
  amount: number;
  description: string;
  returnUrl: string;
  userId: string;
  interval: "monthly" | "yearly";
}

/** Create a PagueloFacil payment link (redirects user to hosted checkout) */
export async function createPaymentLink({
  amount,
  description,
  returnUrl,
  userId,
  interval,
}: CreatePaymentLinkParams): Promise<{ url: string }> {
  const baseUrl = getBaseUrl();
  const cclw = getCCLW();

  const body = new URLSearchParams({
    ESSION: "0",
    ESSION2: "0",
    CCLW: cclw,
    CMTN: amount.toFixed(2),
    CDSC: description,
    RETURN_URL: hexEncode(returnUrl),
    PARM_1: signParm(userId, interval),
    PARM_2: interval,
  });

  const res = await fetch(`${baseUrl}/LinkDeamon.cfm`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PagueloFacil LinkDeamon error: ${res.status} ${text}`);
  }

  const data = await res.json();

  if (!data.url && !data.data?.url) {
    throw new Error(`PagueloFacil did not return a checkout URL: ${JSON.stringify(data)}`);
  }

  return { url: data.url || data.data?.url };
}

interface ChargeRecurrentParams {
  codOper: string;
  amount: number;
  email: string;
  description: string;
}

interface RecurrentResult {
  success: boolean;
  raw: Record<string, unknown>;
}

/** Charge a stored card token for subscription renewal */
export async function chargeRecurrent({
  codOper,
  amount,
  email,
  description,
}: ChargeRecurrentParams): Promise<RecurrentResult> {
  const baseUrl = getBaseUrl();
  const cclw = getCCLW();
  const token = getToken();

  const res = await fetch(`${baseUrl}/rest/processTx/RECURRENT`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify({
      CCLW: cclw,
      codOper,
      amount: parseFloat(amount.toFixed(2)),
      CDSC: description,
      EMAIL: email,
    }),
  });

  const data = await res.json();
  const status = data?.headerStatus?.code;

  return {
    success: status === 200 || status === "200",
    raw: data,
  };
}
