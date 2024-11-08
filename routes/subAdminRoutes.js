// routes/productRoutes.js
const express = require('express');
const authorizeRole = require('../middleware/authorizeRole');
const router = express.Router();
const Product = require('../models/Product'); // Assuming Product is a Mongoose model

// Middleware to check if user is a "Products Admin"
const productsAdminOnly = authorizeRole('Products Admin');

// Route: Fetch all products (GET /api/products)
router.get('/', productsAdminOnly, async (req, res) => {
    try {
        const products = await Product.find(); // Fetch all products from the database
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch products', error });
    }
});

// Route: Create a new product (POST /api/products)
router.post('/', productsAdminOnly, async (req, res) => {
    const { name, description, price, stock, category } = req.body;

    try {
        const newProduct = new Product({
            name,
            description,
            price,
            stock,
            category
        });

        const savedProduct = await newProduct.save(); // Save the new product to the database
        res.status(201).json({ message: 'Product created successfully', product: savedProduct });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create product', error });
    }
});

// Route: Update a product (PUT /api/products/:id)
router.put('/:id', productsAdminOnly, async (req, res) => {
    const { id } = req.params;
    const { name, description, price, stock, category } = req.body;

    try {
        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            { name, description, price, stock, category },
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.status(200).json({ message: 'Product updated successfully', product: updatedProduct });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update product', error });
    }
});

// Route: Delete a product (DELETE /api/products/:id)
router.delete('/:id', productsAdminOnly, async (req, res) => {
    const { id } = req.params;

    try {
        const deletedProduct = await Product.findByIdAndDelete(id);

        if (!deletedProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete product', error });
    }
});

// Route: Get a single product by ID (GET /api/products/:id)
router.get('/:id', productsAdminOnly, async (req, res) => {
    const { id } = req.params;

    try {
        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.status(200).json(product);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch product', error });
    }
});

module.exports = router;
