const express = require('express');
const multer = require('multer');
const path = require('path');
const Product = require('../models/Product');
const { check, validationResult } = require('express-validator');

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

// File filter for validating image types
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'), false);
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

// Get all products with pagination and filtering
router.get('/', async (req, res) => {
    const page = parseInt(req.query.page) || 1;          // Current page, default to 1
    const pageSize = parseInt(req.query.pageSize) || 6; // Items per page, default to 6

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
        query.price = { $gte: parseFloat(minPrice) }; // Greater than or equal to minPrice
    }
    if (maxPrice) {
        query.price = { $lte: parseFloat(maxPrice) }; // Less than or equal to maxPrice
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
router.post(
    '/',
    upload.single('image'),
    [
        check('name').notEmpty().withMessage('Name is required'),
        check('price').isFloat({ gt: 0 }).withMessage('Price must be greater than 0'),
        check('description').notEmpty().withMessage('Description is required'),
        check('sku').notEmpty().withMessage('SKU is required'),
        check('brand').notEmpty().withMessage('Brand is required'),
        check('category').notEmpty().withMessage('Category is required'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

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
    }
);

// Update product by ID
router.put(
    '/:id',
    upload.single('image'),
    [
        check('name').optional().notEmpty().withMessage('Name cannot be empty'),
        check('price').optional().isFloat({ gt: 0 }).withMessage('Price must be greater than 0'),
        check('description').optional().notEmpty().withMessage('Description cannot be empty'),
        check('sku').optional().notEmpty().withMessage('SKU cannot be empty'),
        check('brand').optional().notEmpty().withMessage('Brand cannot be empty'),
        check('category').optional().notEmpty().withMessage('Category cannot be empty'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, price, description, sku, brand, category } = req.body;
        const imageUrl = req.file ? req.file.path.replace(/\\/g, '/') : undefined;

        try {
            const updatedProduct = await Product.findByIdAndUpdate(
                req.params.id,
                { name, price, description, sku, brand, category, imageUrl },
                { new: true, runValidators: true }
            );
            if (!updatedProduct) {
                return res.status(404).json({ error: 'Product not found' });
            }
            res.json(updatedProduct);
        } catch (error) {
            res.status(400).json({ error: 'Bad Request' });
        }
    }
);

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
