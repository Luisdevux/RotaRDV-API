// src/models/DespesaManutencao.js

import mongoose from "mongoose";
import Despesa from "./Despesa.js";

const despesaManutencaoSchema = new mongoose.Schema({
    oficina_nome: {
        type: String,
        default: ""
    }
}, { _id: false });

const DespesaManutencao = mongoose.models.despesas_manutencoes ||
    Despesa.discriminator("MANUTENCAO", despesaManutencaoSchema);

export default DespesaManutencao;
