const Product = require("../../models/product.model");
const Account = require("../../models/account.model");
const ProductCategory = require("../../models/product-category.model");
const Coupon = require("../../models/coupon.model");
const filterStatusHelper = require("../../helpers/filterStatus.helper");
const searchHelper = require("../../helpers/search.helper");
const paginationHelper = require("../../helpers/pagination.helper");
const systemConfig = require("../../config/system");

module.exports.coupons = async (req, res) => {
    try {
        const coupons = await Coupon.find({
            deleted: false,
        });
        res.render("admin/pages/coupons/index", {
            title: "coupons",
            coupons: coupons,
        });
    } catch (error) {
        res.redirect(`${systemConfig.prefixAdmin}/dashboard`);
    }
};

module.exports.create = async (req, res) => {
    try {
        res.render("admin/pages/coupons/create", {
            title: "coupons",
        });
    } catch (error) {
        res.redirect(`${systemConfig.prefixAdmin}/dashboard`);
    }
};

module.exports.createPost = async (req, res) => {
    try {
        req.body.discountValue = parseInt(req.body.discountValue);
        req.body.minOrderValue = parseInt(req.body.minOrderValue);
        req.body.usageLimit = parseInt(req.body.usageLimit);
        const exsits = await Coupon.findOne({
            deleted: false,
            status: "active",
            codeCoupon: req.body.codeCoupon,
        });
        if (!exsits) {
            const coupon = new Coupon(req.body);
            coupon.save();
            req.flash("success", "Tạo mã giảm giá thành công!");
        } else {
            req.flash("error", "Mã giảm giá đã tồn tại! Vui lòng tạo mã mới!");
        }
        res.redirect("back");
    } catch (error) {
        res.redirect(`${systemConfig.prefixAdmin}/dashboard`);
    }
};

module.exports.edit = async (req, res) => {
    try {
        const id = req.params.id;
        const coupon = await Coupon.findOne({
            _id: id,
        });
        res.render("admin/pages/coupons/edit", {
            title: "coupons",
            coupon: coupon,
        });
    } catch (error) {
        res.redirect(`${systemConfig.prefixAdmin}/dashboard`);
    }
};

module.exports.editPatch = async (req, res) => {
    try {
        req.body.discountValue = parseInt(req.body.discountValue);
        req.body.minOrderValue = parseInt(req.body.minOrderValue);
        req.body.usageLimit = parseInt(req.body.usageLimit);
        const exsits = await Coupon.findOne({
            deleted: false,
            status: "active",
            codeCoupon: req.body.codeCoupon,
        });
        if (!exsits || exsits.id == req.params.id) {
            const dateNow = new Date();
            if (dateNow.toISOString().split("T")[0] < req.body.expirationDate) {
                req.body.status = "active";
            }
            await Coupon.updateOne(
                {
                    _id: req.params.id,
                },
                req.body
            );
            req.flash("success", "Cập nhật thành công!");
        } else {
            req.flash("error", "Mã giảm giá đã tồn tại! Vui lòng tạo mã mới!");
        }
        res.redirect("back");
    } catch (error) {
        res.redirect(`${systemConfig.prefixAdmin}/dashboard`);
    }
};

module.exports.delete = async (req, res) => {
    try {
        const id = req.params.id;
        await Coupon.updateOne(
            {
                _id: id,
            },
            {
                deleted: true,
                status: "expired",
            }
        );
        req.flash("success", "Xóa thành công!");
        res.redirect("back");
    } catch (error) {
        res.redirect(`${systemConfig.prefixAdmin}/dashboard`);
    }
};