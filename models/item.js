"use strict";

const db = require("../db");
const { sqlForPartialUpdate } = require("../helpers/sql");

const {
    NotFoundError,
    BadRequestError,
    UnauthorizedError
} = require("../expressError");

/** Menu Item class consolidating related CRUD functions  */

class Item {
    /** Add new menu item with data - Create
     * 
     * returns 
     *      {itemID, menuItem, foodType, recipeCode, description,
     *             likes, colorCode, sodiumLvl, itemImage regsStandard }
     */
    static async add(
        { menuItem, foodType, recipeCode=null, description, colorCode=null,
            sodiumLvl=null, itemImage=null, regsStandard=null }
    ) {
        const duplicateCheck = await db.query(
            `SELECT menu_item from items
                WHERE menu_item = $1`,
            [menuItem]
        );
        if (duplicateCheck.rows[0]) {
            throw new BadRequestError(`Duplicate item: ${menuItem}`);
        }

        const result = await db.query(
            `INSERT INTO items
                            (menu_item,
                            food_type,
                            recipe_code,
                            description,
                            color_code,
                            sodium_level,
                            item_img,
                            da_standard)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id AS "itemID",
                            menu_item AS "menuItem",
                            food_type AS "foodType",
                            recipe_code AS "recipeCode",
                            description,
                            likes,
                            color_code AS "colorCode",
                            sodium_level AS "sodiumLvl",
                            item_img AS "itemImage",
                            da_standard AS "regsStandard"`,
            [
                menuItem,
                foodType,
                recipeCode,
                description,
                colorCode,
                sodiumLvl,
                itemImage,
                regsStandard
            ]
        );
               
        const item = result.rows[0];
        return item;
    }

    /** Find all items - Read 
     * 
     * returns 
     *      { items: {itemID, menuItem, foodType, recipeCode, description,
     *             likes, colorCode, sodiumLvl, itemImage, regsStandard }, {itemID,...},
     *              {...}, ...}
    */
    static async findAll() {
        const result = await db.query(
            `SELECT id AS "itemID",
                    menu_item AS "menuItem",
                    food_type AS "foodType",
                    recipe_code AS "recipeCode",
                    description,
                    likes,
                    color_code AS "colorCode",
                    sodium_level AS "sodiumLvl",
                    item_img AS "itemImage",
                    da_standard AS "regsStandard"
                FROM items
                ORDER BY menu_item`
        );

        return result.rows;
    }

    /** Given the id of a menuItem, return data about that item, including the associated meals 
     *          - READ - 
     * 
     * returns { item: {itemID, menuItem, foodType, recipeCode, description,
     *             likes, colorCode, sodiumLvl, itemImage, regsStandard }
     *          nutrition: {calories, protein, carbs, fat, sodium, cholesterol, sugars}
     *          meals:[{dfacID, mealName, description, type, price, imgPic,  likes, updatedAt},
     *                  {dfacID, ...}, {...}, ...] }
     * 
     *  Separate queries select the item's nutrition and meals data and the spread operator
     *     `...` combines the values.
     * 
     * throws NotFoundError if item not found
     */
    static async get(itemID) {
        const itemRes = await db.query(
            `SELECT id AS "itemID",
                    menu_item AS "menuItem",
                    food_type AS "foodType",
                    recipe_code AS "recipeCode",
                    description,
                    likes,
                    color_code AS "colorCode",
                    sodium_level AS "sodiumLvl",
                    item_img AS "itemImage",
                    da_standard AS "regsStandard"
                FROM items
                WHERE id = $1`,
            [itemID]
        );

        const nutritionRes = await db.query(
            `SELECT calories,
                    protein,
                    carbs,
                    fat,
                    sodium,
                    cholesterol,
                    sugars
                FROM nutrition
                WHERE menu_item_id = $1`,
            [itemID]
        );

        const mealsRes = await db.query(
            `SELECT m.id AS "mealID",
                    m.dfac_id AS "dfacID",
                    m.meal_name AS "mealName",
                    m.description,
                    m.type,
                    m.price,
                    m.img_pic AS "imgPic",
                    m.likes,
                    m.updated_at AS "updatedAt"
                FROM meals m
                JOIN meal_items mi ON m.id = mi.meal_id
                JOIN items i ON mi.item_id = i.id
                WHERE i.id = $1`,
            [itemID]
        );

        const item = itemRes.rows[0];
        if (!item) throw new NotFoundError(`No itemID: ${menuItem}`);

        const nutrition = nutritionRes.rows[0];
        const itemNutrition = { item, nutrition };

        const meals = mealsRes.rows

        const itemNutritionAndMeals = {
            ...itemNutrition,
            meals: meals
        };

        return itemNutritionAndMeals;
    }

    /** Update an item with `data` - UPDATE
     * 
     * Partial update is perfectly acceptable; fields only changed if patch request
     * includes corresponding data.
     * 
     * Allowable data:
     * { menuItem foodType, recipeCode, description, colorCode, sodiumLvl, itemImage, regsStandard }
     * 
     * Returns
     * { item: {itemID, menuItem foodType, recipeCode, description, likes, colorCode, sodiumLvl, itemImage, regsStandard, createdAt, updatedAt} }
     *
     * Throws NotFoundError if itemID not found
     */
    static async update(itemID, data) {
        const { setCols, values } = sqlForPartialUpdate(
            data,
            {
                menuItem: "menu_item",
                foodType: "food_type",
                recipeCode: "recipe_code",
                description: "description",
                colorCode: "color_code",
                sodiumLvl: "sodium_level",
                itemImage: "item_img",
                regsStandard: "da_standard"
            }
        );
        const itemIDVarIdx = "$" + (values.length + 1);

        const querySql = `UPDATE items
                            SET ${setCols}, updated_at = CURRENT_TIMESTAMP
                            WHERE id = ${itemIDVarIdx}
                            RETURNING id AS "itemID",
                                    menu_item AS "menuItem",
                                    food_type AS "foodType",
                                    recipe_code AS "recipeCode",
                                    description,
                                    likes,
                                    color_code AS "colorCode",
                                    sodium_level AS "sodiumLvl",
                                    item_img AS "itemImage",
                                    da_standard AS "regsStandard",
                                    created_at AS "createdAt",
                                    updated_at AS "updatedAt"`;
        const result = await db.query(querySql, [...values, itemID]);

        const item = result.rows[0];
        if (!item) throw new NotFoundError(`No item: ${itemID}`);

        return item;
    }
}

module.exports = Item;
