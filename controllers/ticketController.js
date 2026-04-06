let ticketModel = require('../schemas/tickets')
let seatModel = require('../schemas/seats')
let tripModel = require('../schemas/trips')
let userModel = require('../schemas/users')
let mongoose = require('mongoose')

module.exports = {
    BookTicket: async function (user, trip, seats, totalAmount) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            // 1. VALIDATE: Kiểm tra user tồn tại
            let userData = await userModel.findOne({ 
                _id: user, 
                isDeleted: false 
            }).session(session);
            if (!userData) {
                throw new Error("Người dùng không tồn tại");
            }

            // 2. VALIDATE: Kiểm tra trip tồn tại
            let tripData = await tripModel.findOne({ 
                _id: trip, 
                isDeleted: false 
            }).session(session);
            if (!tripData) {
                throw new Error("Chuyến xe không tồn tại");
            }

            // 3. VALIDATE: Kiểm tra trip status (không được book chuyến đã completed)
            if (tripData.status === 'COMPLETED') {
                throw new Error("Chuyến xe này đã kết thúc, không thể đặt vé");
            }

            if (tripData.status === 'CANCELLED') {
                throw new Error("Chuyến xe này đã bị hủy");
            }

            // 4. Tìm tất cả các ghế dựa vào mảng ID truyền lên
            let seatList = await seatModel.find({ 
                _id: { $in: seats }, 
                trip: trip 
            }).session(session);

            // 5. VALIDATE: Kiểm tra số lượng ghế
            if (seatList.length !== seats.length) {
                throw new Error("Thông tin ghế không hợp lệ hoặc không thuộc chuyến xe này");
            }

            // 6. VALIDATE: Kiểm tra tất cả ghế đã được book hay khỏa
            for (let i = 0; i < seatList.length; i++) {
                if (seatList[i].status !== 'AVAILABLE') {
                    throw new Error("Ghế " + seatList[i].seatNumber + " đã có người đặt");
                }
            }

            // 7. KHÓA GHẾ: Cập nhật trạng thái ghế
            for (let i = 0; i < seatList.length; i++) {
                seatList[i].status = 'BOOKED';
                await seatList[i].save({ session });
            }

            // 8. TẠO HÓA ĐƠN VÉ
            let newItem = new ticketModel({
                user: user,
                trip: trip,
                seats: seats,
                totalAmount: totalAmount,
                status: "PENDING"
            });
            
            await newItem.save({ session });
            
            await session.commitTransaction();
            session.endSession();

            return newItem;

        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    },

    GetAllTickets: async function (userId) {
        let condition = { isDeleted: false };
        if (userId) {
            // VALIDATE: Người dùng chỉ có thể xem vé của mình (riêng admin dùng parameter này để check)
            condition.user = userId;
        }
        return await ticketModel.find(condition).populate('user').populate('trip').populate('seats')
    },

    GetATicketById: async function (id) {
        let result = await ticketModel.findOne({
            isDeleted: false,
            _id: id
        }).populate('user').populate('trip').populate('seats')
        
        if (result) {
            return result;
        }
        return false;
    },

    UpdateATicket: async function (id, updateData) {
        // VALIDATE: Chỉ cho update status
        let allowedFields = ['status'];
        let cleanData = {};
        
        for (let field of allowedFields) {
            if (updateData[field] !== undefined) {
                cleanData[field] = updateData[field];
            }
        }

        let updatedItem = await ticketModel.findOneAndUpdate({
            isDeleted: false,
            _id: id
        }, cleanData, { new: true }).populate('user').populate('trip').populate('seats')

        if (updatedItem) {
            return updatedItem;
        }
        return false;
    },

    // CancelTicket: Hủy vé và trả ghế
    CancelTicket: async function (id) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            // 1. Tìm vé
            let ticket = await ticketModel.findOne({
                _id: id,
                isDeleted: false,
                status: { $ne: 'CANCELLED' }
            }).session(session);

            if (!ticket) {
                throw new Error("Vé không tồn tại hoặc đã được hủy");
            }

            // 2. Trả ghế về trạng thái AVAILABLE
            await seatModel.updateMany(
                { _id: { $in: ticket.seats } },
                { status: 'AVAILABLE' }
            ).session(session);

            // 3. Cập nhật status vé
            ticket.status = 'CANCELLED';
            await ticket.save({ session });

            await session.commitTransaction();
            session.endSession();

            return ticket;
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    },

    DeleteATicket: async function (id) {
        let updatedItem = await ticketModel.findOneAndUpdate({
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