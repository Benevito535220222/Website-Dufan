const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    subject: {
        type: String,
        required: true
    },
    body: {
        type: String,
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    recipients: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    }],
    readBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Message = mongoose.model('message', messageSchema);

module.exports = Message;
