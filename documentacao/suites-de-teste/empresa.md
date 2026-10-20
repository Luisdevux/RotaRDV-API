# Plano de Teste: Gestão Corporativa e Multi-Tenancy (Empresa)

Esta documentação detalha os testes de integração de endpoints e testes unitários de serviços implementados para o módulo de **Empresas, Permissões de SuperAdmin, Governança Multilocatária e Integridade Referencial**.

Arquivos correspondentes:
- **Rotas:** [`src/test/routes/empresaRoutes.test.js`](../../src/test/routes/empresaRoutes.test.js)
- **Serviço:** [`src/test/services/EmpresaService.test.js`](../../src/test/services/EmpresaService.test.js)

---

### POST /empresas (Cadastro Corporativo)

| Cenário / Funcionalidade | Comportamento Esperado | Verificações (Execução) | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Criação Exclusiva por SuperAdmin** | Permite o cadastro de novas transportadoras apenas para contas com a role `superAdmin`. | Requisição `POST /empresas` ou chamada a `service.criar()` autenticado como `superAdmin` com dados válidos de CNPJ e contato. | Retorna HTTP `201` / Retorna documento com dados cadastrados e status ativo. |
| **Bloqueio para Admin Comum** | Impede que administradores internos ou gestores de empresas criem novas empresas na plataforma. | Requisição `POST /empresas` autenticado como `admin` comum. | Retorna HTTP `403` / Lança `CustomError` (403, `permissionError`) informando que a rota é restrita a Super Administradores. |
| **Validação de CNPJ** | Exige CNPJ válido com dígitos verificadores íntegros (suportando padrão clássico e novo alfanumérico RFB). | Cadastro com CNPJ inválido ou repetido na base. | Retorna HTTP `400` / `409` pelo validador. |

---

### DELETE /empresas/:id (Integridade Referencial e Exclusão)

| Cenário / Funcionalidade | Comportamento Esperado | Verificações (Execução) | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Trava Referencial: Motoristas Vinculados** | Impede a exclusão de uma transportadora caso ainda existam motoristas associados ao seu `empresa_id`. | Tentativa de `DELETE /empresas/:id` para empresa que possui motoristas cadastrados. | Retorna HTTP `409` / Lança `CustomError` (409, `conflict`) informando a existência de condutores vinculados. A empresa não é excluída. |
| **Trava Referencial: Veículos na Frota** | Impede a exclusão caso ainda existam caminhões ou carretas cadastrados na frota da empresa. | Tentativa de `DELETE /empresas/:id` para empresa com veículos ativos no banco. | Retorna HTTP `409` / Lança `CustomError` (409, `conflict`) informando a existência de veículos vinculados. |
| **Exclusão Segura sem Vínculos** | Permite a exclusão física do registro quando não houver motoristas nem veículos dependentes. | Requisição `DELETE /empresas/:id` de empresa limpa sem vínculos por `superAdmin`. | Retorna HTTP `200` / Registro é expurgado do banco de dados (`Empresa.findById()` retorna `null`). |

---

### POST /empresas/filial (Cadastro de Filiais Coligadas)

| Cenário / Funcionalidade | Comportamento Esperado | Verificações (Execução) | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Criação de Filial por Administrador** | Permite que Administradores criem novas filiais associadas ao seu `admin_id`. | Requisição `POST /empresas/filial` autenticado como `admin` enviando CNPJ, email e endereço da filial. | Retorna HTTP `201` com `admin_id` vinculado ao usuário administrador autenticado. |
| **Bloqueio de Criação por Motorista** | Impede que motoristas cadastrem filiais. | Requisição `POST /empresas/filial` autenticado como `motorista`. | Retorna HTTP `403` informando restrição a Administradores. |
| **Visibilidade Multi-Tenant Consolidada** | O Administrador Master visualiza tanto a matriz quanto suas filiais coligadas na listagem. | Requisição `GET /empresas` com token do Administrador Master. | Retorna HTTP `200` contendo matriz e filiais sob sua gestão. |

---

### Filtros e Validação de CNPJ Alfanumérico (IN RFB 2.229/2024)

| Cenário / Funcionalidade | Comportamento Esperado | Verificações (Execução) | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Cadastro com CNPJ Alfanumérico** | Permite registrar empresa com CNPJ contendo letras nos primeiros 12 dígitos e DVs matematicamente válidos. | Envio de CNPJ no novo padrão oficial (ex: `12.ABC.345/0001-88`). | Retorna HTTP `201` com CNPJ normalizado e salvo sem máscara no banco. |
| **Busca por CNPJ Formatado** | Localiza a empresa quando pesquisada com pontuação (`12.ABC.345/0001-88`). | Requisição `GET /empresas?cnpj=12.ABC.345/0001-88`. | Retorna HTTP `200` com a empresa correspondente. |
| **Busca por CNPJ Limpo** | Localiza a empresa quando pesquisada sem pontuação (`12ABC345000188`). | Requisição `GET /empresas?cnpj=12ABC345000188`. | Retorna HTTP `200` com a empresa correspondente. |
| **Busca Parcial Case-Insensitive** | Localiza a empresa por termo parcial com letras minúsculas (`12abc`). | Requisição `GET /empresas?cnpj=12abc`. | Retorna HTTP `200` com a empresa correspondente. |
| **Prevenção de Duplicatas** | Rejeita tentativa de duplicidade do mesmo CNPJ alfanumérico. | Tentativa de cadastro com CNPJ alfanumérico já existente. | Retorna HTTP `400` com erro de duplicidade de CNPJ. |
