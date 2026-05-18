# Arquitetura Offline-First: RotaRDV

Este documento registra as decisões arquiteturais e técnicas definidas para o suporte **Offline-First** do aplicativo RotaRDV. Ele serve como guia de implementação, documentação de referência para o TCC e embasamento teórico para a defesa da monografia.

---

## 1. O Desafio do Offline-First
Em sistemas tradicionais (Online-First), o Backend (Banco de Dados) é a única fonte da verdade e o único gerador de IDs (ex: `ObjectId` no MongoDB ou `Auto Increment` em SQL). 

No RotaRDV, o aplicativo móvel (Flutter + IsarDB) atuará em áreas sem conectividade (rodovias). Isso transforma nossa aplicação em um **Sistema Distribuído**, onde o celular passa a ser um "nó" capaz de gerar novos dados (Viagens e Despesas) sem consultar a API.

Para que a sincronização funcione de forma perfeita, adotamos os seguintes padrões da indústria.

---

## 2. O Paradigma de Identificadores (UUID vs ObjectId)

Abriremos mão da geração nativa de `ObjectId` progressivos do MongoDB nas coleções geradas no fluxo móvel (Viagens e Despesas). 

**A Solução Implementada:**
* O campo `_id` oficial do Mongoose foi tipado como `String`.
* **Fluxo Offline:** O IsarDB (Flutter) gera um identificador universal único (`UUID v4`) seguro no momento da criação do dado e envia esse UUID no JSON.
* **Fluxo Online (Painel Web/Swagger):** Caso a requisição não traga um `_id`, nós configuramos o Mongoose com `default: () => crypto.randomUUID()` para gerar o identificador automaticamente no Node.js.

### Por que descartamos o padrão "Dual ID" (`_id` do Mongo + `id_sync` do Mobile)?
Manter os dois IDs criaria o chamado **"ID Mapping Hell"** (Inferno de Mapeamento).
Se uma Despesa fosse criada offline associada a uma Viagem (também criada offline):
1. A API receberia a Viagem e o Mongo geraria um ObjectId novo para ela.
2. Ao receber a Despesa, a API precisaria pausar, fazer uma query de `SELECT` para descobrir qual novo ObjectId foi gerado para aquela Viagem usando o `id_sync` como base, substituir a chave estrangeira em tempo de execução, para só então salvar a Despesa.
3. Isso seria um desastre de performance em inserções em lote (Batch Sync).

**Com o `_id` como UUID**, o Mongo aceita os relacionamentos nativamente (a Despesa já vem apontando para a Viagem correta), garantindo inserções instantâneas.

---

## 3. Idempotência e Sincronização Delta (Upsert)

**Sincronização Delta** significa enviar ou processar apenas o que foi alterado, criado ou excluído, e não o banco inteiro.

**Idempotência** é a capacidade de uma requisição ser enviada diversas vezes de forma segura. Se o motorista estiver com um 3G instável, o app pode falhar em receber o "OK" da API e reenviar os dados. Pelo fato do `_id` ser o UUID fixo do mobile, isso **não duplicará** registros.

* **A Mágica do MongoDB:** Os dados não usarão `.create()` na API. A sincronização utilizará a função **`bulkWrite`** do Mongoose fazendo operações de **Upsert** (`updateOne` com `upsert: true`). 
* **Regra:** *"Busque esse UUID. Se ele já existe, atualize os campos fornecidos. Se ele não existe, insira como novo."*

---

## 4. O Controle de Tempo Real (Timestamps)

Não podemos confiar nas datas de inserção do MongoDB (`createdAt` do `timestamps: true`). Se um motorista abastece na sexta-feira sem sinal e o app só sincroniza no domingo, a despesa precisa relatar que ocorreu na sexta-feira.

* Nas models, adotamos propriedades explícitas como `data` (Despesa) e `data_inicio` (Viagem).
* Em caso de conflito de atualização, o backend usará um campo `updatedAt_mobile` (gerado e gerenciado pelo Flutter) para decidir se a versão do banco ou do celular é a mais recente.

---

## 5. Soft Delete (Exclusão Lógica)

Não executamos `DELETE` físico direto no celular quando offline. 
* Se o motorista excluir uma despesa no modo "Avião", o IsarDB adicionará a flag genérica `excluido = true`.
* Na próxima sincronização, essa despesa sobe para a API. A API atualiza o registro no MongoDB como "Deletado" (não exibindo mais nas buscas) e devolve um Status 200 (OK).
* Só então o Flutter executa a deleção física local (`isar.writeTxnSync(() => isar.despesas.delete(id))`), limpando a memória do aparelho.

---

## 6. Próximos Passos no Backend (Em Breve)

Para o retorno aos trabalhos, o foco será a implementação do **Endpoint Unificado de Sincronização Lógica**:

1. **`SyncController`**: Uma única rota `POST /api/v1/sync` englobando uma Transação (Transaction) gerencial.
2. A rota receberá um Payload imenso:
   ```json
   {
     "viagens": [ { ... } ],
     "despesas": [ { ... } ]
   }
   ```
3. O App rodará todo o `bulkWrite`. Se as viagens derem certo e as despesas derem erro, o MongoDB executa `Rollback` anulando toda a transação, mantendo integridade 100%.
4. **Endpoint para Binários (Arquivos):** Desacoplar a string de fotos/comprovantes em Base64 desse Sync JSON, criando uma rota `multipart/form-data` assíncrona só para subida de imagens em background.
