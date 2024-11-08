const express = require('express');
const bcrypt = require('bcryptjs');
const { check, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const SubAdmin = require('../models/Admin');  // Ensure this model exists
const User = require('../models/User');      // Ensure you have a User model for regular users
const router = express.Router();

// Middleware to check if the user is an admin using JWT token
const isAdmin = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'Authorization token is required' });
  }

  try {
    const decoded = jwt.verify(token, 'your-secret-key'); // Use your secret key
    if (decoded.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }
    req.user = decoded;  // Store decoded user info for further use in route handlers
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Admin login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    let admin = await SubAdmin.findOne({ email });
    if (admin) {
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Issue JWT token and send response
      const token = jwt.sign({ id: admin._id, email: admin.email, role: admin.role }, 'your-secret-key', { expiresIn: '1h' });
      return res.json({ message: 'Admin logged in successfully', token, redirect: '/admin-dashboard' });
    }

    // If not found in SubAdmin, check the User collection (for regular users)
    const user = await User.findOne({ email });
    if (user) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: user._id, email: user.email, role: 'User' }, 'your-secret-key', { expiresIn: '1h' });
      return res.json({ message: 'User logged in successfully', token, redirect: '/home' });
    }

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
    const adminToUpdate = await SubAdmin.findById(id);
    if (!adminToUpdate) {
      return res.status(404).json({ message: "Sub-admin not found" });
    }

    if (email) adminToUpdate.email = email;
    if (role) adminToUpdate.role = role;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      adminToUpdate.password = await bcrypt.hash(password, salt);
    }

    await adminToUpdate.save();
    res.status(200).json({ message: "Sub-admin updated successfully" });
  } catch (error) {
    console.error("Error updating sub-admin:", error);
    res.status(500).json({ message: "Error updating sub-admin" });
  }
});

module.exports = router;
