export const validate = (schema) => (req, res, next) => {
    try {
        const result = schema.safeParse({
            body: req.body,
            query: req.query,
            params: req.params
        });

        if (!result.success) {
            const formattedErrors = result.error.issues?.map((issue) => ({
                field: issue.path.slice(1).join(".") || issue.path.join("."),
                message: issue.message
            })) || [];

            return res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: formattedErrors[0]?.message || "Validation failed",
                    details: formattedErrors
                }
            });
        }

        if (result.data.body) req.body = result.data.body;
        if (result.data.params) Object.assign(req.params, result.data.params);
        if (result.data.query) {
            Object.defineProperty(req, "query", {
                value: result.data.query,
                writable: true,
                configurable: true,
                enumerable: true
            });
        }

        next();
    } catch (error) {
        next(error);
    }
};
