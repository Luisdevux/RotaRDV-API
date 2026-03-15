// src/utils/TokenUtil.js

import jwt from 'jsonwebtoken';

class TokenUtil {
    generateAccessToken(id) {
        return new Promise((resolve, reject) => {
            jwt.sign(
                { id },
                process.env.JWT_SECRET_ACCESS_TOKEN,
                { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRATION || '1d' },
                (err, token) => {
                    if (err) return reject(err);
                    resolve(token);
                }
            );
        });
    }

    generateRefreshToken(id) {
        return new Promise((resolve, reject) => {
            jwt.sign(
                { id },
                process.env.JWT_SECRET_REFRESH_TOKEN,
                { expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRATION || '7d' },
                (err, token) => {
                    if (err) return reject(err);
                    resolve(token);
                }
            );
        });
    }

    generatePasswordRecoveryToken(id) {
        return new Promise((resolve, reject) => {
            jwt.sign(
                { id },
                process.env.JWT_SECRET_PASSWORD_RECOVERY,
                { expiresIn: process.env.JWT_PASSWORD_RECOVERY_EXPIRATION || '1h' },
                (err, token) => {
                    if (err) return reject(err);
                    resolve(token);
                }
            );
        });
    }

    decodePasswordRecoveryToken(token, secret) {
        return new Promise((resolve, reject) => {
            jwt.verify(token, secret, (err, decoded) => {
                if (err) return reject(err);
                resolve(decoded.id);
            });
        });
    }
}

export default new TokenUtil();
