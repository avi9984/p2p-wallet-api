import express from "express";
import * as transferController from "../controllers/transfer.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { transferSchema, getTransferSchema } from "../validations/transaction.validation.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware);
// Perform P2P Transfer (POST /transfers)
router.post("/", validate(transferSchema), transferController.transfer);

// Get Transfer by ID (GET /transfers/:id)
router.get("/:id", validate(getTransferSchema), transferController.getTransfer);

export default router;
