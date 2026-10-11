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
