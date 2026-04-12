import JWT from "jsonwebtoken";
import userModel from "../models/userModel.js";

// Protected routes token base
// Kailashwaran, A0253385Y
export const requireSignIn = async (req, res, next) => {
    try {
        if (!req.headers.authorization) {
            return res.status(401).send({
                success: false,
                message: "Unauthorized: No token provided",
            });
        }

        const decode = JWT.verify(req.headers.authorization, process.env.JWT_SECRET);
        console.log(decode);
        req.user = decode;
        return next();
    } catch (error) {
        console.log(error);
        // If token is invalid/expired, return 401 Unauthorized
        if (
            error &&
            (error.name === "TokenExpiredError" ||
                error.name === "JsonWebTokenError" ||
                error.name === "NotBeforeError")
        ) {
            return res.status(401).send({
                success: false,
                error,
                message: "Unauthorized: Invalid or expired token",
            });
        }

        // Other errors
        return res.status(500).send({
            success: false,
            error,
            message: "Error in signIn middleware",
        });
    }
};

//admin access
export const isAdmin = async (req, res, next) => {
    try {
        const user = await userModel.findById(req.user._id);
        if (user.role !== 1) {
            return res.status(401).send({
                success: false,
                message: "UnAuthorized Access",
            });
        } else {
            next();
        }
    } catch (error) {
        console.log(error);
        // If the error is related to JWT/authorization, return 401
        if (
            error &&
            (error.name === "TokenExpiredError" ||
                error.name === "JsonWebTokenError" ||
                error.name === "NotBeforeError")
        ) {
            return res.status(401).send({
                success: false,
                error,
                message: "Unauthorized: Invalid or expired token",
            });
        }

        res.status(500).send({
            success: false,
            error,
            message: "Error in admin middleware",
        });
    }
};