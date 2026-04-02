// src/models/Despesa.js

import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import brazilianDatePlugin from "../utils/helpers/mongooseBrazilianDatePlugin.js";

const despesaSchema = new mongoose.Schema({
    viagem_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "viagens",
        required: [true, "O ID da viagem é obrigatório!"]
    },
    tipo: {
        type: String,
        required: [true, "O tipo da despesa é obrigatório!"],
        enum: ["ABASTECIMENTO", "ALIMENTACAO", "MANUTENCAO", "PEDAGIO", "OUTROS"]
    },
    valor_total: {
        type: Number,
        required: [true, "O valor da despesa é obrigatório!"]
    },
    data: {
        type: Date,
        required: [true, "A data da despesa é obrigatória!"]
    },
    local: {
        type: String,
        default: ""
    },
    descricao: {
        type: String,
        default: ""
    },
    foto_anexo: {
        type: String,
        default: ""
    }
}, {
    timestamps: true,
    versionKey: false,
    discriminatorKey: "tipo", // Isso diz ao Mongoose qual campo usar para diferenciar os tipos
    collection: "despesas"
});

despesaSchema.plugin(mongoosePaginate);
despesaSchema.plugin(brazilianDatePlugin);

const Despesa = mongoose.models.despesas || mongoose.model("despesas", despesaSchema);

export default Despesa;
