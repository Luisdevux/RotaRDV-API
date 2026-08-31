// src/services/SyncService.js

import Viagem from '../models/Viagem.js';
import Despesa from '../models/Despesa.js';
import Usuario from '../models/Usuario.js';
import Veiculo from '../models/Veiculo.js';
import { DateHelper } from '../utils/helpers/index.js';

class SyncService {
    async pushSync(usuarioRef, viagens, despesas) {
        const userId = usuarioRef._id || usuarioRef;
        const usuarioLogado = await Usuario.findById(userId).populate('veiculo_id');

        const results = { viagensUpserted: 0, viagensDeleted: 0, despesasUpserted: 0, despesasDeleted: 0 };

        if (!usuarioLogado) {
            return results;
        }

        const veiculoDoc = usuarioLogado.veiculo_id;

        if (viagens && viagens.length > 0) {
            const bulkViagens = [];
            for (const v of viagens) {
                if (v.is_deleted) {
                    bulkViagens.push({
                        deleteOne: { filter: { _id: v._id, usuario_id: usuarioLogado._id } }
                    });
                } else {
                    v.usuario_id = usuarioLogado._id;
                    if (usuarioLogado.empresa_id && !v.empresa_id) {
                        v.empresa_id = usuarioLogado.empresa_id;
                    }

                    // Autopreenche snapshot do motorista caso não venha no payload
                    if (!v.usuario_snapshot) {
                        v.usuario_snapshot = {
                            nome: usuarioLogado.nome,
                            email: usuarioLogado.email
                        };
                    }

                    // Autopreenche veículo e snapshot do caminhão vinculado ao motorista
                    if (!v.veiculo_id && veiculoDoc) {
                        v.veiculo_id = veiculoDoc._id;
                    }
                    if (!v.veiculo_snapshot && veiculoDoc) {
                        v.veiculo_snapshot = {
                            placa: veiculoDoc.placa,
                            modelo: veiculoDoc.modelo,
                            reboque: {
                                modelo: veiculoDoc.reboque?.modelo || '',
                                placas: veiculoDoc.reboque?.placas || []
                            }
                        };
                    }

                    delete v.is_deleted;
                    v.updatedAt = new Date();

                    bulkViagens.push({
                        updateOne: {
                            filter: { _id: v._id, usuario_id: usuarioLogado._id },
                            update: { $set: v },
                            upsert: true
                        }
                    });
                }
            }

            if (bulkViagens.length > 0) {
                const vRes = await Viagem.bulkWrite(bulkViagens, { ordered: false });
                results.viagensUpserted = (vRes.upsertedCount || 0) + (vRes.modifiedCount || 0);
                results.viagensDeleted = vRes.deletedCount || 0;
            }
        }

        if (despesas && despesas.length > 0) {
            // Busca todas as viagens que pertencem ao usuário logado na base + viagens do lote atual
            const viagensDoMotorista = await Viagem.find({ usuario_id: usuarioLogado._id }, '_id');
            const incomingViagemIds = (viagens || []).filter(v => !v.is_deleted).map(v => String(v._id));
            const validViagemIds = new Set([
                ...viagensDoMotorista.map(v => String(v._id)),
                ...incomingViagemIds
            ]);

            const bulkDespesas = [];

            for (const d of despesas) {
                // Ignora despesas sem viagem ou de viagens que não são deste motorista
                if (!d.viagem_id || !validViagemIds.has(String(d.viagem_id))) {
                    continue;
                }

                if (d.is_deleted) {
                    bulkDespesas.push({
                        deleteOne: { filter: { _id: d._id, viagem_id: d.viagem_id } }
                    });
                } else {
                    delete d.is_deleted;

                    // Protege contra sobrescrever uma foto_anexo já enviada caso o sync venha sem a URL
                    if (!d.foto_anexo) {
                        delete d.foto_anexo;
                    }

                    d.updatedAt = new Date();

                    bulkDespesas.push({
                        updateOne: {
                            filter: { _id: d._id, viagem_id: d.viagem_id },
                            update: { $set: d },
                            upsert: true
                        }
                    });
                }
            }

            if (bulkDespesas.length > 0) {
                // ordered: false permite que se um upsert falhar, os outros passem
                const dRes = await Despesa.bulkWrite(bulkDespesas, { ordered: false }).catch(err => err);

                const resObject = dRes.result ? dRes.result : dRes;
                results.despesasUpserted = (resObject.upsertedCount || 0) + (resObject.modifiedCount || 0);
                results.despesasDeleted = resObject.deletedCount || 0;
            }
        }

        return results;
    }

    async pullSync(usuarioRef, updatedAfter) {
        const userId = usuarioRef._id || usuarioRef;
        const usuarioLogado = await Usuario.findById(userId).populate('veiculo_id');

        if (!usuarioLogado) {
            return { viagens: [], despesas: [], veiculo: null };
        }

        // Pega todos os IDs de viagens que pertencem ao motorista
        const viagensAllMotorista = await Viagem.find({ usuario_id: usuarioLogado._id }, '_id');
        const idsMotorista = viagensAllMotorista.map(v => v._id.toString());

        const queryViagem = { usuario_id: usuarioLogado._id };
        const queryDespesa = { viagem_id: { $in: idsMotorista } };

        // Delta Sync: Retornar apenas registros criados ou editados após a última sincronização
        if (updatedAfter) {
            const dateLimit = DateHelper.parseFlexibleDate(updatedAfter);
            if (dateLimit) {
                queryViagem.updatedAt = { $gt: dateLimit };
                queryDespesa.updatedAt = { $gt: dateLimit };
            }
        }

        const viagens = await Viagem.find(queryViagem).lean();
        const despesas = await Despesa.find(queryDespesa).lean();

        return {
            viagens,
            despesas,
            veiculo: usuarioLogado.veiculo_id || null
        };
    }
}

export default SyncService;
