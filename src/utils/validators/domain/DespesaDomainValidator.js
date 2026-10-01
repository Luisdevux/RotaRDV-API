// src/utils/validators/domain/DespesaDomainValidator.js

/**
 * Validador unificado de regras e invariantes de domínio para despesas.
 * Utilizado de forma centralizada tanto pelos endpoints REST quanto pelo pipeline de Sincronização.
 */
class DespesaDomainValidator {
    /**
     * Valida as regras de negócio de uma despesa contra sua viagem de vínculo.
     * @param {Object} despesa - Objeto contendo os dados da despesa
     * @param {Object} [viagem] - Documento da viagem vinculada (opcional ou obrigatório para checagem contextual)
     * @returns {{ valido: boolean, motivo?: string, campo?: string }}
     */
    static validar(despesa, viagem = null) {
        if (!despesa) {
            return { valido: false, motivo: 'Os dados da despesa não foram fornecidos.', campo: 'geral' };
        }

        // 1. Tipo de despesa permitido
        const tiposValidos = ['ABASTECIMENTO', 'ALIMENTACAO', 'MANUTENCAO', 'PEDAGIO', 'OUTROS'];
        if (!despesa.tipo || !tiposValidos.includes(despesa.tipo)) {
            return {
                valido: false,
                motivo: `Tipo de despesa '${despesa.tipo}' é inválido. Tipos aceitos: ${tiposValidos.join(', ')}.`,
                campo: 'tipo'
            };
        }

        // 2. Valor financeiro estritamente positivo
        const valorTotal = Number(despesa.valor_total);
        if (isNaN(valorTotal) || valorTotal <= 0) {
            return {
                valido: false,
                motivo: 'O valor da despesa deve ser maior que zero.',
                campo: 'valor_total'
            };
        }

        // 3. Validação cronológica
        if (!despesa.data) {
            return { valido: false, motivo: 'A data da despesa é obrigatória.', campo: 'data' };
        }

        const dataDespesa = new Date(despesa.data);
        if (isNaN(dataDespesa.getTime())) {
            return { valido: false, motivo: 'Formato de data da despesa inválido.', campo: 'data' };
        }

        // Tolerância de 10 minutos para acomodar pequenos desvios de relógio de dispositivos clientes
        const margemFuturaMs = 10 * 60 * 1000;
        if (dataDespesa.getTime() > Date.now() + margemFuturaMs) {
            return {
                valido: false,
                motivo: 'A data da despesa não pode estar no futuro.',
                campo: 'data'
            };
        }

        // 4. Validações contextuais com a Viagem
        if (viagem) {
            // Viagens canceladas não aceitam novos lançamentos nem sincronização
            if (viagem.status === 'cancelada') {
                return {
                    valido: false,
                    motivo: 'Não é permitido registrar ou sincronizar despesas em uma viagem com status "cancelada".',
                    campo: 'viagem_id'
                };
            }

            // A data da despesa não pode ser anterior ao início da viagem (com 60s de tolerância para concorrência)
            if (viagem.data_inicio) {
                const dataInicioViagem = new Date(viagem.data_inicio);
                if (dataDespesa.getTime() < dataInicioViagem.getTime() - 60000) {
                    return {
                        valido: false,
                        motivo: 'A data da despesa não pode ser anterior à data de início da viagem.',
                        campo: 'data'
                    };
                }
            }

            // 5. Invariantes específicas de Abastecimento
            if (despesa.tipo === 'ABASTECIMENTO') {
                const litros = Number(despesa.litros);
                if (isNaN(litros) || litros <= 0) {
                    return {
                        valido: false,
                        motivo: 'A quantidade de litros abastecida deve ser maior que zero.',
                        campo: 'litros'
                    };
                }

                // Validação de limite de capacidade conforme o fluido (Arla 32 vs Combustível)
                if (despesa.tipo_combustivel === 'ARLA_32') {
                    let capacidadeArla = null;
                    if (viagem && typeof viagem.veiculo_id === 'object' && viagem.veiculo_id !== null && viagem.veiculo_id.capacidade_arla) {
                        capacidadeArla = Number(viagem.veiculo_id.capacidade_arla);
                    } else if (viagem && viagem.capacidade_arla) {
                        capacidadeArla = Number(viagem.capacidade_arla);
                    }

                    const limiteArla = (capacidadeArla && capacidadeArla > 0) ? capacidadeArla : 150;
                    if (litros > limiteArla) {
                        return {
                            valido: false,
                            motivo: capacidadeArla && capacidadeArla > 0
                                ? `A quantidade de Arla 32 (${litros} L) excede a capacidade do reservatório de Arla do veículo (${capacidadeArla} L).`
                                : `A quantidade de Arla 32 (${litros} L) excede a capacidade máxima permitida para reservatórios de Arla 32 (${limiteArla} L).`,
                            campo: 'litros'
                        };
                    }
                } else {
                    let capacidadeTanque = null;
                    if (viagem && typeof viagem.veiculo_id === 'object' && viagem.veiculo_id !== null && viagem.veiculo_id.capacidade_tanque) {
                        capacidadeTanque = Number(viagem.veiculo_id.capacidade_tanque);
                    } else if (viagem && viagem.capacidade_tanque) {
                        capacidadeTanque = Number(viagem.capacidade_tanque);
                    }

                    if (capacidadeTanque && capacidadeTanque > 0 && litros > capacidadeTanque) {
                        return {
                            valido: false,
                            motivo: `A quantidade de litros (${litros} L) excede a capacidade máxima do tanque de combustível do veículo (${capacidadeTanque} L).`,
                            campo: 'litros'
                        };
                    }
                }

                if (litros > 50000) {
                    return {
                        valido: false,
                        motivo: 'A quantidade de litros não pode ultrapassar 50.000 L.',
                        campo: 'litros'
                    };
                }

                const valorLitro = Number(despesa.valor_litro);
                if (isNaN(valorLitro) || valorLitro <= 0) {
                    return {
                        valido: false,
                        motivo: 'O valor unitário por litro deve ser maior que zero.',
                        campo: 'valor_litro'
                    };
                }

                const combustiveisValidos = ['DIESEL_S10', 'DIESEL_S500', 'GASOLINA', 'ETANOL', 'ARLA_32', 'OUTRO'];
                if (despesa.tipo_combustivel && !combustiveisValidos.includes(despesa.tipo_combustivel)) {
                    return {
                        valido: false,
                        motivo: `Tipo de combustível '${despesa.tipo_combustivel}' não reconhecido.`,
                        campo: 'tipo_combustivel'
                    };
                }

                // Validação de compatibilidade mecânica de combustível com o veículo vinculado
                let combustivelPreferencial = null;
                if (viagem && typeof viagem.veiculo_id === 'object' && viagem.veiculo_id !== null && viagem.veiculo_id.combustivel_preferencial) {
                    combustivelPreferencial = String(viagem.veiculo_id.combustivel_preferencial).toUpperCase();
                } else if (viagem && viagem.combustivel_preferencial) {
                    combustivelPreferencial = String(viagem.combustivel_preferencial).toUpperCase();
                }

                if (combustivelPreferencial && despesa.tipo_combustivel) {
                    const comb = String(despesa.tipo_combustivel).toUpperCase();
                    const isDiesel = combustivelPreferencial === 'DIESEL_S10' || combustivelPreferencial === 'DIESEL_S500';

                    if (isDiesel) {
                        if (comb === 'ARLA_32') {
                            // Fluído permitido para veículos a diesel
                        } else if (comb !== combustivelPreferencial) {
                            return {
                                valido: false,
                                motivo: `O combustível '${comb}' não é permitido para este veículo. O abastecimento deve ser exclusivamente com ${combustivelPreferencial}.`,
                                campo: 'tipo_combustivel'
                            };
                        }
                    } else {
                        // Veículos não-diesel (carros/leves): aceitam Gasolina, Etanol ou Outro
                        if (comb === 'DIESEL_S10' || comb === 'DIESEL_S500' || comb === 'ARLA_32') {
                            return {
                                valido: false,
                                motivo: `O combustível '${comb}' não é compatível com veículos não-diesel.`,
                                campo: 'tipo_combustivel'
                            };
                        }
                    }
                }

                const kmAtual = Number(despesa.km_atual);
                if (isNaN(kmAtual) || kmAtual <= 0) {
                    return {
                        valido: false,
                        motivo: 'A quilometragem do odômetro no abastecimento deve ser informada e maior que zero.',
                        campo: 'km_atual'
                    };
                }

                // Invariante de odômetro: O KM atual não pode ser inferior ao odômetro inicial da viagem
                const kmInicialViagem = Number(viagem.km_inicial || 0);
                if (kmAtual < kmInicialViagem) {
                    return {
                        valido: false,
                        motivo: `O KM de abastecimento (${kmAtual}) não pode ser menor que o KM inicial da viagem (${kmInicialViagem}).`,
                        campo: 'km_atual'
                    };
                }

                // Consistência de cálculo entre volume e valor monetário (tolerância de R$ 0.10)
                const valorCalculado = litros * valorLitro;
                const diferenca = Math.abs(valorTotal - valorCalculado);
                if (diferenca > 0.10) {
                    return {
                        valido: false,
                        motivo: `O valor total informado (R$ ${valorTotal.toFixed(2)}) diverge da multiplicação de litros por preço unitário (R$ ${valorCalculado.toFixed(2)}).`,
                        campo: 'valor_total'
                    };
                }
            }
        }

        return { valido: true };
    }
}

export default DespesaDomainValidator;
