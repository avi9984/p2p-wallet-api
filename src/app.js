import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import routes from "./routes/index.js";
import { errorMiddleware } from "./middleware/error.middleware.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(helmet());

// Health Check
app.get("/health", (req, res) => {
    return res.status(200).json({
        success: true,
        message: "P2P Wallet API is running"
    });
});

// Mount Application Routes
app.use("/", routes);

// Handle 404 for unknown endpoints
app.use((req, res) => {
    return res.status(404).json({
        error: {
            code: "NOT_FOUND",
            message: `Route ${req.method} ${req.originalUrl} not found`
        }
    });
});

// Global Error Handling Middleware
app.use(errorMiddleware);

export default app;