// src/services/SyncService.js

import mongoose from 'mongoose';
import Viagem from '../models/Viagem.js';
import Despesa from '../models/Despesa.js';
import Usuario from '../models/Usuario.js';
import Veiculo from '../models/Veiculo.js';
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
        const viagensDoMotorista = await Viagem.find({ usuario_id: usuarioLogado._id })
            .populate('veiculo_id', 'modelo placa capacidade_tanque capacidade_arla combustivel_preferencial')
            .lean();
        for (const v of viagensDoMotorista) {
            mapaViagens.set(String(v._id), v);
        }

        // 1. Processamento e validação de Viagens
        if (viagens && viagens.length > 0) {
            const bulkViagens = [];
            const viagensDeletadasIds = [];
            for (const v of viagens) {
                if (v.is_deleted) {
                    if (v._id && mapaViagens.has(String(v._id))) {
                        viagensDeletadasIds.push(v._id);
                    }
                    bulkViagens.push({
                        deleteOne: { filter: { _id: v._id, usuario_id: usuarioLogado._id } }
                    });
                    mapaViagens.delete(String(v._id));
                } else {
                    // Impede apropriação de viagem de outro motorista caso usuario_id divergente seja enviado
                    if (v.usuario_id && String(v.usuario_id) !== String(usuarioLogado._id)) {
                        results.rejeitados.push({
                            id: v._id,
                            tipo: 'VIAGEM',
                            motivo: 'Esta viagem pertence a outro motorista e não pode ser sincronizada nesta sessão.',
                            campo: 'usuario_id'
                        });
                        continue;
                    }

                    // Normaliza variante sem acento enviada por versões antigas do cliente
                    if (v.status === 'concluida') {
                        v.status = 'concluída';
                    }

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

                    const viagemExistente = mapaViagens.get(String(v._id));
                    const veiculoExistenteId = viagemExistente?.veiculo_id?._id || viagemExistente?.veiculo_id;

                    // Resolve veículo: informado no payload -> já existente na viagem -> vinculado ao motorista
                    if (!v.veiculo_id) {
                        v.veiculo_id = veiculoExistenteId || veiculoDoc?._id || null;
                    }

                    if (!v.veiculo_id) {
                        results.rejeitados.push({
                            id: v._id,
                            tipo: 'VIAGEM',
                            motivo: 'Nenhum veículo vinculado ao motorista ou informado na viagem.',
                            campo: 'veiculo_id'
                        });
                        continue;
                    }

                    v.usuario_id = usuarioLogado._id;
                    if (usuarioLogado.empresa_id && !v.empresa_id) {
                        v.empresa_id = usuarioLogado.empresa_id;
                    }

                    // Autopreenche snapshot do motorista caso não venha no payload
                    if (!v.usuario_snapshot) {
                        v.usuario_snapshot = viagemExistente?.usuario_snapshot || {
                            nome: usuarioLogado.nome,
                            email: usuarioLogado.email
                        };
                    }

                    // Autopreenche snapshot do caminhão caso não venha no payload
                    let veiculoResolvido = veiculoDoc;
                    if (!v.veiculo_snapshot) {
                        if (viagemExistente?.veiculo_snapshot) {
                            v.veiculo_snapshot = viagemExistente.veiculo_snapshot;
                        } else {
                            if (!veiculoResolvido || String(veiculoResolvido._id) !== String(v.veiculo_id)) {
                                try {
                                    veiculoResolvido = await Veiculo.findById(v.veiculo_id).lean();
                                } catch (_) {
                                    veiculoResolvido = null;
                                }
                            }
                            if (veiculoResolvido) {
                                v.veiculo_snapshot = {
                                    placa: veiculoResolvido.placa,
                                    modelo: veiculoResolvido.modelo,
                                    reboque: {
                                        modelo: veiculoResolvido.reboque?.modelo || '',
                                        placas: veiculoResolvido.reboque?.placas || []
                                    }
                                };
                            }
                        }
                    }

                    // Converte datas da viagem para BSON Date com suporte a formatos flexíveis
                    if (v.data_inicio) {
                        v.data_inicio = DateHelper.parseFlexibleDate(v.data_inicio) || new Date(v.data_inicio);
                    }
                    if (v.data_fim) {
                        v.data_fim = DateHelper.parseFlexibleDate(v.data_fim) || null;
                    }

                    const viagemCreatedAt = DateHelper.parseFlexibleDate(v.createdAt) || v.data_inicio || new Date();
                    delete v.createdAt;
                    delete v.is_deleted;
                    v.updatedAt = new Date();

                    bulkViagens.push({
                        updateOne: {
                            filter: { _id: v._id, usuario_id: usuarioLogado._id },
                            update: {
                                $set: v,
                                $setOnInsert: { createdAt: viagemCreatedAt }
                            },
                            upsert: true
                        }
                    });

                    // Disponibiliza a viagem atualizada para as despesas do lote atual
                    mapaViagens.set(String(v._id), {
                        ...v,
                        veiculo_id: (typeof v.veiculo_id === 'object' && v.veiculo_id !== null && v.veiculo_id.placa)
                            ? v.veiculo_id
                            : (viagemExistente?.veiculo_id || veiculoResolvido || veiculoDoc || v.veiculo_id)
                    });

                    // Se a viagem sincronizada estiver concluída, atualiza o KM do veículo com o maior valor
                    if (v.status === 'concluída' && v.km_final) {
                        let targetVeiculoId = (typeof v.veiculo_id === 'object' && v.veiculo_id?._id)
                            ? v.veiculo_id._id
                            : (v.veiculo_id || veiculoDoc?._id);
                        if (!targetVeiculoId) {
                            try {
                                const viagemDb = await Viagem.findById(v._id).select('veiculo_id');
                                if (viagemDb?.veiculo_id) {
                                    targetVeiculoId = viagemDb.veiculo_id;
                                }
                            } catch (_) {}
                        }
                        if (targetVeiculoId) {
                            try {
                                await Veiculo.findByIdAndUpdate(targetVeiculoId, {
                                    $max: { km_atual: Number(v.km_final) }
                                });
                            } catch (_) {}
                        }
                    }
                }
            }

            if (bulkViagens.length > 0) {
                const vRes = await Viagem.bulkWrite(bulkViagens, { ordered: false });
                results.viagensUpserted = (vRes.upsertedCount || 0) + (vRes.modifiedCount || 0);
                results.viagensDeleted = vRes.deletedCount || 0;
            }

            if (viagensDeletadasIds.length > 0) {
                await Despesa.deleteMany({ viagem_id: { $in: viagensDeletadasIds } });
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

                // Converte as datas enviadas pelo app para BSON Date com parser flexível (ISO e DD/MM/YYYY)
                if (d.data) {
                    d.data = DateHelper.parseFlexibleDate(d.data) || new Date();
                }

                d.createdAt = DateHelper.parseFlexibleDate(d.createdAt) || d.data || new Date();

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
            return {
                viagens: [],
                despesas: [],
                veiculo: null,
                viagens_ativas_ids: [],
                despesas_ativas_ids: []
            };
        }

        // Pega todos os IDs de viagens e despesas ativas do motorista para reconciliação de exclusões no cliente
        const viagensAllMotorista = await Viagem.find({ usuario_id: usuarioLogado._id }, '_id').lean();
        const idsMotorista = viagensAllMotorista.map(v => String(v._id));

        const despesasAllMotorista = idsMotorista.length > 0
            ? await Despesa.find({ viagem_id: { $in: idsMotorista } }, '_id').lean()
            : [];
        const idsDespesasAtivas = despesasAllMotorista.map(d => String(d._id));

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
        const despesas = idsMotorista.length > 0 ? await Despesa.find(queryDespesa).lean() : [];

        return {
            viagens,
            despesas,
            veiculo: usuarioLogado.veiculo_id || null,
            viagens_ativas_ids: idsMotorista,
            despesas_ativas_ids: idsDespesasAtivas
        };
    }
}

export default SyncService;
