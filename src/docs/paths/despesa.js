// src/docs/paths/despesa.js

import commonResponses from "../schemas/swaggerCommonResponses.js";

const despesaPaths = {
    "/despesas": {
        get: {
            tags: ["Despesas"],
            summary: "Lista todas as despesas ou busca por filtros",
            description: `
            + Caso de uso: Permitir a listagem de despesas (Abastecimento, Alimentação, Pedágio, Manutenção, Outros) para consulta, prestação de contas (RDV) e sincronização Offline-First.

            + Função de Negócio:
                - Retornar uma lista paginada de lançamentos financeiros.
                + Recebe como query parameters (opcionais):
                    • filtros: **viagem_id**, **tipo**, **data_inicio**, **data_fim**.
                    • paginação: **page** (padrão: 1), **limite** (padrão: 10, máx: 100).

            + Regras de Negócio:
                - **Administrador**: Visualiza e filtra despesas de todas as viagens e empresas.
                - **Gestor**: Visualiza as despesas de todas as viagens vinculadas aos motoristas da sua transportadora (\`empresa_id\`).
                - **Motorista**: Visualiza apenas as despesas das suas próprias viagens.
                - **(Offline-First)**: Se o motorista não enviar o \`viagem_id\`, a API retornará automaticamente todas as despesas vinculadas a todas as viagens dele, permitindo o "Pull Sync" global no banco local do dispositivo.

            + Resultado Esperado:
                - HTTP 200 OK com array de despesas formatadas e metadados de paginação.
            `,
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "viagem_id",
                    in: "query",
                    schema: { type: "string" },
                    description: "ID da viagem para filtrar as despesas"
                },
                {
                    name: "tipo",
                    in: "query",
                    schema: { type: "string", enum: ["ABASTECIMENTO", "ALIMENTACAO", "MANUTENCAO", "PEDAGIO", "OUTROS"] },
                    description: "Filtrar por tipo macro de despesa"
                },
                {
                    name: "data_inicio",
                    in: "query",
                    schema: { type: "string", format: "date-time" },
                    description: "Data inicial para filtro de período"
                },
                {
                    name: "data_fim",
                    in: "query",
                    schema: { type: "string", format: "date-time" },
                    description: "Data final para filtro de período"
                },
                {
                    name: "page",
                    in: "query",
                    schema: { type: "integer", default: 1 },
                    description: "Número da página para paginação"
                },
                {
                    name: "limite",
                    in: "query",
                    schema: { type: "integer", default: 10, maximum: 100 },
                    description: "Quantidade de itens por página"
                }
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/DespesaRequest"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        },
        post: {
            tags: ["Despesas"],
            summary: "Registra uma nova despesa na viagem ativa",
            description: `
            + Caso de uso: Registrar um comprovante de gasto operacional ocorrido durante a viagem (Abastecimento no posto, Alimentação, Pedágio, Manutenção ou Outros).

            + Função de Negócio:
                - Criar um novo lançamento financeiro atrelado à viagem em andamento.
                + Recebe no corpo da requisição:
                    - **viagem_id**: UUID da viagem vinculada (obrigatório).
                    - **tipo**: "ABASTECIMENTO" | "ALIMENTACAO" | "MANUTENCAO" | "PEDAGIO" | "OUTROS" (obrigatório).
                    - **valor_total**: Valor total em Reais (obrigatório).
                    - **data**: Data e hora da despesa (obrigatório, não pode ser no futuro nem anterior ao início da viagem).
                    - **local**: Nome do posto, restaurante, praça de pedágio ou oficina (opcional).
                    - **descricao**: Descrição livre do que foi realizado/comprado (opcional).
                    - **foto_anexo**: URL da foto do comprovante/recibo armazenado no Garage/S3 (opcional).
                    - *Campos exclusivos para ABASTECIMENTO*:
                        • **litros**: Quantidade de litros abastecidos.
                        • **valor_litro**: Preço por litro.
                        • **tipo_combustivel**: "DIESEL_S10" | "DIESEL_S500" | "GASOLINA" | "ETANOL" | "ARLA_32" | "OUTRO".
                        • **km_atual**: Odômetro atual do veículo no momento do abastecimento (deve ser >= km_inicial da viagem).

            + Regras de Negócio:
                - Apenas o motorista dono da viagem, o gestor da transportadora ou administrador podem registrar despesas.
                - A viagem deve estar com status "em_andamento".
                - Em despesas de abastecimento, a validação de tolerância financeira garante que \`valor_total\` seja exatamente \`litros * valor_litro\`.
                - As despesas são imutáveis (append-only) para auditoria fiscal e prevenção de fraudes.

            + Resultado Esperado:
                - HTTP 201 Created com os dados completos da despesa registrada.
            `,
            security: [{ bearerAuth: [] }],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            $ref: "#/components/schemas/DespesaRequest"
                        }
                    }
                }
            },
            responses: {
                201: commonResponses[201]("#/components/schemas/DespesaRequest"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    },
    "/despesas/{id}": {
        get: {
            tags: ["Despesas"],
            summary: "Busca uma despesa específica pelo ID",
            description: `
            + Caso de uso: Consultar os detalhes, valores e foto do comprovante de um lançamento financeiro específico.

            + Função de Negócio:
                - Retornar todos os campos de uma despesa pelo seu UUID.
                + Recebe como path parameter:
                    - **id**: UUID da despesa.

            + Regras de Negócio:
                - O usuário deve ser o motorista dono da viagem, o gestor da transportadora vinculada ou Administrador do sistema.

            + Resultado Esperado:
                - HTTP 200 OK com os dados completos da despesa.
            `,
            security: [{ bearerAuth: [] }],
            parameters: [
                {
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "string" },
                    description: "UUID da despesa"
                }
            ],
            responses: {
                200: commonResponses[200]("#/components/schemas/DespesaRequest"),
                401: commonResponses[401](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        },
        delete: {
            tags: ["Despesas"],
            summary: "Remove uma despesa lançada incorretamente",
            description: `
            + Caso de uso: Excluir um comprovante ou lançamento financeiro digitado com erro antes do encerramento da viagem.

            + Função de Negócio:
                - Remover o registro da despesa da base de dados.
                + Recebe como path parameter:
                    - **id**: UUID da despesa a ser excluída.

            + Regras de Negócio:
                - A exclusão por motoristas só é permitida enquanto a viagem correspondente estiver com status "em_andamento".
                - O solicitante deve ser o motorista da viagem, o gestor da transportadora vinculada ou Administrador.

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
                    description: "UUID da despesa"
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
                                    mensagem: { type: "string", example: "Despesa deletada com sucesso." }
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
    }
};

export default despesaPaths;
