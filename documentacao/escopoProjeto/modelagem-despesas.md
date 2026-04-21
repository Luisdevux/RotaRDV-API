# Modelagem das despesas no sistema

## Visão geral

No projeto, as despesas de viagem são registradas em uma coleção base chamada `despesas`. Essa coleção guarda os campos comuns a todos os registros, como viagem, tipo, valor, data, local, descrição e anexo.

Os tipos fixos de despesa, como abastecimento, alimentação, manutenção e pedágio, usam uma técnica do Mongoose chamada `discriminators`. Com isso, cada tipo continua tendo seus campos específicos e sua própria validação, mas todos os registros permanecem armazenados na mesma coleção física no MongoDB.

## Técnica utilizada

Os discriminators do Mongoose são uma forma de criar modelos diferentes a partir de um mesmo schema base. Eles permitem que documentos com campos comuns compartilhem a mesma coleção, enquanto cada variação mantém seus campos específicos e suas próprias validações.

A técnica aplicada é conhecida como `Single Collection Inheritance`. Na prática, ela funciona assim:

1. Existe um schema pai com os campos compartilhados por todas as despesas.
2. Esse schema pai define uma `discriminatorKey` no campo `tipo`.
3. Cada tipo específico de despesa cria um schema filho com os campos exclusivos daquele formulário.
4. O Mongoose salva tudo na coleção `despesas`, mas distingue cada documento pelo valor de `tipo`.

No projeto, isso aparece em `src/models/Despesa.js`, onde ficam os campos base, e nos arquivos `DespesaAbastecimento.js`, `DespesaAlimentacao.js`, `DespesaManutencao.js` e `DespesaPedagio.js`, que representam as variações específicas.

## Por que essa abordagem é melhor

### 1. Mantém o banco organizado

Em vez de criar uma coleção separada para cada tipo de despesa, todos os registros ficam centralizados. Isso evita duplicação de estrutura e reduz a quantidade de consultas cruzadas entre coleções.

### 2. Facilita a listagem no app

Como todas as despesas estão na mesma coleção, a aplicação pode buscar o histórico de uma viagem com uma única consulta. Isso é especialmente útil para telas como resumo da viagem e possíveis relatórios.

### 3. Preserva validação por tipo

Mesmo com a coleção unificada, cada tipo continua validando apenas os seus campos específicos. Por exemplo, abastecimento exige litros e quilometragem, enquanto alimentação exige tipo de refeição.

### 4. Permite evolução do sistema

Se surgir um novo tipo de despesa no futuro, basta criar um novo discriminator. A estrutura de leitura principal continua a mesma, o que reduz o impacto de manutenção.

## Diferença para o método anterior

Antes, a ideia era tratar alguns tipos como entidades separadas, cada uma podendo ter sua própria coleção ou modelagem isolada. Isso parecia organizado no primeiro momento, mas criava alguns problemas:

1. A listagem geral de despesas exigia juntar dados de várias origens.
2. O backend precisava coordenar múltiplas consultas para montar uma visão única.
3. O front-end(APP) e os controllers ficavam mais complexos para tratar cada tipo separadamente.

Com os discriminators, o sistema passou a ter uma coleção única para leitura e escrita, mas sem perder a regra de negócio específica de cada formulário.

## Caso do tipo "OUTROS"

O tipo `OUTROS` não precisa de um model separado se ele não tiver campos exclusivos relevantes. Nesse caso, ele pode ser tratado apenas como mais um valor de `tipo` dentro da coleção base.

Se a observação do usuário for o único dado extra, o campo `descricao` da própria despesa já atende essa necessidade. Isso evita redundância e reduz a complexidade do projeto.

## Resultado prático no projeto

Com essa modelagem, o sistema ficou com estas características:

1. Uma coleção principal para todas as despesas.
2. Campos comuns centralizados no schema base.
3. Campos específicos separados apenas quando realmente existem diferenças relevantes.
4. Leitura mais simples para o app mobile.
5. Menor custo de manutenção no backend.

## Conclusão

A adoção de discriminators no Mongoose é a melhor opção para este projeto porque combina duas necessidades importantes ao mesmo tempo: flexibilidade para telas diferentes de cadastro e simplicidade para consultas unificadas.

Em vez de espalhar a lógica em várias coleções, o sistema passa a enxergar a despesa como uma entidade única, com variações controladas por tipo. Isso torna a arquitetura mais limpa, mais performática e mais fácil de evoluir.
