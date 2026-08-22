// src/docs/schemas/usuarioSchema.js

const usuarioSchemas = {
    UsuarioFiltro: {
        type: "object",
        properties: {
            nome: { type: "string", description: "Filtra por nome" },
            email: { type: "string", format: "email", description: "Filtra por email" },
            status: { type: "string", enum: ["ativo", "inativo"], description: "Filtra por status" },
            role: { type: "string", enum: ["superAdmin", "admin", "gestor", "motorista"], description: "Filtra por papel de acesso" },
            empresa_id: { type: "string", description: "Filtra por ID da empresa/transportadora" },
            cpf: { type: "string", description: "Filtra pelo CPF (Expressão Regular)" },
            cnh: { type: "string", description: "Filtra pela CNH (Expressão Regular)" },
            veiculo_id: { type: "string", description: "Filtra pelo ID do veículo atual do motorista" },
            empresa_nome: { type: "string", description: "Filtra por parte do nome da empresa/transportadora" },
            isAdmin: { type: "boolean", description: "Filtra os Administradores" }
        }
    },

    UsuarioListagem: {
        type: "object",
        properties: {
            _id: { type: "string", example: "674fa21d79969d2172e78710" },
            nome: { type: "string", example: "João da Silva" },
            email: { type: "string", format: "email", example: "joao.silva@email.com" },
            cpf: { type: "string", example: "08573215099" },
            cnh: { type: "string", example: "12345678901", description: "CNH do condutor (11 dígitos)" },
            telefone: { type: "string", description: "Telefone ou celular do usuário", example: "(69) 99999-8888" },
            role: { type: "string", enum: ["superAdmin", "admin", "gestor", "motorista"], example: "motorista" },
            status: { type: "string", enum: ["ativo", "inativo"], example: "ativo" },
            isAdmin: { type: "boolean", example: false },
            foto_perfil: { type: "string", example: "" },
            email_verificado: { type: "boolean", example: true },
            empresa_id: { type: "string", example: "674fa21d79969d2172e78755" },
            empresa: {
                type: "object",
                properties: {
                    nome: { type: "string", example: "Transportes Brasil" },
                    cargo: { type: "string", example: "Motorista" }
                }
            },
            veiculo_id: { type: "string", example: "674fa21d79969d2172e78799", description: "ID do veículo ou o objeto populado" },
            createdAt: { type: "string", format: "date-time", example: "2025-01-16T12:00:00.000Z" },
            updatedAt: { type: "string", format: "date-time", example: "2025-01-16T12:00:00.000Z" }
        },
        description: "Schema para listagem de usuários"
    },

    UsuarioDetalhes: {
        type: "object",
        properties: {
            _id: { type: "string", example: "674fa21d79969d2172e78710" },
            nome: { type: "string", example: "João da Silva" },
            email: { type: "string", format: "email", example: "joao.silva@email.com" },
            cpf: { type: "string", example: "08573215099" },
            cnh: { type: "string", example: "12345678901", description: "CNH do condutor (11 dígitos)" },
            telefone: { type: "string", description: "Telefone ou celular do usuário", example: "(69) 99999-8888" },
            role: { type: "string", enum: ["superAdmin", "admin", "gestor", "motorista"], example: "motorista" },
            status: { type: "string", enum: ["ativo", "inativo"], example: "ativo" },
            isAdmin: { type: "boolean", example: false },
            foto_perfil: { type: "string", example: "" },
            email_verificado: { type: "boolean", example: true },
            empresa_id: { type: "string", example: "674fa21d79969d2172e78755" },
            empresa: {
                type: "object",
                properties: {
                    nome: { type: "string", example: "Transportes Brasil" },
                    cargo: { type: "string", example: "Motorista" }
                }
            },
            veiculo_id: { type: "string", example: "674fa21d79969d2172e78799", description: "Opcional: ID do veículo (populate retorna o objeto Veiculo)" },
            createdAt: { type: "string", format: "date-time", example: "2025-01-16T12:00:00.000Z" },
            updatedAt: { type: "string", format: "date-time", example: "2025-01-16T12:00:00.000Z" }
        },
        description: "Schema para detalhes de um usuário"
    },

    UsuarioPost: {
        type: "object",
        properties: {
            nome: { type: "string", description: "Nome completo", example: "João da Silva" },
            email: { type: "string", format: "email", description: "Email do usuário", example: "joao.silva@email.com" },
            senha: { type: "string", description: "Senha segura", example: "Senha@123" },
            cpf: { type: "string", description: "CPF do usuário (11 dígitos ou formatado)", example: "08573215099" },
            cnh: { type: "string", description: "CNH do condutor (11 dígitos)", example: "12345678901" },
            telefone: { type: "string", description: "Telefone de contato", example: "(69) 99999-8888" },
            role: { type: "string", enum: ["superAdmin", "admin", "gestor", "motorista"], example: "motorista" },
            empresa_id: { type: "string", description: "ID da empresa", example: "674fa21d79969d2172e78755" },
            empresa: {
                type: "object",
                properties: {
                    nome: { type: "string", example: "Transportes Brasil" },
                    cargo: { type: "string", example: "Motorista" }
                }
            },
            veiculo_id: { type: "string", description: "ID do veículo ao qual ele está vinculado", example: "674fa21d79969d2172e78799" },
            isAdmin: { type: "boolean", description: "Define se é administrador", example: false }
        },
        required: ["nome", "email", "senha", "cpf"],
        description: "Schema para criação de um usuário",
        example: {
            nome: "João da Silva",
            email: "joao.silva@email.com",
            senha: "Senha@123",
            cpf: "08573215099",
            cnh: "12345678901",
            telefone: "(69) 99999-8888",
            role: "motorista",
            empresa: {
                nome: "Transportadora Brasil",
                cargo: "Motorista"
            },
            veiculo_id: "674fa21d79969d2172e78799",
            isAdmin: false
        }
    },

    UsuarioPatch: {
        type: "object",
        properties: {
            nome: { type: "string", description: "Nome completo", example: "João da Silva Pereira" },
            email: { type: "string", format: "email", description: "Email do usuário", example: "joao.silva@email.com" },
            cpf: { type: "string", description: "CPF do usuário (11 dígitos ou formatado)", example: "08573215099" },
            cnh: { type: "string", description: "CNH do condutor (11 dígitos)", example: "12345678901" },
            telefone: { type: "string", description: "Telefone de contato", example: "(69) 99999-8888" },
            role: { type: "string", enum: ["superAdmin", "admin", "gestor", "motorista"], description: "Papel de acesso (requer admin)", example: "gestor" },
            empresa_id: { type: "string", description: "ID da empresa" },
            empresa: {
                type: "object",
                properties: {
                    nome: { type: "string" },
                    cargo: { type: "string" }
                }
            },
            veiculo_id: { type: "string", description: "ID do veículo" }
        },
        required: [],
        description: "Schema para atualização parcial de um usuário",
        example: {
            nome: "João da Silva Pereira",
            telefone: "(69) 99999-8888",
            empresa: {
                nome: "Nova Transportadora",
                cargo: "Motorista Sênior"
            }
        }
    },

    UsuarioStatusPatch: {
        type: "object",
        properties: {
            status: {
                type: "string",
                enum: ["ativo", "inativo"],
                description: "Novo status do usuário",
                example: "inativo"
            }
        },
        required: ["status"],
        description: "Schema para atualização de status do usuário",
        example: {
            status: "inativo"
        }
    }
};

export default usuarioSchemas;
