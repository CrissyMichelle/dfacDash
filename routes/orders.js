const express = require("express");
const router = express.Router();
const Order = require("../models/order");

/** POST /orders
 * 
 * Creates a new order.
 * 
 * Authorization required: none
 * 
 * Accepts { customerID, dfacID, mealID, comments, toGo, quantity, specialInstructions }
 * 
 * Returns { mealOrdered: { meal: {
 *                                  mealID, dfacID, mealName, description, type, price, imgPic, likes,
                                    },
                            order: {orderID, customerID, dfacID, comments, toGo, orderTimestamp, readyForPickup, pickedUp, canceled, favorite 
                                    },
                            orderMealJoin: {
                                orderMealID, orderID, mealID, quantity, specialInstructions
                                     }
            }
 */
router.post("/", async (req, res, next) => {
    try {
        const { customerID, dfacID, mealID, comments, toGo, quantity, specialInstructions } = req.body;

        const order = await Order.createOrder(customerID, dfacID, mealID, comments, toGo, quantity, specialInstructions);
        return res.status(201).json({ order });
    } catch (err) {
        return next(err);
    }
});

/** GET /orders
 * 
 * Returns list of all orders.
 * 
 * Authorization required: none
 * 
 * Returns { orders: [ { id, customerID, dfacID, comments, toGo, orderTimestamp, readyForPickup, pickedUp, canceled, favorite }, ...] }
 */
router.get("/", async (req, res, next) => {
    try {
        const orders = await Order.getAllOrders();
        return res.json({ orders });
    } catch (err) {
        return next(err);
    }
});

/** GET /orders/:id
 * 
 * Returns information about a specific order.
 * 
 * Authorization required: none
 * 
 * returns { order: {orderID, dfacID, comments, orderDateTime, readyTime,
 *              pickedUpTime, canceled, favorite},
 *            meal: {mealID, dfacID, mealName, description, type, price,
 *              imgPic, likes, updatedAt} }
 */
router.get("/:id", async (req, res, next) => {
    try {
        const order = await Order.get(req.params.id);
        return res.json({ order });
    } catch (err) {
        return next(err);
    }
});

/** PATCH /orders/:id
 * 
 * Updates information about a specific order.Accepts a variable amount of allowable data
 * 
 * Authorization required: none
 * 
 * Accepts { comments, toGo, readyTime, pickedUpTime, canceled, favorite }
 * 
 * Returns { order: { id, customerID, dfacID, comments, toGo, orderDateTime, readyForPickup, pickedUp, canceled, canceledAtTime, favorite } }
 */
router.patch("/:id", async (req, res, next) => {
    try {
        const order = await Order.updateOrderStatus(req.params.id, req.body);
        return res.json({ order });
    } catch (err) {
        return next(err);
    }
});

module.exports = router;
