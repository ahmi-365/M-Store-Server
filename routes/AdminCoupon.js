const express = require("express");
const Coupon = require("../models/Coupen");

const router = express.Router();

// Create a new coupon
router.post("/create", async (req, res) => {
  const { code, discountPercentage, expiryDate, usageLimit } = req.body;

  try {
    const newCoupon = new Coupon({
      code,
      discountPercentage,
      expiryDate: new Date(expiryDate),
      usageLimit,
    });

    await newCoupon.save();

    res.json({ success: true, coupon: newCoupon });
  } catch (error) {
    console.error("Error creating coupon:", error);
    res.status(500).json({ error: "Failed to create coupon" });
  }
});

// Get all coupons
router.get("/", async (req, res) => {
  try {
    const coupons = await Coupon.find();
    res.json(coupons);
  } catch (error) {
    console.error("Error fetching coupons:", error);
    res.status(500).json({ error: "Failed to fetch coupons" });
  }
});

module.exports = router;
