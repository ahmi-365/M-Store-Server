// routes/orderRoutes.js

const express = require("express");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const stripe = require("stripe")("sk_test_51Q8JuzAepkvGYigUsKmHJpB31IpydHYuRCWx9F1MaaD5hIbZhzWUvQPtarlTwIrrYDv3C1szAl5JSn59N9gtVQeS00Uov1zkTg");

const router = express.Router();

// Order Schema (without creating a separate model)
const OrderSchema = new mongoose.Schema({
  orderId: { type: String, default: uuidv4, required: true, unique: true },
  userEmail: { type: String, required: true },
  totalProductPrice: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  shippingCost: { type: Number, default: 0 },
  discountPercentage: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, default: "Pending" },
  couponCode: { type: String, default: "" },
});

const OrderItemSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  imageUrl: { type: String, required: true },
  description: String,
  brand: String,
  category: String,
  sku: String,
  selectedSize: String,
  selectedColor: String,
});

// Create the models
const Order = mongoose.model("Order", OrderSchema);
const OrderItem = mongoose.model("OrderItem", OrderItemSchema);

// API endpoint for creating checkout session
router.post("/create-checkout-session", async (req, res) => {
  const {
    cartItems,
    userEmail,
    shippingCost = 0,
    discountPercentage = 0,
  } = req.body;

  if (!cartItems || cartItems.length === 0) {
    return res.status(400).json({ error: "No items in the cart" });
  }

  try {
    const totalProductPrice = cartItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );

    let totalAmount = totalProductPrice + parseFloat(shippingCost);

    if (discountPercentage > 0) {
      const discountAmount = (totalAmount * discountPercentage) / 100;
      totalAmount -= discountAmount;
    }

    const totalAmountInCents = Math.round(totalAmount * 100);

    const lineItems = [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Total Cart Amount",
          },
          unit_amount: totalAmountInCents,
        },
        quantity: 1,
      },
    ];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      success_url: "http://localhost:5173/OrderHistory",
      cancel_url: "http://localhost:5173/",
    });

    const newOrder = new Order({
      userEmail,
      totalProductPrice,
      totalAmount,
      shippingCost,
      discountPercentage,
      status: "Pending",
    });

    await newOrder.save();

    const orderItems = cartItems.map((item) => ({
      orderId: newOrder._id,
      productId: item._id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      imageUrl: item.imageUrl,
      description: item.description,
      brand: item.brand,
      category: item.category,
      sku: item.sku,
      selectedSize: item.selectedSize,
      selectedColor: item.selectedColor,
    }));

    await OrderItem.insertMany(orderItems);

    res.json({ id: session.id });
  } catch (error) {
    console.error("Failed to create Stripe session or save order:", error.message);
    res.status(500).json({ error: "Failed to create Stripe session or save order" });
  }
});

// Get order by ID
router.get("/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("orderItems");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get all orders
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error.message);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Delete an order by ID
router.delete("/:id", async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.status(200).json({ message: "Order removed successfully" });
  } catch (error) {
    console.error("Error removing order:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
