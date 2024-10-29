const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true,index: true },
    price: { type: Number, required: true,index: true },
    description: { type: String, required: true },
    sku: { type: String, required: true },
    brand: { type: String, required: true,index: true },
    category: { type: String, required: true,index: true },
    imageUrl: { type: String, required: true }
}, { timestamps: true });

const Product = mongoose.model('Product', ProductSchema);
module.exports = Product;
