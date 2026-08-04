# Arquitetura Offline-First: RotaRDV

Este documento registra as decisões arquiteturais e técnicas definidas para o suporte **Offline-First** do aplicativo RotaRDV. Ele serve como guia de implementação, documentação de referência para o TCC e embasamento teórico para a defesa da monografia.

---

## 1. O Desafio do Offline-First
Em sistemas tradicionais (Online-First), o Backend (Banco de Dados) é a única fonte da verdade e o único gerador de IDs (ex: `ObjectId` no MongoDB ou `Auto Increment` em SQL). 

No RotaRDV, o aplicativo móvel (Flutter + IsarDB) atuará em áreas sem conectividade (rodovias). Isso transforma nossa aplicação em um **Sistema Distribuído**, onde o celular passa a ser um "nó" capaz de gerar novos dados (Viagens e Despesas) sem consultar a API.

Para que a sincronização funcione de forma perfeita, foram adotados os seguintes padrões da indústria.

---

## 2. O Paradigma de Identificadores (UUID vs ObjectId)

Abri mão da geração nativa de `ObjectId` progressivos do MongoDB nas coleções geradas no fluxo móvel (Viagens e Despesas). 

**A Solução Implementada:**
* O campo `_id` oficial do Mongoose foi tipado como `String`.
* **Fluxo Offline:** O IsarDB (Flutter) gera um identificador universal único (`UUID v4`) seguro no momento da criação do dado e envia esse UUID no JSON.
* **Fluxo Online (Painel Web/Swagger):** Caso a requisição não traga um `_id`, foi configurado o Mongoose com `default: () => crypto.randomUUID()` para gerar o identificador automaticamente no Node.js.

### Por que foi descartado o padrão "Dual ID" (`_id` do Mongo + `id_sync` do Mobile)?
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

Não se pode confiar nas datas de inserção do MongoDB (`createdAt` do `timestamps: true`). Se um motorista abastece na sexta-feira sem sinal e o app só sincroniza no domingo, a despesa precisa relatar que ocorreu na sexta-feira.

* Nas models, foram adotadas propriedades explícitas como `data` (Despesa) e `data_inicio` (Viagem).
* Em caso de conflito de atualização, o backend usará um campo `updatedAt_mobile` (gerado e gerenciado pelo Flutter) para decidir se a versão do banco ou do celular é a mais recente.

---

## 5. Soft Delete (Exclusão Lógica)

Não executa `DELETE` físico direto no celular quando offline. 
* Se o motorista excluir uma despesa no modo "Avião", o IsarDB adicionará a flag genérica `excluido = true`.
* Na próxima sincronização, essa despesa sobe para a API. A API atualiza o registro no MongoDB como "Deletado" (não exibindo mais nas buscas) e devolve um Status 200 (OK).
* Só então o Flutter executa a deleção física local (`isar.writeTxnSync(() => isar.despesas.delete(id))`), limpando a memória do aparelho.

---

## 6. Implementação do Mecanismo de Sincronização (Sync Engine)

O mecanismo de sincronização bidirecional foi totalmente implementado através do `SyncController` e `SyncService` nas seguintes rotas:

### 📤 6.1. Push Sync (`POST /sync/push`)
Permite ao aplicativo móvel enviar em lote todas as alterações locais (inserções, atualizações e deleções com `is_deleted: true`):

* **Payload:**
  ```json
  {
    "viagens": [
      {
        "_id": "550e8400-e29b-41d4-a716-446655440000",
        "veiculo_id": "60d5ec49f1b2c8b1f8e4e1a1",
        "usuario_snapshot": { "nome": "João da Silva", "email": "joao@email.com" },
        "veiculo_snapshot": { "placa": "ABC-1234", "modelo": "Volvo FH 540", "reboque": { "modelo": "Randon", "placas": ["XYZ-9876"] } },
        "origem": { "cidade": "Curitiba", "estado": "PR" },
        "destino": { "cidade": "Santos", "estado": "SP" },
        "data_inicio": "2026-08-01T08:00:00.000Z",
        "km_inicial": 120500,
        "status": "em_andamento"
      }
    ],
    "despesas": [
      {
        "_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "viagem_id": "550e8400-e29b-41d4-a716-446655440000",
        "tipo": "ABASTECIMENTO",
        "valor_total": 850.50,
        "data": "2026-08-01T12:30:00.000Z",
        "litros": 150,
        "valor_litro": 5.67,
        "tipo_combustivel": "DIESEL_S10",
        "km_atual": 120950
      },
      {
        "_id": "7ca7b810-9dad-11d1-80b4-00c04fd430c9",
        "viagem_id": "550e8400-e29b-41d4-a716-446655440000",
        "is_deleted": true
      }
    ]
  }
  ```
* **Execução em Lote (`bulkWrite`):**
  * Para viagens e despesas com `is_deleted === true`, executa `deleteOne` filtrando pelo `_id` e garantindo o vínculo de ownership com o usuário logado.
  * Para novos registros ou edições, executa `updateOne` com `{ upsert: true }` e define o `usuario_id` do usuário autenticado.
  * Utiliza `{ ordered: false }` para que eventuais falhas em um registro não bloqueiem o restante do lote.
* **Resposta:**
  ```json
  {
    "message": "Sincronização concluída com sucesso.",
    "data": {
      "viagensUpserted": 1,
      "viagensDeleted": 0,
      "despesasUpserted": 1,
      "despesasDeleted": 1
    }
  }
  ```

---

### 📥 6.2. Pull / Delta Sync (`GET /sync/pull`)
Permite ao dispositivo móvel baixar os dados mais recentes do servidor de forma incremental:

* **Parâmetro de Consulta:** `?updatedAfter=2026-08-01T00:00:00.000Z`
* **Comportamento:**
  * Se `updatedAfter` for informado, retorna apenas registros cujo `updatedAt` seja maior que a data fornecida (Delta Sync).
  * Se omitido, retorna todas as viagens e despesas do motorista logado.
* **Resposta:**
  ```json
  {
    "message": "Dados sincronizados com sucesso.",
    "data": {
      "viagens": [ /* Array de viagens atualizadas */ ],
      "despesas": [ /* Array de despesas atualizadas */ ]
    }
  }
  ```

---

### 🖼️ 6.3. Upload Desacoplado de Imagens e Comprovantes
* O tráfego de comprovantes e fotos é totalmente desacoplado do payload JSON de sincronização.
* O envio de fotos de notas fiscais e perfil ocorre via `multipart/form-data` gerenciado pelo `UploadService`.
* As imagens são processadas e otimizadas com a biblioteca **Sharp** (conversão para JPEG progressivo com compressão e redimensionamento automático, além de sanitização rigorosa de SVG contra XSS via **DOMPurify**).
* Os arquivos são persistidos no storage S3-compatible (**MinIO/Garage**), retornando URLs públicas/relativas gravadas no campo `foto_anexo` da despesa ou `foto_perfil` do usuário.
* Conta com estratégia de retry com *Exponential Backoff* para deleção assíncrona de arquivos antigos.
