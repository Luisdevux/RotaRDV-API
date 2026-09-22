// src/utils/validators/domain/ViagemDomainValidator.js

/**
 * Validador unificado de regras e invariantes de domínio para viagens.
 * Assegura que tanto o fluxo REST quanto a sincronização em lote respeitem
 * a consistência dos odômetros, intervalos de datas e transições de status.
 */
class ViagemDomainValidator {
    /**
     * Valida as invariantes de negócio de uma viagem.
     * @param {Object} viagem - Objeto contendo os dados da viagem
     * @param {number|null} [ultimaKmVeiculo] - Último odômetro registrado do veículo na frota
     * @returns {{ valido: boolean, motivo?: string, campo?: string }}
     */
    static validar(viagem, ultimaKmVeiculo = null) {
        if (!viagem) {
            return { valido: false, motivo: 'Os dados da viagem não foram fornecidos.', campo: 'geral' };
        }

        // 1. Odômetro inicial não-negativo
        const kmInicial = Number(viagem.km_inicial);
        if (isNaN(kmInicial) || kmInicial < 0) {
            return {
                valido: false,
                motivo: 'O odômetro inicial da viagem não pode ser negativo ou nulo.',
                campo: 'km_inicial'
            };
        }

        // Não regressão em relação ao histórico do veículo quando informado
        if (ultimaKmVeiculo !== null && kmInicial < ultimaKmVeiculo) {
            return {
                valido: false,
                motivo: `O KM inicial (${kmInicial}) não pode ser menor que o KM final da última viagem do veículo (${ultimaKmVeiculo}).`,
                campo: 'km_inicial'
            };
        }

        // 2. Odômetro final
        if (viagem.km_final !== null && viagem.km_final !== undefined) {
            const kmFinal = Number(viagem.km_final);
            if (isNaN(kmFinal) || kmFinal < kmInicial) {
                return {
                    valido: false,
                    motivo: `O KM final (${kmFinal}) não pode ser menor que o KM inicial (${kmInicial}).`,
                    campo: 'km_final'
                };
            }
        }

        // 3. Regra de conclusão: KM final obrigatório
        if (viagem.status === 'concluída') {
            if (viagem.km_final === null || viagem.km_final === undefined) {
                return {
                    valido: false,
                    motivo: 'O KM final é obrigatório para concluir a viagem.',
                    campo: 'km_final'
                };
            }
        }

        // 4. Integridade cronológica
        if (!viagem.data_inicio) {
            return { valido: false, motivo: 'A data de início da viagem é obrigatória.', campo: 'data_inicio' };
        }

        const dataInicio = new Date(viagem.data_inicio);
        if (isNaN(dataInicio.getTime())) {
            return { valido: false, motivo: 'Formato de data de início inválido.', campo: 'data_inicio' };
        }

        if (viagem.data_fim) {
            const dataFim = new Date(viagem.data_fim);
            if (isNaN(dataFim.getTime()) || dataFim < dataInicio) {
                return {
                    valido: false,
                    motivo: 'A data de encerramento não pode ser anterior à data de início da viagem.',
                    campo: 'data_fim'
                };
            }
        }

        // 5. Origem e Destino
        if (!viagem.origem?.cidade || !viagem.origem?.estado) {
            return {
                valido: false,
                motivo: 'Cidade e sigla de estado da origem são obrigatórias.',
                campo: 'origem'
            };
        }

        if (!viagem.destino?.cidade || !viagem.destino?.estado) {
            return {
                valido: false,
                motivo: 'Cidade e sigla de estado do destino são obrigatórias.',
                campo: 'destino'
            };
        }

        // 6. Status válido
        const statusValidos = ['em_andamento', 'concluída', 'cancelada'];
        if (viagem.status && !statusValidos.includes(viagem.status)) {
            return {
                valido: false,
                motivo: `Status de viagem '${viagem.status}' não reconhecido.`,
                campo: 'status'
            };
        }

        return { valido: true };
    }
}

export default ViagemDomainValidator;
