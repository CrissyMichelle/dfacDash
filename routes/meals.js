const express = require("express");
const router = express.Router();
const Meal = require("../models/meal");


// router.get("/", async (req, res, next) => {
//     try {
//         const meals = await Meal.findAll();
//         return res.json({ meals });
//     } catch (err) {
//         return next(err);
//     }
// });

/** GET /meals
 * 
 * Returns list of all meals.
 * 
 * Authorization required: none
 * 
 * { meals:  {mealID, dfacID, dfacName, dfacLogo, street, bldgNum, city, state, zip, dfacPhone, flashMsg1, flashMsg2,
 *                  bfHours, luHours, dnHours, bchHours, supHours, orderBf, orderLu, orderDn, orderBch, orderSup,
 *                  mealName, description, type, price, imgPic, likes, createdAt}, {mealID, dfacID, dfacName, ...},
 *              {...}, ...}
 */
router.get("/", async (req, res, next) => {
    try {
        const meals = await Meal.getWithDfacDeets();
        return res.json({ meals });
    } catch (err) {
        return next(err);
    }
});

/** GET /meals/:id
 * 
 * Returns information about a specific meal.
 * 
 * Authorization required: none
 * 
 * Returns
     * { meal: {mealID, dfacID, mealName, description, type, price, imgPic, likes, createdAt}
     *      items: [{ itemID, menuItem, foodType, recipeCode, description,
     *             likes, colorCode, sodiumLvl, regsStandard }, { itemID,... },
     *              {...}, ...}] 
     *                              }
 */
router.get("/:id", async (req, res, next) => {
    try {
        const meal = await Meal.get(req.params.id);
        return res.json({ meal });
    } catch (err) {
        return next(err);
    }
});

module.exports = router;
