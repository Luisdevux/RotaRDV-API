// src/services/SyncService.js

import Viagem from '../models/Viagem.js';
import Despesa from '../models/Despesa.js';
import Usuario from '../models/Usuario.js';
import { DateHelper } from '../utils/helpers/index.js';
import ViagemDomainValidator from '../utils/validators/domain/ViagemDomainValidator.js';
import DespesaDomainValidator from '../utils/validators/domain/DespesaDomainValidator.js';

class SyncService {
    async pushSync(usuarioRef, viagens, despesas) {
        const userId = usuarioRef._id || usuarioRef;
        const usuarioLogado = await Usuario.findById(userId).populate('veiculo_id');

        const results = {
            viagensUpserted: 0,
            viagensDeleted: 0,
            despesasUpserted: 0,
            despesasDeleted: 0,
            rejeitados: []
        };

        if (!usuarioLogado) {
            return results;
        }

        const veiculoDoc = usuarioLogado.veiculo_id;

        // Mapa de viagens do motorista para validação contextual de despesas e integridade relacional
        const mapaViagens = new Map();
        const viagensDoMotorista = await Viagem.find({ usuario_id: usuarioLogado._id }).lean();
        for (const v of viagensDoMotorista) {
            mapaViagens.set(String(v._id), v);
        }

        // 1. Processamento e validação de Viagens
        if (viagens && viagens.length > 0) {
            const bulkViagens = [];
            for (const v of viagens) {
                if (v.is_deleted) {
                    bulkViagens.push({
                        deleteOne: { filter: { _id: v._id, usuario_id: usuarioLogado._id } }
                    });
                    mapaViagens.delete(String(v._id));
                } else {
                    // Validação de invariantes de domínio da viagem
                    const validacaoViagem = ViagemDomainValidator.validar(v);
                    if (!validacaoViagem.valido) {
                        results.rejeitados.push({
                            id: v._id,
                            tipo: 'VIAGEM',
                            motivo: validacaoViagem.motivo,
                            campo: validacaoViagem.campo
                        });
                        continue; // Rejeitado: não é incluído no lote de escrita do MongoDB
                    }

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

                    // Disponibiliza a viagem atualizada para as despesas do lote atual
                    mapaViagens.set(String(v._id), v);
                }
            }

            if (bulkViagens.length > 0) {
                const vRes = await Viagem.bulkWrite(bulkViagens, { ordered: false });
                results.viagensUpserted = (vRes.upsertedCount || 0) + (vRes.modifiedCount || 0);
                results.viagensDeleted = vRes.deletedCount || 0;
            }
        }

        // 2. Processamento e validação de Despesas
        if (despesas && despesas.length > 0) {
            const bulkDespesas = [];

            for (const d of despesas) {
                // Se for exclusão física solicitada pelo cliente
                if (d.is_deleted) {
                    if (d.viagem_id && mapaViagens.has(String(d.viagem_id))) {
                        bulkDespesas.push({
                            deleteOne: { filter: { _id: d._id, viagem_id: d.viagem_id } }
                        });
                    }
                    continue;
                }

                // 2.1 Verifica se a viagem informada pertence a este motorista
                const viagemVinculada = mapaViagens.get(String(d.viagem_id));
                if (!d.viagem_id || !viagemVinculada) {
                    results.rejeitados.push({
                        id: d._id,
                        tipo: 'DESPESA',
                        motivo: 'A viagem associada a esta despesa não existe ou não pertence a este motorista.',
                        campo: 'viagem_id'
                    });
                    continue;
                }

                // 2.2 Validação unificada de invariantes de domínio da despesa contra a viagem
                const validacaoDespesa = DespesaDomainValidator.validar(d, viagemVinculada);
                if (!validacaoDespesa.valido) {
                    results.rejeitados.push({
                        id: d._id,
                        tipo: 'DESPESA',
                        motivo: validacaoDespesa.motivo,
                        campo: validacaoDespesa.campo
                    });
                    continue; // Rejeitado: não é incluído no lote de escrita do MongoDB
                }

                delete d.is_deleted;

                // Protege contra sobrescrever uma foto_anexo já enviada caso o sync venha sem a URL
                if (!d.foto_anexo) {
                    delete d.foto_anexo;
                }

                // Converte a data enviada pelo app para BSON Date (evita salvar como String no bulkWrite)
                if (d.data && !(d.data instanceof Date)) {
                    d.data = new Date(d.data);
                }

                if (!d.createdAt) {
                    d.createdAt = d.data || new Date();
                }

                d.updatedAt = new Date();

                // Despesas são imutáveis após o lançamento (motoristas não possuem permissão de edição).
                // O $setOnInsert garante a inserção inicial e impede qualquer alteração indevida de dados já persistidos.
                bulkDespesas.push({
                    updateOne: {
                        filter: { _id: d._id, viagem_id: d.viagem_id },
                        update: { $setOnInsert: d },
                        upsert: true
                    }
                });
            }

            if (bulkDespesas.length > 0) {
                // ordered: false permite que se um upsert falhar, os outros passem
                // Usa Despesa.collection.bulkWrite para não filtrar campos de discriminators (ex: litros, km_atual)
                const dRes = await Despesa.collection.bulkWrite(bulkDespesas, { ordered: false }).catch(err => err);

                const resObject = dRes.result ? dRes.result : dRes;
                results.despesasUpserted = (resObject.upsertedCount || dRes.upsertedCount || 0) + (resObject.modifiedCount || dRes.modifiedCount || 0);
                results.despesasDeleted = resObject.deletedCount || dRes.deletedCount || 0;
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
