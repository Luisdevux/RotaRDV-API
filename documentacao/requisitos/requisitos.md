<p align="center">
  <img src="https://img.shields.io/badge/System-Requirements-02303A?style=for-the-badge&logo=notion&logoColor=white" alt="Requisitos"/>
  <img src="https://img.shields.io/badge/Status-Aprovado-brightgreen?style=for-the-badge&logo=checkmarx&logoColor=white" alt="Status"/>
  <img src="https://img.shields.io/badge/Architecture-Offline--First-3E67B1?style=for-the-badge" alt="Offline-First"/>
</p>

# 📋 Especificação Funcional e Tecnológica

Este documento consolida os **Requisitos Funcionais (RF)** e **Requisitos Não Funcionais (RNF)** da API do **RotaRDV (Registro de Despesas de Viagens)**, desenvolvida sob o paradigma **Offline-First** para transportadoras rodoviárias.

---

## 🎯 Requisitos Funcionais (RF)

Os Requisitos Funcionais descrevem **o que o sistema faz**, mapeando as regras de negócio, fluxos de permissão (RBAC/ABAC) e integrações de cada módulo.

### 🔐 1. Autenticação e Gestão de Contas
| ID | Descrição do Requisito | Atores Envolvidos | Prioridade |
|:---:|---|:---:|:---:|
| **RF-01** | O sistema deve permitir o cadastro de motoristas e administradores (Signup/Admin) com validação de CPF único, CNH única (Carteira Nacional de Habilitação com 11 dígitos para condutores), nome, telefone de contato, e-mail e senha com hash seguro. | *Usuário / Admin* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-02** | O sistema deve suportar autenticação federada via **Google OAuth2** (`POST /google`), vinculando ou criando automaticamente o usuário na base. | *Usuário* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-03** | O sistema deve exigir a **confirmação de e-mail** (`GET /verificar-email`) antes de autorizar o login local, despachando tokens de verificação com validade temporal via e-mail transacional (Hermes Client). | *Sistema / Usuário* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-04** | O sistema deve autenticar usuários (`POST /login`) gerando um **Access Token** JWT de curta duração (2 min) e um **Refresh Token** de longa duração (3 dias) persistido no banco para validação de sessão. | *Usuário* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-05** | O sistema deve disponibilizar endpoint para renovação transparente de sessão (`POST /refresh`) e encerramento de sessão (`POST /logout`), invalidando o Refresh Token no banco. | *Usuário* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-06** | O sistema deve disponibilizar fluxo seguro de recuperação de senha (`POST /recover` e `PATCH /password/reset`) via código numérico de 6 dígitos com expiração temporal enviado por e-mail. | *Usuário* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-07** | O sistema deve suportar upload, substituição e deleção de foto de perfil (`POST/DELETE /usuarios/:id/foto`) via Multipart Form-Data com persistência em Storage S3 (MinIO/Garage). | *Motorista / Admin* | ![Média](https://img.shields.io/badge/Média-yellow?style=flat-square) |
| **RF-08** | Administradores (`admin`) e Gestores (`gestor`) para condutores e equipe vinculada à sua transportadora podem alterar o status de ativação (`PATCH /usuarios/:id/status` entre `ativo` e `inativo`). Somente Administradores podem alterar níveis de acesso internos (`role: admin | gestor | motorista`), e o perfil `superAdmin` (Global) é exclusivo da administração do serviço. | *Super Admin / Admin / Gestor* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |

---

### 🏢 2. Gestão de Empresas e Transportadoras
| ID | Descrição do Requisito | Atores Envolvidos | Prioridade |
|:---:|---|:---:|:---:|
| **RF-09** | O sistema deve permitir o cadastro de empresas/transportadoras (`POST /empresas`) exclusivo para Super Administradores (`superAdmin`), validando obrigatoriedade e unicidade de CNPJ (com verificação matemática de dígitos válidos suportando os formatos numérico clássico e o novo padrão alfanumérico da Receita Federal - IN RFB nº 2.229/2024), e-mail corporativo único e endereço estruturado com validação de CEP e UF. | *Super Admin* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-10** | O cadastro de empresa pode associar um **Gestor de Frota** (`gestor_id`); ao associar, o sistema deve atualizar automaticamente o usuário atribuindo a role `gestor` e vinculando o `empresa_id`. | *Super Admin / Sistema* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-11** | O sistema deve aplicar governança e isolamento de acesso (Multi-Tenant): Super Administradores (`superAdmin`) listam e gerenciam todas as empresas globalmente (`GET /empresas` e `GET /empresas/:id`); administradores internos (`admin`), gestores e motoristas têm acesso restrito estritamente aos dados da própria transportadora vinculada (`empresa_id`). | *Super Admin / Admin / Gestor / Motorista* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-12** | O sistema deve permitir a **atualização parcial** de dados cadastrais da empresa (`PATCH /empresas/:id`) por Administradores da Empresa ou Super Administradores; a transferência de titularidade ou alteração de `gestor_id` é restrita a Administradores. | *Super Admin / Admin / Gestor* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-13** | Somente Super Administradores podem alterar o status operacional global da empresa (`PATCH /empresas/:id/status` entre `ativo` e `inativo`). | *Super Admin* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-14** | A exclusão de empresa (`DELETE /empresas/:id`) é restrita a Super Administradores e deve aplicar **trava de integridade referencial rígida**, impedindo a remoção caso existam motoristas vinculados ou veículos associados à transportadora. | *Super Admin / Sistema* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-15** | O sistema deve disponibilizar endpoints de gestão de motoristas para a transportadora: cadastro direto com criação de conta (`POST /empresas/:id/motoristas`), vínculo de motorista existente (`POST /empresas/:id/motoristas/vincular`), desvinculação (`DELETE /empresas/:id/motoristas/:motoristaId`) e listagem paginada (`GET /empresas/:id/motoristas`). | *Admin / Gestor* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-16** | O sistema deve permitir à empresa listar os veículos vinculados à sua frota (`GET /empresas/:id/veiculos`) e auditar o histórico de viagens corporativas (`GET /empresas/:id/viagens`). | *Admin / Gestor* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-17** | O sistema deve fornecer um endpoint consolidado de **Dashboard Analítico** (`GET /empresas/:id/dashboard`), computando em tempo real: total de motoristas, total de veículos, viagens em andamento e concluídas, KM total rodado, total financeiro de despesas e agregação por categoria (`ABASTECIMENTO`, `ALIMENTACAO`, `MANUTENCAO`, `PEDAGIO`, `OUTROS`). | *Admin / Gestor* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-18** | O sistema deve suportar upload e exclusão de logotipo institucional da empresa (`POST/DELETE /empresas/:id/foto`) via Multipart Form-Data com persistência em Storage S3 (MinIO/Garage). | *Admin / Gestor* | ![Média](https://img.shields.io/badge/Média-yellow?style=flat-square) |

---

### 🚛 3. Gestão de Frota (Veículos)
| ID | Descrição do Requisito | Atores Envolvidos | Prioridade |
|:---:|---|:---:|:---:|
| **RF-19** | O sistema deve permitir o cadastro de veículos de tração (cavalos mecânicos) com placa única validada, tipo de combustível preferencial (`DIESEL_S10`, `DIESEL_S500`, `GASOLINA`, `ETANOL`, `ARLA_32`, `OUTRO`), capacidade do tanque em litros e ano de fabricação. | *Admin / Gestor* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-20** | O veículo deve suportar o registro estruturado de reboques/carretas associadas (modelo, ano de fabricação e array de múltiplas placas para composições simples, bitrens, rodotrens, tritrens ou canavieiros). | *Admin / Gestor* | ![Média](https://img.shields.io/badge/Média-yellow?style=flat-square) |
| **RF-21** | Administradores e Gestores podem criar, editar, excluir e ativar/desativar veículos da frota (`PATCH /veiculos/:id/status` entre `ativo` e `inativo`); motoristas podem apenas listar e consultar dados do caminhão vinculado. | *Admin / Gestor / Motorista* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |

---

### 🛣️ 4. Controle de Viagens
| ID | Descrição do Requisito | Atores Envolvidos | Prioridade |
|:---:|---|:---:|:---:|
| **RF-22** | O sistema deve permitir a abertura de uma nova viagem informando origem (cidade/UF), destino (cidade/UF), odômetro inicial (`km_inicial`), data de início e veículo. | *Motorista* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-23** | Na abertura da viagem, a API deve **gerar Snapshots Imutáveis** dos dados do motorista (`usuario_snapshot`) e do veículo completo com reboques (`veiculo_snapshot`), congelando o histórico contra alterações cadastrais futuras. | *Sistema* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-24** | A API deve impedir que um motorista inicie uma nova viagem caso já possua outra viagem com status `em_andamento` no sistema. | *Sistema* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-25** | O motorista e a transportadora podem acompanhar o ciclo de vida da viagem pelos status: `em_andamento`, `concluída` e `cancelada`. | *Motorista / Admin / Gestor* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-26** | Na consulta da viagem (`GET /viagens/:id`), a API deve calcular e injetar em tempo real um **Resumo Financeiro Dinâmico** (`resumo_financeiro`), contendo: total geral de gastos, subtotais por categoria (`ABASTECIMENTO`, `ALIMENTACAO`, `MANUTENCAO`, `PEDAGIO`, `OUTROS`), km percorrido total, litros totais abastecidos e média de consumo calculada (km/l). | *Sistema* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |

---

### 🧾 5. Gestão de Despesas (Polimorfismo & Discriminators)
| ID | Descrição do Requisito | Atores Envolvidos | Prioridade |
|:---:|---|:---:|:---:|
| **RF-27** | O sistema deve permitir o lançamento de despesas atreladas exclusivamente a viagens com status `em_andamento`. | *Motorista* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-28** | As despesas devem ser categorizadas rigidamente via **Mongoose Discriminators** (`Single Collection Inheritance` na coleção `despesas`), garantindo campos e validações exclusivas por tipo: | *Sistema* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| | • **ABASTECIMENTO:** Quantidade de litros, valor por litro, tipo de combustível e odômetro atual (`km_atual`). | | |
| | • **ALIMENTACAO:** Tipo de refeição (café, almoço, jantar, lanche). | | |
| | • **MANUTENCAO:** Nome/razão social da oficina mecânica. | | |
| | • **PEDAGIO:** Nome da praça/concessionária de pedágio. | | |
| | • **OUTROS:** Descrição detalhada do gasto eventual. | | |
| **RF-29** | A data da despesa não pode ser anterior à data de início da viagem, e o KM registrado no abastecimento não pode ser inferior ao KM inicial da viagem. | *Sistema* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-30** | As despesas podem conter comprovantes fotográficos (notas fiscais) via upload Multipart, salvando URLs públicas do S3 no campo `foto_anexo`. | *Motorista* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |

---

### 🔄 6. Sincronização Bidirecional Offline-First (Sync Engine)
| ID | Descrição do Requisito | Atores Envolvidos | Prioridade |
|:---:|---|:---:|:---:|
| **RF-31** | **Push Sync (`POST /sync/push`):** O sistema deve processar em lote (batch) arrays de viagens e despesas enviadas pelo aplicativo móvel, aplicando operações de **Upsert** (`bulkWrite` não ordenado) e exclusões lógicas (`is_deleted: true`), garantindo idempotência total baseada em identificadores **UUID v4**. | *Motorista / Sistema* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-32** | **Pull / Delta Sync (`GET /sync/pull`):** O sistema deve fornecer endpoint de sincronização incremental recebendo o parâmetro `updatedAfter`, retornando unicamente viagens e despesas criadas ou modificadas após o timestamp informado. | *Motorista / Sistema* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |

---

### 🩺 7. Monitoramento e Documentação
| ID | Descrição do Requisito | Atores Envolvidos | Prioridade |
|:---:|---|:---:|:---:|
| **RF-33** | O sistema deve disponibilizar endpoint de verificação de integridade (`GET /health`), reportando status da API (`healthy`/`unhealthy`), estado da conexão com o MongoDB, uptime e timestamp atual. | *DevOps / Monitor* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-34** | O sistema deve disponibilizar documentação interativa completa da API no padrão OpenAPI 3.0 via **Swagger UI** (`GET /docs`), com esquemas de validação, parâmetros e exemplos de respostas. | *Desenvolvedores* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |

---

## ⚙️ Requisitos Não Funcionais (RNF)

Os Requisitos Não Funcionais descrevem **os aspectos qualitativos, de segurança, performance, arquitetura e resiliência** da plataforma.

### 🛡️ 1. Segurança e Integridade
- **[RNF-01] Hash Criptográfico:** As senhas dos usuários locais são sanitizadas e protegidas com `bcryptjs` utilizando salt configurável (`SALT_LENGTH=10`) antes de qualquer persistência no banco de dados.
- **[RNF-02] Validação Estrita em Runtime (Zod):** 100% dos payloads de entrada (Body, Params e Query Strings) são validados e tipados por schemas Zod antes de atingir os controladores.
- **[RNF-03] Controle de Acesso Contextual (Ownership / ABAC):** A função helper `ensurePermission` valida o vínculo de propriedade (o motorista só lê, edita ou sincroniza seus próprios registros), permitindo bypass apenas para contas com `isAdmin: true`.
- **[RNF-04] Proteção contra Brute Force (Rate Limiting):** Aplicação de limitadores de requisições em 3 níveis (`authRateLimit`, `strictRateLimit` para rotas sensíveis como login/recuperação, e `publicRateLimit`).
- **[RNF-05] Headers HTTP Seguros:** Implementação do middleware `helmet` configurado com Content Security Policy (CSP) e cabeçalhos de segurança avançados.
- **[RNF-06] Sanitização contra XSS em Uploads:** Processamento e sanitização de arquivos vetoriais SVG com `jsdom` e `DOMPurify`, prevenindo injeção de scripts maliciosos.

### 🚀 2. Arquitetura e Engenharia de Software
- **[RNF-07] Arquitetura em Camadas (Layered Architecture):** Segregação estrita de responsabilidades: `Routes -> Controllers -> Services -> Repositories -> Models`.
- **[RNF-08] Desacoplamento de Armazenamento de Arquivos:** Imagens e comprovantes fiscais nunca são persistidos em Base64 no banco de dados; são otimizados via `sharp` (JPEG progressivo, qualidade 80%) e transferidos para Object Storage compatível com S3 (`MinIO/Garage`).
- **[RNF-09] Tratamento Centralizado de Erros:** O middleware global `errorHandler` intercepta e padroniza 12 categorias de falhas (Zod, CastError, DuplicateKey, TokenExpired, etc.), gerando identificadores únicos `errorId` (UUID) para rastreabilidade nos logs.
- **[RNF-10] Logging Estruturado e Rotação:** Logs com `winston` e `winston-daily-rotate-file` em 3 transportes (console, arquivos diários combinados e arquivos de erro), com retenção configurável e monitoramento de tráfego via `LogRoutesMiddleware`.

### 📈 3. Banco de Dados e Sincronização
- **[RNF-11] Identificadores Universais Distribuídos (UUID v4):** Coleções de Viagens e Despesas utilizam `_id` tipado em `String` com UUID v4, viabilizando a geração autônoma de IDs pelo cliente móvel offline sem colisões.
- **[RNF-12] Índices e Restrições Únicas:** Aplicação de índices `unique` nativos no MongoDB para placas de veículos, e-mails de usuários, CPFs e identificadores Google (`googleId`).
- **[RNF-13] Paginação Otimizada:** Endpoints de listagem utilizam `mongoose-paginate-v2` com ordenação e limite de registros, preservando a memória dos clientes móveis.
- **[RNF-14] Formatação Brasileira de Datas:** Plugin customizado `mongooseBrazilianDatePlugin` que assegura a formatação e serialização consistente de datas no padrão brasileiro (`dd/MM/yyyy`).
