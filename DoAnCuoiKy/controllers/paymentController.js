let paymentModel = require('../schemas/payments')
let ticketModel = require('../schemas/tickets')
let mongoose = require('mongoose')

module.exports = {
    CreateAPayment: async function (ticket, amount, method) {
        try {
            // 1. VALIDATE: Kiểm tra ticket tồn tại
            let ticketData = await ticketModel.findOne({ 
                _id: ticket, 
                isDeleted: false 
            });
            if (!ticketData) {
                throw new Error("Vé không tồn tại");
            }

            // 2. VALIDATE: Kiểm tra ticket chưa thanh toán
            if (ticketData.status === 'CONFIRMED') {
                throw new Error("Vé này đã được thanh toán rồi");
            }

            // 3. VALIDATE: Kiểm tra amount đúng với totalAmount của ticket
            if (amount !== ticketData.totalAmount) {
                throw new Error("Số tiền không khớp với tổng tiền vé");
            }

            // 4. TẠO PAYMENT
            let newItem = new paymentModel({
                ticket: ticket,
                amount: amount,
                method: method,
                status: "PENDING"
            });
            await newItem.save();
            return newItem;
        } catch (error) {
            throw error;
        }
    },

    GetAllPayments: async function () {
        return await paymentModel.find({
            isDeleted: false
        }).populate('ticket')
    },

    GetAPaymentById: async function (id) {
        let result = await paymentModel.findOne({
            isDeleted: false,
            _id: id
        }).populate('ticket')
        if (result) {
            return result;
        }
        return false;
    },

    UpdateAPayment: async function (id, updateData) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            // VALIDATE: Chỉ cho update status
            let allowedFields = ['status'];
            let cleanData = {};
            
            for (let field of allowedFields) {
                if (updateData[field] !== undefined) {
                    cleanData[field] = updateData[field];
                }
            }

            let payment = await paymentModel.findOne({
                _id: id,
                isDeleted: false
            }).session(session);

            if (!payment) {
                await session.abortTransaction();
                session.endSession();
                return false;
            }

            // Nếu cập nhật status thành SUCCESS, thì cập nhật ticket status
            if (cleanData.status === 'SUCCESS' && payment.status !== 'SUCCESS') {
                await ticketModel.findByIdAndUpdate(
                    payment.ticket,
                    { status: 'CONFIRMED' },
                    { session }
                );
            }

            let updatedItem = await paymentModel.findByIdAndUpdate(
                id,
                cleanData,
                { new: true, session }
            ).populate('ticket');

            await session.commitTransaction();
            session.endSession();

            if (updatedItem) {
                return updatedItem;
            }
            return false;
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    },

    DeleteAPayment: async function (id) {
        let updatedItem = await paymentModel.findOneAndUpdate({
            isDeleted: false,
            _id: id
        }, {
            isDeleted: true
        }, { new: true })

        if (updatedItem) {
            return updatedItem;
        }
        return false;
    }
}