import "dotenv/config";
import app from "./app.js";
import prisma from "./config/prisma.js";

const PORT = process.env.PORT || 3000;

const startServer = async () => {

    try {

        await prisma.$connect();

        console.log("PostgreSQL connected");

        app.listen(PORT, () => {

            console.log(
                `Server running on http://localhost:${PORT}`
            );

        });

    } catch (error) {

        console.error(
            "Failed to connect to database:",
            error
        );

        process.exit(1);
    }
};


startServer();