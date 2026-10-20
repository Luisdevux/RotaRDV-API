# Plano de Teste: Gestão de Veículos e Frotas (Veículo)

Esta documentação detalha os testes unitários de serviços e regras de negócio implementados para o módulo de **Veículos da Frota, Vínculo de Empresa e Controles de Acesso (RBAC)**.

Arquivos correspondentes:
- **Serviço:** [`src/test/services/VeiculoService.test.js`](../../src/test/services/VeiculoService.test.js)

---

### Criação e Cadastro de Veículos na Frota

| Cenário / Funcionalidade | Comportamento Esperado | Verificações (Execução) | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Bloqueio de Criação por Motorista** | Impede que usuários com perfil de motorista criem ou cadastrem novos veículos na frota da empresa. | Chamada a `VeiculoService.criar()` com credenciais de usuário com `role: 'motorista'`. | Lança `CustomError` (403, `permissionError`). O veículo não é registrado no banco. |
| **Vinculação Automática ao Tenant** | Associa compulsoriamente o `empresa_id` do gestor autenticado ao registro do novo veículo, garantindo a governança do tenant. | Chamada a `VeiculoService.criar()` autenticado como `gestor` da transportadora. | Retorna o documento do veículo criado contendo exatamente o `empresa_id` correspondente ao gestor. |
| **Unicidade de Placa Veicular** | Impede o cadastramento de dois veículos com a mesma placa identificadora na base de dados. | Tentativa de cadastro de veículo com placa já existente no sistema. | Lança `CustomError` (409) com indicação do campo `placa`. Não permite duplicidade cadastral. |

---

### Listagem e Consulta de Veículos

| Cenário / Funcionalidade | Comportamento Esperado | Verificações (Execução) | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Bloqueio de Listagem sem Vínculo** | Impede a listagem de frota por motorista que não possui nenhum veículo atribuído ao seu perfil. | Chamada a `VeiculoService.listar()` por motorista com `veiculo_id: null`. | Lança `CustomError` (403, `forbidden`). |
| **Isolamento de Frota Multi-Tenant** | Garante que um gestor visualize estritamente os veículos cadastrados sob a sua própria empresa. | Consulta paginada `VeiculoService.listar()` por gestor com múltiplos veículos cadastrados em empresas distintas no banco. | A lista retornada contém exclusivamente os IDs de veículos da empresa do gestor, expurgando veículos de outros tenants. |
| **Bloqueio de Consulta a Veículo Alheio** | Impede que um motorista consulte detalhes de veículos de outros condutores ou de frotas não autorizadas. | Chamada a `VeiculoService.listar()` passando ID de veículo pertencente a outro usuário/frota. | Lança `CustomError` (403) de acesso não autorizado. |

---

### Exclusão e Modificação de Veículos

| Cenário / Funcionalidade | Comportamento Esperado | Verificações (Execução) | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Bloqueio de Exclusão Cross-Tenant** | Impede que gestores ou usuários de uma empresa excluam veículos cadastrados sob a titularidade de outra empresa. | Tentativa de `VeiculoService.deletar()` passando ID de veículo pertencente a outra empresa. | Lança `CustomError` (403). O registro do veículo permanece inalterado no banco de dados. |
