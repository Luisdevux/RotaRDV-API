// src/repositories/filters/ViagemFilterBuild.js

class ViagemFilterBuild {
    constructor() {
        this.filtros = {};
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
        if (data_inicio || data_fim) {
            this.filtros.data_inicio = {};
            if (data_inicio) this.filtros.data_inicio.$gte = new Date(data_inicio);
            if (data_fim) this.filtros.data_inicio.$lte = new Date(data_fim);
        }
        return this;
    }

    build() {
        return this.filtros;
    }
}

export default ViagemFilterBuild;
