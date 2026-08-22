// src/repositories/filters/ViagemFilterBuild.js

import { DateHelper } from '../../utils/helpers/index.js';

class ViagemFilterBuild {
    constructor() {
        this.filtros = {};
    }

    comEmpresaId(empresa_id) {
        if (empresa_id) {
            this.filtros.empresa_id = empresa_id;
        }
        return this;
    }

    comUsuarioId(usuario_id) {
        if (usuario_id) {
            this.filtros.usuario_id = usuario_id;
        }
        return this;
    }

    comVeiculoId(veiculo_id) {
        if (veiculo_id) {
            this.filtros.veiculo_id = veiculo_id;
        }
        return this;
    }

    comStatus(status) {
        if (status) {
            this.filtros.status = status;
        }
        return this;
    }

    comDataRange(data_inicio, data_fim) {
        const inicio = DateHelper.parseFlexibleDate(data_inicio);
        const fim = DateHelper.parseFlexibleDate(data_fim);

        if (inicio || fim) {
            this.filtros.data_inicio = {};
            if (inicio) this.filtros.data_inicio.$gte = inicio;
            if (fim) {
                // Se a string da data final não trouxer horário (ex: YYYY-MM-DD), ajusta para o fim do dia
                if (typeof data_fim === 'string' && !data_fim.includes('T') && !data_fim.includes(':')) {
                    fim.setHours(23, 59, 59, 999);
                }
                this.filtros.data_inicio.$lte = fim;
            }
        }
        return this;
    }

    build() {
        return this.filtros;
    }
}

export default ViagemFilterBuild;
