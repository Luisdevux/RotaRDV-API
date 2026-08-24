// src/docs/paths/viagem.js

import commonResponses from "../schemas/swaggerCommonResponses.js";
import viagemSchemas from "../schemas/viagemSchema.js";
import { generateParameters } from "./utils/generateParameters.js";

const viagemRoutes = {
    "/viagens": {
        get: {
            tags: ["Viagens"],
            summary: "Lista todas as viagens ou busca por filtros",
            description: `
            + Caso de uso: Permitir que motoristas, gestores e administradores listem as viagens cadastradas com suporte a filtros e paginação.

            + Função de Negócio:
                - Retornar uma lista paginada de viagens.
                + Recebe como query parameters (opcionais):
                    • filtros: **empresa_id**, **status** ("em_andamento", "concluída", "cancelada"), **veiculo_id**, **data_inicio**, **data_fim**.
                    • paginação/exportação: **page** (padrão: 1), **limite** (padrão: 10, máx: 1000, 0 para todos), **todos** (booleano).

            + Regras de Negócio:
                - **SuperAdmin**: Visualiza viagens de todos os usuários e empresas (podendo filtrar por `empresa_id`).
                - **Gestores / Administradores da Empresa**: Visualizam as viagens de todos os motoristas pertencentes à sua transportadora (`empresa_id`).
                - **Motoristas**: Visualizam apenas as suas próprias viagens.
                - Suporte à paginação via parâmetros `page` e `limite` (ou `todos=true`/`limite=0` para listagem completa de relatórios).

            + Resultado Esperado:
                - HTTP 200 OK com array conforme schema **ViagemListagem** contendo snapshots de usuário e veículo.
            `,
            security: [{ bearerAuth: [] }],
            parameters: [
                ...generateParameters(viagemSchemas.ViagemFiltro),
                {
                    name: "limite",
                    in: "query",
                    schema: { type: "number", default: 10, maximum: 1000 },
                    required: false,
                    description: "Quantidade de registros por página (máximo 1000, ou 0 para todos)"
                },
                {
                    name: "page",
                    in: "query",
                    schema: { type: "number", default: 1 },
                    required: false,
                    description: "Número da página"
                }
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/ViagemListagem"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        },
        post: {
            tags: ["Viagens"],
            summary: "Cria e inicia uma nova viagem",
            description: `
            + Caso de uso: O motorista inicia uma nova jornada de trabalho/viagem no aplicativo.

            + Função de Negócio:
                - Registrar os dados iniciais da viagem, capturando snapshots do motorista e do veículo.
                + Recebe no corpo da requisição:
                    - **veiculo_id**: ID do veículo utilizado (obrigatório).
                    - **origem**: Cidade/Estado de origem (obrigatório).
                    - **destino**: Cidade/Estado de destino (obrigatório).
                    - **data_inicio**: Data e hora de início (obrigatório).
                    - **km_inicial**: Odômetro inicial do veículo (obrigatório).
                    - **_id**: UUID gerado offline pelo aplicativo (opcional).

            + Regras de Negócio: 
                - Um motorista só pode ter UMA viagem com status "em_andamento" por vez.
                - O veículo não pode estar em uso por outra viagem "em_andamento".
                - O \`km_inicial\` não pode ser menor que o \`km_final\` da última viagem concluída do veículo.
                - Captura snapshots imutáveis do motorista (nome, email) e do veículo (placa, modelo, reboque).
                - Associa automaticamente a viagem à transportadora do motorista ou veículo.

            + Resultado Esperado:
                - HTTP 201 Created retornando os dados da viagem criada conforme schema **ViagemListagem**.
            `,
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/ViagemCriacao"
                        }
                    }
                }
            },
            responses: {
                201: commonResponses[201]("#/components/schemas/ViagemListagem"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                409: commonResponses[409](null, "Já existe uma viagem em andamento para este usuário ou veículo em uso."),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    },
    "/viagens/{id}": {
        get: {
            tags: ["Viagens"],
            summary: "Busca detalhes de uma viagem específica pelo ID",
            description: `
            + Caso de uso: Exibir os detalhes completos de uma viagem, incluindo resumo financeiro dinâmico e comprovantes.

            + Função de Negócio:
                - Buscar os dados da viagem pelo UUID.
                + Recebe como path parameter:
                    - **id**: UUID da viagem.

            + Regras de Negócio:
                - Administradores visualizam qualquer viagem.
                - Gestores visualizam viagens dos motoristas da sua própria transportadora.
                - Motoristas visualizam apenas as suas próprias viagens.

            + Resultado Esperado:
                - HTTP 200 OK com os dados completos da viagem e resumo financeiro.
            `,
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "UUID da viagem"
                }
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/ViagemListagem"),
                401: commonResponses[401](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        },
        patch: {
            tags: ["Viagens"],
            summary: "Atualiza ou finaliza uma viagem existente",
            description: `
            + Caso de uso: Editar informações cadastrais da viagem ou concluir a jornada inserindo o KM Final.

            + Função de Negócio:
                - Atualizar propriedades da viagem ou definir status como "concluída".
                + Recebe como path parameter:
                    - **id**: UUID da viagem.
                + Recebe no corpo da requisição (opcionais para fechamento):
                    - **status**: "concluída" | "cancelada".
                    - **km_final**: Odômetro final do veículo (obrigatório para status "concluída").
                    - **data_fim**: Data/hora de término da viagem.

            + Regras de Negócio:
                - Permitido ao motorista dono da viagem, gestor da transportadora ou Administrador.
                - Não permite alterações se a viagem já estiver "concluída" ou "cancelada" (salvo Administradores).
                - Se o status for alterado para "concluída", o \`km_final\` é obrigatório e deve ser estritamente maior que o \`km_inicial\`.
                - A \`data_fim\` não pode ser anterior à \`data_inicio\`.

            + Resultado Esperado:
                - HTTP 200 OK com os dados atualizados da viagem.
            `,
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "UUID da viagem"
                }
            ],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/ViagemAtualizacao"
                        }
                    }
                }
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/ViagemListagem"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        },
        delete: {
            tags: ["Viagens"],
            summary: "Remove uma viagem do sistema",
            description: `
            + Caso de uso: Excluir um registro de viagem incorreto ou duplicado.

            + Função de Negócio:
                - Remover a viagem da base de dados.
                + Recebe como path parameter:
                    - **id**: UUID da viagem.

            + Regras de Negócio:
                - Apenas Administradores do sistema podem excluir viagens diretamente pela API.
                - A existência da viagem é validada antes da exclusão.

            + Resultado Esperado:
                - HTTP 200 OK com mensagem confirmando a exclusão.
            `,
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "UUID da viagem"
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
                                    mensagem: { type: "string", example: "Viagem deletada com sucesso." }
                                }
                            }
                        }
                    }
                },
                401: commonResponses[401](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    }
};

export default viagemRoutes;
