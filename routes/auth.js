"use strict";

/** Routes for new and returning users; no token required */

const express = require("express");
const router = new express.Router;

const jsonschema = require("jsonschema");
const customerRegisterSchema = require("../schemas/customerRegister.json");
const cookRegisterSchema = require("../schemas/new92G.json");
const Customer = require("../models/customer");
const Cook = require("../models/cook");
const Dfac = require("../models/dfac");
const { createToken } = require("../helpers/tokens");
const { BadRequestError } = require("../expressError");

/** POST /auth/register/customer
 * 
 * customer must include { username, password, firstName, lastName, dodid, mealCard, isAdmin, role }
 * 
 * returns JWT token which can be used to authenticate further requests
 * Authorization required: none
 */
router.post("/register/customer", async (req, res, next) => {
    try {
        const validator = jsonschema.validate(req.body, customerRegisterSchema);

        if(!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const newCustomer = await Customer.register(req.body);
        const token = createToken(newCustomer);

        return res.status(201).json({ token });
    } catch (err) {
        return next(err);
    }
});

/** POST route for customer login
 * 
 * logs in with { username, password }
 * returns 
 *     JWT token for authenticating further HTTP requests
 * 
 * No authorization required
 */
router.post("/customer/login", async (req, res, next) => {
    try {
        const { username, password } = req.body;
        const customer = await Customer.authenticate(username, password);

        if (customer) {
            customer.role = "customer";
            
            const token = createToken(customer);
            return res.json({ token });
        } else {
            throw new BadRequestError("Bad username/password")
        }
    } catch (err) {
        return next(err);
    }
});

/** POST /auth/register/92G
 * 
 * 92G must include { dfacID, username, password, firstName, lastName, dodid,
 *    email, isAdmin, isManager, updateMenu, updateHours, updateMeals, updateOrders, role }
 * 
 * returns JWT token which can be used to authenticate further requests
 * Authorization required: none
 */
router.post("/register/92G", async (req, res, next) => {
    try {
        const validator = jsonschema.validate(req.body, cookRegisterSchema);

        if(!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const newCook = await Cook.register(req.body);
        const token = createToken(newCook);

        return res.status(201).json({ token });
    } catch (err) {
        return next(err);
    }
});

/** POST route for 92G login
 * 
 * logs in with { username, password }
 * returns 
 *     JWT token for authenticating further HTTP requests
 * 
 * No authorization required
 */
router.post("/92G/login", async (req, res, next) => {
    try {
        const { username, password } = req.body;
        const cook = await Cook.authenticate(username, password);

        if (cook) {
            cook.role = "92G";

            const token = createToken(cook);
            return res.json({ token });
        } else {
            throw new BadRequestError("Bad username/password")
        }
    } catch (err) {
        return next(err);
    }
});

/** GET route for accessing DFAC data - READ
 * 
 * returns all dfacs as the response object locals: dfacs
 * /auth/dfacs --> { dfacs: [ {dfacID, dfacName, dfacLogo, street, bldgNum, city, state, zip, dfacPhone, flashMsg1, flashMsg2,
 *                  bfHours, luHours, dnHours, bchHours, supHours, orderBf, orderLu, orderDn, orderBch, orderSup },
 *                              {dfacName, ...}, {...}, ...] }
 * 
 * Authorization required: none
 */
router.get("/dfacs", async (req, res, next) => {
    try {
        const dfacs = await Dfac.findAll();

        return res.json({ dfacs });
    } catch (err) {
        return next(err);
    }
});

/** GET route for accessing a specific DFAC's data - READ
 * 
 * takes dfacID as a parameter
 * 
 * returns specific dfac data in the response object locals: dfac
 * /auth/dfacs/[dfacID] --> {  dfac:
 *                              { dfacDetails: {dfacID, dfacName, dfacLogo, street, bldgNum, city, state, zip, dfacPhone, flashMsg1, flashMsg2,
 *                               bfHours, luHours, dnHours, bchHours, supHours, orderBf, orderLu, orderDn, orderBch, orderSup},
 *                              meals: [ {mealID, dfacID, description, type, price, imgPic, likes}, {mealID, dfacID, ...}, {...}, ... ] 
 *                      }
 * Authorization required: none
 */
router.get("/:dfacID", async (req, res, next) => {
    try {
        const dfacTarget = req.params.dfacID;
        const dfac = await Dfac.get(dfacTarget);

        return res.json({ dfac });
    } catch (err) {
        return next(err);
    }
});

module.exports = router;
