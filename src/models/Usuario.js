// src/models/Usuario.js

import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import brazilianDatePlugin from "../utils/helpers/mongooseBrazilianDatePlugin.js";

class Usuario {
    constructor() {
        const usuarioSchema = new mongoose.Schema({
            nome: {
                type: String,
                required: [true, "O nome é obrigatório!"]
            },
            email: {
                type: String,
                required: [true, "O email é obrigatório!"],
                unique: true
            },
            senha: {
                type: String,
                required: [true, "A senha é obrigatória!"],
                select: false
            },
            googleId: {
                type: String,
                unique: true,
                sparse:true
            },
            authProvider: {
                type: String,
                enum: ["local", "google"],
                default: "local"
            },
            cpf: {
                type: String,
                unique: true,
                sparse: true
            },
            status: {
                type: String,
                enum: ["ativo", "inativo"],
                default: "ativo"
            },
            isAdmin: {
                type: Boolean,
                default: false
            },
            foto_perfil: {
                type: String,
                default: ""
            },
            empresa: {
                nome: {
                    type: String
                },
                cargo: {
                    type: String
                }
            },
            veiculo_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "veiculos"
            },
            refreshtoken: {
                type: String,
                select: false
            },
            accesstoken: {
                type: String,
                select: false
            },
            tokenUnico: {
                type: String,
                select: false
            },
            codigo_recupera_senha: {
                type: String,
                select: false
            },
            exp_codigo_recupera_senha: {
                type: Date,
                select: false
            },
            email_verificado: {
              type: Boolean,
              default: false
            },
            token_verificacao_email: {
              type: String,
              select: false
            },
            exp_token_verificacao_email: {
              type: Date,
              select: false
            }
        }, {
            timestamps: true,
            versionKey: false
        });

        usuarioSchema.plugin(mongoosePaginate);
        usuarioSchema.plugin(brazilianDatePlugin);

        this.model =
            mongoose.models.usuarios || mongoose.model("usuarios", usuarioSchema);
    }
}

export default new Usuario().model;
