import express from "express";
import userRoutes from "./user.routes.js";
import walletRoutes from "./wallet.routes.js";
import transferRoutes from "./transfer.routes.js";

import { apiLimiter } from "./middleware/rateLimiter.js";
const router = express.Router();

app.use("/api", apiLimiter);

router.use("/users", userRoutes);
router.use("/wallets", walletRoutes);
router.use("/transfers", transferRoutes);

export default router;
