# Plano de Teste: Gestão de Despesas (Despesa)

Esta documentação detalha os testes de integração de endpoints e testes unitários de serviços implementados para o módulo de **Despesas Polimórficas, Discriminators Mongoose, Travamento Operacional e Integridade Financeira**.

Arquivos correspondentes:
- **Rotas:** [`src/test/routes/despesaRoutes.test.js`](../../src/test/routes/despesaRoutes.test.js)
- **Serviço:** [`src/test/services/DespesaService.test.js`](../../src/test/services/DespesaService.test.js)

---

### POST /despesas (Lançamento de Despesas Polimórficas)

| Cenário / Funcionalidade | Comportamento Esperado | Verificações (Execução) | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Lançamento de Abastecimento** | Persiste documento na coleção `despesas` aplicando o schema discriminado de `DespesaAbastecimento`. | Requisição `POST /despesas` com `{ tipo: 'ABASTECIMENTO', litros: 100, valor_litro: 6, valor_total: 600, tipo_combustivel: 'DIESEL_S10', km_atual: 20500 }`. | Retorna HTTP `201` com campos específicos de combustível salvos e validados. |
| **Lançamento de Alimentação** | Persiste documento com o schema discriminado de `DespesaAlimentacao`. | Requisição `POST /despesas` com `{ tipo: 'ALIMENTACAO', tipo_refeicao: 'Almoço', valor_total: 50 }`. | Retorna HTTP `201` com `tipo_refeicao` armazenado corretamente. |
| **Viagem Inexistente** | Impede lançamento de despesa em viagem que não existe no banco. | Requisição `POST /despesas` informando `viagem_id` aleatório inexistente. | Retorna HTTP `404` / Lança `CustomError` (404, `resourceNotFound`). |
| **Isolamento de Viagem (Outro Motorista)** | Impede que um motorista lance despesas na viagem de outro condutor. | Motorista autenticado tentando lançar despesa em viagem cujo `usuario_id` é de outro condutor. | Retorna HTTP `403` / Lança `CustomError` (403, `forbidden`). |
| **Bloqueio em Viagem Cancelada** | Impede registro ou sincronização de despesas em viagens marcadas como `cancelada`. | Tentativa de cadastro de despesa vinculada a viagem com status `cancelada`. | Retorna HTTP `400` / Lança `CustomError` (400, `validation`) com `field: 'viagem_id'`. |
| **Invariante de Odômetro de Abastecimento** | O odômetro registrado no abastecimento (`km_atual`) não pode ser inferior ao odômetro inicial da viagem (`km_inicial`). | Cadastro de abastecimento informando `km_atual: 19500` para viagem com `km_inicial: 20000`. | Retorna HTTP `400` / Lança `CustomError` (400, `validation`) barrando inconsistência de odômetro. |
| **Consistência Matemática de Combustível** | Garante que o `valor_total` corresponda matematicamente a `litros * valor_litro` (tolerância de até R$ 0,05 para arredondamentos). | Cadastro de abastecimento com `litros: 100`, `valor_litro: 6.00` e `valor_total: 500` (divergência). | Retorna HTTP `400` pelo schema Zod / validador com mensagem de inconsistência de cálculo. |

---

### DELETE /despesas/:id (Travamento Operacional e Auditoria)

| Cenário / Funcionalidade | Comportamento Esperado | Verificações (Execução) | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Travamento em Viagem Concluída** | Impede alteração ou exclusão de despesas atreladas a viagens já concluídas ou fechadas contabilmente. | Tentativa de exclusão de despesa cujo status da viagem mãe é `concluída`. | Retorna HTTP `400` / Lança `CustomError` (400, `validation`). A despesa permanece intacta no banco. |
| **Exclusão em Viagem em Andamento** | Permite que o condutor ou gestor exclua lançamentos errôneos enquanto a viagem estiver ativa. | Requisição `DELETE /despesas/:id` com a viagem vinculada no status `em_andamento`. | Retorna HTTP `200`. O documento é removido da coleção do MongoDB. |
