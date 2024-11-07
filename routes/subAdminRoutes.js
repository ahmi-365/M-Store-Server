const express = require('express');
const bcrypt = require('bcryptjs');
const SubAdmin = require('../models/Admin');  // Make sure you have this model for sub-admins
const router = express.Router();

// Middleware to check if the user is an admin (based on session)
function verifyAdmin(req, res, next) {
  console.log('Session data:', req.session);  // Check the session data

  if (!req.session.user || req.session.user.role !== 'Admin') {
    return res.status(403).json({ message: "Unauthorized" });
  }
  next();
}

// Admin login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await SubAdmin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ message: 'Admin not found' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Store user data in session
    req.session.user = { id: admin._id, email: admin.email, role: admin.role };
    console.log('Admin logged in, session:', req.session); // Debug session data
    res.json({ message: 'Logged in successfully' });

  } catch (error) {
    res.status(500).json({ message: 'Error logging in' });
  }
});

// Fetch all sub-admins (only accessible by an admin)
router.get('/subadmins', verifyAdmin, async (req, res) => {
  try {
    const subAdmins = await SubAdmin.find({});
    res.status(200).json(subAdmins);
  } catch (error) {
    res.status(500).json({ message: "Error fetching sub-admins" });
  }
});

// Create a new sub-admin (only accessible by an admin)
router.post('/subadmins', verifyAdmin, async (req, res) => {
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
router.delete('/subadmins/:id', verifyAdmin, async (req, res) => {
  try {
    await SubAdmin.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Sub-admin deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting sub-admin" });
  }
});

module.exports = router;
