// src/models/Despesa.js

import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";
import crypto from "crypto";
import brazilianDatePlugin from "../utils/helpers/mongooseBrazilianDatePlugin.js";

const despesaSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: () => crypto.randomUUID(),
        required: [true, "O UUID da despesa é obrigatório para sincronização offline!"]
    },
    viagem_id: {
        type: String,
        ref: "viagens",
        required: [true, "O UUID da viagem é obrigatório!"]
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
    discriminatorKey: "tipo",
    collection: "despesas"
});

// Middleware para atualizar o resumo financeiro da viagem
async function atualizarResumoViagem(doc) {
    const Viagem = mongoose.model("viagens");
    const Despesa = mongoose.model("despesas");

    const viagemId = doc.viagem_id;

    const pipeline = [
        { $match: { viagem_id: viagemId } },
        {
            $group: {
                _id: "$tipo",
                total: { $sum: "$valor_total" }
            }
        }
    ];

    const resultados = await Despesa.aggregate(pipeline);

    const resumo = {
        total_geral: 0,
        por_categoria: {
            ABASTECIMENTO: 0,
            ALIMENTACAO: 0,
            MANUTENCAO: 0,
            PEDAGIO: 0,
            OUTROS: 0
        }
    };

    resultados.forEach(res => {
        resumo.por_categoria[res._id] = res.total;
        resumo.total_geral += res.total;
    });

    await Viagem.findByIdAndUpdate(viagemId, { resumo_financeiro: resumo });
}

despesaSchema.post("save", async function (doc) {
    await atualizarResumoViagem(doc);
});

despesaSchema.post("findOneAndUpdate", async function (doc) {
    if (doc) {
        await atualizarResumoViagem(doc);
    }
});

despesaSchema.post("findOneAndDelete", async function (doc) {
    if (doc) {
        await atualizarResumoViagem(doc);
    }
});

despesaSchema.plugin(mongoosePaginate);
despesaSchema.plugin(brazilianDatePlugin);

const Despesa = mongoose.models.despesas || mongoose.model("despesas", despesaSchema);

export default Despesa;
