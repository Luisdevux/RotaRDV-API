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
        + Caso de uso: Permitir que motoristas ou administradores listem as viagens cadastradas.
        
        + Função de Negócio:
            - Retornar uma lista de viagens (paginada).
            + Recebe opcionalmente parâmetros de query:
                - **status**: "em_andamento", "concluída" ou "cancelada".
                - **veiculo_id**: filtrar viagens de um veículo específico.
                - **data_inicio** e **data_fim**: para filtrar viagens num período.
        
        + Regras de Negócio:
            - Administradores visualizam viagens de todos os usuários.
            - Motoristas visualizam apenas suas próprias viagens.
            - A paginação é feita pelas queries \`page\` e \`limite\`.
        
        + Resultado Esperado:
            - HTTP 200 OK com array de \`ViagemListagem\` contendo os snapshots de usuário e veículo.
      `,
            security: [{ bearerAuth: [] }],
            parameters: [
                ...generateParameters(viagemSchemas.ViagemFiltro),
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
            summary: "Cria uma nova viagem",
            description: `
        + Caso de uso: O motorista inicia uma nova viagem no aplicativo.
        
        + Função de Negócio:
            - Registrar os dados iniciais da viagem, como origem, destino, km_inicial, e a data de início.
            + Recebe no corpo:
                - **veiculo_id**, **origem**, **destino**, **data_inicio**, **km_inicial**.
        
        + Regras de Negócio: 
            - Um usuário (motorista) só pode ter UMA viagem com status "em_andamento" por vez.
            - O \`veiculo_id\` deve ser válido.
            - A \`data_fim\` e o \`km_final\` não são exigidos na criação.
            - Opcionalmente o App pode enviar o \`_id\` gerado offline via IsarDB.
        
        + Resultado Esperado:
            - HTTP 201 Created retornando os detalhes da viagem.
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
                409: commonResponses[409](null, "Já existe uma viagem em andamento para este usuário."),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    },
    "/viagens/{id}": {
        get: {
            tags: ["Viagens"],
            summary: "Busca uma viagem específica pelo ID",
            description: `
            + Caso de uso: Exibir os detalhes completos de uma viagem (incluindo métricas financeiras se houver).
            
            + Função de Negócio:
                - Busca os dados da viagem pelo UUID.
            
            + Regras de Negócio:
                - Se for motorista comum, o backend valida se ele é dono daquela viagem.
                - Administrador visualiza livremente.
            
            + Resultado Esperado:
                - HTTP 200 OK com os dados da viagem (Snapshot do veículo incluso).
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
            summary: "Atualiza uma viagem existente",
            description: `
            + Caso de uso: Editar informações ou CONCLUIR a viagem.
            
            + Função de Negócio:
                - Atualizar propriedades da viagem, como definir \`status = "concluída"\`.
                + Para concluir, recebe:
                    - **data_fim** e **km_final**.
            
            + Regras de Negócio:
                - Apenas o motorista dono da viagem ou admin pode atualizar.
                - Se mudar o status para "concluída", o \`km_final\` se torna obrigatório.
                - O \`km_final\` não pode ser menor que o \`km_inicial\`.
                - A \`data_fim\` não pode ser anterior à \`data_inicio\`.
            
            + Resultado Esperado:
                - HTTP 200 OK com os dados atualizados.
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
            summary: "Remove uma viagem",
            description: `
            + Caso de uso: Excluir um registro de viagem incorreto.
            
            + Função de Negócio:
                - Remove fisicamente a viagem do banco de dados (ou \`is_deleted=true\` se soft delete).
            
            + Regras de Negócio:
                - Apenas Administradores podem deletar viagens via API de forma direta.
                - Alternativamente, motoristas excluem localmente e a sincronização Push (is_deleted: true) processa a remoção.
            
            + Resultado Esperado:
                - HTTP 200 OK se removido com sucesso.
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
