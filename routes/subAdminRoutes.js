const express = require('express');
const bcrypt = require('bcryptjs');
const SubAdmin = require('../models/Admin');
const router = express.Router();

// // Middleware to restrict access based on role
// function checkRole(requiredRole) {
//   return (req, res, next) => {
//     console.log("Session data before role check:", req.session.user);  // Check session data
//     if (!req.session.user || req.session.user.role !== requiredRole) {
//       return res.status(403).json({ message: "Forbidden: You don't have access to this resource" });
//     }
//     next();
//   };
// }

// Admin login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await SubAdmin.findOne({ email });
    if (admin) {
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

      req.session.user = { id: admin._id, email: admin.email, role: admin.role };
      console.log("User session:", req.session.user);  // Add this to confirm session data
      return res.json({ message: 'Admin logged in successfully', role: admin.role });
    }
    return res.status(400).json({ message: 'User not found' });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: 'Error logging in' });
  }
});

// Fetch all sub-admins (only accessible by an admin)
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
    const existingAdmin = await SubAdmin.findOne({ email });
    if (existingAdmin) return res.status(400).json({ message: "Sub-admin with this email already exists" });

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
    const adminToUpdate = await SubAdmin.findById(id);
    if (!adminToUpdate) return res.status(404).json({ message: "Sub-admin not found" });

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

// Product Management (only accessible by Product Admin)
router.get('/products', async (req, res) => {
  try {
    // Replace this with actual logic to fetch products from the database
    res.status(200).json({ message: 'Product list retrieved successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products' });
  }
});

router.post('/products', async (req, res) => {
  try {
    // Replace this with actual logic to add a new product to the database
    res.status(201).json({ message: 'Product added successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error adding product' });
  }
});

router.put('/products/:id',async (req, res) => {
  try {
    // Replace this with actual logic to update a product by its ID
    res.status(200).json({ message: 'Product updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating product' });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    // Replace this with actual logic to delete a product by its ID
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product' });
  }
});

module.exports = router;
