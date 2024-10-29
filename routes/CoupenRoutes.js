const express = require("express");
const Coupon = require("../models/Coupon");

const router = express.Router();

// Validate the coupon code without increasing the usage count
router.post("/validate", async (req, res) => {
  const { code } = req.body;
  console.log("Validating coupon code:", code);

  try {
    const coupon = await Coupon.findOne({ code });
    if (!coupon) {
      return res.json({ isValid: false, discountPercentage: 0, reason: "Coupon does not exist." });
    }

    const isExpired = coupon.expiryDate < new Date();
    const isUsageExceeded = coupon.usageLimit <= coupon.usageCount;

    if (isExpired) {
      return res.json({ isValid: false, discountPercentage: 0, reason: "Coupon has expired." });
    }

    if (isUsageExceeded) {
      return res.json({ isValid: false, discountPercentage: 0, reason: "Usage limit exceeded." });
    }

    // Return discount percentage without incrementing the usage count
    res.json({
      isValid: true,
      discountPercentage: coupon.discountPercentage
    });
  } catch (error) {
    console.error("Error validating coupon:", error);
    res.status(500).json({ error: "Failed to validate coupon" });
  }
});

// Update coupon usage count after payment is confirmed
router.post("/use-coupon", async (req, res) => {
  const { code } = req.body;

  try {
    const coupon = await Coupon.findOne({ code });
    if (!coupon) {
      return res.json({ success: false, message: "Coupon does not exist." });
    }

    const isExpired = coupon.expiryDate < new Date();
    const isUsageExceeded = coupon.usageLimit <= coupon.usageCount;

    if (isExpired || isUsageExceeded) {
      return res.json({ success: false, message: "Cannot use coupon. Either expired or usage limit exceeded." });
    }

    // Increment usage count and save
    coupon.usageCount += 1;
    await coupon.save();

    res.json({ success: true, message: "Coupon applied successfully", usageCount: coupon.usageCount });
  } catch (error) {
    console.error("Error applying coupon:", error);
    res.status(500).json({ error: "Failed to apply coupon" });
  }
});


// Fetch all coupons
router.get('/', async (req, res) => {
  try {
    const coupons = await Coupon.find();
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

// Create a new coupon
router.post('/', async (req, res) => {
  const { code, discountPercentage, expiryDate, usageLimit } = req.body;

  try {
    const newCoupon = new Coupon({ code, discountPercentage, expiryDate, usageLimit });
    await newCoupon.save();
    res.status(201).json({ message: 'Coupon created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});
// Increment coupon usage count on payment
router.post("/increment-usage", async (req, res) => {
  const { code } = req.body;

  try {
    const coupon = await Coupon.findOne({ code });
    if (!coupon) {
      return res.status(400).json({ error: "Coupon not found" });
    }

    // Check if coupon usage is within the limit
    if (coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({ error: "Coupon usage limit exceeded" });
    }

    // Increment usage count
    coupon.usageCount += 1;
    await coupon.save();

    res.json({ success: true, usageCount: coupon.usageCount });
  } catch (error) {
    res.status(500).json({ error: "Failed to increment coupon usage" });
  }
});

module.exports = router;
