const User = require('../models/User.model');
const jwt = require('jsonwebtoken');

exports.ssoLogin = async (req, res) => {
  try {
    const { vexaAccountId, email, name, avatar } = req.body;
    if (!vexaAccountId || !email) return res.status(400).json({ success: false, message: 'vexaAccountId and email are required' });
    let user = await User.findOne({ vexaAccountId });
    if (!user) {
      user = new User({ vexaAccountId, email, name: name || email.split('@')[0], avatar: avatar || null });
      await user.save();
    } else {
      user.lastLogin = new Date();
      if (avatar) user.avatar = avatar;
      if (name) user.name = name;
      await user.save();
    }
    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, data: {
      token, user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar, role: user.role, isVerified: user.isVerified }
    }});
  } catch (error) {
    console.error('SSO Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-__v');
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ success: false, message: 'Failed to get user data' });
  }
};

exports.logout = async (req, res) => res.json({ success: true, message: 'Logged out successfully' });