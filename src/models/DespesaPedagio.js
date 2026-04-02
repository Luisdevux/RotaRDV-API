// src/models/DespesaPedagio.js

import mongoose from "mongoose";
import Despesa from "./Despesa.js";

const despesaPedagioSchema = new mongoose.Schema({
    praca_nome: {
        type: String,
        default: ""
    }
}, { _id: false });

const DespesaPedagio = mongoose.models.despesas_pedagios ||
    Despesa.discriminator("PEDAGIO", despesaPedagioSchema);

export default DespesaPedagio;
