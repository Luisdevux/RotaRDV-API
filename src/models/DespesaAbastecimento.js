// src/models/DespesaAbastecimento.js

import mongoose from "mongoose";
import Despesa from "./Despesa.js";

const despesaAbastecimentoSchema = new mongoose.Schema({
    litros: {
        type: Number,
        required: [true, "A quantidade de litros é obrigatória!"]
    },
    km_atual: {
        type: Number,
        required: [true, "A quilometragem atual é obrigatória!"]
    }
}, { _id: false }); // _id é gerado automaticamente, mas ele herdará o do documento base

const DespesaAbastecimento = mongoose.models.despesas_abastecimentos ||
    Despesa.discriminator("ABASTECIMENTO", despesaAbastecimentoSchema);

export default DespesaAbastecimento;
