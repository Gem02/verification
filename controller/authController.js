const UserModel = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('../utilities/generateToken');
const bcryptjs = require('bcryptjs');
const validator = require('validator');
const forgotPasswordModel = require('../models/forgotPassword');
const {sendVerificationEmail} = require('../utilities/emailTemplate');
const {checkNIN} = require('../utilities/quickVerify')


const sendForgotPasswordCode = async (req, res) =>{
    try {
        const email = validator.normalizeEmail(req.body.email || '');
        if (!email) {
            return res.status(400).json({ message: 'Valid email is required' });
        }
        const userExists = await UserModel.findOne({ email });
        if (!userExists) {
            return res.status(400).json({message: 'No account found with this email'})
        }
        const token = Math.floor(Math.random() * (999999 - 100000 + 1) + 100000);
    
        let user = await forgotPasswordModel.findOne({email});
        if (user) {
            return res.status(400).json({message: 'Try again after 5 mins'})
        }

        user = await forgotPasswordModel.create({ email, token });
        sendVerificationEmail(email, token);
        return res.status(200).json({message: 'verification sent', status: true});
    
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Sorry a server error occured' });
    }
};

const verifyCode = async (req, res) => {
    try {
        const email = validator.normalizeEmail(req.body.email || '');
        const code = validator.escape(req.body.code || '');

        if (!email || !code) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const user = await forgotPasswordModel.findOne({ email });

        if (!user || user.token !== code) {
            return res.status(400).json({ message: 'Invalid or expired verification code' });
        }

        
        await forgotPasswordModel.deleteOne({ email });

        res.status(200).json({ message: 'Email verified successfully', status: true });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
};

 const newPassword = async (req, res) => {
    try {
        const email = validator.normalizeEmail(req.body.email || '');
        const password = validator.escape(req.body.password || '');

        if (!email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const user = await UserModel.findOne({ email });

        if (!user) {
        return res.status(400).json({ message: 'User does not exist' });
        }

        user.password = password;
        await user.save();

        return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}; 

const registerUser = async (req, res) => {

  try {
    const firstName = validator.escape(req.body.firstName || '');
    const lastName = validator.escape(req.body.lastName || '');
    const email = validator.normalizeEmail(req.body.email || '');
    const phone = validator.escape(req.body.phone || '');
    const nin = validator.escape(req.body.nin || '');
    const password = validator.escape(req.body.password || '');

    if (!firstName || !lastName || !email || !phone || !nin || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const userExists = await UserModel.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    const activeNin = await UserModel.findOne({nin});
    if (activeNin) {
        return res.status(400).json({ message: 'NIN already exists' });
    }

    try {
      const res = await checkNIN(nin);
      console.log(res)
    } catch (ninError) {
      return res.status(400).json({ message: 'Invalid NIN. Verification failed.' });
    }

    console.log('finally')

    const user = await UserModel.create({
      firstName,
      lastName,
      email,
      phone,
      nin,
      password,
    });

    return res.status(201).json({ message: 'User created successfully', user });

  } catch (error) {
    console.error('Registration error:', error.message);
    return res.status(500).json({
      message: 'Registration failed due to server error',
      error: error.message,
    });
  }
};


const login = async (req, res) => {
    try {
        const email = validator.normalizeEmail(req.body.email || '');
        const password = validator.escape(req.body.password || '');

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const userInfo = await UserModel.findOne({ email }).select('+password');
        if (!userInfo) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isCorrect = await bcryptjs.compare(password, userInfo.password);
        if (!isCorrect) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const accessToken = generateAccessToken(userInfo._id, userInfo.email, userInfo.role);
        const refreshToken = generateRefreshToken(userInfo._id, userInfo.email, userInfo.role);

        res.cookie('accessToken', accessToken, {
            maxAge: 15 * 60 * 1000,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'None'
        });

        res.cookie('refreshToken', refreshToken, {
            maxAge: 30 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'None'
        });


        return res.status(200).json({
            id: userInfo._id,
            firstName: userInfo.firstName,
            lastName: userInfo.lastName,
            email: userInfo.email,
            role: userInfo.role
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ message: 'Login failed. Please try again.' });
    }
};

const loginAdmin = async (req, res) => {
  try {
    const email = validator.normalizeEmail(req.body.email || '');
    const password = validator.escape(req.body.password || '');

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user || !['admin', 'super-admin'].includes(user.role)) {
      return res.status(401).json({ message: 'Unauthorized: Invalid role or user.' });
    }

    
    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const accessToken = generateAccessToken(userInfo._id, userInfo.email, userInfo.role);
    const refreshToken = generateRefreshToken(userInfo._id, userInfo.email, userInfo.role);

    res.cookie('accessToken', accessToken, {
        maxAge: 15 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'None'
    });

    res.cookie('refreshToken', refreshToken, {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'None'
    });


    return res.status(200).json({
        id: userInfo._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


const logout = (req, res) => {
    res.clearCookie('accessToken', {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict'
    });
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict'
    });
    return res.status(200).json({ message: 'Logged out successfully', logout:true });

}

/* const passResetRegisteration = async(req, res) =>{
    try {
        const {email} = req.body;
        const token = Math.floor(Math.random() * (999999 - 100000 + 1) + 100000);
    
        let user = await forgotPasswordModel.findOne({email});
        if (user) {
            return res.status(400).json({message: 'Error try again later'})
        }
        const validUser = await UserModel.findOne({email});

        if (validUser){
            const name = 'UNKNOWN';
            user = await forgotPasswordModel.create({ email, name, token });
            sendVerificationPassword(email, token);
            return res.status(200).json({message: 'verification sent', status: true});
        } else{
            return res.status(400).json({message: 'No account is linked to this email'})
        }
        
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Sorry a server error occured' });
    }
} */

module.exports = { registerUser, login, logout, sendForgotPasswordCode, verifyCode, newPassword, loginAdmin};