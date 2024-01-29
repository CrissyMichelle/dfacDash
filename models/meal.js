"use strict";

const db = require("../db");
const { sqlForPartialUpdate } = require("../helpers/sql");
const {
    NotFoundError,
    BadRequestError,
    UnauthorizedError
} = require("../expressError");

/** Meal class consolidates CRUD for data interactions with meals */
class Meal {
    /** Create a new meal - CREATE
     * 
     * Requires { dfacID, mealName, description, type, price } as input
     * Optionally accepts all other meal attributes
     * 
     * Returns { mealID, dfacID, mealName, description, type, price, imgPic, likes, createdAt }
     */
    static async create(
        { dfacID, mealName, description, type, price, imgPic=null }
    ) {
        const result = await db.query(
            `INSERT INTO meals
                (dfac_id, meal_name, description, type, price, img_pic)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id AS "mealID",
                        dfac_id AS "dfacID",
                        meal_name AS "mealName",
                        description,
                        type,
                        price,
                        img_pic AS "imgPic",
                        likes,
                        created_at AS "createdAt"`,
            [dfacID, mealName, description, type, price, imgPic]
        );

        return result.rows[0];
    }

    /** Find all meals - READ
     * 
     * Returns all meals as the response object locals: meals
     * { meals: [ {mealID, dfacID, mealName, description, type, price, imgPic, likes, createdAt}, {...}, {...}, ...] }
     */
    static async findAll() {
        const result = await db.query(
            `SELECT id AS "mealID",
                    dfac_id AS "dfacID",
                    meal_name AS "mealName",
                    description,
                    type,
                    price,
                    img_pic AS "imgPic",
                    likes,
                    created_at AS "createdAt"
            FROM meals
            ORDER BY id`
        );

        return result.rows;
    }

    /** READ meals with dfac details included
     * 
     * Returns similar to findAll meals but JOIN with all dfac data
     * { meals:  {mealID, dfacID, dfacName, dfacLogo, street, bldgNum, city, state, zip, dfacPhone, flashMsg1, flashMsg2,
     *                  bfHours, luHours, dnHours, bchHours, supHours, orderBf, orderLu, orderDn, orderBch, orderSup,
     *                  mealName, description, type, price, imgPic, likes, createdAt}, {mealID, dfacID, dfacName, ...},
     *              {...}, ...}
     */
    static async getWithDfacDeets() {
        const result = await db.query(
            `SELECT m.id AS "mealID",
                    m.dfac_id AS "dfacID",
                    d.dfac_name AS "dfacName",
                    d.dfac_logo AS "dfacLogo",
                    d.street_address AS "street",
                    d.bldg_num AS "bldgNum",
                    d.city,
                    d.state_abb AS "state",
                    d.zip_code AS "zip",
                    d.dfac_phnumber AS "dfacPhone",
                    d.flash_msg1 AS "flashMsg1",
                    d.flash_msg2 AS "flashMsg2",
                    d.bf_hours AS "bfHours", 
                    d.lu_hours AS "luHours", 
                    d.dn_hours AS "dnHours", 
                    d.order_timebf AS "orderBf", 
                    d.order_timelu AS "orderLu", 
                    d.order_timedn AS "orderDn", 
                    d.order_timesup AS "orderSup",
                    m.meal_name AS "mealName",
                    m.description,
                    m.type,
                    m.price,
                    m.img_pic AS "imgPic",
                    m.likes,
                    m.created_at AS "createdAt"
                FROM meals m
                JOIN dfacs d ON m.dfac_id = d.id
                ORDER BY d.dfac_name`
        );

        return result.rows;
    }

    /** Find a meal by mealID - READ
     * 
     * Returns
     * { meal: {mealID, dfacID, mealName, description, type, price, imgPic, likes, createdAt}
     *      items: [{ itemID, menuItem, foodType, recipeCode, description,
     *             likes, colorCode, sodiumLvl, regsStandard }, { itemID,... },
     *              {...}, ...}] 
     *                              }
     */
    static async get(mealID) {
        const mealRes = await db.query(
            `SELECT id AS "mealID",
                    dfac_id AS "dfacID",
                    meal_name AS "mealName",
                    description,
                    type,
                    price,
                    img_pic AS "imgPic",
                    likes,
                    created_at AS "createdAt"
            FROM meals
            WHERE id = $1`,
            [mealID]
        );

        const itemsRes = await db.query(
                `SELECT i.id AS "itemID",
                        i.menu_item AS "menuItem",
                        i.food_type AS "foodType",
                        i.description,
                        i.likes,
                        i.color_code AS "colorCode",
                        i.sodium_level AS "sodiumLvl"
                    FROM items i
                    JOIN meal_items mi ON i.id = mi.item_id
                    JOIN meals m ON mi.meal_id = m.id
                    WHERE m.id = $1`,
                [mealID]
        );

        const meal = mealRes.rows[0];
        if (!meal) throw new NotFoundError(`No mealID: ${mealID}`);

        const items = itemsRes.rows

        const mealAndItems = {
            meal: meal,
            items: items
        };

        return mealAndItems;
    }

        /** Find meals by dfacID - READ
     * 
     * Returns
     * { dfac: {dfacID, dfacName, dfacLogo, street, bldgNum, city, state, zip, dfacPhone, flashMsg1, flashMsg2,
     *                  bfHours, luHours, dnHours, bchHours, supHours, orderBf, orderLu, orderDn, orderBch, orderSup
     *                  createdAt, updatedAt},
     * meals: [ {mealID, mealName, description, type, price, imgPic, likes, createdAt},
     *      {mealID, mealName, description, ...}, { mealID, ...},
     *              {...}, ... ] 
     *  }
     */
        static async getDfacMeals(dfacID) {
            const mealsRes = await db.query(
                `SELECT id AS "mealID",
                        dfac_id AS "dfacID",
                        meal_name AS "mealName",
                        description,
                        type,
                        price,
                        img_pic AS "imgPic",
                        likes,
                        created_at AS "createdAt"
                FROM meals
                WHERE dfac_id = $1`,
                [dfacID]
            );

            const dfacRes = await db.query(
                `SELECT id AS "dfacID",
                        dfac_name AS "dfacName", 
                        dfac_logo AS "dfacLogo", 
                        street_address AS "street", 
                        bldg_num AS "bldgNum",
                        city, 
                        state_abb AS "state", 
                        zip_code AS "zip", 
                        dfac_phnumber AS "dfacPhone", 
                        flash_msg1 AS "flashMsg1",
                        flash_msg2 AS "flashMsg2", 
                        bf_hours AS "bfHours", 
                        lu_hours AS "luHours", 
                        dn_hours AS "dnHours", 
                        order_timebf AS "orderBf", 
                        order_timelu AS "orderLu", 
                        order_timedn AS "orderDn", 
                        order_timesup AS "orderSup"
                    FROM dfacs
                    WHERE id = $1`,
                [dfacID]
            );
            const dfac = dfacRes.rows[0];
            if (!dfac) throw new NotFoundError(`Dfac not found: ${dfacID}`);

            const meals = mealsRes.rows

            const dfacAndMeals = {
                dfac: dfac,
                meals: meals
            };

            return dfacAndMeals;
        }


    /** Update a meal with `data` - UPDATE
     * 
     * Partial update is perfectly acceptable; fields only changed if patch request
     * includes corresponding data.
     * 
     * Allowable data:
     * { mealName, description, type, price, imgPic }
     * 
     * Returns
     * { meal: {mealID, dfacID, mealName, description, type, price, imgPic, likes, createdAt, updatedAt} }
     *
     * Throws NotFoundError if mealID not found
     */
    static async update(mealID, data) {
        const { setCols, values } = sqlForPartialUpdate(
            data,
            {
                mealName: "meal_name",
                description: "description",
                type: "type",
                price: "price",
                imgPic: "img_pic"
            }
        );
        const mealIDVarIdx = "$" + (values.length + 1);

        const querySql = `UPDATE meals
                            SET ${setCols}, updated_at = CURRENT_TIMESTAMP
                            WHERE id = ${mealIDVarIdx}
                            RETURNING id AS "mealID",
                                    dfac_id AS "dfacID",
                                    meal_name AS "mealName",
                                    description,
                                    type,
                                    price,
                                    img_pic AS "imgPic",
                                    likes,
                                    created_at AS "createdAt",
                                    updated_at AS "updatedAt"`;
        const result = await db.query(querySql, [...values, mealID]);

        const meal = result.rows[0];
        if (!meal) throw new NotFoundError(`No meal: ${mealID}`);

        return meal;
    }

    /** "Soft" delete
     * 
     * Marks a meal as deleted by setting the deleted_at field without
     * actually deleting the meals row
     * 
     * Returns mealID of "deleted" meal; throws NotFoundError if no mealID found
     */
    static async remove(mealID) {
        let result = await db.query(
            `UPDATE meals
                SET deleted_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING id AS "mealID"`,
            [mealID]
        );

        const meal = result.rows[0];
        if (!meal) throw new NotFoundError(`No meal: ${mealID}`);

        return meal;
    }
}

module.exports = Meal;
