"use strict";

/** Express app for dfacDash */

const express = require('express');
const app = express();
const cors = require("cors");
const morgan = require("morgan");

const { authenticateJWT } = require("./middleware/auth");
const { NotFoundError } = require("./expressError");
const customerRoutes = require("./routes/customers");
const authRoutes = require("./routes/auth");

// Middleware
app.use(express.json());
app.use(cors());
app.use(morgan("tiny"));
app.use(authenticateJWT);

// routes
app.use("/customers", customerRoutes);
app.use("/auth", authRoutes);

// Handle most errors with 404
app.use((req, res, next) => {
        return next(new NotFoundError());
});

// Everything else unhandled gets caught here
app.use((err, req, res, next) => {
        if (process.env.NODE_ENV !== "test") console.error(err.stack);
        const status = err.status || 500;
        const message = err.message;

        return res.status(status).json({
                error: { message, status }
        });
});

module.exports = app;