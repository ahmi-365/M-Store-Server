const express = require('express');
const bcrypt = require('bcryptjs');
const SubAdmin = require('../models/Admin');  // Make sure you have this model for sub-admins
const router = express.Router();

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
      req.session.user = { id: admin._id, email: admin.email, role: admin.role };
      return res.json({ message: 'Admin logged in successfully', redirect: '/admin-dashboard' });
    }
    const user = await User.findOne({ email });
    if (user) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      req.session.user = { id: user._id, email: user.email, role: 'User' };
      return res.json({ message: 'User logged in successfully', redirect: '/home' });
    }
    return res.status(400).json({ message: 'User not found' });

  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: 'Error logging in' });
  }
});

// Fetch all sub-admins (only accessible by an admin)
router.get('/subadmins',  async (req, res) => {
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
