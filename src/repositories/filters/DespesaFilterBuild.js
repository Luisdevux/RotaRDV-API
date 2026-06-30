// src/repositories/filters/DespesaFilterBuild.js

class DespesaFilterBuild {
    constructor() {
        this.filtros = {};
    }

    comViagemId(viagemId) {
        if (viagemId) {
            this.filtros.viagem_id = viagemId;
        }
        return this;
    }

    comTipo(tipo) {
        if (tipo) {
            this.filtros.tipo = tipo;
        }
        return this;
    }

    comDataEntre(dataInicio, dataFim) {
        if (dataInicio || dataFim) {
            this.filtros.data = {};
            if (dataInicio) this.filtros.data.$gte = new Date(dataInicio);
            if (dataFim) this.filtros.data.$lte = new Date(dataFim);
        }
        return this;
    }

    build() {
        return this.filtros;
    }
}

export default DespesaFilterBuild;
