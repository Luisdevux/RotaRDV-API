// src/docs/schemas/authSchema.js

const authSchemas = {
    loginPost: {
        type: "object",
        properties: {
            email: {
                type: "string",
                format: "email",
                description: "Email do usuário cadastrado",
                example: "joao.silva@email.com"
            },
            senha: {
                type: "string",
                description: "Senha do usuário",
                example: "Senha@123"
            }
        },
        required: ["email", "senha"],
        description: "Schema para login de usuário",
        example: {
            email: "admin@rotardv.com",
            senha: "Senha@123"
        }
    },

    signupPost: {
        type: "object",
        properties: {
            nome_empresa: {
                type: "string",
                description: "Razão Social ou Nome Fantasia da Transportadora",
                example: "Transportadora Rota Express Ltda"
            },
            cnpj: {
                type: "string",
                description: "CNPJ da transportadora (numérico tradicional ou novo padrão alfanumérico IN RFB 2.229/2024)",
                example: "12.ABC.345/0001-88"
            },
            email_empresa: {
                type: "string",
                format: "email",
                description: "Email corporativo institucional da transportadora",
                example: "contato@rotaexpress.com.br"
            },
            telefone_empresa: {
                type: "string",
                description: "Telefone institucional de contato da transportadora",
                example: "(11) 3333-4444"
            },
            endereco: {
                $ref: "#/components/schemas/Endereco"
            },
            admin: {
                type: "object",
                properties: {
                    nome: { type: "string", example: "Carlos Eduardo" },
                    email: { type: "string", format: "email", example: "admin@rotaexpress.com.br" },
                    senha: { type: "string", example: "Senha@Forte2026" },
                    cpf: { type: "string", example: "08573215099" },
                    telefone: { type: "string", example: "(11) 98888-7777" }
                },
                required: ["nome", "email", "senha"]
            }
        },
        required: ["nome_empresa", "cnpj", "email_empresa"],
        description: "Schema para Onboarding Corporativo (cadastro simultâneo da Transportadora e do Administrador Master)"
    },

    signupPostDetalhes: {
        type: "object",
        properties: {
            empresa: {
                $ref: "#/components/schemas/EmpresaListagem"
            },
            usuario: {
                type: "object",
                properties: {
                    _id: { type: "string", example: "674fa21d79969d2172e78710" },
                    nome: { type: "string", example: "Carlos Eduardo" },
                    email: { type: "string", example: "admin@rotaexpress.com.br" },
                    role: { type: "string", example: "admin" },
                    isAdmin: { type: "boolean", example: true },
                    email_verificado: { type: "boolean", example: true },
                    empresa_id: { type: "string", example: "674fa21d79969d2172e78788" }
                }
            }
        },
        description: "Schema para detalhes do Onboarding Corporativo (Empresa e Administrador Master criados)"
    },

    RespostaLogin: {
        type: "object",
        properties: {
            accessToken: {
                type: "string",
                description: "JWT de acesso (expira em 15 minutos)",
                example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            },
            refreshToken: {
                type: "string",
                description: "JWT para renovação (expira em 7 dias)",
                example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            },
            user: {
                type: "object",
                properties: {
                    _id: { type: "string", example: "674fa21d79969d2172e78710" },
                    nome: { type: "string", example: "João da Silva" },
                    email: { type: "string", example: "joao.silva@rotardv.com.br" },
                    cpf: { type: "string", example: "08573215099" },
                    telefone: { type: "string", example: "(69) 99999-8888" },
                    isAdmin: { type: "boolean", example: false }
                }
            }
        },
        description: "Schema para resposta de login com tokens JWT"
    },

    RequisicaoRecuperaSenha: {
        type: "object",
        properties: {
            email: {
                type: "string",
                format: "email",
                description: "Email cadastrado para recuperação de senha",
                example: "joao.silva@rotardv.com.br"
            }
        },
        required: ["email"],
        description: "Schema para requisição de recuperação de senha",
        example: {
            email: "joao.silva@rotardv.com.br"
        }
    },

    RespostaRecuperaSenha: {
        type: "object",
        properties: {
            message: {
                type: "string",
                description: "Mensagem de confirmação do envio do email",
                example: "Email de recuperação enviado com sucesso."
            }
        },
        description: "Schema para resposta de recuperação de senha"
    },

    RequisicaoRedefinirSenha: {
        type: "object",
        properties: {
            email: {
                type: "string",
                format: "email",
                description: "Email do usuário",
                example: "joao.silva@rotardv.com.br"
            },
            codigo: {
                type: "string",
                description: "Código de recuperação recebido por email",
                example: "abc123def456"
            },
            novaSenha: {
                type: "string",
                description: "Nova senha (mín. 8 chars, 1 maiúscula, 1 minúscula, 1 número, 1 especial)",
                example: "NovaSenha@456"
            }
        },
        required: ["email", "codigo", "novaSenha"],
        description: "Schema para redefinição de senha com código",
        example: {
            email: "joao.silva@rotardv.com.br",
            codigo: "abc123def456",
            novaSenha: "NovaSenha@456"
        }
    },

    RespostaRedefinirSenha: {
        type: "object",
        properties: {
            message: {
                type: "string",
                description: "Mensagem de confirmação da redefinição",
                example: "Senha redefinida com sucesso."
            }
        },
        description: "Schema para resposta de redefinição de senha"
    },

    googleLoginPost: {
        type: "object",
        properties: {
            idToken: {
                type: "string",
                description: "O ID Token retornado pelo Google Sign-In",
                example: "eyJhbGciOiJSUzI1NiIsImtpZCI6IjYxOWRk..."
            }
        },
        required: ["idToken"],
        description: "Schema para login via Google",
        example: {
            idToken: "token_recebido_pelo_google"
        }
    },

    RespostaPass: {
        type: "object",
        properties: {
            active: {
                type: "boolean",
                description: "Indica se o token ainda é válido (não expirado)",
                example: true
            },
            token_type: {
                type: "string",
                description: "Tipo de token, conforme RFC 6749",
                example: "Bearer"
            },
            exp: {
                type: "integer",
                description: "Timestamp UNIX de expiração do token",
                example: 1672531199
            },
            iat: {
                type: "integer",
                description: "Timestamp UNIX de emissão do token",
                example: 1672527600
            }
        },
        description: "Schema para resposta de introspecção de token"
    }
};

export default authSchemas;
