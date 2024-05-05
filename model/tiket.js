const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const ticketSchema = new mongoose.Schema({
    user: {
        type: ObjectId,
        ref: 'user',
        required: true
    },
    ticketType: {
        type: String,
        required: true
    },
    visitDate: {
        type: Date,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    totalPrice: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        required: true,
        default: 'In Progress'
    }
}, { timestamps: true });

const Ticket = mongoose.model('ticket', ticketSchema);

module.exports = Ticket;
