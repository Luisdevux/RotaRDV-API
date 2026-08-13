// src/models/Empresa.js

import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import brazilianDatePlugin from "../utils/helpers/mongooseBrazilianDatePlugin.js";

const enderecoSchema = new mongoose.Schema({
    cep: {
        type: String,
        required: false,
        default: ""
    },
    logradouro: {
        type: String,
        required: false,
        default: ""
    },
    numero: {
        type: String,
        required: false,
        default: ""
    },
    complemento: {
        type: String,
        required: false,
        default: ""
    },
    bairro: {
        type: String,
        required: false,
        default: ""
    },
    cidade: {
        type: String,
        required: false,
        default: ""
    },
    estado: {
        type: String,
        required: false,
        default: ""
    }
}, { _id: false });

class Empresa {
    constructor() {
        const empresaSchema = new mongoose.Schema({
            nome_empresa: {
                type: String,
                required: [true, "O nome da empresa é obrigatório!"],
                trim: true
            },
            cnpj: {
                type: String,
                required: [true, "O CNPJ é obrigatório!"],
                unique: true,
                trim: true
            },
            email: {
                type: String,
                required: [true, "O email institucional é obrigatório!"],
                unique: true,
                trim: true,
                lowercase: true
            },
            telefone: {
                type: String,
                required: false,
                default: ""
            },
            endereco: {
                type: enderecoSchema,
                required: false,
                default: () => ({})
            },
            status: {
                type: String,
                enum: ["ativo", "inativo"],
                default: "ativo"
            },
            foto_logo: {
                type: String,
                default: ""
            },
            gestor_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "usuarios",
                required: false
            }
        }, {
            timestamps: true,
            versionKey: false
        });

        empresaSchema.plugin(mongoosePaginate);
        empresaSchema.plugin(brazilianDatePlugin);

        this.model =
            mongoose.models.empresas || mongoose.model("empresas", empresaSchema);
    }
}

export default new Empresa().model;
