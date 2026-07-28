# TCC-Despesas: Contexto Completo de Handoff

Este documento consolida TODO o trabalho realizado na sessão de hoje para garantir uma transição perfeita para outro ambiente de desenvolvimento.

## 1. O Início da Sessão (Bugs Menores e Liberação de Acesso)
*   **Crash nas Despesas (`buscarPorId is not a function`):**
    *   **Problema:** Havia uma inconsistência nos nomes dos métodos na hora de buscar viagens e despesas. Algumas chamavam `buscarPorId` e outras `buscarPorID`.
    *   **Solução:** Padronizamos a nomenclatura para `buscarPorID` tanto no `DespesaService.js` quanto no `DespesaRepository.js`, alinhando com o resto da arquitetura.
*   **Liberação da Rota de Veículos:**
    *   **Problema:** O `GET /veiculos` estava bloqueado apenas para Administradores (`isAdmin: true`).
    *   **Solução:** Removemos a restrição de "Apenas Admins" no `VeiculoService`. Se for Motorista, liberamos o acesso, porém com a regra de exibir apenas o veículo associado a ele.
*   **Criação do Filtro de ID de Veículo:**
    *   Para dar suporte à busca do motorista, criamos o método `.comId(_id)` dentro da classe de builder `VeiculoFilterBuild.js`.

## 2. O Problema de Vazamento de Dados nas Listagens
Após liberar a rota de veículos, o usuário relatou que o "Motorista 1" logava, batia no Swagger, e conseguia ver TODOS os veículos, viagens e despesas, ignorando os filtros que tentamos colocar.

### A Investigação
1.  **Tentativa Inicial:** Tentamos forçar a filtragem injetando valores no objeto de requisição (`req.query.usuario_id = ...` e `req.query._id = ...`) dentro da camada de Serviço.
2.  **Ambiente Stale (Código não recarregava):** O processo local estava travado rodando `node server.js` puro. Matamos o processo e avisamos para rodar via `npm run dev:local` (Nodemon) para garantir que as alterações subissem.
3.  **O Mistério do Express 5.x:** Mesmo com o nodemon ativo e a lógica teoricamente certa, o Swagger continuava trazendo 10 registros.
    *   **A Causa Raiz:** Descobrimos que o projeto roda **Express 5.2.1**. Nesta versão, o objeto `req.query` possui getters/setters estritos. Quando fazíamos `req.query.usuario_id = ID`, o Express simplesmente ignorava (engolia silenciosamente) a atribuição porque o objeto retornado pelo getter não refletia as mudanças de volta ao pipeline interno do Express de forma persistente. O Mongoose, ao ler `req.query` no Repositório, pegava o objeto limpo original, e listava tudo.

## 3. A Solução Arquitetural (Clean Architecture)
Para resolver definitivamente o vazamento, abandonamos a "gambiarra" de tentar mutar o `req.query` do Express. Implementamos um fluxo limpo:

*   **Service Layer (`ViagemService`, `VeiculoService`, `DespesaService`):**
    *   Criamos um objeto chamado `filtrosOverride = {}`.
    *   Populamos este objeto com as regras de segurança baseadas em quem está logado (ex: `filtrosOverride.usuario_id = usuarioLogado._id`).
    *   Enviamos este objeto explícito como um segundo parâmetro: `await this.repository.listar(req, filtrosOverride)`.
*   **Repository Layer:**
    *   Atualizamos as assinaturas para `async listar(req, filtrosOverride = {})`.
    *   Adicionamos o merge de precedência: `const usuario_id = filtrosOverride.usuario_id || req.query.usuario_id;`.

## 4. Comportamento Atual das Rotas (Testado e Validado)
Com a nova arquitetura, o comportamento das listagens ficou blindado:

*   **Veículos (`GET /veiculos`):**
    *   Admins listam todos e podem usar query params.
    *   Motorista SEM veículo vinculado: Retorna Erro Customizado 403 (*"Você não possui nenhum veículo vinculado..."*).
    *   Motorista COM veículo: Filtro limpo usando o `filtrosOverride._id`.
*   **Viagens (`GET /viagens`):**
    *   Motoristas são forçados pelo backend a trazerem apenas viagens do próprio `usuario_id`.
*   **Despesas (`GET /despesas`):**
    *   **Suporte a Offline-First (Pull Sync):** Seguindo o documento de regras, se o app do motorista solicitar despesas e NÃO enviar um `viagem_id` na query, o `DespesaService` irá buscar o ID de **todas as viagens atreladas àquele motorista** e injetará no `filtrosOverride.viagem_id = { $in: [array_de_ids] }`. Isso permite sincronizar todas as despesas offline de uma só vez.
    *   Se for passado um `viagem_id` específico, a API valida por segurança se aquela viagem realmente pertence ao motorista.

## 5. Próximos Passos (Backlog Ativo)
As fundações do banco e leitura de dados estão sólidas. A partir da próxima sessão, focar em:

1.  **Sincronização IsarDB (Push Sync):** Criar uma rota específica (ex: `POST /sync`) que receba o payload JSON com os dados offline criados no celular do motorista, faça validações em lote e os sincronize (Upsert) com o MongoDB.
2.  **Frontend Mobile Flutter:** Criar a UI/UX de lançamento de despesas no celular.
3.  **Frontend Web Dashboard:** Iniciar o painel web administrativo com os gráficos para consumir esses dados em React/Next/Vite.
