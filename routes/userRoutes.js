const express = require('express');
const bcrypt = require('bcryptjs');
const fetch = require('node-fetch');
const User = require('../models/User');
const router = express.Router();

// Facebook App Details
const appId = '432104696419805'; // Replace with your App ID
const appSecret = '7797d1c4a559d93670c4bd57db5f5354'; // Replace with your App Secret
const redirectUri = 'https://e-commerace-store.onrender.com/facebook/callback'; // Replace with your Redirect URI

// Facebook OAuth callback route
router.get('/facebook/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ message: 'Authorization code is missing' });
  }

  try {
    // Exchange code for access token
    const tokenUrl = `https://graph.facebook.com/v12.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&client_secret=${appSecret}&code=${code}`;

    const tokenResponse = await fetch(tokenUrl);
    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new Error('Failed to retrieve access token');
    }

    const accessToken = tokenData.access_token;

    // Fetch user profile from Facebook
    const profileUrl = `https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`;
    const profileResponse = await fetch(profileUrl);
    const profileData = await profileResponse.json();

    if (!profileData.email) {
      return res.status(400).json({ message: 'Facebook account does not provide an email address' });
    }

    // Check if the user already exists
    let user = await User.findOne({ email: profileData.email });

    if (!user) {
      // Create a new user if not exists
      user = new User({
        email: profileData.email,
        name: profileData.name,
        facebookId: profileData.id,
        isAdmin: false, // Default to non-admin
      });

      await user.save();
    }

    // Set session or return user data
    req.session.user = { email: user.email, isAdmin: user.isAdmin };
    res.status(200).json({
      message: 'Facebook login successful',
      user: {
        email: user.email,
        name: user.name,
        id: user._id,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error('Error during Facebook OAuth:', error);
    res.status(500).json({ message: 'Facebook login failed', error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Find and delete the user by ID
        const deletedUser = await User.findByIdAndDelete(id);

        if (!deletedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        return res.status(500).json({ message: 'Error deleting user', error: error.message });
    }
});

// User signup (for regular users, no direct admin creation here)
router.post('/signup', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, password: hashedPassword, isAdmin: false }); // New users are not admins by default
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// User login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check if the user is an admin based on the isAdmin field
        const isAdmin = user.isAdmin;

        // Store user info in session
        req.session.user = { email: user.email, isAdmin };

        // Return relevant data to the frontend
        return res.json({
            message: isAdmin ? 'Admin login successful' : 'Login successful',
            isAdmin,
            email: user.email,
            userId: user._id,
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
router.get('/', async (req, res) => {
    try {
      const users = await User.find(); // Fetch all users from the database
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });
  
  // Edit user details
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { email, role } = req.body;
  
    try {
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Update fields
      user.email = email || user.email;
      user.role = role || user.role;
  
      const updatedUser = await user.save();
      res.status(200).json(updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: 'Server error while updating user' });
    }
  });
  
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Logout failed' });
        }
        res.json({ message: 'Logout successful' });
    });
});

module.exports = router;
