// src/models/Veiculo.js

import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import brazilianDatePlugin from "../utils/helpers/mongooseBrazilianDatePlugin.js";

class Veiculo {
    constructor() {
        const veiculoSchema = new mongoose.Schema({
            modelo: {
                type: String,
                required: [true, "O modelo é obrigatório!"]
            },
            placa: {
                type: String,
                required: [true, "A placa é obrigatória!"],
                unique: true
            },
            combustivel_preferencial: {
                type: String,
                enum: ["DIESEL_S10", "DIESEL_S500", "GASOLINA", "ETANOL", "ARLA_32", "OUTRO"],
                required: [true, "O combustível preferencial é obrigatório!"]
            },
            status: {
                type: String,
                enum: ["ativo", "inativo"],
                default: "ativo"
            },
            capacidade_tanque: {
                type: Number,
                default: 400
            },
            ano_fabricacao: {
                type: Number,
                default: 2024
            },
            reboque: {
                modelo: {
                    type: String,
                    required: false
                },
                placas: {
                    type: [String], // Array para receber as placas das carretas do conjunto
                    required: false
                },
                ano_fabricacao: {
                    type: Number,
                    required: false
                }
            },
            empresa_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "empresas",
                required: false,
                default: null
            }
        }, {
            timestamps: true,
            versionKey: false
        });

        veiculoSchema.plugin(mongoosePaginate);
        veiculoSchema.plugin(brazilianDatePlugin);

        this.model =
            mongoose.models.veiculos || mongoose.model("veiculos", veiculoSchema);
    }
}

export default new Veiculo().model;
