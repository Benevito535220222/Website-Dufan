
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: String,
    price: String,
    image: String,
    stripeId: String
});

const Product = mongoose.model('product', productSchema);

module.exports = Product;