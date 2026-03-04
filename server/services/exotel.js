import axios from 'axios';

/**
 * Exotel masked-calling service.
 *
 * Masked call flow (real mode):
 * 1) Exotel calls the scanner (From) using the virtual number.
 * 2) Once answered, Exotel bridges to the owner (To), still masked.
 */
export async function initiateCall(callerPhone, ownerPhone) {
  if (process.env.MOCK_CALLS === 'true') {
    await new Promise(r => setTimeout(r, 800));
    const lastDigit = parseInt(callerPhone.slice(-1), 10);
    const mockOutcome = lastDigit === 0 ? 'no-answer'
      : lastDigit === 1 ? 'busy'
      : 'completed';
    return { sid: `MOCK-${Date.now()}`, mockOutcome, mockDelay: 3000 };
  }

  const {
    EXOTEL_SID,
    EXOTEL_API_KEY,
    EXOTEL_API_TOKEN,
    EXOTEL_VIRTUAL_NUMBER,
    SERVER_URL,
  } = process.env;

  const fromNum = callerPhone.startsWith('0') ? callerPhone : `0${callerPhone}`;
  const toNum = ownerPhone.startsWith('0') ? ownerPhone : `0${ownerPhone}`;
  const webhookUrl = `${SERVER_URL || 'http://localhost:5000'}/api/v1/webhooks/exotel`;

  const body = new URLSearchParams({
    From: fromNum,
    To: toNum,
    CallerId: EXOTEL_VIRTUAL_NUMBER,
    StatusCallback: webhookUrl,
    TimeLimit: '300',
  });

  const url = `https://api.exotel.com/v1/Accounts/${EXOTEL_SID}/Calls/connect`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${EXOTEL_API_KEY}:${EXOTEL_API_TOKEN}`).toString('base64')}`,
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

export async function sendMaskedSMS(callerPhone, ownerPhone, message) {
  if (process.env.MOCK_CALLS === 'true') {
    const mockSid = `mock_sms_${Date.now()}`;
    console.log(`[MOCK SMS] SID: ${mockSid}`);
    console.log(`[MOCK SMS] From virtual number to: ${ownerPhone}`);
    console.log(`[MOCK SMS] Triggered by caller: ${callerPhone}`);
    console.log(`[MOCK SMS] Body: ${message}`);
    return { status: 'sent', sid: mockSid };
  }

  try {
    const payload = new URLSearchParams({
      From: process.env.EXOTEL_VIRTUAL_NUMBER,
      To: ownerPhone,
      Body: message,
      EncodingType: 'unicode',
      Priority: 'high',
    });

    if (process.env.EXOTEL_DLT_ENTITY_ID) {
      payload.append('DltEntityId', process.env.EXOTEL_DLT_ENTITY_ID);
    }
    if (process.env.EXOTEL_DLT_TEMPLATE_ID) {
      payload.append('DltTemplateId', process.env.EXOTEL_DLT_TEMPLATE_ID);
    }

    const response = await axios.post(
      `https://api.exotel.com/v1/Accounts/${process.env.EXOTEL_SID}/Sms/send`,
      payload,
      {
        auth: {
          username: process.env.EXOTEL_API_KEY,
          password: process.env.EXOTEL_API_TOKEN,
        },
      }
    );

    return {
      status: 'sent',
      sid: response.data?.SMSMessage?.Sid || null,
    };
  } catch (error) {
    console.error('[EXOTEL SMS ERROR]', error.response?.data || error.message);
    return { status: 'failed', sid: null, error: error.message };
  }
}

export async function sendBulkEmergencySMS(callerPhone, recipients, message) {
  const results = [];
  for (const recipient of recipients) {
    const result = await sendMaskedSMS(callerPhone, recipient.phone, message);
    results.push({
      label: recipient.label,
      ...result,
    });
  }
  return results;
}
