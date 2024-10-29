const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  discountPercentage: { type: Number, required: true },
  expiryDate: { type: Date, required: true },
  usageLimit: { type: Number, required: true },
  usageCount: { type: Number, default: 0 }, // Add this line
});

const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon;
