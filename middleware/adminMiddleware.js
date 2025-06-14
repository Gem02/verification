const UserModel = require('../models/User');

const verifyAdmin = async (req, res, next) => {
  try {
    const adminUserId = req.params ;

    if (!adminUserId) {
      return res.status(400).json({ message: 'Admin user ID is required' });
    }

    const admin = await UserModel.findById({_id: adminUserId});

    if (!admin || !['admin', 'super-admin'].includes(admin.role)) {
      return res.status(403).json({ message: 'Unauthorized: Not an admin' });
    }

    req.user = admin;
    next();
  } catch (err) {
    console.error('Admin verification error:', err);
    res.status(500).json({ message: 'Server error verifying admin' });
  }
};

module.exports = {
  verifyAdmin
};
