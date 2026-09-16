import * as transferService from "../services/transfer.service.js";

export const transfer = async (req, res, next) => {
    try {
        const { from_user_id, to_user_id, amount, idempotency_key, description } = req.body;

        const result = await transferService.transfer({
            fromUserId: from_user_id,
            toUserId: to_user_id,
            amount,
            idempotencyKey: idempotency_key,
            description
        });

        return res.status(201).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getTransfer = async (req, res, next) => {
    try {
        const transfer = await transferService.getTransferById(req.params.id);
        return res.status(200).json({
            success: true,
            data: transfer
        });
    } catch (error) {
        next(error);
    }
};
