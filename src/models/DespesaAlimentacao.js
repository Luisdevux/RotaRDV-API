// src/models/DespesaAlimentacao.js

import mongoose from "mongoose";
import Despesa from "./Despesa.js";

const despesaAlimentacaoSchema = new mongoose.Schema({
    tipo_refeicao: {
        type: String,
        required: [true, "O tipo da refeição é obrigatório!"]
    }
}, { _id: false });

const DespesaAlimentacao = mongoose.models.despesas_alimentacoes ||
    Despesa.discriminator("ALIMENTACAO", despesaAlimentacaoSchema);

export default DespesaAlimentacao;
