require('dotenv').config();
const validator = require('validator');
const axios = require('axios');


const verifyNin = async (req, res) =>{
    try {
        const nin = validator.escape(req.body.nin || '');
        if (!nin) {
            return res.status(400).json({ message: 'Error: Please Provide a valid NIN number' });
        }
        
        const response = await axios.post(
            `${base_url}/identitypass/verification/vnin`,
            { number: nin },
            {
            headers: {
                'x-api-key': process.env.PREMBLY_API_KEY,
                'app-id': process.env.PREMBLY_APP_ID,
                'Content-Type': 'application/json',
            },
            }
        );
        
        const result = response.data;
        if (!result?.status || result.verification?.status !== 'VERIFIED') {
            throw new Error('❌ NIN verification failed');
        }
    
        return res.status(200).json({result})
        
        
    } catch (error) {
        return res.status(400).json({message: 'NIN verification error'});
    }
}

module.exports = {verifyNin};