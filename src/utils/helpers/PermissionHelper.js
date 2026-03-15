// src/utils/helpers/PermissionHelper.js

import CustomError from './CustomError.js';
import HttpStatusCodes from './HttpStatusCodes.js';

function ensurePermission({ usuarioLogado, targetId, field, customMessage }) {
    const isAdmin = usuarioLogado.isAdmin;
    const isSelf = String(usuarioLogado._id) === String(targetId);

    if (!isAdmin && !isSelf) {
        throw new CustomError({
            statusCode: HttpStatusCodes.FORBIDDEN.code,
            errorType: 'permissionError',
            field,
            details: [],
            customMessage,
        });
    }

    return { isAdmin, isSelf };
}

export default ensurePermission;
