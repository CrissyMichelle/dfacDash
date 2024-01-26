"use strict";

const db = require("../db");
const { sqlForPartialUpdate } = require("../helpers/sql");
const {
    NotFoundError,
    BadRequestError,
    UnauthorizedError
} = require("../expressError");

const bcrypt = require("bcrypt");
const { BCRYPT_WORK_FACTOR } = require("../config");

/** DFAC class consolidates CRUD for data interactions with the restaurants */
class Dfac {
    /** Add a new dfac to the database - CREATE
     * 
     *  Requires {dfacName, street, city, state, zip, dfacPhone} as input, but optionally accepts all the other dfac attributes too
     * 
     *  returns { dfacName, dfacLogo, street, bldgNum, city, state, zip, dfacPhone, flashMsg1, flashMsg2,
     *              bfHours, luHours, dnHours, bchHours, supHours, orderBf, orderLu, orderDn, orderBch, orderSup,
     *              createdAt }
     */
    static async add(
        { dfacName, dfacLogo=null, street, bldgNum=null, city, state, zip, dfacPhone, flashMsg1=null, flashMsg2=null,
            bfHours=null, luHours=null, dnHours=null, bchHours=null, supHours=null, orderBf=null, orderLu=null, orderDn=null, orderBch=null, 
            orderSup=null }
    ) {
        const duplicateCheck = await db.query(
            `SELECT dfac_name from dfacs
                WHERE dfac_name = $1`,
            [dfacName]
        );
        if (duplicateCheck.rows[0]) {
            throw new BadRequestError(`Duplicate dfac: ${dfacName}`);
        }

        const result = await db.query(
            `INSERT INTO dfacs
                            (dfac_name,
                                dfac_logo,
                                street_address,
                                bldg_num,
                                city,
                                state_abb,
                                zip_code,
                                dfac_phnumber,
                                flash_msg1,
                                flash_msg2,
                                bf_hours,
                                lu_hours,
                                dn_hours,
                                bch_hours,
                                sup_hours,
                                order_timebf, 
                                order_timelu,
                                order_timedn,
                                order_timebch,
                                order_timesup)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
                RETURNING id AS "dfacID", dfac_name AS "dfacName", dfac_logo AS "dfacLogo", street_address AS "street", bldg_num AS bldgNum,
                    city, state_abb AS "state", zip_code AS "zip", dfac_phnumber AS "dfacPhone", flash_msg1 AS "flashMsg1",
                    flash_msg2 AS "flashMsg2", bf_hours AS "bfHours", lu_hours AS "luHours", dn_hours AS "dnHours", order_timebf
                    AS "orderBf", order_timelu AS "orderLu", order_timedn AS "orderDn", order_timesup AS "orderSup", created_at AS "createdAt"`,
            [
                dfacName, dfacLogo, street, bldgNum, city,
                state, zip, dfacPhone, flashMsg1, flashMsg2, 
                bfHours, luHours, dnHours, bchHours, supHours, 
                orderBf, orderLu, orderDn, orderBch, orderSup
            ] 
        );

        return result.rows[0];
    }

    /** Find all dfacs - READ
     * 
     * returns all dfacs as the response object locals: dfacs
     * { dfacs: [ {dfacID, dfacName, dfacLogo, street, bldgNum, city, state, zip, dfacPhone, flashMsg1, flashMsg2,
     *                  bfHours, luHours, dnHours, bchHours, supHours, orderBf, orderLu, orderDn, orderBch, orderSup },
     *                              {dfacName, ...}, {...}, ...] }
     */
    static async findAll() {
        const result = await db.query(
            `SELECT id AS "dfacID",
                    dfac_name AS "dfacName", 
                    dfac_logo AS "dfacLogo", 
                    street_address AS "street", 
                    bldg_num AS bldgNum,
                    city, 
                    state_abb AS "state", 
                    zip_code AS "zip", 
                    dfac_phnumber AS "dfacPhone", 
                    flash_msg1 AS "flashMsg1",
                    flash_msg2 AS "flashMsg2", 
                    bf_hours AS "bfHours", 
                    lu_hours AS "luHours", 
                    dn_hours AS "dnHours", 
                    bch_hours AS "bchHours",
                    sup_hours AS "supHours",
                    order_timebf AS "orderBf", 
                    order_timelu AS "orderLu", 
                    order_timedn AS "orderDn",
                    order_timebch AS "orderBch", 
                    order_timesup AS "orderSup"
                FROM dfacs
                ORDER BY id`
        );

        return result.rows;
    }

    /** Find a dfac by dfacID - READ
     * 
     * returns
     * { dfac: {dfacDetails: {dfacID, dfacName, dfacLogo, street, bldgNum, city, state, zip, dfacPhone, flashMsg1, flashMsg2,
     *                  bfHours, luHours, dnHours, bchHours, supHours, orderBf, orderLu, orderDn, orderBch, orderSup},
     *        meals: [{mealID, dfacID, description, type, price, imgPic, likes}, {mealID, dfacID, ...}, {...}, ... ] }
     */
    static async get(dfacID) {
        const dfacRes = await db.query(
            `SELECT id AS "dfacID",
                    dfac_name AS "dfacName", 
                    dfac_logo AS "dfacLogo", 
                    street_address AS "street", 
                    bldg_num AS bldgNum,
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

        const mealsRes = await db.query(
            `SELECT id AS "mealID",
                            dfac_id AS "dfacID",
                            meal_name AS "mealName",
                            description,
                            type,
                            price,
                            img_pic AS "imgPic",
                            likes
                FROM meals
                WHERE dfac_id = $1`,
            [dfacID]
        );

        if (dfacRes.rows.length === 0 ) {
            throw new NotFoundError(`No dfac: ${dfacID}`);
        }
        
        const meals = [...mealsRes.rows];

        const dfacAndMeals = {
            dfacDetails: dfacRes.rows[0],
            meals: meals
        }

        return dfacAndMeals;
    }

    /** Supervisors and admin function to Patch dfac data with `data` - UPDATE
     * 
     * Partial update is perfectly acceptable; fields only changed if patch request
     * includes corresponding data.
     * 
     * Allowable data:
     *      { dfacName, dfacLogo, street, bldgNum, city, state, zip, dfacPhone,flashMsg1, flashMsg2,
     *           bfHours, luHours, dnHours, bchHours, supHours, orderBf, orderLu, orderDn, orderBch, orderSup }
     * 
     * returns
     * { dfac: {dfacID, dfacName, dfacLogo, street, bldgNum, city, state, zip, dfacPhone, flashMsg1, flashMsg2,
     *                  bfHours, luHours, dnHours, bchHours, supHours, orderBf, orderLu, orderDn, orderBch, orderSup
     *                  createdAt, updatedAt} }
     *
     * throws NotFoundError if dfacID not found
     */
    static async update(dfacID, data) {
        const { setCols, values } = sqlForPartialUpdate(
            data,
            {
                dfacName: "dfac_name",  
                dfacLogo: "dfac_logo", 
                street: "street_address", 
                bldgNum: "bldg_num",
                city: "city",
                state: "state_abb",
                zip: "zip_code",
                dfacPhone: "dfac_phnumber",
                flashMsg1: "flash_msg1", 
                flashMsg2: "flash_msg2",
                bfHours: "bf_hours",
                luHours: "lu_hours",
                dnHours: "dn_hours",
                bchHours: "bch_hours",
                supHours: "sup_hours",
                orderBf: "order_timebf",
                orderLu: "order_timelu",
                orderDn: "order_timedn",
                orderBch:"order_timebch",
                orderSup: "order_timesup"      
            }
        );
        const dfacIDVarIdx = "$" + (values.length + 1);

        const querySql = `UPDATE dfacs
                            SET ${setCols}, updated_at = CURRENT_TIMESTAMP
                            WHERE id = ${dfacIDVarIdx}
                            RETURNING id AS "dfacID",
                                    dfac_name AS "dfacName", 
                                    dfac_logo AS "dfacLogo", 
                                    street_address AS "street", 
                                    bldg_num AS bldgNum,
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
                                    order_timesup AS "orderSup",
                                    created_at AS "createdAt",
                                    updated_at AS "updatedAt"`;
        const result = await db.query(querySql, [...values, dfacID]);

        const dfac = result.rows[0];
        if (!dfac) throw new NotFoundError(`No dfac: ${dfacID}`);

        return dfac;
    }

    /** PATCH function to update dfac hours with `data` 
     *          - UPDATE - 
     * 
     * Partial update is perfectly acceptable; fields only changed if patch request
     * includes corresponding data.
     * 
     * Allowable data:
     *      {bfHours, luHours, dnHours, bchHours, supHours, orderBf, orderLu, orderDn, orderBch, orderSup}
     * 
     * returns
     * { dfac: {dfacID, dfacName, dfacLogo, street, bldgNum, city, state, zip, dfacPhone, flashMsg1, flashMsg2,
     *                  bfHours, luHours, dnHours, bchHours, supHours, orderBf, orderLu, orderDn, orderBch, orderSup
     *                      updatedAt} }
     *
     * throws NotFoundError if dfacID not found
     */
    static async updateHours(dfacID, data) {
        const { setCols, values } = sqlForPartialUpdate(
            data,
            {
                bfHours: "bf_hours",
                luHours: "lu_hours",
                dnHours: "dn_hours",
                bchHours: "bch_hours",
                supHours: "sup_hours",
                orderBf: "order_timebf",
                orderLu: "order_timelu",
                orderDn: "order_timedn",
                orderBch:"order_timebch",
                orderSup: "order_timesup"      
            }
        );
        const dfacIDVarIdx = "$" + (values.length + 1);

        const querySql = `UPDATE dfacs
                            SET ${setCols}, updated_at = CURRENT_TIMESTAMP
                            WHERE id = ${dfacIDVarIdx}
                            RETURNING id AS "dfacID",
                                    dfac_name AS "dfacName", 
                                    dfac_logo AS "dfacLogo", 
                                    street_address AS "street", 
                                    bldg_num AS bldgNum,
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
                                    order_timesup AS "orderSup",
                                    updated_at AS "updatedAt"`;
        const result = await db.query(querySql, [...values, dfacID]);

        const dfac = result.rows[0];
        if (!dfac) throw new NotFoundError(`No dfac: ${dfacID}`);

        return dfac;
    }

    /** "Soft" delete
     * 
     * marks a dfac as deleted by setting the deleted_at field without
     *    actually deleting the dfacs row
     * 
     * returns dfacName of "deleted" dfac; throws NotFoundError if no dfacID found
     */
    static async remove(dfacID) {
        let result = await db.query(
            `UPDATE dfacs
                SET deleted_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING dfac_name AS "dfacName"`,
            [dfacID]
        );

        const dfac = result.rows[0];
        if (!dfac) throw new NotFoundError(`No dfac: ${dfacID}`);

        return dfac;
    }
}

module.exports = Dfac;
