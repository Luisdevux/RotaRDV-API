// src/utils/helpers/PermissionHelper.js

import CustomError from './CustomError.js';
import HttpStatusCodes from './HttpStatusCodes.js';
import messages from './messages.js';

function ensurePermission({ usuarioLogado, targetId, isOwner, field, customMessage = messages.auth.invalidPermission }) {
    const isAdmin = usuarioLogado.isAdmin;
    
    const isDriver = typeof isOwner === 'boolean' 
        ? isOwner 
        : (targetId ? String(usuarioLogado._id) === String(targetId) : false);

      if (!isAdmin && !isDriver) {
          throw new CustomError({
            statusCode: HttpStatusCodes.FORBIDDEN.code,
            errorType: 'permissionError',
            field,
            details: [],
            customMessage,
        });
    }

    return { isAdmin, isDriver };
}

export default ensurePermission;
