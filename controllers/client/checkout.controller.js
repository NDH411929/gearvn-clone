const Cart = require("../../models/cart.model");
const Order = require("../../models/order.model");
const User = require("../../models/user.model");
const Coupon = require("../../models/coupon.model");
const Product = require("../../models/product.model");

module.exports.checkout = async (req, res) => {
    try {
        const cartDetail = res.locals.miniCart;
        cartDetail.totalPrice = 0;

        for (const item of cartDetail.products) {
            const infoProduct = await Product.findOne({
                _id: item.product_id,
            });
            infoProduct.priceNew = (
                (infoProduct.price * (100 - infoProduct.discountPercentage)) /
                100
            ).toFixed(2);
            infoProduct.totalPrice = (
                infoProduct.priceNew * item.quantity
            ).toFixed(2);
            item.infoProduct = infoProduct;
            cartDetail.totalPrice += parseFloat(infoProduct.totalPrice);
        }

        cartDetail.totalPrice = cartDetail.totalPrice.toFixed(2);
        if (cartDetail.coupon_id) {
            const coupon = await Coupon.findOne({
                _id: cartDetail.coupon_id,
                deleted: false,
                status: "active",
            });
            if (coupon) {
                const findCoupon = res.locals.infoUser.couponsId.find(
                    (item) => item.couponId == coupon.id
                );
                if (findCoupon.couponStatus == "active") {
                    if (coupon.discountType == "percent") {
                        cartDetail.totalPriceCoupon = (
                            cartDetail.totalPrice *
                            (1 - coupon.discountValue / 100)
                        ).toFixed(2);
                    } else {
                        cartDetail.totalPriceCoupon = (
                            cartDetail.totalPrice - coupon.discountValue
                        ).toFixed(2);
                    }
                    cartDetail.saleCoupon = (
                        cartDetail.totalPrice - cartDetail.totalPriceCoupon
                    ).toFixed(2);
                    cartDetail.totalPrice = cartDetail.totalPriceCoupon;
                }
            }
        }

        cartDetail.totalPrice =
            cartDetail.totalPrice < 0 ? 0 : cartDetail.totalPrice;

        res.render("client/pages/checkout/index", {
            title: "Checkout",
            cartDetail: cartDetail,
        });
    } catch (error) {
        res.redirect("/");
    }
};

module.exports.orderPost = async (req, res) => {
    try {
        // const cartId = req.cookies.cartId;
        const cartId = res.locals.miniCart.id;
        let couponId = "";
        const userInfo = {
            fullName: req.body.fullName,
            phoneNumber: req.body.phoneNumber,
            address: req.body.address,
            email: req.body.email,
        };

        const addressDelivery = {
            cityAddress: req.body.cityAddress,
            districAddress: req.body.districAddress,
            homeNumber: req.body.homeNumber,
        };

        const userNote = req.body.userNote;

        const cart = await Cart.findOne({
            _id: cartId,
        });

        const products = [];

        for (const item of cart.products) {
            const product = await Product.findOne({
                _id: item.product_id,
            });
            const stock = product.stock - item.quantity;
            if (stock < 0) {
                req.flash("error", "Sản phẩm đã hết hàng!");
            } else {
                await Product.updateOne(
                    { _id: item.product_id },
                    {
                        stock: stock,
                    }
                );
            }
            const objectProduct = {
                product_id: product.id,
                price: product.price,
                color: item.color,
                discountPercentage: product.discountPercentage,
                quantity: item.quantity,
            };
            products.push(objectProduct);
        }
        if (cart.coupon_id) {
            const coupon = await Coupon.findOne({
                _id: cart.coupon_id,
                deleted: false,
                status: "active",
            });
            const findCoupon = res.locals.infoUser.couponsId.find(
                (item) => item.couponId == coupon.id
            );
            if (coupon && findCoupon.couponStatus == "active") {
                couponId = coupon.id;
            }
        }
        let objectOrder = {
            cart_id: cartId,
            userInfo: userInfo,
            addressDelivery: addressDelivery,
            products: products,
            userNote: userNote,
            coupon: couponId,
            createdAt: new Date(),
        };
        const order = new Order(objectOrder);
        await order.save();

        await User.updateOne(
            {
                _id: res.locals.infoUser.id,
                "couponsId.couponId": cart.coupon_id,
            },
            {
                $set: { "couponsId.$.couponStatus": "used" },
            }
        );
        await Cart.updateOne(
            {
                _id: order.cart_id,
            },
            {
                products: [],
                $unset: { coupon_id: cart.coupon_id },
            }
        );
        res.cookie("orderId", order.id);
        req.flash("success", "Đặt hàng thành công!");
        res.redirect(`/checkout/success`);
    } catch (error) {
        res.redirect("/");
    }
};

module.exports.checkoutSuccess = async (req, res) => {
    res.render("client/pages/checkout/success", {
        title: "Đặt hàng",
    });
};

module.exports.orderReview = async (req, res) => {
    try {
        const cartId = res.locals.miniCart.id;
        // const cart = await Cart.findOne({
        //     _id: cartId,
        // });
        const orders = await Order.find({
            cart_id: cartId,
        }).sort({ createdAt: "desc" });

        for (const order of orders) {
            order.totalPrice = 0;
            order.discount = 0;
            for (const item of order.products) {
                const infoProduct = await Product.findOne({
                    _id: item.product_id,
                });
                item.priceNew = (
                    (item.price * (100 - item.discountPercentage)) /
                    100
                ).toFixed(2);
                item.totalPrice = (item.priceNew * item.quantity).toFixed(2);
                item.title = infoProduct.title;
                item.thumbnail = infoProduct.thumbnail;
                order.totalPrice += parseFloat(item.totalPrice);
            }
            if (order.coupon != "") {
                const coupon = await Coupon.findOne({
                    _id: order.coupon,
                }).select("discountType discountValue");
                if (coupon) {
                    if (coupon.discountType == "fixed") {
                        order.totalPrice =
                            order.totalPrice - coupon.discountValue;
                        order.discount = coupon.discountValue;
                    } else {
                        order.discount =
                            order.totalPrice -
                            order.totalPrice * (1 - coupon.discountValue / 100);
                        order.totalPrice =
                            order.totalPrice * (1 - coupon.discountValue / 100);
                    }
                }
            }
            order.discount = order.discount.toFixed(0);
            order.totalPrice = order.totalPrice.toFixed(2);
        }

        res.render("client/pages/checkout/order-review", {
            title: "Xem lại đơn hàng",
            orders: orders,
        });
    } catch (error) {
        res.redirect("/");
    }
};
