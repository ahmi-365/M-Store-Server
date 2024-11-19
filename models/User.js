const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String }, // Not required for Facebook users
  name: { type: String },
  facebookId: { type: String, unique: true }, // To store Facebook ID
  isAdmin: { type: Boolean, default: false },
});

module.exports = mongoose.model('User', userSchema);
