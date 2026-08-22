// src/utils/helpers/PermissionHelper.js

import CustomError from './CustomError.js';
import HttpStatusCodes from './HttpStatusCodes.js';
import messages from './messages.js';

function ensurePermission({
    usuarioLogado,
    targetId,
    isOwner,
    empresaId,
    field,
    customMessage = messages.auth.invalidPermission
}) {
    const isSuperAdmin = usuarioLogado?.role === 'superAdmin';
    const isAdmin = Boolean(usuarioLogado?.role === 'admin' || isSuperAdmin);

    const isDriver = typeof isOwner === 'boolean'
        ? isOwner
        : (targetId ? String(usuarioLogado?._id) === String(targetId) : false);

    const isCompanyStaff = empresaId
        ? ((usuarioLogado?.role === 'gestor' || usuarioLogado?.role === 'admin') && String(usuarioLogado?.empresa_id) === String(empresaId))
        : (usuarioLogado?.role === 'gestor' || usuarioLogado?.role === 'admin');

    if (!isSuperAdmin && !isDriver && !isCompanyStaff) {
        throw new CustomError({
            statusCode: HttpStatusCodes.FORBIDDEN.code,
            errorType: 'permissionError',
            field,
            details: [],
            customMessage,
        });
    }

    return { isSuperAdmin, isAdmin, isDriver, isGestor: isCompanyStaff };
}

export default ensurePermission;
