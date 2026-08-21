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
            + Caso de uso: Permitir a listagem de empresas cadastradas no sistema ou busca por filtros dinâmicos de transportadoras.

            + Função de Negócio:
                - Obter uma lista paginada das empresas cadastradas no sistema.
                + Recebe como query parameters (opcionais):
                    • filtros: nome_empresa, cnpj, email, status, cidade, estado.
                    • paginação: page, limite.

            + Regras de Negócio:
                - Administradores do sistema podem listar todas as empresas cadastradas.
                - Gestores de empresa visualizam apenas a transportadora à qual pertencem.
                - Validar formatos dos filtros fornecidos.
                - Paginação padrão suportada via parâmetros page (mínimo 1) e limite (máximo 100).

            + Resultado Esperado:
                - HTTP 200 OK com corpo conforme schema **EmpresaListagem** contendo a lista e metadados de paginação.
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
            + Caso de uso: Cadastro corporativo de uma nova transportadora no sistema.

            + Função de Negócio:
                - Criar e persistir uma nova empresa transportadora.
                + Recebe no corpo da requisição os campos:
                    - **nome_empresa**: Razão Social / Nome da Transportadora (obrigatório).
                    - **cnpj**: CNPJ válido da empresa com 14 dígitos (obrigatório).
                    - **email**: Email corporativo de contato (obrigatório).
                    - **telefone**: Telefone de contato (opcional).
                    - **endereco**: Objeto com logradouro, número, complemento, bairro, cidade, estado e cep (opcional).
                    - **gestor_id**: ID do usuário gestor inicial (opcional).
                    - **foto_logo**: URL pública do logotipo (opcional).

            + Regras de Negócio:
                - Apenas administradores do sistema podem cadastrar novas empresas.
                - CNPJ e Email corporativo devem ser únicos e válidos no sistema.
                - Se informado um gestor_id, o usuário deve existir e não ser administrador.

            + Resultado Esperado:
                - HTTP 201 Created com os dados da empresa criada conforme schema **EmpresaListagem**.
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
            + Caso de uso: Consultar o perfil detalhado, configurações e dados cadastrais da empresa.

            + Função de Negócio:
                - Retornar as informações completas da empresa especificada.
                + Recebe como path parameter:
                    - **id**: Identificador único da empresa (MongoDB ObjectId).

            + Regras de Negócio:
                - Administradores do sistema podem consultar qualquer empresa.
                - Gestores e motoristas vinculados têm permissão para consultar apenas sua própria empresa.
                - A empresa deve existir na base de dados.

            + Resultado Esperado:
                - HTTP 200 OK com os detalhes da empresa conforme schema **EmpresaListagem**.
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
                400: commonResponses[400](),
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
            + Caso de uso: Editar informações cadastrais, telefone, endereço, logotipo ou gestor responsável da empresa.

            + Função de Negócio:
                - Atualizar total ou parcialmente os campos cadastrais da empresa.
                + Recebe como path parameter:
                    - **id**: Identificador único da empresa (MongoDB ObjectId).
                + Recebe no corpo da requisição (campos opcionais para alteração):
                    - **nome_empresa**: Novo nome da empresa.
                    - **cnpj**: Novo CNPJ (validado).
                    - **email**: Novo email corporativo.
                    - **telefone**: Novo telefone.
                    - **endereco**: Objeto atualizado de endereço.
                    - **gestor_id**: Novo gestor responsável.
                    - **foto_logo**: Nova URL do logotipo.

            + Regras de Negócio:
                - Apenas administradores do sistema ou o gestor responsável pela respectiva empresa podem alterar os dados.
                - Em caso de alteração de CNPJ ou Email, a unicidade e o formato são validados.

            + Resultado Esperado:
                - HTTP 200 OK com os dados atualizados da empresa conforme schema **EmpresaListagem**.
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
            + Caso de uso: Remover o registro da empresa do sistema.

            + Função de Negócio:
                - Deletar a empresa especificada da base de dados.
                + Recebe como path parameter:
                    - **id**: Identificador único da empresa (MongoDB ObjectId).

            + Regras de Negócio:
                - Apenas administradores do sistema podem excluir empresas.
                - A existência da empresa deve ser validada antes da exclusão.
                - Não é permitida a exclusão de empresas que possuam viagens em andamento ativas.

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
                    description: "ID da empresa"
                }
            ],
            responses: {
                200: commonResponses[200](),
                400: commonResponses[400](),
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
            description: `
            + Caso de uso: Permitir ao administrador ativar ou desativar uma empresa transportadora.

            + Função de Negócio:
                - Atualizar o status da empresa entre "ativo" e "inativo".
                + Recebe como path parameter:
                    - **id**: Identificador único da empresa (MongoDB ObjectId).
                + Recebe no corpo da requisição:
                    - **status**: Novo status da empresa ("ativo" ou "inativo").

            + Regras de Negócio:
                - Apenas administradores do sistema podem alterar o status de ativação da empresa.
                - O status deve ser estritamente "ativo" ou "inativo".

            + Resultado Esperado:
                - HTTP 200 OK com os dados atualizados da empresa.
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
                            $ref: "#/components/schemas/EmpresaStatusAtualizacao"
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
    "/empresas/{id}/motoristas": {
        get: {
            tags: ["Empresas"],
            summary: "Lista os motoristas vinculados à empresa",
            description: `
            + Caso de uso: Gerenciamento e visualização da equipe de motoristas da transportadora no Painel Web.

            + Função de Negócio:
                - Obter a listagem paginada de todos os motoristas associados à empresa.
                + Recebe como path parameter:
                    - **id**: Identificador único da empresa (MongoDB ObjectId).
                + Recebe como query parameters (opcionais):
                    - **page**: Número da página (padrão: 1).
                    - **limite**: Quantidade de registros por página (padrão: 10).

            + Regras de Negócio:
                - Administradores do sistema ou o gestor da respectiva empresa podem listar os motoristas.
                - Retorna apenas usuários com papel de motorista vinculados à transportadora solicitada.

            + Resultado Esperado:
                - HTTP 200 OK com array de motoristas e metadados de paginação.
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
                400: commonResponses[400](),
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
            + Caso de uso: A transportadora cadastra o motorista diretamente pelo Painel Web, enviando email de boas-vindas e credenciais.

            + Função de Negócio:
                - Criar uma nova conta de motorista, associá-la à empresa e disparar as instruções de acesso via serviço de e-mail Hermes.
                + Recebe como path parameter:
                    - **id**: Identificador único da empresa (MongoDB ObjectId).
                + Recebe no corpo da requisição:
                    - **nome**: Nome completo do motorista (obrigatório).
                    - **email**: Email de acesso do motorista (obrigatório).
                    - **cpf**: CPF válido do motorista com 11 dígitos (obrigatório).
                    - **telefone**: Telefone de contato (opcional).
                    - **cargo**: Cargo do motorista (opcional, padrão: "Motorista").
                    - **veiculo_id**: ID do veículo inicial associado (opcional).
                    - **senha**: Senha provisória de acesso (opcional; se omitida, o motorista acessa via Login com Google ou recuperação de senha).

            + Regras de Negócio:
                - Administradores do sistema ou o gestor responsável pela respectiva empresa podem realizar o cadastro.
                - Email e CPF do motorista devem ser únicos no sistema.
                - A conta é criada com status ativo, email verificado e papel de motorista.
                - Um email de boas-vindas com instruções completas é disparado automaticamente via Hermes.

            + Resultado Esperado:
                - HTTP 201 Created com os dados do motorista cadastrado.
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
                404: commonResponses[404](),
                409: commonResponses[409](null, "Motorista já pertence a outra empresa ou dados já cadastrados."),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    },
    "/empresas/{id}/motoristas/vincular": {
        post: {
            tags: ["Empresas"],
            summary: "Vincula um motorista existente à empresa",
            description: `
            + Caso de uso: Associar um motorista já previamente registrado na plataforma à transportadora.

            + Função de Negócio:
                - Estabelecer vínculo empregatício entre a empresa e o motorista existente.
                + Recebe como path parameter:
                    - **id**: Identificador único da empresa (MongoDB ObjectId).
                + Recebe no corpo da requisição:
                    - **usuario_id**: ID do usuário motorista existente (ou email/cpf).
                    - **email**: Email do motorista existente (alternativa ao usuario_id).
                    - **cpf**: CPF do motorista existente (alternativa ao usuario_id).
                    - **cargo**: Cargo a ser exercido na empresa (opcional).
                    - **veiculo_id**: ID do veículo atribuído ao motorista (opcional).

            + Regras de Negócio:
                - Administradores do sistema ou o gestor da empresa solicitante.
                - O motorista não pode estar vinculado simultaneamente a outra empresa ativa.
                - O usuário é atualizado com o papel de motorista e o identificador da empresa.

            + Resultado Esperado:
                - HTTP 200 OK com os dados atualizados do motorista vinculado.
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
                409: commonResponses[409](null, "Motorista já está vinculado a outra empresa."),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    },
    "/empresas/{id}/motoristas/{motoristaId}": {
        delete: {
            tags: ["Empresas"],
            summary: "Desvincula um motorista da empresa",
            description: `
            + Caso de uso: Encerrar o vínculo profissional entre a transportadora e o motorista.

            + Função de Negócio:
                - Remover a associação entre o motorista e a transportadora.
                + Recebe como path parameters:
                    - **id**: Identificador único da empresa (MongoDB ObjectId).
                    - **motoristaId**: Identificador único do motorista a ser desvinculado (MongoDB ObjectId).

            + Regras de Negócio:
                - Administradores do sistema ou o gestor responsável pela empresa.
                - O motorista deve estar atualmente vinculado a esta empresa.
                - Não é permitido desvincular motoristas que possuam viagens com status "em_andamento".
                - O campo empresa_id do motorista é desassociado.

            + Resultado Esperado:
                - HTTP 200 OK com mensagem de sucesso confirmando a desvinculação.
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
                409: commonResponses[409](null, "Motorista possui viagens em andamento."),
                498: commonResponses[498](),
                500: commonResponses[500]()
            }
        }
    },
    "/empresas/{id}/veiculos": {
        get: {
            tags: ["Empresas"],
            summary: "Lista todos os veículos da frota da empresa",
            description: `
            + Caso de uso: Visualizar e gerenciar a frota de cavalos mecânicos e implementos da transportadora.

            + Função de Negócio:
                - Obter a listagem paginada de todos os veículos cadastrados para a empresa.
                + Recebe como path parameter:
                    - **id**: Identificador único da empresa (MongoDB ObjectId).
                + Recebe como query parameters (opcionais):
                    - **page**: Número da página (padrão: 1).
                    - **limite**: Quantidade de registros por página (padrão: 10).

            + Regras de Negócio:
                - Administradores do sistema ou o gestor da respectiva empresa.
                - Retorna exclusivamente os veículos vinculados ao empresa_id informado.

            + Resultado Esperado:
                - HTTP 200 OK com array de veículos da frota da empresa e metadados de paginação.
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
                400: commonResponses[400](),
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
            description: `
            + Caso de uso: Acompanhamento em tempo real e histórico de viagens de toda a frota da transportadora.

            + Função de Negócio:
                - Obter a listagem de viagens vinculadas à empresa com filtros por status e período.
                + Recebe como path parameter:
                    - **id**: Identificador único da empresa (MongoDB ObjectId).
                + Recebe como query parameters (opcionais):
                    - **status**: Filtra pelo status da viagem (em_andamento, concluída, cancelada).
                    - **data_inicio**: Data de início mínima.
                    - **data_fim**: Data de fim máxima.
                    - **page**: Número da página.
                    - **limite**: Quantidade de registros por página.

            + Regras de Negócio:
                - Administradores do sistema ou o gestor da respectiva empresa.
                - Retorna as viagens contendo snapshots de motorista e veículo e resumo de despesas.

            + Resultado Esperado:
                - HTTP 200 OK com array de viagens e metadados de paginação.
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
                    name: "status",
                    in: "query",
                    schema: { type: "string", enum: ["em_andamento", "concluída", "cancelada"] },
                    description: "Filtra pelo status da viagem"
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
                400: commonResponses[400](),
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
            + Caso de uso: Visualização executiva de indicadores chave de desempenho (KPIs) operacionais e financeiros da transportadora.

            + Função de Negócio:
                - Consolidar em tempo real as métricas de frota, motoristas, viagens e despesas financeiras acumuladas por categoria.
                + Recebe como path parameter:
                    - **id**: Identificador único da empresa (MongoDB ObjectId).

            + Regras de Negócio:
                - Administradores do sistema ou o gestor responsável pela respectiva empresa.
                - Calcula a contagem de motoristas vinculados, veículos da frota, viagens em andamento e concluídas, quilometragem total rodada, volume total de combustível (litros), média de consumo da frota (km/l) e somatório de despesas agregadas por tipo (ABASTECIMENTO, ALIMENTACAO, MANUTENCAO, PEDAGIO, OUTROS).

            + Resultado Esperado:
                - HTTP 200 OK com payload estruturado conforme o schema **EmpresaDashboard**.
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
                400: commonResponses[400](),
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
                + Recebe como path parameter:
                    - **id**: Identificador único da empresa (MongoDB ObjectId).
                + Recebe via **multipart/form-data**:
                    - \`file\` ou \`imagem\` ou \`logo\`: O arquivo da imagem do logotipo.

            + Regras de Negócio:
                - Máximo 50MB e tipos de imagem permitidos (jpg, png, jpeg, svg, webp).
                - A imagem antiga é apagada automaticamente do bucket para economia de espaço.
                - Administradores do sistema ou o gestor da própria empresa podem realizar o upload.

            + Resultado Esperado:
                - HTTP 200 OK com a URL da imagem carregada e metadados de processamento.
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
                                    description: "Arquivo de imagem do logotipo (PNG, JPG, WEBP, etc.)"
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
                - Apagar a imagem da logo do bucket (Garage/S3) e redefinir o campo \`foto_logo\` como vazio na base de dados.
                + Recebe como path parameter:
                    - **id**: Identificador único da empresa (MongoDB ObjectId).

            + Regras de Negócio:
                - A empresa deve possuir um logotipo previamente cadastrado.
                - Administradores do sistema ou o gestor responsável pela própria empresa podem remover o logotipo.

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

export default empresaRoutes;
