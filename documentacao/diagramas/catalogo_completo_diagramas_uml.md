# Catálogo Oficial dos Diagramas UML - Ecossistema RotaRDV

Documento mestre de **Engenharia de Software** do ecossistema **RotaRDV** (`tcc-despesas-api` e `tcc-despesas-mobile`), contemplando os **6 Principais Diagramas UML da especificação oficial OMG UML 2.5**, divididos em suas duas categorias fundamentais (Estruturais e Comportamentais), prontos para renderização e exportação direta em **SVG**.

---

## 1. Visão Geral da Arquitetura de Diagramas UML

```text
tcc-despesas-api/documentacao/diagramas/
│
├── 1. DIAGRAMAS ESTRUTURAIS (Parte Estática do Sistema)
│   ├── classe/
│   │   ├── diagrama_classes_dominio.puml / .mmd      # Entidades de Domínio, Snapshots e Discriminators
│   │   ├── diagrama_classes_arquitetura.puml / .mmd  # Arquitetura em Camadas da API Express 5.2
│   │   ├── diagrama_classes_mobile.puml / .mmd       # Camadas do Mobile Flutter / IsarDB / Dio
│   │   └── diagrama_classes_completo.md              # Documentação das Classes e Relacionamentos
│   │
│   ├── componentes/
│   │   ├── diagrama_componentes.puml                 # Componentes em PlantUML (Mobile, API, S3, Mongo)
│   │   └── diagrama_componentes.mmd                  # Componentes em Mermaid
│   │
│   ├── containers/
│   │   ├── diagrama_containers.puml                  # Diagrama de Containers C4 Model (Nível 2) em PlantUML
│   │   ├── diagrama_containers.mmd                   # Diagrama de Containers C4 Model em Mermaid
│   │   └── README.md                                 # Especificação técnica dos containers
│   │
│    └── implantacao/
        ├── diagrama_implantacao.puml                 # Nós físicos, Cluster K3s na OCI ARM64, Cloudflare e Celular
        └── diagrama_implantacao.mmd                  # Implantação em Mermaid

└── 2. DIAGRAMAS COMPORTAMENTAIS (Comportamento Dinâmico do Sistema)
    ├── casosdeuso/
    │   ├── diagrama_casos_de_uso.puml                # Casos de Uso formal (Atores, Includes e Extends)
    │   ├── diagrama_casos_de_uso.mmd                 # Casos de Uso em Mermaid
    │   └── especificacao_casos_de_uso.md             # Especificação formal completa (UC-01 a UC-12 + 20 RNs)
    │
    ├── sequencia/
    │   ├── sequencia_autenticacao_e_refresh.puml / .mmd  # Autenticação JWT, Bcrypt e ApiClient (Refresh)
    │   ├── sequencia_ciclo_vida_viagem.puml / .mmd       # Abertura com Snapshots e Encerramento $aggregate
    │   ├── sequencia_lancamento_despesa_e_upload.puml / .mmd # Discriminators Mongoose, Sharp mozjpeg e S3
    │   └── sequencia_sincronizacao_offline_first.puml / .mmd # Push bulkWrite, Auto-Recovery e Delta Pull
    │
    └── atividades/
        ├── atividade_abertura_e_encerramento_viagem.puml # Fluxo de Viagem com raias, guardas e fork/join
        ├── atividade_fluxo_despesas_e_comprovantes.puml  # Bifurcação das 5 categorias e upload desacoplado
        └── atividade_motor_sincronizacao_offline.puml    # Listener de rede, retentativas e exclusão de fotos
```

---

## 2. Detalhamento dos 6 Diagramas Principais

### Categoria A: Diagramas Estruturais (Estáticos)

1. **Diagrama de Classes (`classe/`):**
   - **Domínio:** Modela os esquemas Mongoose, herança polimórfica com discriminators na coleção `despesas` (`ABASTECIMENTO`, `ALIMENTACAO`, `MANUTENCAO`, `PEDAGIO`, `OUTROS`), snapshots imutáveis (`usuario_snapshot` e `veiculo_snapshot`), e controle de múltiplos reboques e placas.
   - **Arquitetura API:** Modela a divisão de responsabilidades da API Express 5.2 (`Routes` -> `Middlewares` -> `Controllers` -> `Services` -> `Repositories` -> `Helpers`).
   - **Mobile Flutter:** Modela a arquitetura reativa offline-first do app móvel com coleções Isar (`ViagemCollection`, `DespesaCollection`), `SyncService`, `StorageCleanerService` e `ApiClient` (`package:http`).

2. **Diagrama de Componentes (`componentes/`):**
   - Modela os módulos de software e suas interfaces (`tcc-despesas-mobile`, `tcc-despesas-api`, `MongoDB Database`, `Garage S3 Storage`, `Google Identity Platform` e `Hermes SMTP Mailer`).
   - Mapeia as portas e protocolos de comunicação: REST JSON HTTPS, S3 API SigV4, MongoDB Wire Protocol, Google OAuth 2.0 e SMTP TLS.

3. **Diagrama de Implantação (`implantacao/`):**
   - Modela a topologia de infraestrutura física e nuvem:
     - Dispositivo Móvel do Motorista (Smartphone Android/iOS com APK Flutter, IsarDB embutido em C++ e storage local de fotos).
     - Instância OCI ARM64 Ampere na Oracle Cloud (Ubuntu 22.04 LTS com cluster Kubernetes leve K3s).
     - Namespace `kube-system`: daemon `cloudflared` (Cloudflare Tunnel seguro sem portas abertas) e `traefik` (Ingress Controller v2).
     - Namespace `rotardv-prod`: container da API Node.js 22 / Express 5.2 (porta 5040) e StatefulSet MongoDB 7.0 com PVC local-path.
     - Storage Institucional: Garage Cloud S3 (`s3.fslab.dev:443`) com TLS e SigV4.

4. **Diagrama de Containers (`containers/`):**
   - Modela a arquitetura de software no padrão **C4 Model (Nível 2)**:
     - Containers de Software: `App Móvel RotaRDV` (Flutter / IsarDB), `Cloudflare Edge Anycast`, `Cloudflare Tunnel (cloudflared)`, `Traefik Ingress`, `API RESTful RotaRDV` (Node.js 22 / Express 5.2), `MongoDB 7.0 StatefulSet` e `Garage Cloud S3`.
     - Protocolos e portas mapeados: HTTPS Anycast (443), Tunnel Protocol seguro, HTTP interno (80), ClusterIP REST (5040), MongoDB Wire Protocol (27017) e S3 SigV4 TLS (443).
   - Disponível em [**`diagrama_containers.puml`**](file:///C:/Users/Pichau/Documents/TCCDespesas/tcc-despesas-api/documentacao/diagramas/containers/diagrama_containers.puml) e [**`.mmd`**](file:///C:/Users/Pichau/Documents/TCCDespesas/tcc-despesas-api/documentacao/diagramas/containers/diagrama_containers.mmd).

---

### Categoria B: Diagramas Comportamentais (Dinâmicos)

5. **Diagrama de Casos de Uso (`casosdeuso/`):**
   - Apresenta as interações dos 3 atores humanos (`Motorista Rodoviário`, `Gestor de Frota`, `Super Administrador`) e 4 atores de sistema (`Google/Firebase OAuth`, `Hermes SMTP`, `Garage S3`, `Sync Engine Mobile`).
   - Detalha as relações de inclusão (`<<include>>`) e extensão (`<<extend>>`) para os casos de uso essenciais (UC-01 a UC-12), acompanhado do documento formal de especificações e catálogo de 20 Regras de Negócio normativas.

6. **Diagramas de Sequência (`sequencia/`):**
   - **Autenticação e Refresh:** Interceptor Dio pausando requisições ao receber HTTP 401, renovando via `POST /auth/refresh` e reexecutando a chamada original de forma imperceptível para o motorista.
   - **Ciclo de Vida da Viagem:** Validação de odômetro mínimo contra retrocesso, bloqueio de condutor/veículo ocupado, geração de snapshots imutáveis, encerramento com `km_final > km_inicial` e cálculo dinâmico via pipeline `$aggregate`.
   - **Lançamento de Despesa e Upload:** Persistência dos campos polimórficos de Discriminator, validação temporal (`data >= data_inicio`), compressão via Sharp mozjpeg 80%, sanitização SVG anti-XSS via DOMPurify e envio ao Garage S3.
   - **Sincronização Offline-First:** Push em lote com `bulkWrite({ ordered: false })`, tratamento de `is_deleted`, upload individual de comprovantes físicos com auto-recovery (`resolverOuRecuperarFotoLocal`), Pull delta via `updatedAfter` e exclusão periódica de fotos locais > 15 dias.

7. **Diagramas de Atividades (`atividades/`):**
   - Modela com precisão algorítmica os fluxos de controle através de raias (swimlanes), nós de decisão com condições de guarda e pontos de sincronização (fork/join):
     - Atividade de Abertura e Encerramento de Viagem.
     - Atividade de Lançamento de Despesa e Processamento de Mídia.
     - Atividade do Motor de Sincronização e Manutenção de Armazenamento.

---

## 3. Como Visualizar e Gerar SVG no VS Code

Todos os arquivos `.puml` foram padronizados com `@startuml` anônimo e compilam sem erros na extensão **PlantUML** do VS Code:

1. Abra qualquer arquivo `.puml` no VS Code.
2. Pressione **`Alt + D`** para abrir a pré-visualização gráfica.
3. Para salvar em **SVG**: clique com o botão direito sobre o diagrama na pré-visualização e selecione **Export Current Diagram > SVG**.
