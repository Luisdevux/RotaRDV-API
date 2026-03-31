// src/docs/paths/auth.js

import commonResponses from "../schemas/swaggerCommonResponses.js";

const authRoutes = {
    "/login": {
        post: {
            tags: ["Auth"],
            summary: "Autentica usuário e retorna tokens JWT",
            description: `
            + Caso de uso: Autenticação de usuário no sistema via email e senha.

            + Função de Negócio:
                - Permitir que o usuário faça login na plataforma de delivery.
                + Recebe no corpo da requisição:
                    - **email**: email cadastrado do usuário.
                    - **senha**: senha do usuário.

            + Regras de Negócio:
                - Email e senha são obrigatórios.
                - O sistema valida as credenciais e verifica se o usuário está ativo.
                - Em caso de sucesso, retorna accessToken (15min) e refreshToken (7 dias).
                - Em caso de falha, retorna 401 Unauthorized.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **RespostaLogin**, contendo accessToken, refreshToken e dados do usuário.
        `,
            requestBody: {
                content: {
                    "application/json": {
                        schema: {
                            "$ref": "#/components/schemas/loginPost"
                        }
                    }
                }
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/RespostaLogin"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                500: commonResponses[500]()
            }
        }
    },

    "/signup": {
        post: {
            tags: ["Auth"],
            summary: "Registra novo usuário no sistema",
            description: `
            + Caso de uso: Criação de conta própria no sistema de delivery.

            + Função de Negócio:
                - Permitir que novos usuários se registrem, criando uma conta com dados básicos.
                + Recebe no corpo da requisição:
                    - Objeto conforme schema **signupPost**, contendo campos como nome, email, senha, etc.

            + Regras de Negócio:
                - Validação de campos obrigatórios (nome, email e senha).
                - Verificação de unicidade para email e cpf.
                - Definição de status inicial como "ativo".
                - Senha deve atender requisitos de segurança (mín. 8 chars, maiúscula, minúscula, número, especial).
                - Em caso de duplicidade ou erro de validação, retorna erro apropriado.

            + Resultado Esperado:
                - HTTP 201 Created com corpo conforme **signupPostDetalhes**, contendo todos os dados do usuário criado.
        `,
            requestBody: {
                content: {
                    "application/json": {
                        schema: {
                            "$ref": "#/components/schemas/signupPost"
                        }
                    }
                }
            },
            responses: {
                201: commonResponses[201]("#/components/schemas/signupPostDetalhes"),
                400: commonResponses[400](),
                409: commonResponses[409](),
                500: commonResponses[500]()
            }
        }
    },

    "/logout": {
        post: {
            tags: ["Auth"],
            summary: "Encerra sessão e invalida access token",
            description: `
            + Caso de uso: Logout de usuário e revogação de token de acesso.

            + Função de Negócio:
                - Permitir ao usuário encerrar a sessão corrente e impedir o uso futuro do mesmo token.

            + Recebe pelo header Authorization:
                - Bearer <token> o accessToken a ser revogado.

            + Fluxo:
                - Valida accessToken e revoga ao excluir da base de dados, impedindo usos futuros.
                - Invalida sessão corrente.
                - Endpoint idempotente: se já revogado, continua retornando 200 OK.

            + Resultado Esperado:
                - 200 OK com mensagem: Sessão encerrada com sucesso.
        `,
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                access_token: {
                                    type: "string",
                                    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
                                },
                            },
                            required: ["access_token"]
                        }
                    }
                }
            },
            responses: {
                200: commonResponses[200](),
                400: commonResponses[400](),
                401: commonResponses[401](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    },

    "/refresh": {
        post: {
            tags: ["Auth"],
            summary: "Renova access token a partir de refresh token",
            description: `
            + Caso de uso: Renovação de accessToken via refreshToken.

            + Função de Negócio:
                - Permitir ao usuário continuar logado sem necessidade de nova autenticação completa.

            + Recebe **refreshToken** válido no corpo da requisição.
                1. Valida se o token não está expirado.
                2. Gera um **accessToken** (expiração: 15 minutos).
                3. Opcionalmente, gera um **refreshToken** novo (rotacionamento).

            + Regras de Negócio:
                - Falha na validação retorna 401 Unauthorized ou 498 Token Expired.

            + Resultado Esperado:
                - **accessToken** (string): novo JWT de acesso, válido por 15 minutos.
                - **refreshToken** (string, opcional): novo refreshToken, válido por 7 dias.
                - **user** (object): dados do usuário autenticado.
        `,
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                refresh_token: {
                                    type: "string",
                                    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
                                },
                            },
                            required: ["refresh_token"]
                        }
                    }
                }
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/RespostaLogin"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    },

    "/recover": {
        post: {
            tags: ["Auth"],
            summary: "Solicita recuperação de senha via email",
            description: `
            + Caso de uso: Recuperação de senha quando o usuário esqueceu suas credenciais.

            + Função de Negócio:
                - Enviar email com código de recuperação para o usuário.
                + Recebe no corpo da requisição:
                    - **email**: email cadastrado do usuário.

            + Regras de Negócio:
                - O email deve estar cadastrado no sistema.
                - Gera código temporário de recuperação com expiração.
                - Envia email com o código via serviço de email configurado.
                - Rate limiting aplicado para evitar abuso.

            + Resultado Esperado:
                - HTTP 200 OK com mensagem de confirmação do envio do email.
        `,
            requestBody: {
                content: {
                    "application/json": {
                        schema: {
                            "$ref": "#/components/schemas/RequisicaoRecuperaSenha"
                        }
                    }
                }
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/RespostaRecuperaSenha"),
                400: commonResponses[400](),
                404: commonResponses[404](),
                429: commonResponses[429](),
                500: commonResponses[500]()
            }
        }
    },

    "/password/reset": {
        patch: {
            tags: ["Auth"],
            summary: "Redefine senha com código de recuperação",
            description: `
            + Caso de uso: Redefinição de senha utilizando código recebido por email.

            + Função de Negócio:
                - Permitir ao usuário definir uma nova senha utilizando o código de recuperação.
                + Recebe no corpo da requisição:
                    - **email**: email do usuário.
                    - **codigo**: código de recuperação recebido por email.
                    - **novaSenha**: nova senha a ser definida.

            + Regras de Negócio:
                - O código deve ser válido e não expirado.
                - A nova senha deve atender os requisitos de segurança.
                - Após redefinição, o código é invalidado.
                - Rate limiting aplicado para evitar brute force.

            + Resultado Esperado:
                - HTTP 200 OK com mensagem de confirmação da redefinição.
        `,
            requestBody: {
                content: {
                    "application/json": {
                        schema: {
                            "$ref": "#/components/schemas/RequisicaoRedefinirSenha"
                        }
                    }
                }
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/RespostaRedefinirSenha"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                429: commonResponses[429](),
                500: commonResponses[500]()
            }
        }
    }
};

export default authRoutes;
