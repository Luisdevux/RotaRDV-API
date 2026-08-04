<div align="center">

# 🚛 Projeto RotaRDV
**Registro de Despesas de Viagens — TCC**

*Transformação digital da logística rodoviária através de uma arquitetura Offline-First.*

![Status](https://img.shields.io/badge/Status-Em_Desenvolvimento-F7B93E?style=for-the-badge)
![Ecosystem](https://img.shields.io/badge/Ecossistema-Mobile_%2B_API-47A248?style=for-the-badge)
![Architecture](https://img.shields.io/badge/Arquitetura-Offline--First-3E67B1?style=for-the-badge)

</div>

---

## 📖 O Coração do TCC

O **RotaRDV** nasce com o foco na **transformação digital da logística rodoviária**, resolvendo um gargalo operacional crítico nas transportadoras: a substituição do processo arcaico de prestação de contas de motoristas.

### 🚨 O Problema Central
A dependência excessiva do **papel** para o RDV (Registro de Despesas de Viagens). Essa defasagem tecnológica gera um severo "efeito dominó":
- **Perdas Financeiras:** Rasuras, perda ou degradação de comprovantes impressos que invalidam o reembolso.
- **Falta de Transparência:** Ausência de visão em tempo real para a transportadora sobre os gastos efetuados na estrada.
- **Sobrecarga Administrativa:** Esforço manual enorme da equipe de backoffice para ler, consolidar recibos amassados e "fechar o caixa" de cada viagem.

### 💡 A Solução Técnica
Uma solução de software completa (API Central + App Mobile Android/iOS) fundamentada num requisito arquitetural crítico: **Offline-First**. 
Caminhoneiros frequentemente cruzam zonas de "sombra" de internet. O RotaRDV permite que o motorista registre um abastecimento (com foto do cupom fiscal) no meio do nada. Os dados são persistidos localmente gerando UUIDs no device e **sincronizados automaticamente** em background com o backend assim que ele voltar a ter sinal.

### 🎯 O Diferencial de Usabilidade (UX/UI)
O público-alvo (motoristas de caminhão) tende a ter perfil e faixa etária mais elevados ou menor proficiência digital. Isso dita totalmente o design e limites do mobile:
- **Interface Limpa e Direta:** Sem menus complexos.
- **Acessibilidade:** Botões superdimensionados, alto contraste e fontes legíveis.
- **Fluxo Contínuo:** Rápida tomada de decisão que não atrapalha a rotina rigorosa e desgastante da estrada.

> **O Objetivo Final Científico**: Não se trata apenas de "*fazer um app*", mas de **validar** como a interface de coleta de dados *off-grid* automatiza, audita e gera informações limpas para tomadas de decisão logísticas, estancando o gargalo financeiro de papéis e trazendo segurança jurídica para dono de transportadora e motoristas.

---

## ⚙️ Regras de Negócios Robustas (A Arquitetura da API)

O backend do RotaRDV foi estruturado para suportar escalabilidade, garantindo que não ocorram duplicações de caixa no contexto offline e que seja amarrado um controle seguro contra desfalques frotistas:

1. **Padrão Snapshot (Cópia Atemporal):** Caminhões mudam de placa, de carreta, e motoristas trocam de boleia constantemente. A API **não** salva um relacionamento simples e genérico do veículo na viagem. A API cria um *Snapshot* rígido dos dados inteiros do caminhão + carreta no momento de check-in da viagem. A transportadora pode vender o caminhão futuramente; o histórico passado da prestação de contas continuará impenetrável e com o dado salvo intacto da data.
2. **Autorizações Contextuais (Ownership):** Diferente de apps comuns de CRUD, a segurança não fica só num token JWT checando se "logou". A API dispõe de uma validação severa chamada `ensurePermission`, que impede na camada de software que um motorista injete, leia ou burle o caixa do chassi de outro condutor, interceptando ações antes de tocar na persistência. (O motorista é o "Dono" apenas dos dados em seu alcance).
3. **Categorização Fechada (Enums):** Para garantir o fechamento de caixa consistente e gráficos precisos, o motorista jamais digita um motivo fiscal. Na modelagem de dados, a regra recai sob Enums travados no banco: `[ABASTECIMENTO, ALIMENTACAO, MANUTENCAO, PEDAGIO, OUTROS]`. Qualquer item externo aciona exceções HTTP rigorosas na API.
4. **Resiliência de Upload (Multipart & Cloud):** Como o comprovante precisa ser tirado como foto num posto com rede precária, a API atenda os *files* desmembrados sem consumir cache volátil de Mongoose, encaminhando de forma isolada do fluxo os JPEGs pesados direto para Data Storage Cloud nativo S3 (MinIO/Garage).

---

## 🗄️ Modelagem de Dados (Ecossistema)

O banco de dados do projeto de domínio foi fragmentado em 5 grandes coleções principais no MongoDB:

- 👥 **`usuarios`**: Gestão dos motores (Mobile) e retaguarda administrativa (Dashboards). Modela hash de segredos, vínculos, JWT Sessions e recuperação de permissões.
- 🚛 **`veiculos`**: Gestão unificada da frota da transportadora. Regula a "cabeça" (cavalo mecânico) e sua array de chassis tracionados (Reboques).
- 🛣️ **`viagens`**: O coração relacional. Associa 1 Motorista <> 1 Snapshot de Veículo. Congela cronometragens, odometria inicial/final e status cíclico.
- 🧾 **`despesas`**: Entidades monetárias atreladas à estrutura hierárquica superior (`viagens`). Tratam comprovantes (links S3), valores escalares, a categoria taxada fechada e cronologia real de faturamento injetada pelo celular.
- 🔔 **`notificacoes`**: Lembretes paralelos empurrados ou consultados de forma assíncrona (Ex: "Fechar caixa da viagem iniciada dia 12" etc).

---

## ✅ Status de Maturidade dos Requisitos Funcionais

Acompanhamento do que o projeto já atende de regra de arquitetura real pronta para consumir via endpoints.

### 👤 Autenticação e Perfis (Usuários) - Baseada
- [x] O Administrativo pode cadastrar usuários com nome, email, hash robusto e máscara documental CPF validada.
- [x] Ecossistema pronto para Refresh/Recovery JWT base de sessão de usuário.
- [x] Motoristas editando upload de assinaturas visuais (profile S3).
- [x] Nivelamento de motoristas bloqueados nas próprias coleções contra manipulação vertical.

### 🚛 Frota (Veículos) - Baseada
- [x] Cadastro de veículos com travas no repositório Mongoose de chassi duplicado.
- [x] Estrutura montada de Reboque e modelo da cavalaria de eixo no veículo pai.
- [x] Bloqueio semântico: Condutores conseguem enxergar quem dirige, mas somente contas Admin alteram estrutura corporativa frota.

### 🛣️ Controle de Viagens *(Status: ✅ Implementado)*
- [x] `POST /viagens`: Criação de viagem com geração automática de **Snapshots Imutáveis** de motorista (`usuario_snapshot`) e veículo (`veiculo_snapshot`), garantindo consistência histórica.
- [x] Trava de consistência de estado: Bloqueio automático de criação de nova viagem se o motorista já possuir uma viagem com status `em_andamento`.
- [x] `GET /viagens` e `GET /viagens/:id`: Listagem paginada e consulta detalhada com injeção em tempo real de **Resumo Financeiro Dinâmico** (`total_geral`, `por_categoria`, métricas de `km_percorrido`, `total_litros` e `media_consumo` km/l via aggregation pipeline).
- [x] `PATCH /viagens/:id`: Atualização de dados da viagem e fechamento de ciclo operacional (`em_andamento`, `concluída`, `cancelada`) com validação de odômetro final.
- [x] `DELETE /viagens/:id`: Exclusão controlada de viagens e limpeza associada respeitando controle de permissão (Ownership / Admin).

### 🧾 Caixa e Despesas *(Status: ✅ Implementado)*
- [x] Modelagem polimórfica com **Mongoose Discriminators** (`Single Collection Inheritance`) para as categorias: `ABASTECIMENTO`, `ALIMENTACAO`, `MANUTENCAO`, `PEDAGIO` e `OUTROS`.
- [x] `POST /despesas`: Criação de despesas com validações de integridade rígidas (a viagem precisa estar `em_andamento`, a data da despesa não pode ser anterior à data de início da viagem, e o KM de abastecimento não pode ser inferior ao KM inicial da viagem).
- [x] `GET /despesas` e `GET /despesas/:id`: Listagem com filtros por viagem e paginação, protegida por ownership.
- [x] `DELETE /despesas/:id`: Exclusão de despesas com verificação de status ativo da viagem e permissão do motorista.
- [x] Desacoplamento de fotos e comprovantes fiscais com processamento via Sharp e armazenamento persistente em S3 (MinIO/Garage).

### 🔄 Sincronização Offline-First (Sync Engine) *(Status: ✅ Implementado)*
- [x] `POST /sync/push`: Sincronização bidirecional em lote com `bulkWrite` tolerante a falhas (`ordered: false`), operando via UUIDs v4 para idempotência absoluta (Upsert de viagens/despesas e exclusão lógica).
- [x] `GET /sync/pull`: Delta Sync incremental filtrando registros alterados após timestamp (`updatedAfter`) para otimizar largura de banda móvel.

---

## 🏗️ Estruturas e Padrões (Backend API)

A API Node.js deste projeto evita acoplamento forte empregando uma separação clara de domínios, visando isolamento de falhas, legibilidade de documentação de rotas e segurança global. A arquitetura de pastas e lógica espelha o seguinte direcionamento:

- **Layered Architecture (MVC Evoluído):** Padrão em que cada requisição percorre verticalmente `Router -> Controller -> Service -> Repository -> Model`.
- **Repository Pattern (`src/repositories`):** A lógica crua do driver do banco (Mongoose) não se espalha pela empresa. Todas as queries de agregação paginadas e inserções NoSQL operam unicamente dentro dos Repositórios.
- **Service Pattern (`src/services`):** O "cérebro" das regras de negócio (validação de placas duplicadas, encriptação hash, verificação do status "isOwner"). É o serviço que dita *"como"* a requisição deve ser transformada.
- **Middlewares Radicais (`src/middlewares`):** O express não processa tráfego solto. Intercepta conexões em Rate-Limiting rigoroso preventivo (DDos), autentica JWT Bearer checando expiração automática, captura toda exceção de código sem crash global (via `errorHandler`) e loga IPs via Logger da plataforma (Winston).
- **Validation DTOs (Zod):** Validação de ponta à ponta do payload de entrada através da biblioteca `zod`, antes de sequer tocar nos Controllers.
- **Documentação Direcionada:** Um diretório exclusivo de `docs` provendo mapeamento automático das rotas via `swagger-ui-express`. A documentação de Swagger é carregada no backend separando por módulos (schemas de payload, parâmetros gerados dinamicamente e responses universais referenciados centralizadamente).
