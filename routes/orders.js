const express = require("express");
const router = express.Router();
const Order = require("../models/order");

/** POST /orders
 * 
 * Creates a new order.
 * 
 * Authorization required: none
 * 
 * Accepts { customerID, dfacID, comments, toGo }
 * 
 * Returns { order: { id, customerID, dfacID, comments, toGo, orderTimestamp, readyForPickup, pickedUp, canceled, favorite } }
 */
router.post("/", async (req, res, next) => {
    try {
        const { customerID, dfacID, comments, toGo } = req.body;

        const order = await Order.createOrder(customerID, dfacID, comments, toGo);
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
 * Returns { order: { id, customerID, dfacID, comments, toGo, orderTimestamp, readyForPickup, pickedUp, canceled, favorite } }
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
 * Updates information about a specific order.
 * 
 * Authorization required: none
 * 
 * Accepts { comments, toGo, readyForPickup, pickedUp, canceled, favorite }
 * 
 * Returns { order: { id, customerID, dfacID, comments, toGo, orderTimestamp, readyForPickup, pickedUp, canceled, favorite, createdAt, updatedAt } }
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
