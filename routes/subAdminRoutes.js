const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // Add jwt for token signing
const SubAdmin = require('../models/Admin');  // Ensure this is your SubAdmin model
const User = require('../models/User'); // Regular user model
const router = express.Router();

// Admin login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // First, check if the email matches an admin (sub-admin)
    let admin = await SubAdmin.findOne({ email });
    if (admin) {
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Generate JWT for the sub-admin (including role in the payload)
      const token = jwt.sign(
        { userId: admin._id, role: admin.role, email: admin.email },
        process.env.JWT_SECRET,  // Secret from .env
        { expiresIn: '1h' }  // Token expires in 1 hour
      );

      return res.json({ 
        message: 'Admin logged in successfully', 
        token,  // Send the token in the response
        redirect: '/admin-dashboard',
        userId: admin._id, 
        email: admin.email,
        role: admin.role 
      });
    }

    // If no admin is found, check for a regular user
    const user = await User.findOne({ email });
    if (user) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Generate JWT for the regular user (no role-based access needed)
      const token = jwt.sign(
        { userId: user._id, role: 'User', email: user.email },
        process.env.JWT_SECRET,  // Secret from .env
        { expiresIn: '1h' }  // Token expires in 1 hour
      );

      return res.json({ 
        message: 'User logged in successfully', 
        token,  // Send the token in the response
        redirect: '/home', 
        userId: user._id,
        email: user.email,
        role: 'User'
      });
    }

    // If neither an admin nor user exists with that email
    return res.status(400).json({ message: 'User not found' });

  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: 'Error logging in' });
  }
});


// Fetch all sub-admins (only accessible by an admin)
// This route could be protected by token validation (omitted for now)
router.get('/subadmins', async (req, res) => {
  try {
    const subAdmins = await SubAdmin.find({});
    res.status(200).json(subAdmins);
  } catch (error) {
    res.status(500).json({ message: "Error fetching sub-admins" });
  }
});

// Create a new sub-admin (only accessible by an admin)
router.post('/subadmins', async (req, res) => {
  const { email, role, password } = req.body;

  try {
    // Check if sub-admin already exists
    const existingAdmin = await SubAdmin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Sub-admin with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newSubAdmin = new SubAdmin({ email, role, password: hashedPassword });
    await newSubAdmin.save();
    res.status(201).json(newSubAdmin);
  } catch (error) {
    res.status(500).json({ message: "Error creating sub-admin" });
  }
});

// Delete a sub-admin by ID (only accessible by an admin)
router.delete('/subadmins/:id', async (req, res) => {
  try {
    await SubAdmin.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Sub-admin deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting sub-admin" });
  }
});

// Update a sub-admin by ID (only accessible by an admin)
router.put('/subadmins/:id', async (req, res) => {
  const { id } = req.params;
  const { email, role, password } = req.body;

  try {
    // Find the sub-admin by ID
    const adminToUpdate = await SubAdmin.findById(id);
    if (!adminToUpdate) {
      return res.status(404).json({ message: "Sub-admin not found" });
    }

    // Update fields only if they are provided in the request body
    if (email) adminToUpdate.email = email;
    if (role) adminToUpdate.role = role;

    // If a new password is provided, hash it before saving
    if (password) {
      const salt = await bcrypt.genSalt(10);
      adminToUpdate.password = await bcrypt.hash(password, salt);
    }

    // Save the updated sub-admin
    await adminToUpdate.save();
    res.status(200).json({ message: "Sub-admin updated successfully" });
  } catch (error) {
    console.error("Error updating sub-admin:", error);
    res.status(500).json({ message: "Error updating sub-admin" });
  }
});

module.exports = router;
