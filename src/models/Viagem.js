// src/models/Viagem.js

import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import crypto from "crypto";
import brazilianDatePlugin from "../utils/helpers/mongooseBrazilianDatePlugin.js";

const veiculoSnapshotSchema = new mongoose.Schema({
    placa: String,
    modelo: String,
    reboque: {
        modelo: String,
        placas: [String]
    }
}, { _id: false });

const usuarioSnapshotSchema = new mongoose.Schema({
    nome: String,
    email: String
}, { _id: false });

class Viagem {
    constructor() {
        const viagemSchema = new mongoose.Schema({
            _id: {
                type: String,
                default: () => crypto.randomUUID(),
                required: [true, "O UUID da viagem é obrigatório para sincronização offline!"]
            },
            usuario_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "usuarios",
                required: [true, "O ID do usuário é obrigatório!"]
            },
            // Snapshot do motorista
            usuario_snapshot: {
                type: usuarioSnapshotSchema,
                required: [true, "O snapshot do usuário é obrigatório!"]
            },
            veiculo_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "veiculos",
                required: [true, "O ID do veículo é obrigatório!"]
            },
            // Snapshot do veículo
            veiculo_snapshot: {
                type: veiculoSnapshotSchema,
                required: [true, "O snapshot do veículo é obrigatório!"]
            },
            origem: {
                cidade: {
                    type: String,
                    required: [true, "A cidade de origem é obrigatória!"]
                },
                estado: {
                    type: String,
                    required: [true, "O estado de origem é obrigatório!"]
                }
            },
            destino: {
                cidade: {
                    type: String,
                    required: [true, "A cidade de destino é obrigatória!"]
                },
                estado: {
                    type: String,
                    required: [true, "O estado de destino é obrigatório!"]
                }
            },
            data_inicio: {
                type: Date,
                required: [true, "A data de início é obrigatória!"]
            },
            data_fim: {
                type: Date,
                required: false
            },
            km_inicial: {
                type: Number,
                required: [true, "O km inicial é obrigatório!"]
            },
            km_final: {
                type: Number,
                default: null
            },
            descricao: {
                type: String,
                default: ""
            },
            status: {
                type: String,
                enum: ["em_andamento", "concluída", "cancelada"],
                default: "em_andamento"
            }
        }, {
            timestamps: true,
            versionKey: false
        });

        viagemSchema.plugin(mongoosePaginate);
        viagemSchema.plugin(brazilianDatePlugin);

        this.model =
            mongoose.models.viagens || mongoose.model("viagens", viagemSchema);
    }
}

export default new Viagem().model;
