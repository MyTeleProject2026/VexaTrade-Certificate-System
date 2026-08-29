const axios = require('axios');

const BASE = process.env.VEXA_ACCOUNT_URL || 'https://api-vexaaccount.onrender.com';

async function getIdentity(accessToken) {
  if (!accessToken) throw new Error('VexaAccount access token is required');
  const response = await axios.get(`${BASE}/api/sso/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 15000
  });
  return response.data;
}

module.exports = { getIdentity };
