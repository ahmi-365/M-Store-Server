const express = require('express');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const SubAdmin = require('../models/Admin');  // Model for sub-admins
const User = require('../models/User');       // Model for regular users
const Product = require('../models/Product'); // Model for products
const router = express.Router();

// Middleware setup for sessions (this should ideally be in your main app file)
router.use(session({
  secret: 'your-secret-key', // Replace with a secure key
  resave: false,
  saveUninitialized: false,
}));

// Define allowed actions for each role
const rolePermissions = {
  SuperAdmin: ["manageUsers", "manageSubAdmins", "manageProducts"],
  ProductAdmin: ["manageProducts"], // Product Admins can only manage products
};

// Middleware to check if the user has the required role for an action
const checkRole = (action) => {
  return (req, res, next) => {
    const userRole = req.session.user?.role;
    if (userRole && rolePermissions[userRole] && rolePermissions[userRole].includes(action)) {
      next(); // User has permission
    } else {
      res.status(403).json({ message: "Access denied: Insufficient permissions" });
    }
  };
};

// Admin login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    let admin = await SubAdmin.findOne({ email });
    if (admin) {
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

      req.session.user = { id: admin._id, email: admin.email, role: admin.role };
      return res.json({ message: 'Admin logged in successfully', redirect: '/admin-dashboard' });
    }

    const user = await User.findOne({ email });
    if (user) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

      req.session.user = { id: user._id, email: user.email, role: 'User' };
      return res.json({ message: 'User logged in successfully', redirect: '/home' });
    }

    res.status(400).json({ message: 'User not found' });

  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ message: 'Error logging in' });
  }
});

// Product management routes (accessible by SuperAdmin and ProductAdmin)
router.get('/products', checkRole("manageProducts"), async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Error fetching products" });
  }
});

router.post('/products', checkRole("manageProducts"), async (req, res) => {
  const { name, price, description } = req.body;
  try {
    const newProduct = new Product({ name, price, description });
    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ message: "Error creating product" });
  }
});

router.put('/products/:id', checkRole("manageProducts"), async (req, res) => {
  const { id } = req.params;
  const { name, price, description } = req.body;

  try {
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (name) product.name = name;
    if (price) product.price = price;
    if (description) product.description = description;

    await product.save();
    res.status(200).json({ message: "Product updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error updating product" });
  }
});

router.delete('/products/:id', checkRole("manageProducts"), async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting product" });
  }
});

// User management routes (accessible only by SuperAdmin)
router.get('/users', checkRole("manageUsers"), async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users" });
  }
});

router.delete('/users/:id', checkRole("manageUsers"), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user" });
  }
});

// Sub-admin management routes (accessible only by SuperAdmin)
router.get('/subadmins', checkRole("manageSubAdmins"), async (req, res) => {
  try {
    const subAdmins = await SubAdmin.find({});
    res.status(200).json(subAdmins);
  } catch (error) {
    res.status(500).json({ message: "Error fetching sub-admins" });
  }
});

router.post('/subadmins', checkRole("manageSubAdmins"), async (req, res) => {
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

router.put('/subadmins/:id', checkRole("manageSubAdmins"), async (req, res) => {
  const { id } = req.params;
  const { email, role, password } = req.body;

  try {
    const adminToUpdate = await SubAdmin.findById(id);
    if (!adminToUpdate) return res.status(404).json({ message: "Sub-admin not found" });

    if (email) adminToUpdate.email = email;
    if (role) adminToUpdate.role = role;
    if (password) adminToUpdate.password = await bcrypt.hash(password, 10);

    await adminToUpdate.save();
    res.status(200).json({ message: "Sub-admin updated successfully" });
  } catch (error) {
    console.error("Error updating sub-admin:", error);
    res.status(500).json({ message: "Error updating sub-admin" });
  }
});

router.delete('/subadmins/:id', checkRole("manageSubAdmins"), async (req, res) => {
  try {
    await SubAdmin.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Sub-admin deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting sub-admin" });
  }
});

module.exports = router;
