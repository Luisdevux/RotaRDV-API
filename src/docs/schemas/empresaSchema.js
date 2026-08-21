// src/docs/schemas/empresaSchema.js

const empresaSchemas = {
    EmpresaFiltro: {
        type: "object",
        properties: {
            nome_empresa: { type: "string", description: "Filtra pelo nome da empresa" },
            cnpj: { type: "string", description: "Filtra pelo CNPJ da empresa (suporta numérico clássico ou novo padrão alfanumérico IN RFB 2.229/2024)" },
            email: { type: "string", description: "Filtra pelo email corporativo" },
            status: { type: "string", enum: ["ativo", "inativo"], description: "Filtra pelo status" },
            cidade: { type: "string", description: "Filtra pela cidade" },
            estado: { type: "string", description: "Filtra pela sigla do estado (UF)" }
        }
    },

    EmpresaListagem: {
        type: "object",
        properties: {
            _id: { type: "string", example: "674fa21d79969d2172e78799" },
            nome_empresa: { type: "string", example: "Transportadora Rota Brasil" },
            cnpj: { type: "string", description: "CNPJ numérico ou alfanumérico", example: "12.345.678/0001-90" },
            email: { type: "string", example: "contato@rotabrasil.com.br" },
            telefone: { type: "string", example: "(11) 98765-4321" },
            endereco: {
                type: "object",
                properties: {
                    cep: { type: "string", example: "01001-000" },
                    logradouro: { type: "string", example: "Av. Paulista" },
                    numero: { type: "string", example: "1000" },
                    complemento: { type: "string", example: "Sala 502" },
                    bairro: { type: "string", example: "Bela Vista" },
                    cidade: { type: "string", example: "São Paulo" },
                    estado: { type: "string", example: "SP" }
                }
            },
            status: { type: "string", enum: ["ativo", "inativo"], example: "ativo" },
            foto_logo: { type: "string", example: "https://rota-rdv.web.fslab.dev/logos/rotabrasil.png" },
            gestor_id: {
                type: "object",
                properties: {
                    _id: { type: "string", example: "674fa21d79969d2172e78788" },
                    nome: { type: "string", example: "Carlos Silva" },
                    email: { type: "string", example: "carlos@rotabrasil.com.br" }
                }
            },
            createdAt: { type: "string", format: "date-time", example: "2026-08-13T12:00:00.000Z" },
            updatedAt: { type: "string", format: "date-time", example: "2026-08-13T12:00:00.000Z" }
        },
        description: "Schema para listagem de empresa"
    },

    EmpresaCriacao: {
        type: "object",
        required: ["nome_empresa", "cnpj", "email"],
        properties: {
            nome_empresa: { type: "string", example: "Transportadora Rota Brasil" },
            cnpj: { type: "string", example: "12.345.678/0001-90" },
            email: { type: "string", example: "contato@rotabrasil.com.br" },
            telefone: { type: "string", example: "(11) 98765-4321" },
            endereco: {
                type: "object",
                properties: {
                    cep: { type: "string", example: "01001-000" },
                    logradouro: { type: "string", example: "Av. Paulista" },
                    numero: { type: "string", example: "1000" },
                    complemento: { type: "string", example: "Sala 502" },
                    bairro: { type: "string", example: "Bela Vista" },
                    cidade: { type: "string", example: "São Paulo" },
                    estado: { type: "string", example: "SP" }
                }
            },
            gestor_id: { type: "string", example: "674fa21d79969d2172e78788", description: "ID do usuário gestor (opcional)" },
            foto_logo: { type: "string", example: "https://rota-rdv.web.fslab.dev/logos/rotabrasil.png" }
        },
        description: "Schema para criação de uma nova empresa"
    },

    EmpresaAtualizacao: {
        type: "object",
        properties: {
            nome_empresa: { type: "string", example: "Transportadora Rota Brasil" },
            cnpj: { type: "string", example: "12.345.678/0001-90" },
            email: { type: "string", example: "contato@rotabrasil.com.br" },
            telefone: { type: "string", example: "(11) 98765-4321" },
            endereco: {
                type: "object",
                properties: {
                    cep: { type: "string", example: "01001-000" },
                    logradouro: { type: "string", example: "Av. Paulista" },
                    numero: { type: "string", example: "1000" },
                    complemento: { type: "string", example: "Sala 502" },
                    bairro: { type: "string", example: "Bela Vista" },
                    cidade: { type: "string", example: "São Paulo" },
                    estado: { type: "string", example: "SP" }
                }
            },
            gestor_id: { type: "string", example: "674fa21d79969d2172e78788" },
            foto_logo: { type: "string", example: "https://rota-rdv.web.fslab.dev/logos/rotabrasil.png" }
        },
        description: "Schema para atualização de dados da empresa"
    },

    EmpresaStatusAtualizacao: {
        type: "object",
        required: ["status"],
        properties: {
            status: { type: "string", enum: ["ativo", "inativo"], example: "ativo" }
        }
    },

    EmpresaCadastrarMotorista: {
        type: "object",
        required: ["nome", "email", "cpf"],
        properties: {
            nome: { type: "string", example: "João da Silva" },
            email: { type: "string", example: "joao.motorista@gmail.com" },
            cpf: { type: "string", example: "12345678901" },
            telefone: { type: "string", example: "(65) 99999-8888" },
            cargo: { type: "string", example: "Motorista Carreteiro" },
            veiculo_id: { type: "string", example: "674fa21d79969d2172e78799", description: "Veículo inicial associado" },
            senha: { type: "string", example: "SenhaForte@123", description: "Opcional: se não informada, o motorista pode acessar via Google ou redefinição de senha" }
        },
        description: "Schema para cadastrar e vincular novo motorista pela empresa"
    },

    EmpresaVincularMotorista: {
        type: "object",
        properties: {
            usuario_id: { type: "string", example: "674fa21d79969d2172e78788" },
            email: { type: "string", example: "motorista@gmail.com" },
            cpf: { type: "string", example: "12345678901" },
            cargo: { type: "string", example: "Motorista" },
            veiculo_id: { type: "string", example: "674fa21d79969d2172e78799" }
        },
        description: "Schema para vincular motorista existente à empresa"
    },

    EmpresaDashboard: {
        type: "object",
        properties: {
            empresa: {
                type: "object",
                properties: {
                    id: { type: "string", example: "674fa21d79969d2172e78799" },
                    nome_empresa: { type: "string", example: "Transportadora Rota Brasil" },
                    cnpj: { type: "string", example: "12.345.678/0001-90" },
                    status: { type: "string", example: "ativo" }
                }
            },
            resumo: {
                type: "object",
                properties: {
                    total_motoristas: { type: "number", example: 14 },
                    total_veiculos: { type: "number", example: 10 },
                    viagens_em_andamento: { type: "number", example: 5 },
                    viagens_concluidas: { type: "number", example: 120 },
                    total_km_rodado: { type: "number", example: 84500.5 },
                    total_despesas: { type: "number", example: 98450.75 },
                    despesas_por_categoria: {
                        type: "object",
                        properties: {
                            ABASTECIMENTO: { type: "number", example: 65000.00 },
                            ALIMENTACAO: { type: "number", example: 12000.00 },
                            MANUTENCAO: { type: "number", example: 14500.75 },
                            PEDAGIO: { type: "number", example: 5950.00 },
                            OUTROS: { type: "number", example: 1000.00 }
                        }
                    }
                }
            }
        },
        description: "Métricas consolidadas para Painel Web da Empresa"
    }
};

export default empresaSchemas;
