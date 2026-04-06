let mongoose = require('mongoose');

let paymentSchema = mongoose.Schema({
    ticket: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ticket',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    method: {
        type: String,
        required: true // Vi du: VNPAY, MOMO, CASH
    },
    status: {
        type: String,
        default: "PENDING" // PENDING, SUCCESS, FAILED
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
})

module.exports = mongoose.model('payment', paymentSchema);