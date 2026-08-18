// src/docs/paths/empresa.js

import commonResponses from "../schemas/swaggerCommonResponses.js";
import empresaSchemas from "../schemas/empresaSchema.js";
import { generateParameters } from "./utils/generateParameters.js";

const empresaRoutes = {
    "/empresas": {
        get: {
            tags: ["Empresas"],
            summary: "Lista todas as empresas ou busca por filtros",
            description: `
        + Caso de uso: Permitir a listagem de empresas cadastradas no sistema ou busca por filtros (CNPJ, Nome da Empresa, etc).
        
        + Regras de Negócio:
            - Administradores do sistema podem listar todas as empresas.
            - Gestores de empresa visualizam apenas a empresa a qual pertencem.
            - Paginação suportada via \`page\` e \`limite\`.
            `,
            security: [{ bearerAuth: [] }],
            parameters: [
                ...generateParameters(empresaSchemas.EmpresaFiltro),
                {
                    name: "limite",
                    in: "query",
                    schema: { type: "number" },
                    required: false,
                    description: "Quantidade de registros por página"
                },
                {
                    name: "page",
                    in: "query",
                    schema: { type: "number" },
                    required: false,
                    description: "Número da página"
                }
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/EmpresaListagem"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        },
        post: {
            tags: ["Empresas"],
            summary: "Cadastra uma nova empresa",
            description: `
        + Caso de uso: Cadastro corporativo de transportadoras no sistema.
        
        + Regras de Negócio:
            - Apenas administradores do sistema podem cadastrar novas empresas.
            - CNPJ e Email corporativo devem ser únicos e válidos.
            - Opcionalmente vincula um usuário como gestor responsável.
            `,
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/EmpresaCriacao"
                        }
                    }
                }
            },
            responses: {
                201: commonResponses[201]("#/components/schemas/EmpresaListagem"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                409: commonResponses[409](null, "CNPJ ou email já cadastrado."),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    },
    "/empresas/{id}": {
        get: {
            tags: ["Empresas"],
            summary: "Busca detalhes de uma empresa pelo ID",
            description: `
        + Caso de uso: Exibir perfil e configurações da empresa.
        
        + Regras de Negócio:
            - Administradores, gestores da empresa ou motoristas vinculados têm acesso.
            `,
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "ID da empresa"
                }
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/EmpresaListagem"),
                401: commonResponses[401](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        },
        patch: {
            tags: ["Empresas"],
            summary: "Atualiza os dados de uma empresa",
            description: `
        + Caso de uso: Editar informações cadastrais, endereço ou gestor da empresa.
        
        + Regras de Negócio:
            - Administradores do sistema ou Gestores da respectiva empresa.
            `,
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "ID da empresa"
                }
            ],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/EmpresaAtualizacao"
                        }
                    }
                }
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/EmpresaListagem"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        },
        delete: {
            tags: ["Empresas"],
            summary: "Exclui uma empresa do sistema",
            description: `
        + Regras de Negócio:
            - Apenas administradores do sistema.
            - Não permite exclusão se houver viagens em andamento vinculadas.
            `,
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "ID da empresa"
                }
            ],
            responses: {
                200: commonResponses[200](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                409: commonResponses[409](null, "Existem viagens em andamento na empresa."),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    },
    "/empresas/{id}/status": {
        patch: {
            tags: ["Empresas"],
            summary: "Ativa ou inativa uma empresa",
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "ID da empresa"
                }
            ],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/EmpresaStatusAtualizacao"
                        }
                    }
                }
            },
            responses: {
                200: commonResponses[200](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    },
    "/empresas/{id}/motoristas": {
        get: {
            tags: ["Empresas"],
            summary: "Lista os motoristas vinculados à empresa",
            description: `
        + Caso de uso: Painel Web da empresa para gerenciamento de motoristas.
        `,
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "ID da empresa"
                },
                {
                    name: "page",
                    in: "query",
                    schema: { type: "number" },
                    description: "Página"
                },
                {
                    name: "limite",
                    in: "query",
                    schema: { type: "number" },
                    description: "Limite por página"
                }
            ],
            responses: {
                200: commonResponses[200](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        },
        post: {
            tags: ["Empresas"],
            summary: "Cadastra um novo motorista pela empresa e envia email de boas-vindas",
            description: `
        + Caso de uso: A transportadora cadastra o motorista diretamente no Painel Web.
        + O motorista recebe um email de boas-vindas com instruções de acesso e pode entrar no App via Google ou senha.
        `,
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "ID da empresa"
                }
            ],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/EmpresaCadastrarMotorista"
                        }
                    }
                }
            },
            responses: {
                201: commonResponses[201](),
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                409: commonResponses[409](null, "Motorista já pertence a outra empresa."),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    },
    "/empresas/{id}/motoristas/vincular": {
        post: {
            tags: ["Empresas"],
            summary: "Vincula um motorista existente à empresa",
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "ID da empresa"
                }
            ],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/EmpresaVincularMotorista"
                        }
                    }
                }
            },
            responses: {
                200: commonResponses[200](),
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    },
    "/empresas/{id}/motoristas/{motoristaId}": {
        delete: {
            tags: ["Empresas"],
            summary: "Desvincula um motorista da empresa",
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "ID da empresa"
                },
                {
                    name: "motoristaId",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "ID do motorista"
                }
            ],
            responses: {
                200: commonResponses[200](),
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    },
    "/empresas/{id}/veiculos": {
        get: {
            tags: ["Empresas"],
            summary: "Lista todos os veículos da frota da empresa",
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "ID da empresa"
                }
            ],
            responses: {
                200: commonResponses[200](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    },
    "/empresas/{id}/viagens": {
        get: {
            tags: ["Empresas"],
            summary: "Lista todas as viagens realizadas pelos motoristas da empresa",
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "ID da empresa"
                }
            ],
            responses: {
                200: commonResponses[200](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    },
    "/empresas/{id}/dashboard": {
        get: {
            tags: ["Empresas"],
            summary: "Obtém métricas consolidadas para o Painel Web da Empresa",
            description: `
        + Caso de uso: Dashboard executivo para gestores de transportadora.
        + Retorna total de motoristas, total de veículos, viagens ativas/concluídas, KM total rodado e despesas agregadas por categoria.
        `,
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "ID da empresa"
                }
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/EmpresaDashboard"),
                401: commonResponses[401](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    },
    "/empresas/{id}/foto": {
        post: {
            tags: ["Empresas"],
            summary: "Faz upload/atualiza o logotipo da empresa",
            description: `
            + Caso de uso: Adicionar ou alterar a imagem da logo da empresa transportadora.

            + Função de Negócio:
                - Processa o arquivo de imagem, envia para o bucket (Garage/S3) e associa a \`foto_logo\` da empresa.
                + Recebe via **multipart/form-data**:
                    - \`file\` ou \`imagem\` ou \`logo\`: O arquivo da logo.

            + Regras de Negócio:
                - Máximo 50MB e tipos restritos (jpg, png, jpeg, svg, webp).
                - A imagem antiga é apagada automaticamente do bucket.
                - Administradores ou gestores da empresa podem realizar esta ação.

            + Resultado Esperado:
                - HTTP 200 OK com a URL da imagem carregada.
            `,
            security: [{ bearerAuth: [] }],
            parameters: [{
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string" },
                description: "ID da empresa"
            }],
            requestBody: {
                content: {
                    "multipart/form-data": {
                        schema: {
                            type: "object",
                            properties: {
                                file: {
                                    type: "string",
                                    format: "binary",
                                    description: "Arquivo de imagem do logotipo (PNG, JPG, etc.)"
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                200: commonResponses[200](),
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        },
        delete: {
            tags: ["Empresas"],
            summary: "Deleta o logotipo da empresa",
            description: `
            + Caso de uso: Remover o logotipo cadastrado da empresa.

            + Função de Negócio:
                - Apaga a foto do bucket e redefine \`foto_logo\` como vazio no banco.

            + Regras de Negócio:
                - Administradores ou gestores da própria empresa podem remover o logotipo.

            + Resultado Esperado:
                - HTTP 200 OK informando o sucesso da remoção.
            `,
            security: [{ bearerAuth: [] }],
            parameters: [{
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string" },
                description: "ID da empresa"
            }],
            responses: {
                200: commonResponses[200](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    }
};

export default empresaRoutes;
