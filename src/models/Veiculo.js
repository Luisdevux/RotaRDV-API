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
