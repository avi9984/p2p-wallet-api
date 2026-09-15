export const errorMiddleware = (error, req, res, next) => {
    console.error(error);

    return res.status(
        error.statusCode || 500
    ).json({
        error: {
            code: error.code || "INTERNAL_SERVER_ERROR",
            message: error.message || "Something went wrong"
        }
    });
};