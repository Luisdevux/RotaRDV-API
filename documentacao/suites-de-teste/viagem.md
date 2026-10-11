# Plano de Teste: Controle de Viagens (Viagem)

Esta documentação detalha os testes de integração de endpoints e testes unitários de serviços implementados para o módulo de **Controle de Viagens, Invariantes de Odômetro, Concorrência de Frota e Resumo Financeiro**.

Arquivos correspondentes:
- **Rotas:** [`src/test/routes/viagemRoutes.test.js`](../../src/test/routes/viagemRoutes.test.js)
- **Serviço:** [`src/test/services/ViagemService.test.js`](../../src/test/services/ViagemService.test.js)

---

### POST /viagens (Abertura de Viagem)

| Cenário / Funcionalidade | Comportamento Esperado | Verificações (Execução) | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Abertura com Snapshots Imutáveis** | Cria nova viagem com status `em_andamento` e congela snapshots de motorista e veículo. | Requisição `POST /viagens` enviando `{ origem, destino, km_inicial, veiculo_id }`. | Retorna HTTP `201`. O documento gerado possui `usuario_snapshot` e `veiculo_snapshot` gravados estaticamente. |
| **Concorrência de Motorista** | Impede que o motorista inicie uma segunda viagem caso já possua outra em andamento. | Abertura de viagem para motorista que já possui registro ativo com status `em_andamento`. | Retorna HTTP `409` / Lança `CustomError` (409, `conflict`) instruindo o encerramento da viagem atual. |
| **Concorrência de Veículo (Veículo em Uso)** | Impede que um caminhão seja associado a duas viagens simultaneamente em trânsito. | Abertura de viagem com veículo que já está vinculado a outra viagem em andamento. | Retorna HTTP `409` / Lança `CustomError` (409, `conflict`) informando que o veículo já está em uso. |
| **Regressão de Odômetro** | Impede inconsistência física em que o KM inicial seja inferior ao último KM registrado do veículo. | Abertura de viagem informando `km_inicial` menor que o `km_final` da última viagem do caminhão. | Retorna HTTP `400` / Lança `CustomError` (400, `validationError` / `badRequest`) barrando a regressão de odômetro. |
| **Bloqueio de Criação para Terceiros** | Impede que um motorista abra viagens em nome de outros condutores. | Motorista enviando `usuario_id` pertencente a outro usuário no payload de abertura. | Lança `CustomError` (403, `permissionError`) no service. |

---

### PATCH & GET /viagens/:id (Encerramento e Auditoria Financeira)

| Cenário / Funcionalidade | Comportamento Esperado | Verificações (Execução) | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Encerramento e Resumo Dinâmico de Consumo** | Conclui a viagem via `PATCH` e computa em tempo real no `GET /viagens/:id` o total de despesas, categorização, km rodados e média de consumo (km/l). | Conclusão de viagem com 2 abastecimentos (200L, R$ 1.200) e 1 refeição (R$ 80), rodando 600 km. | Retorna HTTP `200` com `resumo_financeiro.total_geral: 1280`, `media_consumo: 3` km/l e status `concluída`. |

---

### DELETE /viagens/:id (Segurança de Exclusão)

| Cenário / Funcionalidade | Comportamento Esperado | Verificações (Execução) | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Bloqueio de Exclusão para Motorista** | Motoristas são estritamente impedidos de deletar registros de viagens do sistema. | Requisição `DELETE /viagens/:id` autenticado com perfil de motorista. | Retorna HTTP `403` / Lança `CustomError` (403, `forbidden` / `permissionError`) informando que apenas admins podem deletar viagens. |
| **Deleção Autorizada para Administrador** | Permite que Administradores removam viagens em conformidade com as regras operacionais. | Requisição `DELETE /viagens/:id` autenticado como `admin` ou chamada a `service.deletar()`. | Retorna HTTP `200`, removendo o documento do banco de dados (`Viagem.findById()` retorna `null`). |
