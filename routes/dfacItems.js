const express = require("express");
const router = express.Router();
const DfacItem = require("../models/dfacItem");

/** POST /dfac-item/[dfacID]/[itemID]
 * 
 * Creates a new dfac-item association.
 * 
 * Authorization required: supervisory rights
 * 
 * takes { dfacID, itemID }
 * 
 * returns { dfacItem: dfac: {dfacName, dfacLogo, street, bldgNum, city, state, zip, dfacPhone, flashMsg1, flashMsg2,
 *                  bfHours, luHours, dnHours, bchHours, supHours, orderBf, orderLu, orderDn, orderBch, orderSup,
 *                  createdAt},
 *                 item: {itemID, menuItem, foodType, recipeCode, description,
 *                      likes, colorCode, sodiumLvl, itemImage, regsStandard}
 *          }
 */
router.post("/:dfacID/:itemID", authenticateJWT, ensureLoggedIn, async (req, res, next) => {
    try {
        const dfacTarget = parseInt(req.params.dfacID, 10);
        const requestorDfacID = res.locals.user.dfacID;

        console.log("Requestor DFAC ID: ", requestorDfacID, "Target DFAC ID: ", dfacTarget);
        console.log("User object: ", res.locals.user);
        if (res.locals.user.isAdmin) {
            const dfacItem = await DfacItem.add(req.params.dfacID, req.params.itemID);
            return res.json({ dfacItem });
        } else if (requestorDfacID === dfacTarget && res.locals.user.canUpdateMenu) {
            const dfacItem = await DfacItem.add(req.params.dfacID, req.params.itemID);
            return res.json({ dfacItem });
        } else {
            throw new ForbiddenError("Access denied");
        }
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
