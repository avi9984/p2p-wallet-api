import express from "express";
import * as userController from "../controllers/user.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { registerSchema, loginSchema, getUserSchema, refreshTokenSchema } from "../validations/auth.validation.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
const router = express.Router();

// User Registration / Creation
router.post("/", validate(registerSchema), userController.createUser);

// User Login (JWT)
router.post("/login", validate(loginSchema), userController.loginUser);

// Refresh Access Token
router.post("/refresh-token", validate(refreshTokenSchema), userController.refreshToken);

// Get User by ID
router.get("/:id", authMiddleware, validate(getUserSchema), userController.getUser);

// Get User's Wallet (GET /users/:userId/wallet or GET /users/:user_id/wallet)
router.get("/:userId/wallet", authMiddleware, userController.getUserWallet);

export default router;
