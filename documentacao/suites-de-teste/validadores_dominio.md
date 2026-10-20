# Plano de Teste: Validadores de Domínio e Helpers Matemáticos

Esta documentação detalha os testes unitários aplicados sobre os **Validadores de Invariantes de Domínio** (`ViagemDomainValidator`, `DespesaDomainValidator`) e **Helpers de Segurança e Validação** (`ValidationHelper`, `PermissionHelper`).

Arquivos correspondentes:
- **Validadores de Domínio:** [`src/test/utils/domainValidators.test.js`](../../src/test/utils/domainValidators.test.js)
- **Helpers de Validação e Permissão:** [`src/test/utils/validationHelper.test.js`](../../src/test/utils/validationHelper.test.js)

---

### Invariantes de Viagem (ViagemDomainValidator)

| Cenário / Funcionalidade | Comportamento Esperado | Verificações (Execução) | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Viagem Íntegra** | Aprova o documento de viagem quando todos os campos obrigatórios e invariantes lógicas são atendidas. | Execução de `ViagemDomainValidator.validar()` com odômetro positivo e datas coerentes. | Retorna `{ valido: true }`. |
| **Odômetro Inicial Negativo** | Rejeita viagens que tentem registrar quilometragem inicial negativa no velocímetro. | Validação de viagem com `km_inicial < 0`. | Retorna `{ valido: false, campo: 'km_inicial' }`. |
| **Inversão Temporal de Datas** | Impede que a data de encerramento (`data_fim`) seja registrada cronologicamente anterior à data de início (`data_inicio`). | Validação com `data_fim` anterior a `data_inicio`. | Retorna `{ valido: false, campo: 'data_fim' }`. |
| **Status de Viagem Inválido** | Rejeita status desconhecidos ou fora do enum do domínio de viagens. | Validação com status não reconhecido (`status_inexistente`). | Retorna `{ valido: false, campo: 'status' }`. |
| **Não-Regressão de KM no Encerramento** | Impede o fechamento de viagem com quilometragem final menor que a quilometragem de partida. | Validação de viagem concluída com `km_final < km_inicial`. | Retorna `{ valido: false, campo: 'km_final' }`. |

---

### Invariantes de Despesa (DespesaDomainValidator)

| Cenário / Funcionalidade | Comportamento Esperado | Verificações (Execução) | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Despesa Simples em Viagem Ativa** | Aprova lançamento financeiro realizado dentro do período de vigência de uma viagem aberta. | Execução de `DespesaDomainValidator.validar()` para alimentação com valor positivo. | Retorna `{ valido: true }`. |
| **Valor Total Zerado ou Negativo** | Rejeita despesas cujo montante seja menor ou igual a zero. | Validação com `valor_total <= 0`. | Retorna `{ valido: false, campo: 'valor_total' }`. |
| **Despesa em Viagem Cancelada** | Impede o lançamento financeiro associado a viagens que já foram canceladas operacionalmente. | Validação de despesa vinculada a viagem com status `cancelada`. | Retorna `{ valido: false, campo: 'viagem_id' }`. |
| **Despesa Cronologicamente Prévia** | Rejeita comprovantes fiscais com data/hora anterior ao horário de partida da viagem. | Validação com data da despesa anterior ao `data_inicio` da viagem. | Retorna `{ valido: false, campo: 'data' }`. |
| **Consistência de Abastecimento** | Valida integridade da equação $Valor = Litros \times Preço/L$ e odômetro atual. | Validação de abastecimento com `litros * valor_litro == valor_total` e `km_atual >= km_inicial`. | Retorna `{ valido: true }`. |
| **Divergência de Cálculo de Combustível** | Rejeita abastecimento quando a multiplicação da litragem pelo valor unitário diverge do valor total cobrado. | Validação com divergência matemática entre os valores informados. | Retorna `{ valido: false, campo: 'valor_total' }`. |
| **Odômetro Menor que a Partida** | Impede registro de abastecimento com odômetro inferior à quilometragem de início da jornada. | Validação com `km_atual < km_inicial` da viagem vinculada. | Retorna `{ valido: false, campo: 'km_atual' }`. |

---

### Helpers de Documentos e Validação (ValidationHelper)

| Cenário / Funcionalidade | Comportamento Esperado | Verificações (Execução) | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Validação de CPF** | Valida dígitos verificadores oficiais de CPF e rejeita sequências repetidas, formatos inválidos e valores nulos. | Execução de `ValidationHelper.isValidCpf()` com CPFs válidos e inválidos. | Retorna `true` apenas para CPFs estritamente íntegros. |
| **Validação de CNPJ Clássico** | Valida algoritmo oficial de módulo 11 para CNPJs numéricos de 14 dígitos. | Execução de `ValidationHelper.isValidCnpj()` com CNPJ numérico válido e inválido. | Retorna `true` para formato regular e `false` para sequências zeradas ou corrompidas. |
| **CNPJ Alfanumérico (IN RFB 2.229/2024)** | Suporta o padrão alfanumérico da Receita Federal com cálculo dos DVs baseados na tabela ASCII. | Execução de `ValidationHelper.isValidCnpj()` com strings alfanuméricas. | Valida conformidade e rejeita combinações com DVs incompatíveis. |
| **Garantia de Existência (ensureExists)** | Retorna o documento consultado se estiver definido, ou lança erro padronizado caso contrário. | Execução de `ValidationHelper.ensureExists()` com documento e com valor `null`. | Retorna o objeto caso exista; lança `CustomError` (404, `resourceNotFound`) caso seja nulo. |

---

### Controle de Acesso e Escopo (PermissionHelper)

| Cenário / Funcionalidade | Comportamento Esperado | Verificações (Execução) | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Autorização Irrestrita de SuperAdmin** | Concede acesso global ao `superAdmin` independentemente do tenant da requisição. | Execução de `ensurePermission()` com usuário `superAdmin` em entidade de empresa distinta. | Retorna `{ isSuperAdmin: true }` sem lançar exceções. |
| **Autorização de Gestor Co-Tenant** | Autoriza gestores e administradores a operarem recursos pertencentes à sua própria empresa. | Execução de `ensurePermission()` onde `usuario.empresa_id === entidade.empresa_id`. | Retorna `{ isGestor: true }`. |
| **Bloqueio de Gestor Cross-Tenant** | Veta categoricamente qualquer tentativa de gestor visualizar ou manipular recursos de outra transportadora. | Execução de `ensurePermission()` onde os identificadores de empresa divergem. | Lança `CustomError` (403, `permissionError`). |
| **Propriedade Individual do Motorista** | Autoriza condutores a manipularem estritamente os recursos dos quais são os autores (`isOwner: true`). | Execução de `ensurePermission()` para motorista com `isOwner: true`. | Retorna `{ isDriver: true }`. |
| **Bloqueio de Motorista Não-Proprietário** | Impede que motoristas acessem ou modifiquem dados criados por outros condutores. | Execução de `ensurePermission()` para motorista com `isOwner: false`. | Lança `CustomError` (403). |
