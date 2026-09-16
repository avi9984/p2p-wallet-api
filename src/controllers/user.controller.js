import * as userService from "../services/user.service.js";
import * as walletService from "../services/wallet.service.js";

export const createUser = async (req, res, next) => {
    try {
        const user = await userService.createUser(req.body);
        return res.status(201).json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
};

export const loginUser = async (req, res, next) => {
    try {
        const result = await userService.loginUser(req.body);
        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        const result = await userService.refreshAccessToken({ refreshToken });
        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getUser = async (req, res, next) => {
    try {
        const user = await userService.getUserById(req.params.id);
        return res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
};

export const getUserWallet = async (req, res, next) => {
    try {
        const userId = req.params.userId || req.params.user_id || req.params.id;
        const wallet = await walletService.getWalletByUserId(userId);
        return res.status(200).json({
            success: true,
            data: wallet
        });
    } catch (error) {
        next(error);
    }
};
