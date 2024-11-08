const express = require('express');
const bcrypt = require('bcryptjs');
const { check, validationResult } = require('express-validator');
const SubAdmin = require('../models/Admin');  // Make sure you have this model for sub-admins
const router = express.Router();

// Middleware to check if the user is an admin
const isAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Access denied. Admins only.' });
  }
  next();
};

// Admin login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // First, check if the email exists in the SubAdmin collection (for admins)
    let admin = await SubAdmin.findOne({ email });
    if (admin) {
      // Admin found, check password
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Store admin data in the session and send the admin dashboard redirect
      req.session.user = { id: admin._id, email: admin.email, role: admin.role };
      return res.json({ message: 'Admin logged in successfully', redirect: '/admin-dashboard' });
    }

    // If not found in SubAdmin, check the User collection (for regular users)
    const user = await User.findOne({ email });
    if (user) {
      // User found, check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Store user data in the session and send the home page redirect
      req.session.user = { id: user._id, email: user.email, role: 'User' };
      return res.json({ message: 'User logged in successfully', redirect: '/home' });
    }

    // If neither an admin nor a user is found
    return res.status(400).json({ message: 'User not found' });

  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: 'Error logging in' });
  }
});

// Fetch all sub-admins (only accessible by an admin)
router.get('/subadmins', isAdmin, async (req, res) => {
  try {
    const subAdmins = await SubAdmin.find({});
    res.status(200).json(subAdmins);
  } catch (error) {
    res.status(500).json({ message: "Error fetching sub-admins" });
  }
});

// Create a new sub-admin (only accessible by an admin)
router.post('/subadmins', 
  isAdmin, 
  [
    // Validation checks for incoming data
    check('email').isEmail().withMessage('Please provide a valid email'),
    check('role').isIn(['Admin', 'Product Admin']).withMessage('Role must be "Admin" or "Product Admin"'),
    check('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
  ], 
  async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

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
  }
);

// Delete a sub-admin by ID (only accessible by an admin)
router.delete('/subadmins/:id', isAdmin, async (req, res) => {
  try {
    await SubAdmin.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Sub-admin deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting sub-admin" });
  }
});

// Update a sub-admin by ID (only accessible by an admin)
router.put('/subadmins/:id', isAdmin, async (req, res) => {
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
