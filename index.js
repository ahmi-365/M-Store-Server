require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const multer = require('multer');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.ENDPOINT_SECRET;

// Express app setup
const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = [
  "http://localhost:5173", // For local development
  "https://e-commerace-store.onrender.com" // For your deployed frontend
];
// Set storage engine
const storage = multer.diskStorage({
  destination: './uploads', // Directory to store the uploaded images
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Append timestamp to the filename
  },
});
// Initialize upload variable
const upload = multer({
  storage: storage,
  limits: { fileSize: 1000000 }, // Limit file size to 1MB
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/; // Allowed file types
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Error: Images only!');
    }
  },
});

// Stripe webhook endpoint
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log('Webhook verified successfully:', event.id);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    try {
      const order = await Order.findOne({ eventId: session.id });
      if (!order) {
        console.error("Order not found for session ID:", session.id);
        return res.status(404).send("Order not found");
      }

      const fullSession = await stripe.checkout.sessions.retrieve(session.id);
      console.log("Full session data:", fullSession);

      const payment = new Payment({
        paymentId: fullSession.id,
        orderId: order._id,
        amount: fullSession.amount_total / 100,
        currency: fullSession.currency,
        paymentStatus: 'Completed',
        paymentMethod: fullSession.payment_method_types[0],
        receiptUrl: fullSession.receipt_url,
      });

      await payment.save();
      console.log("Payment saved successfully:", payment);

      order.status = 'Completed';
      await order.save();
      console.log("Order status updated successfully:", order);

    } catch (error) {
      console.error("Error saving payment or updating order:", error.message);
      return res.status(500).send("Error processing webhook");
    }
  }

  res.status(200).send('Webhook received');
});

// Middleware setup
app.use(cors({
  origin: allowedOrigins,
  credentials: true // Include credentials (cookies, authorization headers, etc.)
}));app.use(express.json());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Database connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  tls: true,
  tlsAllowInvalidCertificates: true,
})
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Session configuration for production use
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: { secure: false }, // Set to true if using HTTPS
  }));

// Models setup
const Order = mongoose.model('Order', new mongoose.Schema({
  orderId: { type: String, default: uuidv4, required: true, unique: true },
  userEmail: { type: String, required: true },
  totalProductPrice: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  shippingCost: { type: Number, required: true, default: 0 },
  couponCode: { type: String, default: null },
  discountPercentage: { type: Number, required: true, default: 0 },
  createdAt: { type: Date, default: Date.now },
  eventId: { type: String, default: null },
  originDate: { type: Date, default: null },
  status: { type: String, default: 'Pending' },
}));
const OrderItem = mongoose.model('OrderItem', new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
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
}));
const Payment = mongoose.model('Payment', new mongoose.Schema({
  paymentId: { type: String, required: true, unique: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  paymentStatus: { type: String, required: true },
  paymentMethod: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  receiptUrl: { type: String },
}));


// Route to create Stripe checkout session
app.post("/api/create-checkout-session", async (req, res) => {
  const { cartItems, userEmail, shippingCost = 0, discountPercentage = 0, couponCode } = req.body;

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
    const lineItems = [{
      price_data: {
        currency: "usd",
        product_data: { name: "Total Cart Amount" },
        unit_amount: totalAmountInCents,
      },
      quantity: 1,
    }];

    const newOrder = new Order({
      userEmail,
      totalProductPrice,
      totalAmount,
      shippingCost,
      couponCode: couponCode || null,
      discountPercentage,
      status: "Pending",
    });

    await newOrder.save();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      metadata: {
        user_email: userEmail,
        order_id: newOrder._id.toString(),
      },
      success_url: `https://e-commerace-store.onrender.com/OrderHistory?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://e-commerace-store.onrender.com/`,
    });

    newOrder.eventId = session.id;
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

// Order management routes
app.get("/api/orders/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    const orderItems = await OrderItem.find({ orderId: order._id });
    res.json({ order, items: orderItems });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.delete("/api/orders/:id", async (req, res) => {
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
// app.get('*', (req, res) => {
//   res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
// });

// Import and use route modules
const userRoutes = require('./routes/userRoutes');
const couponRoutes = require("./routes/CoupenRoutes");
const productRoutes = require('./routes/productRoutes');

app.use("/api/coupons", couponRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
