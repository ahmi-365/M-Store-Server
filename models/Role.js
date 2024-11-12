// models/Role.js
const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true, // Role names should be unique
  },
  description: {
    type: String,
    required: false,
  },
  permissions: {
    type: [String], 
    default: [],
  },
});

module.exports = mongoose.model('Role', roleSchema);
