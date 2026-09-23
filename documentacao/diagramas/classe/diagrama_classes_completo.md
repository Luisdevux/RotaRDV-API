# Documentação e Catálogo de Diagramas de Classes - Sistema RotaRDV

Este documento consolida a arquitetura estrutural e orientada a objetos de todo o ecossistema **RotaRDV** (`tcc-despesas-api` e `tcc-despesas-mobile`), com as especificações de cada classe, mapeamento de herança/discriminators e as instruções completas para conversão direta para arquivos vetoriais **SVG**.

---

## 1. Organização dos Arquivos de Diagramas

A estrutura de diagramas de classes e de engenharia de software encontra-se organizada nos seguintes arquivos e diretórios:

```text
tcc-despesas-api/documentacao/diagramas/
├── casosdeuso/
│   ├── diagrama_casos_de_uso.puml             (Casos de Uso em PlantUML)
│   ├── diagrama_casos_de_uso.mmd              (Casos de Uso em Mermaid)
│   └── especificacao_casos_de_uso.md          (Especificação formal completa de UC-01 a UC-12)
├── classe/
│   ├── diagrama_classes_dominio.puml          (Classes de Domínio e Entidades em PlantUML)
│   ├── diagrama_classes_dominio.mmd           (Classes de Domínio e Entidades em Mermaid)
│   ├── diagrama_classes_arquitetura.puml      (Arquitetura em Camadas da API em PlantUML)
│   ├── diagrama_classes_arquitetura.mmd       (Arquitetura em Camadas da API em Mermaid)
│   ├── diagrama_classes_mobile.puml           (Arquitetura em Camadas do Mobile Flutter em PlantUML)
│   ├── diagrama_classes_mobile.mmd            (Arquitetura em Camadas do Mobile Flutter em Mermaid)
│   └── diagrama_classes_completo.md           (Este guia mestre de documentação)
├── componentes/
│   ├── diagrama_componentes.puml              (Componentes em PlantUML)
│   └── diagrama_componentes.mmd               (Componentes em Mermaid)
├── implantacao/
│   ├── diagrama_implantacao.puml              (Implantação e Deploy em PlantUML)
│   └── diagrama_implantacao.mmd               (Implantação e Deploy em Mermaid)
├── sequencia/
│   ├── sequencia_autenticacao_e_refresh.puml  (Sequência Auth & Refresh)
│   ├── sequencia_ciclo_vida_viagem.puml       (Sequência Ciclo de Vida da Viagem)
│   ├── sequencia_lancamento_despesa_e_upload.puml (Sequência Despesas & S3)
│   └── sequencia_sincronizacao_offline_first.puml (Sequência Sync Offline-First)
└── atividades/
    ├── atividade_abertura_e_encerramento_viagem.puml (Atividades da Viagem)
    ├── atividade_fluxo_despesas_e_comprovantes.puml  (Atividades de Despesas)
    └── atividade_motor_sincronizacao_offline.puml    (Atividades de Sincronização)
```

---

## 2. Detalhamento do Diagrama de Classes de Domínio

### 2.1. Padrão de Snapshots Imutáveis
O modelo de dados implementa o padrão de congelamento histórico para mitigar os riscos de auditoria caso dados cadastrais de motoristas, veículos ou transportadoras sofram alterações ou exclusões futuras:
- **`UsuarioSnapshot`:** Armazena `{ nome, email }` do condutor no momento exato em que a viagem é iniciada.
- **`VeiculoSnapshot`:** Armazena `{ placa, modelo, reboque: { modelo, placas } }` no momento da abertura da viagem.

### 2.2. Polimorfismo e Mongoose Discriminators na Coleção `despesas`
A coleção `despesas` utiliza herança de schema através do parâmetro `discriminatorKey: "tipo"`:
1. **Schema Base (`Despesa`):**
   - Atributos universais: `_id` (UUID v4), `viagem_id` (UUID v4), `tipo` (Enum), `valor_total`, `data`, `local`, `descricao`, `foto_anexo` (URL do Garage S3).
2. **Discriminator `ABASTECIMENTO` (`DespesaAbastecimento`):**
   - Atributos especializados: `litros`, `valor_litro`, `tipo_combustivel` (`DIESEL_S10`, `DIESEL_S500`, `GASOLINA`, `ETANOL`, `ARLA_32`, `OUTRO`), `km_atual`.
   - Regra de validação: `km_atual >= viagem.km_inicial`.
3. **Discriminator `ALIMENTACAO` (`DespesaAlimentacao`):**
   - Atributo especializado: `tipo_refeicao` (ex: "Almoço", "Jantar", "Café").
4. **Discriminator `MANUTENCAO` (`DespesaManutencao`):**
   - Atributo especializado: `oficina_nome` (estabelecimento mecânico ou borracharia).
5. **Discriminator `PEDAGIO` (`DespesaPedagio`):**
   - Atributo especializado: `praca_nome` (concessionária ou praça de pedágio).
6. **Discriminator `OUTROS` (`DespesaOutros`):**
   - Mantém as propriedades da classe base para despesas eventuais (estacionamento, lavagem, etc.).

---

## 3. Detalhamento da Arquitetura da API em Camadas

A API Node.js segue o padrão clássico de **Separation of Concerns (SoC)** com Express 5.2:

1. **Camada de Middlewares:**
   - `AuthMiddleware`: Extrai e valida o token Bearer JWT do header `Authorization`. Injeta `req.user_id` e valida permissões RBAC (`superAdmin`, `admin`, `gestor`, `motorista`).
   - `RateLimitMiddleware`: Protege endpoints contra ataques de força bruta e DoS.
   - `LogRoutesMiddleware`: Registra logs estruturados de requisições e respostas.

2. **Camada de Controllers:**
   - Responsável estritamente pela validação estrutural de entrada via **Zod**, sanitização e formatação da resposta HTTP (`200 OK`, `201 Created`, etc.).

3. **Camada de Services:**
   - Concentra 100% das regras de negócio, cálculos, garantias de permissão (`ensurePermission`), e orquestração de transações.
   - Aplica os filtros de isolamento multi-tenant (`filtrosOverride.empresa_id`).

4. **Camada de Repositories:**
   - Encapsula as operações de banco de dados com Mongoose, abstraindo consultas complexas, paginação (`mongoose-paginate-v2`) e operações de lote (`bulkWrite`).

5. **Camada Cross-Cutting & Helpers:**
   - `ValidationHelper`: Validações de CNPJ (clássico e IN RFB 2.229/2024), e-mails institucionais e existência de entidades (`ensureExists`).
   - `UploadService`: Integração com AWS-SDK S3 / Garage S3, compressão com `sharp` (mozjpeg 80%) e sanitização contra scripts XSS em arquivos SVG via `DOMPurify` + `JSDOM`.

---

## 4. Detalhamento da Arquitetura Mobile Flutter

O aplicativo móvel foi projetado sob a filosofia **Offline-First**, permitindo que o condutor execute todas as operações essenciais mesmo sem qualquer conexão com a internet:

1. **Isar Database (`LocalDatabase`):**
   - Banco NoSQL embutido ultra-rápido em C++.
   - Modelos: `ViagemCollection` e `DespesaCollection`.
   - Utiliza identificadores autônomos UUID v4 e índices nas propriedades de consulta (`@Index`).
   - Campo `statusSincronizacao` controla as transições: `'criado'` -> `'sincronizado'` ou `'deletado'`.

2. **Motor de Sincronização (`SyncService`):**
   - Escuta continuamente alterações de conectividade com `Connectivity().onConnectivityChanged`.
   - Executa sincronização atômica em lote (`pushSync` e `pullSync`).
   - Realiza upload de mídia desacoplado com auto-recuperação (`resolverOuRecuperarFotoLocal`).

3. **Gerenciador de Armazenamento (`StorageCleanerService`):**
   - Executa rotina em background após cada sincronização bem-sucedida para excluir comprovantes locais que já possuam mais de 15 dias e já estejam na nuvem.

---

## 5. Guia de Conversão dos Diagramas para SVG

### 5.1. Conversão dos Arquivos PlantUML (`.puml`) para SVG

- **Opção 1: Via CLI Oficial PlantUML:**
  ```powershell
  # Requer Java instalado
  java -jar plantuml.jar -tsvg documentacao/diagramas/classe/diagrama_classes_dominio.puml
  java -jar plantuml.jar -tsvg documentacao/diagramas/classe/diagrama_classes_arquitetura.puml
  java -jar plantuml.jar -tsvg documentacao/diagramas/classe/diagrama_classes_mobile.puml
  ```

- **Opção 2: Via VS Code Extension:**
  1. Instale a extensão `PlantUML` no VS Code.
  2. Abra o arquivo `.puml`.
  3. Pressione `Alt + D` para visualizar o diagrama.
  4. Clique com botão direito e selecione **Export Current Diagram > SVG**.

- **Opção 3: Via PlantText / Servidor Online:**
  1. Acesse [planttext.com](https://www.planttext.com).
  2. Cole o conteúdo de qualquer arquivo `.puml`.
  3. Clique no botão de exportação **SVG**.

---

### 5.2. Conversão dos Arquivos Mermaid (`.mmd`) para SVG

- **Opção 1: Via CLI Oficial Mermaid (`@mermaid-js/mermaid-cli`):**
  ```powershell
  # Execução direta via npx
  npx @mermaid-js/mermaid-cli -i documentacao/diagramas/classe/diagrama_classes_dominio.mmd -o documentacao/diagramas/classe/diagrama_classes_dominio.svg
  npx @mermaid-js/mermaid-cli -i documentacao/diagramas/classe/diagrama_classes_arquitetura.mmd -o documentacao/diagramas/classe/diagrama_classes_arquitetura.svg
  npx @mermaid-js/mermaid-cli -i documentacao/diagramas/classe/diagrama_classes_mobile.mmd -o documentacao/diagramas/classe/diagrama_classes_mobile.svg
  ```

- **Opção 2: Via Mermaid Live Editor:**
  1. Acesse [mermaid.live](https://mermaid.live).
  2. Cole o código do arquivo `.mmd`.
  3. Clique em **Actions > Download SVG**.
