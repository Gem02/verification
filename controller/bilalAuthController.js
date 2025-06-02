require('dotenv').config();
const axios = require('axios');

const generateToken = async () => {
  const username = process.env.BILALSADA_USERNAME;
  const password = process.env.BILALSADA_PASSWORD;
  const basicAuth = Buffer.from(`gem1234:qwert12345`).toString('base64');

  try {
    const response = await axios.post(
      'https://bilalsadasub.com/api/user',
      {},
      {
        headers: {
          Authorization: `Basic ${basicAuth}`
        }
      }
    );

    const token = response.data.AccessToken;
    console.log(response.data)
    return token;
  } catch (error) {
    console.error('Error generating token:', error.response?.data || error.message);
    throw new Error('Authentication failed');
  }
};

module.exports = generateToken;

payload = {
  network: 'MTN which means you will send 1', 
  phone: '09019606073',
  dataPlan: 1, 
  userId: '12334sdfdgr...',
  amount: '1200',
  pin: '1234'
};
