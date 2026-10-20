// src/test/utils/domainValidators.test.js

import { describe, it, expect } from 'vitest';
import ViagemDomainValidator from '../../utils/validators/domain/ViagemDomainValidator.js';
import DespesaDomainValidator from '../../utils/validators/domain/DespesaDomainValidator.js';

let contadorId = 1;

function criarViagem(dadosModificados = {}) {
    const id = contadorId++;
    return {
        _id: `viagem-${id}`,
        origem: { cidade: 'São Paulo', estado: 'SP' },
        destino: { cidade: 'Curitiba', estado: 'PR' },
        km_inicial: 10000,
        km_final: null,
        data_inicio: new Date(Date.now() - 3600000), // 1 hora atrás
        data_fim: null,
        status: 'em_andamento',
        ...dadosModificados,
    };
}

function criarDespesa(tipo = 'ALIMENTACAO', dadosModificados = {}) {
    const id = contadorId++;
    const base = {
        _id: `despesa-${id}`,
        viagem_id: `viagem-${id}`,
        tipo,
        valor_total: 50,
        data: new Date(),
        ...dadosModificados,
    };

    if (tipo === 'ABASTECIMENTO') {
        return {
            ...base,
            litros: 100,
            valor_litro: 6.00,
            valor_total: 600,
            tipo_combustivel: 'DIESEL_S10',
            km_atual: 10500,
            ...dadosModificados,
        };
    }

    return base;
}

describe('Domain Validators (src/test/utils/domainValidators)', () => {
    describe('ViagemDomainValidator', () => {
        it('deve validar com sucesso uma viagem com dados consistentes', () => {
            const viagem = criarViagem();
            const res = ViagemDomainValidator.validar(viagem);
            expect(res.valido).toBe(true);
        });

        it('deve rejeitar viagem com odômetro inicial negativo', () => {
            const viagem = criarViagem({ km_inicial: -50 });
            const res = ViagemDomainValidator.validar(viagem);
            expect(res.valido).toBe(false);
            expect(res.campo).toBe('km_inicial');
        });

        it('deve rejeitar viagem com data de encerramento anterior à data de início', () => {
            const dataInicio = new Date();
            const dataFimAnterior = new Date(Date.now() - 3600000); // 1h antes
            const viagem = criarViagem({ data_inicio: dataInicio, data_fim: dataFimAnterior });
            const res = ViagemDomainValidator.validar(viagem);
            expect(res.valido).toBe(false);
            expect(res.campo).toBe('data_fim');
        });

        it('deve rejeitar status desconhecido', () => {
            const viagem = criarViagem({ status: 'status_inexistente' });
            const res = ViagemDomainValidator.validar(viagem);
            expect(res.valido).toBe(false);
            expect(res.campo).toBe('status');
        });

        it('deve rejeitar viagem concluída onde km_final é menor que km_inicial', () => {
            const viagem = criarViagem({
                status: 'concluída',
                km_inicial: 50000,
                km_final: 49000,
                data_fim: new Date(),
            });
            const res = ViagemDomainValidator.validar(viagem);
            expect(res.valido).toBe(false);
            expect(res.campo).toBe('km_final');
        });
    });

    describe('DespesaDomainValidator', () => {
        it('deve validar com sucesso despesa de alimentação em viagem ativa', () => {
            const viagem = criarViagem();
            const despesa = criarDespesa('ALIMENTACAO');
            const res = DespesaDomainValidator.validar(despesa, viagem);
            expect(res.valido).toBe(true);
        });

        it('deve rejeitar despesa com valor negativo ou zerado', () => {
            const despesa = criarDespesa('ALIMENTACAO', { valor_total: 0 });
            const res = DespesaDomainValidator.validar(despesa);
            expect(res.valido).toBe(false);
            expect(res.campo).toBe('valor_total');
        });

        it('deve rejeitar despesa registrada em viagem cancelada', () => {
            const viagem = criarViagem({ status: 'cancelada' });
            const despesa = criarDespesa('ALIMENTACAO');
            const res = DespesaDomainValidator.validar(despesa, viagem);
            expect(res.valido).toBe(false);
            expect(res.campo).toBe('viagem_id');
        });

        it('deve rejeitar despesa com data anterior ao início da viagem', () => {
            const viagem = criarViagem({ data_inicio: new Date() });
            const dataPassada = new Date(Date.now() - 24 * 3600 * 1000);
            const despesa = criarDespesa('ALIMENTACAO', { data: dataPassada });
            const res = DespesaDomainValidator.validar(despesa, viagem);
            expect(res.valido).toBe(false);
            expect(res.campo).toBe('data');
        });

        it('deve validar com sucesso abastecimento com cálculos matemáticos consistentes', () => {
            const viagem = criarViagem({ km_inicial: 10000 });
            const despesa = criarDespesa('ABASTECIMENTO', {
                litros: 100,
                valor_litro: 6.00,
                valor_total: 600,
                km_atual: 10300,
            });
            const res = DespesaDomainValidator.validar(despesa, viagem);
            expect(res.valido).toBe(true);
        });

        it('deve rejeitar abastecimento se litros * valor_litro divergir do valor_total', () => {
            const viagem = criarViagem({ km_inicial: 10000 });
            const despesa = criarDespesa('ABASTECIMENTO', {
                litros: 100,
                valor_litro: 6.00,
                valor_total: 750, // 100 * 6 = 600 != 750
                km_atual: 10300,
            });
            const res = DespesaDomainValidator.validar(despesa, viagem);
            expect(res.valido).toBe(false);
            expect(res.campo).toBe('valor_total');
        });

        it('deve rejeitar abastecimento com odômetro menor que o KM inicial da viagem', () => {
            const viagem = criarViagem({ km_inicial: 20000 });
            const despesa = criarDespesa('ABASTECIMENTO', {
                km_atual: 19500, // Menor que 20000
                litros: 50,
                valor_litro: 6.00,
                valor_total: 300,
            });
            const res = DespesaDomainValidator.validar(despesa, viagem);
            expect(res.valido).toBe(false);
            expect(res.campo).toBe('km_atual');
        });
    });
});
