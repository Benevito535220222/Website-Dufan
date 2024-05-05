const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    isAdmin: {
        type: Boolean,
        default: false 
    },
    nomor: {
        type: String,
        default: '+62123456789' 
    },
    foto: {
        type: String,
        default: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQRNVA9INRUBnqPAHYXY18JZ_kpeN3O_BLY0QUqSx1Tkw&s' 
    },
    cart: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product'
    }]
}, { timestamps: true }); 

const User = mongoose.model('user', userSchema);

module.exports = User;
