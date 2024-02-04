"use strict";

/** Routes for items */

const express = require("express");
const router = express.Router();

const jsonschema = require("jsonschema");

const Item = require("../models/item");

const { ensureLoggedIn, ensureAdmin, authenticateJWT } = require("../middleware/auth");
const { BadRequestError } = require("../expressError");
const { createToken } = require("../helpers/tokens");

/** CRUD router functions for menu items data */

/** GET route for Reading menu item data
 *  
 * returns 
  *      { items: {itemID, menuItem, foodType, recipeCode, description,
  *             likes, colorCode, sodiumLvl, itemImage, regsStandard }, {itemID,...},
  *              {...}, ...}
 * no authorization required
* */
router.get("/", async (req, res, next) => {
    try {
        const items = await Item.findAll();

        return res.json({ items });
    } catch (err) {
        return next(err);
    }
});

/** GET route for Reading item data based on itemID
 * /[itemID] --> { item, nutrition, meals }
 * 
 * returns { item: {itemID, menuItem, foodType, recipeCode, description,
 *             likes, colorCode, sodiumLvl, itemImage, regsStandard }
 *          nutrition: {calories, protein, carbs, fat, sodium, cholesterol, sugars}
 *          meals:[{dfacID, mealName, description, type, price, imgPic,  likes, updatedAt},
 *                  {dfacID, ...}, {...}, ...] }
 */
router.get("/:itemID", async (req, res, next) => {
    try {
        const menuItemID = req.params.itemID;

        const item = await Item.get(menuItemID);
            return res.json({ item });

    } catch (err) {
        return next(err);
    }
});

/** PATCH /items/:id
 * 
 * Updates information about a specific menu item.
 * 
 * Requires supervisory rights
 * 
 * Accepts { menuItem foodType, recipeCode, description, colorCode, sodiumLvl, itemImage, regsStandard }
 * 
 * Returns 
 *  { item: {itemID, menuItem foodType, recipeCode, description, likes, colorCode, sodiumLvl, itemImage, regsStandard, createdAt, updatedAt} }
 */
router.patch("/:id", authenticateJWT, ensureLoggedIn, async (req, res, next) => {
    try {
        console.log("item ID argument: ", req.params.id);
        const itemTarget = parseInt(req.params.id, 10);

        // json schema validation should go here

        console.log("User object: ", res.locals.user);
        if (res.locals.user.isAdmin) {
            const item = await Item.update(itemTarget, req.body);
            return res.json({ item });
        } else if (res.locals.user.canUpdateMenu) {
            const item = await item.update(itemTarget, req.body);
            return res.json({ item });
        } else {
            throw new ForbiddenError("Access denied");
        }
    } catch (err) {
        return next(err);
    }
});

module.exports = router;
