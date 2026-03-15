// src/utils/helpers/CustomError.js

class CustomError extends Error {
    constructor({ statusCode, errorType, field = null, details = [], customMessage = null } = {}) {
        super(customMessage || 'An error occurred');
        this.name = 'CustomError';
        this.statusCode = statusCode;
        this.errorType = errorType;
        this.field = field;
        this.details = details;
        this.customMessage = customMessage;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

export default CustomError;
