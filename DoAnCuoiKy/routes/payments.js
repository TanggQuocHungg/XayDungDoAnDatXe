var express = require("express");
var router = express.Router();
let paymentController = require('../controllers/paymentController');
let validator = require('../utils/validator');
let authHandler = require('../utils/authHandler');
let responseHandler = require('../utils/responseHandler');

// GET tất cả payments (chỉ admin)
router.get("/", 
    authHandler.CheckLogin,
    authHandler.CheckRole('admin'),
    async function (req, res, next) {
        try {
            let result = await paymentController.GetAllPayments();
            responseHandler.success(res, 200, result, 'Lấy danh sách thanh toán thành công');
        } catch (err) {
            responseHandler.error(res, 400, err.message);
        }
    }
);

// GET payment theo id
router.get("/:id", 
    authHandler.CheckLogin,
    async function (req, res, next) {
        try {
            let result = await paymentController.GetAPaymentById(req.params.id);
            if (result) {
                // Kiểm tra quyền
                if (req.user.role.name !== 'admin' && result.ticket.user.toString() !== req.user._id.toString()) {
                    responseHandler.forbidden(res, 'Bạn không có quyền xem thanh toán này');
                    return;
                }
                responseHandler.success(res, 200, result, 'Lấy thông tin thanh toán thành công');
            } else {
                responseHandler.notFound(res, 'Thanh toán không tồn tại');
            }
        } catch (err) {
            responseHandler.error(res, 400, err.message);
        }
    }
);

// CREATE payment (tạo đơn thanh toán)
router.post("/", 
    authHandler.CheckLogin,
    validator.CreatePaymentValidator,
    validator.validatedResult,
    async function (req, res, next) {
        try {
            let newItem = await paymentController.CreateAPayment(
                req.body.ticket,
                req.body.amount,
                req.body.method
            );
            responseHandler.success(res, 201, newItem, 'Tạo đơn thanh toán thành công');
        } catch (err) {
            responseHandler.error(res, 400, err.message);
        }
    }
);

// UPDATE payment (cập nhật status - chỉ admin)
router.put("/:id", 
    authHandler.CheckLogin,
    authHandler.CheckRole('admin'),
    validator.UpdatePaymentValidator,
    validator.validatedResult,
    async function (req, res, next) {
        try {
            let updatedItem = await paymentController.UpdateAPayment(req.params.id, req.body);
            if (updatedItem) {
                responseHandler.success(res, 200, updatedItem, 'Cập nhật thanh toán thành công');
            } else {
                responseHandler.notFound(res, 'Thanh toán không tồn tại');
            }
        } catch (err) {
            responseHandler.error(res, 400, err.message);
        }
    }
);

// DELETE payment (chỉ admin)
router.delete("/:id", 
    authHandler.CheckLogin,
    authHandler.CheckRole('admin'),
    validator.DeletePaymentValidator,
    validator.validatedResult,
    async function (req, res, next) {
        try {
            let updatedItem = await paymentController.DeleteAPayment(req.params.id);
            if (updatedItem) {
                responseHandler.success(res, 200, updatedItem, 'Xóa thanh toán thành công');
            } else {
                responseHandler.notFound(res, 'Thanh toán không tồn tại');
            }
        } catch (err) {
            responseHandler.error(res, 400, err.message);
        }
    }
);

module.exports = router;