// src/repositories/filters/DespesaFilterBuild.js

import mongoose from "mongoose";

class DespesaFilterBuild {
    constructor() {
        this.filtros = {};
    }

    comViagemId(viagemId) {
        if (viagemId) {
            if (Array.isArray(viagemId)) {
                this.filtros.viagem_id = {
                    $in: viagemId.flatMap(id => mongoose.isValidObjectId(id) ? [String(id), new mongoose.Types.ObjectId(id)] : [id])
                };
            } else if (mongoose.isValidObjectId(viagemId)) {
                this.filtros.viagem_id = {
                    $in: [String(viagemId), new mongoose.Types.ObjectId(viagemId)]
                };
            } else {
                this.filtros.viagem_id = viagemId;
            }
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
