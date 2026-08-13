// src/seeds/seedsEmpresa.js

import 'dotenv/config';
import { fakeMappings } from './globalFakeMapping.js';
import Empresa from '../models/Empresa.js';

async function seedEmpresas() {
    console.log('[SEED] Iniciando seed de empresas...');
    await Empresa.deleteMany();

    const empresas = [];

    // 1. Empresas padrão fixas
    empresas.push(
        {
            nome_empresa: 'Transportadora Rota Brasil Ltda',
            cnpj: '12345678000190',
            email: 'contato@rotabrasil.com.br',
            telefone: '(11) 3456-7890',
            status: 'ativo',
            foto_logo: 'https://rota-rdv.web.fslab.dev/logos/rotabrasil.png',
            endereco: {
                cep: '01310-100',
                logradouro: 'Av. Paulista',
                numero: '1000',
                complemento: 'Conjunto 501',
                bairro: 'Bela Vista',
                cidade: 'São Paulo',
                estado: 'SP'
            }
        },
        {
            nome_empresa: 'Logística Norte & Sul Transportes',
            cnpj: '98765432000110',
            email: 'operacoes@nortesul.com.br',
            telefone: '(65) 3612-4000',
            status: 'ativo',
            foto_logo: 'https://rota-rdv.web.fslab.dev/logos/nortesul.png',
            endereco: {
                cep: '78000-000',
                logradouro: 'Rodovia dos Imigrantes',
                numero: 'KM 12',
                complemento: 'Galpão 3',
                bairro: 'Distrito Industrial',
                cidade: 'Cuiabá',
                estado: 'MT'
            }
        },
        {
            nome_empresa: 'TransCargas Express Inativa',
            cnpj: '11223344000155',
            email: 'financeiro@transcargas.com.br',
            telefone: '(41) 3030-9090',
            status: 'inativo',
            foto_logo: '',
            endereco: {
                cep: '80000-000',
                logradouro: 'Rua XV de Novembro',
                numero: '500',
                complemento: '',
                bairro: 'Centro',
                cidade: 'Curitiba',
                estado: 'PR'
            }
        }
    );

    // 2. Gerar mais 3 empresas aleatórias usando fakeMappings
    for (let i = 0; i < 3; i++) {
        empresas.push({
            nome_empresa: fakeMappings.Empresa.nome_empresa(),
            cnpj: fakeMappings.Empresa.cnpj(),
            email: fakeMappings.Empresa.email(),
            telefone: fakeMappings.Empresa.telefone(),
            status: fakeMappings.Empresa.status(),
            foto_logo: fakeMappings.Empresa.foto_logo(),
            endereco: fakeMappings.Empresa.endereco()
        });
    }

    const empresasCriadas = await Empresa.insertMany(empresas);

    console.log(`[SEED] ${empresasCriadas.length} empresas criadas com sucesso.`);
    return empresasCriadas;
}

export default seedEmpresas;
