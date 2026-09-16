import * as walletService from "../services/wallet.service.js";

export const deposit = async (req, res, next) => {
    try {
        const walletId = req.params.id || req.params.walletId;
        const { amount, idempotency_key } = req.body;

        const result = await walletService.deposit({
            walletId,
            amount,
            idempotencyKey: idempotency_key
        });

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getWallet = async (req, res, next) => {
    try {
        const wallet = await walletService.getWalletById(req.params.id);
        return res.status(200).json({
            success: true,
            data: wallet
        });
    } catch (error) {
        next(error);
    }
};

export const getTransactions = async (req, res, next) => {
    try {
        const walletId = req.params.id || req.params.walletId;
        const { page, limit, type, status } = req.query;

        const result = await walletService.getWalletTransactions({
            walletId,
            page,
            limit,
            type,
            status
        });

        return res.status(200).json({
            success: true,
            data: result.transactions,
            pagination: result.pagination
        });
    } catch (error) {
        next(error);
    }
};
