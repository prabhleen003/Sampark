/**
 * Exotel masked-calling service.
 * Set MOCK_CALLS=true in .env to skip real API calls during development.
 */
export async function initiateCall(callerPhone, ownerPhone) {
  if (process.env.MOCK_CALLS === 'true') {
    // Simulate network latency
    await new Promise(r => setTimeout(r, 800));
    return { sid: `MOCK-${Date.now()}` };
  }

  const { EXOTEL_SID, EXOTEL_API_KEY, EXOTEL_API_TOKEN, EXOTEL_VIRTUAL_NUMBER } = process.env;
  const url = `https://api.exotel.com/v1/Accounts/${EXOTEL_SID}/Calls/connect`;

  const body = new URLSearchParams({
    From:     `0${callerPhone}`,
    To:       `0${ownerPhone}`,
    CallerId: EXOTEL_VIRTUAL_NUMBER,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${EXOTEL_API_KEY}:${EXOTEL_API_TOKEN}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.RestException?.Message || 'Exotel API error');
  return { sid: data.Call?.Sid };
}
