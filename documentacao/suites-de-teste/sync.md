# Plano de Teste: Motor de Sincronização Offline-First (Sync)

Esta documentação detalha os testes de integração de endpoints e testes unitários de serviços implementados para o **Motor de Sincronização Bidirecional Offline-First**, garantindo resiliência, idempotência via UUID v4, tolerância a falhas parciais e transmissão delta.

Arquivos correspondentes:
- **Rotas:** [`src/test/routes/syncRoutes.test.js`](../../src/test/routes/syncRoutes.test.js)
- **Serviço:** [`src/test/services/SyncService.test.js`](../../src/test/services/SyncService.test.js)

---

### Autenticação e Segurança do Sync

| Cenário / Funcionalidade | Comportamento Esperado | Verificações (Execução) | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Bloqueio por Ausência de Token** | Impede requisição de sincronização sem credenciais JWT de motorista. | Requisição `POST /sync/push` ou `GET /sync/pull` sem cabeçalho `Authorization`. | Retorna HTTP `498` (`AuthenticationError`). |
| **Token Forjado / Inválido** | Rejeita tokens com assinatura expirada ou adulterada. | Requisição enviando token malformado ou com segredo divergente. | Retorna HTTP `498` (`AuthenticationError`). |

---

### POST /sync/push (Processamento em Lote / Upsert)

| Cenário / Funcionalidade | Comportamento Esperado | Verificações (Execução) | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Sincronização em Lote com Sucesso** | Processa viagens e despesas enviadas pelo app offline, aplicando Upsert via `bulkWrite` e preenchendo snapshots automáticos caso omitidos. | Envio de lote com 1 viagem e 2 despesas válidas. | Retorna HTTP `200` com `viagensUpserted: 1`, `despesasUpserted: 2` e `rejeitados: []`. Documentos salvos no banco contêm snapshots corretos. |
| **Tolerância a Falhas Parciais** | Se um item do lote contiver erro (ex: despesa apontando para viagem inexistente), ele é isolado em `rejeitados` sem abortar os demais registros válidos do lote. | Lote contendo 1 viagem válida, 1 despesa válida e 1 despesa com `viagem_id` desconhecido. | Retorna HTTP `200` com `viagensUpserted: 1`, `despesasUpserted: 1` e `rejeitados` contendo 1 item com `id`, `tipo` e `motivo`. |
| **Imutabilidade de Despesas ($setOnInsert)** | Garante que despesas já sincronizadas não sofram adulteração arbitrária em sincronizações posteriores (prevenção contra fraude offline). | Primeiro push insere despesa com valor R$ 50; segundo push tenta enviar o mesmo ID com valor R$ 999. | Retorna HTTP `200`. No MongoDB, o `valor_total` permanece fixado em R$ 50 através da cláusula `$setOnInsert`. |
| **Exclusão Sincronizada (is_deleted: true)** | Processa comandos de deleção emitidos pelo dispositivo móvel enquanto esteve offline. | Envio de item com flag `is_deleted: true` e ID existente no banco de dados. | Retorna HTTP `200` com contador de deletados incrementado e registro expurgado da base. |

---

### GET /sync/pull (Download Incremental / Delta Sync)

| Cenário / Funcionalidade | Comportamento Esperado | Verificações (Execução) | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Isolamento de Dados por Motorista** | O motorista recebe unicamente seus próprios registros corporativos, garantindo sigilo entre condutores da mesma transportadora. | Motorista A autenticado faz requisição `GET /sync/pull` após motorista B ter registrado viagens no sistema. | Retorna HTTP `200` com viagens e despesas estritamente pertencentes ao motorista A autenticado. |
| **Delta Sync por Timestamp (updatedAfter)** | Retorna apenas os registros criados ou modificados após a última data/hora de sincronização do aplicativo móvel. | Requisição `GET /sync/pull?updatedAfter=2026-10-01T00:00:00.000Z`. | Retorna HTTP `200` filtrando unicamente registros com `updatedAt > updatedAfter`, poupando tráfego de dados e consumo de bateria do celular. |
| **Sincronização Inicial Completa** | Quando o app é recém-instalado e não envia `updatedAfter`, devolve todo o histórico ativo do motorista. | Requisição `GET /sync/pull` sem parâmetro de query. | Retorna HTTP `200` com todas as viagens e despesas do motorista. |
