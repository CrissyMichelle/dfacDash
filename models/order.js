"use strict";

const db = require('../db');
const { sqlForPartialUpdate } = require('../helpers/sql');
const {
    NotFoundError,
    BadRequestError,
} = require('../expressError');

class Order {
    /**
     * Create a new order. Requires the following data :
     * @param {integer} customerID - The ID of the customer placing the order.
     * @param {integer} dfacID - The ID of the DFAC for which the order is placed.
     * @param {integer} mealID - The ID of the meal for which the order is placed.
     * @param {string} comments - Additional comments for the order.
     * @param {boolean} toGo - Indicates if the order is for takeout.
     * 
     * --The created order is an intermediary response - {orderID, customerID, dfacID,
     *                                                         comments, toGo, orderDateTime} 
     *  
     *  Uses the intermediate response to insert into order_meals
     */
    static async createOrder(customerID, dfacID, mealID, comments = null, toGo = true, quantity = 1, specialInstructions = null) {
        // Starting a database transaction
        // const client = await db.connect();

        try{
            // await client.query('BEGIN');

            // first check customerID and dfacID
            const customerExists = await db.query(
                `SELECT id from customers
                    WHERE id = $1 AND deleted_at IS NULL`,
                [customerID]
            );
            if (customerExists.rows.length <= 0) throw new BadRequestError(`Bad customerID: ${customerID}`);

            const dfacExists = await db.query(
                `SELECT id from dfacs
                    WHERE id = $1 AND deleted_at IS NULL`,
                [dfacID]
            );
            if (dfacExists.rows.length <= 0) throw new BadRequestError(`Bad dfacID: ${dfacID}`);

            const ordersRes = await db.query(
                `INSERT INTO orders
                    (customer_id, dfac_id, comments, to_go)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id AS "orderID",
                            customer_id AS "customerID",
                            dfac_id AS "dfacID",
                            comments,
                            to_go AS "toGo",
                            order_timestamp AS "orderDateTime"`,
                [customerID, dfacID, comments, toGo]
            );

            const order = ordersRes.rows[0];
            const orderID = order.orderID;

            const mealRes = await db.query(
                `SELECT id AS "mealID",
                        dfac_id AS "dfacID",
                        meal_name AS "mealName",
                        description,
                        type,
                        price,
                        img_pic AS "imgPic",
                        likes
                FROM meals
                WHERE id = $1`,
                [mealID]
            );
            const meal = mealRes.rows[0];
            // const mealPrice = mealRes.rows[0].price; is unnecessary.
            // price_at_order field auto-populates through custom database trigger function

            if (!meal) throw new NotFoundError(`Meal not found: ${mealID}`);

            const order_mealsRes = await db.query(
                `INSERT INTO order_meals
                    (order_id, meal_id, quantity, special_instructions)
                    VALUES ($1, $2, $3, $4)
                    RETURNING id AS "orderMealID",            
                                order_id AS "orderID",
                                meal_id AS "mealID",
                                quantity,
                                special_instructions AS "specialInstructions"`,
                [orderID, mealID, quantity, specialInstructions]
            );
            const orderedMeal = order_mealsRes.rows[0];

            const mealOrdered = {
                meal: meal,
                order: order,
                orderMealJoin: orderedMeal
            }

            // // Commit the transaction only if everything worked
            // await client.query('COMMIT');

            return mealOrdered;
        } catch (err) {
            // await client.query('ROLLBACK');
            throw err;
        // } finally {
        //     // releasing the client back to the pool
        //     client.release();
        }
    }

    /**
     * Get all orders in the database.
     * @returns {orders: [
     *              {id, customer_id, dfac_id, comments, to_go ...},
     *                  {...}, ...] - An array of all orders.
     */
    static async getAllOrders() {
        const result = await db.query('SELECT * FROM orders');
        return result.rows;
    }

    /**
     * Get an order by orderID
     * returns { order: {orderID, dfacID, comments, orderDateTime, readyTime,
     *              pickedUpTime, canceled, favorite},
     *            meal: {mealID, dfacID, mealName, description, type, price,
     *              imgPic, likes, updatedAt} }
     */
    static async get(orderID) {
        const orderRes = await db.query(
            `SELECT id AS "orderID",
                    dfac_id AS "dfacID",
                    comments,
                    order_timestamp AS "orderDateTime",
                    ready_for_pickup AS "readyTime",
                    picked_up AS "pickedUpTime",
                    canceled,
                    favorite
                FROM orders
                WHERE id = $1`,
            [orderID]
        );

        const mealRes = await db.query(
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
                JOIN order_meals om ON m.id = om.meal_id
                JOIN orders o ON om.order_id = o.id
                WHERE o.id = $1`,
            [orderID]
        );
        
        const order = orderRes.rows[0];
        if(!order) throw new NotFoundError(`No orderID: ${orderID}`);

        const meal = mealRes.rows[0];
        if(!meal) throw new BadRequestError(`No meal in orderID: ${orderID}`);

        const orderedMeal = {
            order: order,
            meal: meal
        };

        return orderedMeal;
    }

    /**
     * Delete an existing order.
     * @param {integer} orderId - The ID of the order to delete.
     * @returns {Promise<Object>} - The deleted order.
     */
    static async remove(orderID) {
        let result = await db.query(
            `UPDATE orders
             SET deleted_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING id AS "orderID"`,
            [orderID]
        );
    
        const order = result.rows[0];
        if (!order) throw new NotFoundError(`No order: ${orderID}`);
    
        return order;
    }

    /**
     * Update the status of an order.
     * @param {integer} orderId - The ID of the order to update.
     * @param {Object} updates - The updates to apply (e.g., { readyForPickup: new Date() }).
     * @returns {Promise<Object>} - The updated order.
     */
    static async updateOrderStatus(orderId, updates) {
        const { setCols, values } = sqlForPartialUpdate(updates);
        const querySql = `UPDATE orders
                            SET ${setCols}
                            WHERE id = $1
                            RETURNING *`;
        const result = await db.query(querySql, [...values, orderId]);

        return result.rows[0];
    }

    /** function for checking if creating a new order conforms with time requirements */
    static isInOrderWindow() {
        // Get current date and time
        const currentDate = new Date();
        const currentDayOfWeek = currentDate.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
        const currentHour = currentDate.getHours();
        const currentMinute = currentDate.getMinutes();
    
        // Define order windows for weekdays (Monday through Friday)
        const weekdayOrderWindows = [
            { startHour: 6, startMinute: 30, endHour: 8, endMinute: 30 },
            { startHour: 10, startMinute: 0, endHour: 11, endMinute: 0 },
            { startHour: 15, startMinute: 30, endHour: 16, endMinute: 30 }
        ];
    
        // Define separate time frames for brunch and dinner on weekends (Saturday and Sunday)
        const brunchWindow = { startHour: 7, startMinute: 30, endHour: 11, endMinute: 0 };
        const dinnerWindow = { startHour: 14, startMinute: 30, endHour: 15, endMinute: 30 };
    
        // Check if the current time is within the allowed time frames
        if (currentDayOfWeek >= 1 && currentDayOfWeek <= 5) {
            // Check for weekdays
            return weekdayOrderWindows.some(({ startHour, startMinute, endHour, endMinute }) => {
                const startTime = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), startHour, startMinute);
                const endTime = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), endHour, endMinute);
    
                return currentDate >= startTime && currentDate <= endTime;
            });
        } else if (currentDayOfWeek === 0 || currentDayOfWeek === 6) {
            // Check for weekends (Saturday and Sunday)
            const isBrunchTime = currentHour >= brunchWindow.startHour && currentHour < brunchWindow.endHour;
            const isDinnerTime = currentHour >= dinnerWindow.startHour && currentHour < dinnerWindow.endHour;
    
            return isBrunchTime || isDinnerTime;
        } else {
            // Default case (other days)
            return false;
        }
        function isInOrderWindow() {
            // Get current date and time
            const currentDate = new Date();
            const currentDayOfWeek = currentDate.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
            const currentHour = currentDate.getHours();
            const currentMinute = currentDate.getMinutes();
        
            // Define order windows for weekdays (Monday through Friday)
            const weekdayOrderWindows = [
                { startHour: 6, startMinute: 30, endHour: 8, endMinute: 30 },
                { startHour: 10, startMinute: 0, endHour: 11, endMinute: 0 },
                { startHour: 15, startMinute: 30, endHour: 16, endMinute: 30 }
            ];
        
            // Define separate time frames for brunch and dinner on weekends (Saturday and Sunday)
            const brunchWindow = { startHour: 7, startMinute: 30, endHour: 11, endMinute: 0 };
            const dinnerWindow = { startHour: 14, startMinute: 30, endHour: 15, endMinute: 30 };
        
            // Check if the current time is within the allowed time frames
            if (currentDayOfWeek >= 1 && currentDayOfWeek <= 5) {
                // Check for weekdays
                return weekdayOrderWindows.some(({ startHour, startMinute, endHour, endMinute }) => {
                    const startTime = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), startHour, startMinute);
                    const endTime = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), endHour, endMinute);
        
                    return currentDate >= startTime && currentDate <= endTime;
                });
            } else if (currentDayOfWeek === 0 || currentDayOfWeek === 6) {
                // Check for weekends (Saturday and Sunday)
                const isBrunchTime = currentHour >= brunchWindow.startHour && currentHour < brunchWindow.endHour;
                const isDinnerTime = currentHour >= dinnerWindow.startHour && currentHour < dinnerWindow.endHour;
        
                return isBrunchTime || isDinnerTime;
            } else {
                // Default case (other days)
                return false;
            }
        }
        
        // Example usage when a user clicks the "order now" button
        /** const canOrder = isInOrderWindow();
        
        if (canOrder) {
            // Redirect to the order page or perform the order-related action
            console.log("You can access the order page!");
        } else {
            // Show a flash message indicating that ordering is not allowed at the current time
            console.log("Ordering is not allowed at the current time.");
        }
        */
    }
}

module.exports = Order;
