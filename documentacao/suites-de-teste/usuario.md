# Plano de Teste: Gestão de Usuários e Acessos (Usuario)

Esta documentação detalha os testes unitários de serviços implementados para o módulo de **Gestão de Usuários, Hierarquia RBAC, Multi-Tenancy e Ciclo de Vida de Contas**.

Arquivo correspondente:
- **Serviço:** [`src/test/services/UsuarioService.test.js`](../../src/test/services/UsuarioService.test.js)

---

### Criação de Usuários e Validações de Hierarquia

| Cenário / Funcionalidade | Comportamento Esperado | Verificações (Execução) | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Bloqueio de Criação para Motoristas** | Motoristas são estritamente impedidos de criar novos usuários no sistema. | Chamada a `service.criar()` com `user_id` de motorista. | Lança `CustomError` (403, `permissionError`). |
| **Hierarquia SuperAdmin** | Impede que administradores internos criem contas com o perfil `superAdmin`. | Chamada a `service.criar()` por admin comum enviando `role: 'superAdmin'`. | Lança `CustomError` (403, `permissionError`). Somente Super Administradores globais podem criar outros Super Administradores. |
| **Vinculação Automática de Empresa** | O novo usuário criado por administrador herda compulsoriamente o `empresa_id` da transportadora do solicitante. | Admin vinculado a empresa cria novo motorista. | O usuário gerado na base possui o atributo `empresa_id` associado automaticamente à transportadora do admin. |
| **Unicidade de E-mail** | Bloqueia cadastros duplicados com o mesmo endereço de e-mail. | Tentativa de cadastro com e-mail já existente na base. | Lança `CustomError` (400, `validationError`) com `field: 'email'`. |

---

### Atualização de Papéis e Permissões (RBAC)

| Cenário / Funcionalidade | Comportamento Esperado | Verificações (Execução) | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Proteção contra Promoção Ilícita** | Impede que administradores locais promovam motoristas a `superAdmin`. | Chamada a `service.atualizar()` por admin comum tentando definir `role: 'superAdmin'`. | Lança `CustomError` (403, `permissionError`). |
| **Auto-Escalação de Privilégios** | Motorista atualizando seu próprio perfil não consegue alterar sua `role` para `admin` ou ativar `isAdmin`. | Chamada a `service.atualizar()` pelo próprio motorista enviando `{ role: 'admin', isAdmin: true }`. | As propriedades de privilégio são ignoradas/removidas pelo service. O usuário permanece como `motorista`. |

---

### Gestão de Status (Ativação / Inativação)

| Cenário / Funcionalidade | Comportamento Esperado | Verificações (Execução) | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Proteção de Equipe Administrativa** | Gestores de frota não possuem permissão para desativar ou alterar status de Administradores ou de outros Gestores. | Chamada a `service.atualizarStatus()` por gestor apontando para admin da empresa. | Lança `CustomError` (403, `permissionError`). |
| **Gestão Operacional de Motoristas** | Gestores podem ativar ou inativar motoristas vinculados à sua própria transportadora. | Chamada a `service.atualizarStatus()` por gestor apontando para motorista da mesma empresa com `{ status: 'inativo' }`. | O status do motorista é atualizado com sucesso no banco de dados para `inativo`. |

---

### Exclusão de Conta (Self-Service)

| Cenário / Funcionalidade | Comportamento Esperado | Verificações (Execução) | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Bloqueio de Exclusão Alheia** | Um usuário comum não pode excluir a conta de outro usuário. | Usuário A tentando chamar `service.deletar()` passando o ID do usuário B. | Lança `CustomError` (403, `permissionError`). |
| **Exclusão da Própria Conta** | Permite que o usuário delete sua própria conta no sistema. | Usuário chamando `service.deletar()` com seu próprio `_id`. | O registro do usuário é removido da base (`Usuario.findById()` retorna `null`). |
