// src/docs/paths/usuario.js

import commonResponses from "../schemas/swaggerCommonResponses.js";
import usuarioSchemas from "../schemas/usuarioSchema.js";
import { generateParameters } from "./utils/generateParameters.js";

const usuarioRoutes = {
    "/usuarios": {
        get: {
            tags: ["Usuários"],
            summary: "Lista todos os usuários cadastrados",
            description: `
        + Caso de uso: Permitir que um usuário autorizado liste todos os usuários disponíveis no sistema, com possibilidade de filtros.

        + Função de Negócio:
            - Permitir ao front-end obter uma lista dos usuários cadastrados.
            + Recebe como query parameters (opcionais):
                • filtros: nome, email, status, role, cpf, cnh, veiculo_id, empresa_id, empresa_nome, isAdmin e todos.
                • paginação: page (padrão 1), limite (padrão 10, máx 1000, 0 para todos).

        + Regras de Negócio:
            - Validar formatos e valores dos filtros fornecidos.
            - A listagem deve ocorrer mesmo se nenhum filtro for enviado.
            - **SuperAdmin**: Pode listar e filtrar todos os usuários do sistema global.
            - **Administradores / Gestores da Empresa**: Visualizam a listagem dos motoristas e membros vinculados à sua transportadora (`empresa_id`).
            - **Motoristas**: Podem visualizar apenas os seus próprios dados de perfil.
            - Suporte a paginação via parâmetros page e limite (ou todos=true para listagem completa).

        + Resultado Esperado:
            - 200 OK com corpo conforme schema **UsuarioListagem**, contendo:
                • **items**: array de usuários.
      `,
            security: [{ bearerAuth: [] }],
            parameters: [
                ...generateParameters(usuarioSchemas.UsuarioFiltro),
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
                200: commonResponses[200]("#/components/schemas/UsuarioListagem"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        },
        post: {
            tags: ["Usuários"],
            summary: "Cadastro de novos usuários (admin)",
            description: `
            + Caso de uso: Permitir que o administrador cadastre um novo usuário no sistema.

            + Função de Negócio:
                - Permitir ao front-end cadastrar um usuário.
                + Recebe no corpo da requisição os seguintes campos:
                    - **nome**: nome do usuário.
                    - **email**: email do usuário.
                    - **senha**: senha do usuário.
                    - **cpf**: CPF do usuário (opcional, 11 dígitos).
                    - **telefone**: telefone (opcional).

            + Regras de Negócio:
                - O corpo da requisição deve seguir o UsuarioSchema.
                - Campos obrigatórios: nome, email e senha.
                - Não deve permitir criação com email ou CPF duplicados.
                - Apenas administradores podem criar outros usuários diretamente por esta rota.

            + Resultado Esperado:
                - HTTP 201 Created retornando o usuário criado com ID.
        `,
            security: [{ bearerAuth: [] }],
            requestBody: {
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/UsuarioPost" }
                    }
                }
            },
            responses: {
                201: commonResponses[201]("#/components/schemas/UsuarioDetalhes"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                409: commonResponses[409](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    },

    "/usuarios/{id}": {
        get: {
            tags: ["Usuários"],
            summary: "Obtém detalhes de um usuário",
            description: `
            + Caso de uso: Consulta de detalhes de um usuário específico.

            + Função de Negócio:
                - Permitir ao front-end obter todas as informações de um usuário cadastrado.
                + Recebe como path parameter:
                    - **id**: identificador do usuário (MongoDB ObjectId).

            + Regras de Negócio:
                - Validação do formato do ID.
                - Administradores têm acesso a todos os usuários.
                - Gestores têm acesso aos dados dos motoristas da sua própria transportadora.
                - Motoristas podem ver apenas seus próprios dados.

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme **UsuarioDetalhes**.
        `,
            security: [{ bearerAuth: [] }],
            parameters: [{
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string" }
            }],
            responses: {
                200: commonResponses[200]("#/components/schemas/UsuarioDetalhes"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        },
        patch: {
            tags: ["Usuários"],
            summary: "Atualiza parcialmente um usuário",
            description: `
            + Caso de uso: Permitir que os usuários atualizem parcialmente seus próprios dados.

            + Função de Negócio:
                - Permitir ao front-end atualizar um usuário.
                + Recebe como path parameter:
                    - **id**: identificador do usuário (MongoDB ObjectId).

            + Regras de Negócio:
                - Os dados enviados devem seguir o UsuarioUpdateSchema.
                - Não é permitido atualizar email ou senha por esta rota.
                - Usuários comuns podem atualizar apenas seus próprios dados.

            + Resultado Esperado:
                - HTTP 200 OK com dados atualizados do usuário.
        `,
            security: [{ bearerAuth: [] }],
            parameters: [{
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string" }
            }],
            requestBody: {
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/UsuarioPatch" }
                    }
                }
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/UsuarioDetalhes"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        },
        delete: {
            tags: ["Usuários"],
            summary: "Deleta um usuário",
            description: `
            + Caso de uso: Permitir que o administrador exclua um usuário ou que o próprio usuário exclua sua conta.

            + Função de Negócio:
                - Permitir ao front-end excluir um usuário.
                + Recebe como path parameter:
                    - **id**: identificador do usuário (MongoDB ObjectId).

            + Regras de Negócio:
                - O usuário não-admin pode excluir apenas a si mesmo.
                - Administradores podem excluir qualquer usuário.
                - A existência do usuário deve ser verificada antes da exclusão.

            + Resultado Esperado:
                - HTTP 200 OK com mensagem de sucesso.
        `,
            security: [{ bearerAuth: [] }],
            parameters: [{
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string" }
            }],
            responses: {
                200: commonResponses[200](),
                400: commonResponses[400](),
                401: commonResponses[401](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    },

    "/usuarios/{id}/status": {
        patch: {
            tags: ["Usuários"],
            summary: "Atualiza status do usuário (ativo/inativo)",
            description: `
            + Caso de uso: Permitir que o administrador ative ou desative um usuário.

            + Função de Negócio:
                - Atualizar o campo status do usuário entre "ativo" e "inativo".
                + Recebe como path parameter:
                    - **id**: identificador do usuário (MongoDB ObjectId).

            + Regras de Negócio:
                - Administradores do sistema podem alterar o status de qualquer usuário.
                - Gestores podem ativar ou inativar motoristas e membros vinculados à sua própria transportadora (empresa_id).
                - O status deve ser "ativo" ou "inativo".

            + Resultado Esperado:
                - HTTP 200 OK com dados atualizados do usuário.
        `,
            security: [{ bearerAuth: [] }],
            parameters: [{
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string" }
            }],
            requestBody: {
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/UsuarioStatusPatch" }
                    }
                }
            },
            responses: {
                200: commonResponses[200]("#/components/schemas/UsuarioDetalhes"),
                400: commonResponses[400](),
                401: commonResponses[401](),
                404: commonResponses[404](),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    },

    "/usuarios/{id}/foto": {
        post: {
            tags: ["Usuários"],
            summary: "Faz upload/atualiza a foto de perfil do usuário",
            description: `
            + Caso de uso: Adicionar ou alterar a foto de perfil do usuário.

            + Função de Negócio:
                - Processa um arquivo de imagem, envia para o bucket e associa ao perfil.
                + Recebe via **multipart/form-data**:
                    - \`file\` ou \`imagem\`: O arquivo da foto.

            + Regras de Negócio:
                - Máximo 50MB (definido no serviço) e tipos restritos (jpg, png, jpeg, svg).
                - A imagem antiga é apagada automaticamente.
                - O próprio usuário (ou admin) pode realizar esta ação.

            + Resultado Esperado:
                - HTTP 200 OK com link da imagem carregada.
            `,
            security: [{ bearerAuth: [] }],
            parameters: [{
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string" },
                description: "ID do usuário"
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
                                    description: "Arquivo de imagem (JPEG, PNG, etc)"
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
                500: commonResponses[500]()
            }
        },
        delete: {
            tags: ["Usuários"],
            summary: "Deleta a foto de perfil do usuário",
            description: `
            + Caso de uso: O usuário deseja remover sua foto de perfil.

            + Função de Negócio:
                - Apaga a foto do bucket e define como vazio/null na base de dados.

            + Regras de Negócio:
                - O próprio usuário (ou admin) pode remover a imagem.
                - A remoção real do arquivo pode ocorrer de forma silenciosa ou síncrona.

            + Resultado Esperado:
                - HTTP 200 OK informando o sucesso da remoção.
            `,
            security: [{ bearerAuth: [] }],
            parameters: [{
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string" },
                description: "ID do usuário"
            }],
            responses: {
                200: commonResponses[200](),
                401: commonResponses[401](),
                403: commonResponses[403](),
                404: commonResponses[404](),
                500: commonResponses[500]()
            }
        }
    }
};

export default usuarioRoutes;
