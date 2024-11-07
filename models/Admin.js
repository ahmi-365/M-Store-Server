const mongoose = require('mongoose');

const subAdminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  role: { type: String, required: true },
  password: { type: String, required: true },
});

const SubAdmin = mongoose.model('SubAdmin', subAdminSchema);

module.exports = SubAdmin;
