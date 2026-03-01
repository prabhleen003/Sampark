/**
 * Exotel masked-calling service.
 *
 * Masked call flow (real mode):
 *   1. Exotel calls the CALLER (From) using the virtual number as caller ID.
 *   2. When caller answers, Exotel bridges to the OWNER (To), also using the
 *      virtual number — neither party ever sees the other's real number.
 *
 * Set MOCK_CALLS=true in .env to skip real API calls during development.
 *
 * Required env vars (real mode):
 *   EXOTEL_SID            — Exotel Account SID
 *   EXOTEL_API_KEY        — API key
 *   EXOTEL_API_TOKEN      — API token
 *   EXOTEL_VIRTUAL_NUMBER — ExoPhone / virtual number (e.g. 08039591111)
 *   SERVER_URL            — Publicly accessible backend URL for the status webhook
 *                           e.g. https://api.yourdomain.com  (no trailing slash)
 */
export async function initiateCall(callerPhone, ownerPhone) {
  // ── Mock mode ───────────────────────────────────────────────────────────────
  if (process.env.MOCK_CALLS === 'true') {
    await new Promise(r => setTimeout(r, 800));
    const lastDigit = parseInt(callerPhone.slice(-1));
    const mockOutcome = lastDigit === 0 ? 'no-answer'
                      : lastDigit === 1 ? 'busy'
                      : 'completed';
    return { sid: `MOCK-${Date.now()}`, mockOutcome, mockDelay: 3000 };
  }

  // ── Real Exotel call ────────────────────────────────────────────────────────
  const {
    EXOTEL_SID,
    EXOTEL_API_KEY,
    EXOTEL_API_TOKEN,
    EXOTEL_VIRTUAL_NUMBER,
    SERVER_URL,
  } = process.env;

  // Indian numbers must be prefixed with 0 for Exotel (0XXXXXXXXXX format)
  const fromNum    = callerPhone.startsWith('0') ? callerPhone : `0${callerPhone}`;
  const toNum      = ownerPhone.startsWith('0')  ? ownerPhone  : `0${ownerPhone}`;
  const webhookUrl = `${SERVER_URL || 'http://localhost:5000'}/api/v1/webhooks/exotel`;

  const body = new URLSearchParams({
    From:           fromNum,
    To:             toNum,
    CallerId:       EXOTEL_VIRTUAL_NUMBER,
    StatusCallback: webhookUrl, // Exotel POSTs call status updates here
    TimeLimit:      '300',      // 5-minute max call duration
  });

  const url = `https://api.exotel.com/v1/Accounts/${EXOTEL_SID}/Calls/connect`;

  const res = await fetch(url, {
    method:  'POST',
    headers: {
      Authorization:  `Basic ${Buffer.from(`${EXOTEL_API_KEY}:${EXOTEL_API_TOKEN}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.RestException?.Message || `Exotel API error (${res.status})`);
  }

  return { sid: data.Call?.Sid };
}
