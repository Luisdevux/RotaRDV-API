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
