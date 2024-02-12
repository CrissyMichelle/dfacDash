"use strict";

const db = require("../db");
const { sqlForPartialUpdate } = require("../helpers/sql");

const {
    NotFoundError,
    BadRequestError,
    UnauthorizedError
} = require("../expressError");

/** DFAC Item class consolidating related CRUD functions  */

class DfacItem {
    /** Add new dfac item relation with data - CREATE
     * 
     * returns { dfacItem: dfac: {dfacName, dfacLogo, street, bldgNum, city, state, zip, dfacPhone, flashMsg1, flashMsg2,
     *              bfHours, luHours, dnHours, bchHours, supHours, orderBf, orderLu, orderDn, orderBch, orderSup,
     *              createdAt},
     *                     item: {itemID, menuItem, foodType, recipeCode, description,
     *             likes, colorCode, sodiumLvl, itemImage, regsStandard}
     *          }
     */
    static async add(dfacID, itemID) {
        const duplicateCheck = await db.query(
            `SELECT * from dfac_items
                WHERE dfac_id = $1 AND item_id = $2`,
            [dfacID, itemID]
        );
        if (duplicateCheck.rows[0]) {
            throw new BadRequestError(`Item ${item} already at Dfac ${dfacID}`);
        }

        const dfacItemRes = await db.query(
            `INSERT INTO dfac_items (dfac_id, item_id)
                VALUES ($1, $2)
                RETURNING dfac_id AS "dfacID", item_id AS "itemID"`,
            [dfacID, itemID]
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

        if (dfacItemRes.rows.length === 0 ) {
            throw new BadRequestError(`Couldn't add to dfac_items`);
        }
        if (dfacRes.rows.length === 0 ) {
            throw new NotFoundError(`No dfac: ${dfacID}`);
        }
        if (itemRes.rows.length === 0 ) {
            throw new NotFoundError(`No item: ${itemID}`);
        }

        const dfacItem = {
            dfac: dfacRes.rows[0],
            item: itemRes.rows[0]
        }

        return dfacItem;
    }

    /**  Add tags to an item - CREATE
     * 
     * Allowable data:
     * {  dietary, allergen, promo, descriptive, availability, tagPic}
     * 
     * Returns
     * { itemTagged: 
     *      item: {itemID, menuItem foodType, recipeCode, description, likes, colorCode, sodiumLvl, itemImage, regsStandard, createdAt, updatedAt},
     *      tags: {dietary, allergen, promo, descriptive, availability, tagPic} 
     *  }
     *
     * Throws NotFoundError if itemID not found
     */
    static async addTag(itemID, data) {
        const idCheck = await db.query(
            `SELECT * FROM items
                WHERE id = $1`,
            [itemID]
        );
        if (idCheck.rows.length === 0) {
            throw NotFoundError(`Item not found ${itemID}`);
        }

        const { setCols, values } = sqlForPartialUpdate(
            data,
            {
                dietary: "dietary",
                allergen: "allergen",
                promo: "promotional",
                descriptive: "descriptive",
                availability: "availability",
                tagPic: "img_pic"
            }
        );

        const insertTags = `INSERT INTO tags ${setCols}
                            VALUES (${values.map((_, index) => "$" + (index + 1)).join(", ")})
                            RETURNING id AS "tagID",
                                    dietary,
                                    allergen,
                                    promotional AS "promo",
                                    descriptive,
                                    availability,
                                    img_pic AS "tagPic"`;
        const tagRes = await db.query(insertTags, [...values]);

        const tagID = tagRes.rows[0].tagID;
        if (!tagID) throw new BadRequestError(`Error inserting tag data`);

        await db.query(
            `INSERT INTO item_tags (item_id, tag_id)
                VALUES ($1, $2)
                RETURNING item_id AS "itemID", tag_id AS "tagID"`,
            [itemID, tagID]
        );

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
                WHERE item_id = $1`,
            [itemID]
        );

        const itemTagged = {
            item: itemRes.rows[0],
            tags: tagRes.rows[0]
        }

        return itemTagged;
    }

    /** Find items based on item tag - READ 
     * 
     *   Allows culinarians to tag describe an item with "breakfast", "dinner", etc
     * 
     * returns 
     *      { taggedItems: { item: {itemID, menuItem, foodType, recipeCode, description,
     *             likes, colorCode, sodiumLvl, itemImage, regsStandard, tag},
     *                      tags: {dietary, allergen, promo, descriptive, availability, tagPic},
     *              item:{itemID,...}, tags: {...},
     *           ...}
    */
    static async findItemsByTag(tagDescription) {
        const tagRes = await db.query(
            `SELECT id AS "tagID",
                    dietary,
                    allergen,
                    promotional AS "promo",
                    descriptive,
                    availability,
                    img_pic AS "tagPic"
                FROM tags
                WHERE descriptive = $1`,
            [tagDescription]
        );

        if (tagRes.rows.length === 0) {
            throw new NotFoundError(`No tags found for ${tagDescription}`);
        }

        const tagID = tagRes.rows[0].tagID;

        const itemsRes = await db.query(
            `SELECT i.id AS "itemID",
                    i.menu_item AS "menuItem",
                    i.food_type AS "foodType",
                    i.recipe_code AS "recipeCode",
                    i.description,
                    i.likes,
                    i.color_code AS "colorCode",
                    i.sodium_level AS "sodiumLvl",
                    i.item_img AS "itemImage",
                    i.da_standard AS "regsStandard"
                FROM items i
                JOIN item_tags it ON i.id = it.item_id
                WHERE it.tag_id = $1`,
            [tagID]
        );
        
        // map itemsRes for obtaining any item associated with given tag
        const taggedItems = itemsRes.rows.map(item => ({
            item: item,
            tags: tagRes.rows[0]
        }));

        return { taggedItems };
    }

    /** Update an item's tags with `data` - UPDATE
     * 
     * Partial update is perfectly acceptable; fields only changed if patch request
     * includes corresponding data.
     * 
     * Allowable data:
     * {  dietary, allergen, promotional, descriptive, availability, tagPic}
     * 
     * Returns
     * { itemTagged: 
     *      item: {itemID, menuItem foodType, recipeCode, description, likes, colorCode, sodiumLvl, itemImage, regsStandard, createdAt, updatedAt},
     *      tags: {dietary, allergen, promo, descriptive, availability, tagPic} 
     *  }
     *
     * Throws NotFoundError if item or tag ID not found
     */
    static async updateTag(itemID, tagID, data) {
        const itemCheck = await db.query(
            `SELECT * FROM items
                WHERE id = $1`,
            [itemID]
        );
        if (itemCheck.rows.length === 0) {
            throw NotFoundError(`Item not found ${itemID}`);
        }

        const tagCheck = await db.query(
            `SELECT * FROM tags
                WHERE id = $1`,
            [tagID]
        );
        if (tagCheck.rows.length === 0) {
            throw NotFoundError(`Tag not found ${tagID}`);
        }

        const { setCols, values } = sqlForPartialUpdate(
            data,
            {
                dietary: "dietary",
                allergen: "allergen",
                promo: "promotional",
                descriptive: "descriptive",
                availability: "availability",
                tagPic: "img_pic"
            }
        );

        const tagIDVarIdx = "$" + (values.length + 1);

        const updateTagFields = `UPDATE tags
                            SET ${setCols}
                            WHERE id = ${tagIDVarIdx}
                            RETURNING id AS "tagID",
                                dietary,
                                allergen,
                                promotional AS "promo",
                                descriptive,
                                availability,
                                img_pic AS "tagPic"`;

        const tagRes = await db.query(updateTagFields, [...values, itemID]);

        const tag = tagRes.rows[0];
        if (!tag) throw new BadRequestError(`Error updating tag data`);

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
                WHERE item_id = $1`,
            [itemID]
        );

        const itemTagged = {
            item: itemRes.rows[0],
            tag: tagRes.rows[0]
        }

        return itemTagged;
    }
}

module.exports = DfacItem;
