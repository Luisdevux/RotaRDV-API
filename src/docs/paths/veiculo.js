// src/docs/paths/veiculo.js

import commonResponses from "../schemas/swaggerCommonResponses.js";
import veiculoSchemas from "../schemas/veiculoSchema.js";
import { generateParameters } from "./utils/generateParameters.js";

const veiculoRoutes = {
    "/veiculos": {
        get: {
            tags: ["Veículos"],
            summary: "Lista todos os veículos ou busca por filtros",
            description: `
            + Caso de uso: Permitir a listagem de veículos cadastrados na frota (cavalos mecânicos e implementos/carretas).

            + Função de Negócio:
                - Obter uma lista paginada dos veículos cadastrados.
                + Recebe como query parameters (opcionais):
                    • filtros: **modelo**, **placa**, **reboque_placa**, **reboque_modelo**.
                    • paginação: **page** (padrão: 1), **limite** (padrão: 10, máx: 100).

            + Regras de Negócio:
                - **Administradores**: Visualizam todos os veículos de todas as frotas.
                - **Gestores**: Visualizam todos os veículos da frota da sua própria transportadora (\`empresa_id\`).
                - **Motoristas**: Visualizam apenas o veículo atribuído ao seu próprio perfil de usuário.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme schema **VeiculoListagem** e dados de paginação.
            `,
            security: [{ bearerAuth: [] }],
            parameters: [
                ...generateParameters(veiculoSchemas.VeiculoFiltro),
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
                200: commonResponses[200]("#/components/schemas/VeiculoListagem"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        },
        post: {
            tags: ["Veículos"],
            summary: "Cadastra um novo veículo na frota",
            description: `
            + Caso de uso: Cadastro de um novo caminhão ou conjunto cavalo/carreta na frota da transportadora.

            + Função de Negócio:
                - Adicionar novo veículo à base de dados para ser utilizado em viagens.
                + Recebe no corpo da requisição:
                    - **placa**: Placa do cavalo mecânico (obrigatório, padrão Mercosul ou Nacional).
                    - **modelo**: Modelo do veículo (obrigatório).
                    - **combustivel_preferencial**: Tipo de combustível principal (obrigatório).
                    - **capacidade_tanque**: Capacidade em litros (obrigatório).
                    - **ano_fabricacao**: Ano de fabricação do veículo (obrigatório).
                    - **reboque**: Objeto contendo modelo e placas das carretas/implementos (opcional).
                    - **empresa_id**: ID da transportadora proprietária (opcional; vinculado automaticamente para gestores).

            + Regras de Negócio: 
                - Administradores do sistema e Gestores da transportadora têm permissão para cadastrar veículos.
                - A placa do veículo principal e dos implementos devem ser únicas no sistema.
                - Validação estrita do padrão de formatação da placa.

            + Resultado Esperado:
                - HTTP 201 Created com os dados do veículo cadastrado conforme schema **VeiculoListagem**.
            `,
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/VeiculoCriacao"
                        }
                    }
                }
            },
            responses: {
                201: commonResponses[201]("#/components/schemas/VeiculoListagem"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                409: commonResponses[409](null, "Placa já cadastrada."),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    },
    "/veiculos/{id}": {
        get: {
            tags: ["Veículos"],
            summary: "Busca detalhes de um veículo pelo ID",
            description: `
            + Caso de uso: Consultar os dados detalhados, especificações técnicas e implementos de um veículo da frota.

            + Função de Negócio:
                - Retornar as informações completas de um veículo pelo seu ID.
                + Recebe como path parameter:
                    - **id**: Identificador único do veículo.

            + Regras de Negócio:
                - Administradores visualizam qualquer veículo.
                - Gestores visualizam veículos da frota da sua própria transportadora.
                - Motoristas visualizam apenas o veículo atribuído ao seu perfil.

            + Resultado Esperado:
                - HTTP 200 OK com os detalhes do veículo conforme schema **VeiculoListagem**.
            `,
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "ID do veículo"
                }
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/VeiculoListagem"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        },
        patch: {
            tags: ["Veículos"],
            summary: "Atualiza os dados de um veículo da frota",
            description: `
            + Caso de uso: Atualizar informações cadastrais, capacidade de tanque ou implementos de um veículo.

            + Função de Negócio:
                - Edição de dados do veículo (modelo, combustível, reboque, etc).
                + Recebe como path parameter:
                    - **id**: Identificador do veículo.

            + Regras de Negócio:
                - Administradores do sistema ou Gestores da transportadora proprietária do veículo.
                - Se a placa for alterada, sua unicidade e formato são revalidados.

            + Resultado Esperado:
                - HTTP 200 OK com os dados atualizados do veículo.
            `,
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "ID do veículo"
                }
            ],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/VeiculoAtualizacao"
                        }
                    }
                }
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/VeiculoListagem"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                409: commonResponses[409](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        },
        delete: {
            tags: ["Veículos"],
            summary: "Remove um veículo da frota",
            description: `
            + Caso de uso: Excluir um veículo da frota (desativação, venda ou erro de lançamento).

            + Função de Negócio:
                - Remover o veículo da base de dados.
                + Recebe como path parameter:
                    - **id**: Identificador do veículo.

            + Regras de Negócio:
                - Apenas Administradores ou Gestores da transportadora proprietária podem excluir veículos.
                - O veículo deve existir na base de dados.

            + Resultado Esperado:
                - HTTP 200 OK com mensagem de sucesso confirmando a exclusão.
            `,
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "ID do veículo"
                }
            ],
            responses: {
                200: {
                    description: "Operação bem-sucedida.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    erro: { type: "boolean", example: false },
                                    mensagem: { type: "string", example: "Veículo deletado com sucesso." }
                                }
                            }
                        }
                    }
                },
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    },
    "/veiculos/{id}/status": {
        patch: {
            tags: ["Veículos"],
            summary: "Altera o status operacional do veículo (ativo/inativo)",
            description: `
            + Caso de uso: Ativar ou inativar temporariamente um veículo da frota (para manutenção, licença ou desativação).

            + Função de Negócio:
                - Alternar o estado de disponibilidade operacional do caminhão.
                + Recebe como path parameter:
                    - **id**: ID do veículo.
                + Recebe no body:
                    - **status**: 'ativo' ou 'inativo'.

            + Regras de Negócio:
                - Apenas Administradores e Gestores da transportadora vinculada podem alterar o status.
                - Veículos inativos não podem ser selecionados para novas viagens.

            + Resultado Esperado:
                - HTTP 200 OK confirmando a atualização de status.
            `,
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "ID do veículo"
                }
            ],
            requestBody: {
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/VeiculoStatusPatch" }
                    }
                }
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/VeiculoListagem"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    }
};

export default veiculoRoutes;
