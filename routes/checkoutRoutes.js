const express = require('express');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const stripe = require('stripe')('sk_test_51Q8JuzAepkvGYigUsKmHJpB31IpydHYuRCWx9F1MaaD5hIbZhzWUvQPtarlTwIrrYDv3C1szAl5JSn59N9gtVQeS00Uov1zkTg');


// Order Schema (If not already in a separate model file, include it here)
const OrderSchema = new mongoose.Schema({
    orderId: { type: String, default: uuidv4, required: true, unique: true },
    userEmail: { type: String, required: true },
    totalAmount: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
    status: { type: String, default: 'Pending' },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
        imageUrl: { type: String, required: true },
    }]
});

const Order = mongoose.model('Order', OrderSchema);

// API endpoint to create a new order and Stripe session
router.post('/create-checkout-session', async (req, res) => {
    const { cartItems, userEmail } = req.body;

    if (!cartItems || cartItems.length === 0) {
        return res.status(400).json({ error: 'No items in the cart' });
    }

    try {
        // Prepare line items for Stripe
        const lineItems = cartItems.map(item => ({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.name,
                },
                unit_amount: item.price * 100, // Amount in cents
            },
            quantity: item.quantity,
        }));

        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: lineItems,
            success_url: 'http://localhost:5173/OrderHistory',
            cancel_url: 'http://localhost:5173/',
        });

        // Calculate total amount
        const totalAmount = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

        // Create order items
        const orderItems = cartItems.map(item => ({
            productId: item._id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            imageUrl: item.imageUrl,
        }));

        // Create new order
        const newOrder = new Order({
            userEmail,
            totalAmount,
            status: 'Pending',
            items: orderItems
        });

        await newOrder.save();
        console.log('New order saved:', newOrder);

        // Respond with the Stripe session ID
        res.json({ id: session.id });
    } catch (error) {
        console.error('Failed to create Stripe session:', error.message);
        res.status(500).json({ error: 'Failed to create Stripe session' });
    }
});

// Get order by ID
router.get('/orders/:orderId', async (req, res) => {
    try {
        const order = await Order.findOne({ orderId: req.params.orderId });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        console.error('Error fetching order:', error.message);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

// Get all orders
router.get('/orders', async (req, res) => {
    try {
        const orders = await Order.find(); // Fetch all orders
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error.message);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

module.exports = router;
