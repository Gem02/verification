require('dotenv').config();
const axios = require('axios');

const checkNIN = async (nin) => {
  const base_url = process.env.PREMBLY_BASE_URL_SANDBOX;
  console.log('first step');

  try {
    console.log('Sending request to:', `${base_url}/api/v1/biometrics/merchant/data/verification/nin`);
    console.log('Using headers:', {
      'x-api-key': process.env.PREMBLY_API_KEY,
      'app-id': process.env.PREMBLY_APP_ID,
    });

    const response = await axios.post(
      `${base_url}/api/v1/biometrics/merchant/data/verification/nin`,
      { number: nin },
      {
        headers: {
          'x-api-key': process.env.PREMBLY_API_KEY,
          'app-id': process.env.PREMBLY_APP_ID,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Response from Prembly:', response.data);

    const result = response.data;

    if (!result?.status || result.status !== 'success') {
      throw new Error('NIN verification failed');
    }

    return result.data;

  } catch (error) {
    console.error('❌ Error during NIN verification:', error.response?.data || error.message || error);
    throw new Error('NIN verification failed');
  }
};

module.exports = { checkNIN };
