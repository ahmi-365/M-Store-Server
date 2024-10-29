const express = require('express');
const multer = require('multer');
const path = require('path');
const Product = require('../models/Product');

const router = express.Router();

// Multer setup for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });
// Get all products with pagination and filtering
router.get('/', async (req, res) => {
    const page = parseInt(req.query.page) || 1;          // Current page, default to 1
    const pageSize = parseInt(req.query.pageSize) || 6; // Items per page, default to 10

    // Extract filter parameters
    const { category, name, minPrice, maxPrice, brand } = req.query;

    // Build a query object
    const query = {};
    if (category) {
        query.category = { $regex: category, $options: 'i' }; // Case-insensitive matching
    }
    if (name) {
        query.name = { $regex: name, $options: 'i' }; // Case-insensitive matching
    }
    if (minPrice) {
        query.price = { ...query.price, $gte: parseFloat(minPrice) }; // Greater than or equal to minPrice
    }
    if (maxPrice) {
        query.price = { ...query.price, $lte: parseFloat(maxPrice) }; // Less than or equal to maxPrice
    }
    if (brand) {
        query.brand = { $regex: brand, $options: 'i' }; // Case-insensitive matching
    }

    try {
        const totalProducts = await Product.countDocuments(query); // Count filtered products
        const skip = (page - 1) * pageSize;
        const products = await Product.find(query).skip(skip).limit(pageSize); // Apply query
        const totalPages = Math.ceil(totalProducts / pageSize);
        
        res.json({
            products,
            page,
            pageSize,
            totalPages,
            totalProducts
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Get product by ID
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Create new product with image upload
router.post('/', upload.single('image'), async (req, res) => {
    const { name, price, description, sku, brand, category } = req.body;
    const imageUrl = req.file ? req.file.path.replace(/\\/g, '/') : '';

    if (!imageUrl) {
        return res.status(400).json({ error: 'Image upload required' });
    }

    try {
        const newProduct = new Product({ name, price, description, sku, brand, category, imageUrl });
        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(400).json({ error: 'Bad Request' });
    }
});

// Delete product by ID
router.delete('/:id', async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        if (!deletedProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
