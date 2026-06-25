<p align="center">
  <img src="https://img.shields.io/badge/System-Requirements-02303A?style=for-the-badge&logo=notion&logoColor=white" alt="Requisitos"/>
  <img src="https://img.shields.io/badge/Status-Aprovado-brightgreen?style=for-the-badge&logo=checkmarx&logoColor=white" alt="Status"/>
</p>

# 📋 Especificação Funcional e Tecnológica

Este documento consolida os **Requisitos Funcionais (RF)** e **Requisitos Não Funcionais (RNF)** da API do RotaRDV, levantados com base na arquitetura central focada no registro de despesas de viagens logísticas (Offline-First).

---

## 🎯 Requisitos Funcionais (RF)
Os Requisitos Funcionais descrevem **o que o sistema deve fazer**, englobando as regras de negócio intrínsecas a cada módulo e as ações permitidas aos usuários (Roles).

### 🔐 1. Autenticação e Perfis (Roles)
| ID | Descrição do Requisito | Atores Envolvidos | Prioridade |
|:---:|---|:---:|:---:|
| **RF-01** | O sistema deve permitir que o setor Administrativo cadastre novos motoristas com nome, e-mail, senha e documento (CPF). | *Admin* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-02** | O sistema deve autenticar usuários e gerar um Token JWT (`Bearer`) para gestão e segurança da sessão. | *Usuário* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-03** | O sistema deve permitir a renovação contínua da sessão via mecanismo de `Refresh Token`. | *Usuário logado* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-04** | O sistema deve oferecer suporte a alteração de dados do perfil e substituição de foto via Upload Multipart. | *Motorista / Admin* | ![Média](https://img.shields.io/badge/Média-yellow?style=flat-square) |
| **RF-05** | Perfis administrativos devem ser os únicos capazes de inativar prontamente a conta de outros condutores. | *Admin* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |

### 🚛 2. Gestão de Frota (Veículos)
| ID | Descrição do Requisito | Atores Envolvidos | Prioridade |
|:---:|---|:---:|:---:|
| **RF-06** | O sistema deve permitir o cadastro de veículos (cavalos mecânicos) com placa única. | *Admin* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-07** | O veículo deve opcionalmente suportar o registro interno de um conjunto de Reboques/Carretas (modelo, ano e placas associadas). | *Admin* | ![Média](https://img.shields.io/badge/Média-yellow?style=flat-square) |
| **RF-08** | Somente contas com a role Admin devem inserir ou excluir a frota, enquanto o motorista pode apenas "Listar/Ter visão" dos dados do seu próprio caminhão engatado (Ownership). | *Admin / Motorista* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |

### 🛣️ 3. Controle de Viagens
| ID | Descrição do Requisito | Atores Envolvidos | Prioridade |
|:---:|---|:---:|:---:|
| **RF-09** | O sistema deve permitir a abertura de uma nova viagem informando a origem, o destino e o km (odômetro) inicial. | *Motorista* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-10** | Na abertura da viagem, a API deve **gerar um Snapshot (fotografia atemporal)** do bloco do motorista e dos dados lidos do veículo neste exato dia para congelar no histórico. | *Sistema* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-11** | O usuário deve listar e gerenciar suas próprias viagens de acordo com os estágios vitais (`EM_ANDAMENTO`, `CONCLUIDA`, `CANCELADA`). | *Motorista* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-12** | O sistema deve computar a finalização da viagem, calculando e exibindo automaticamente a somatória de km percorrido total contra os lançamentos financeiros inseridos. | *Motorista / Sistema* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |

### 🧾 4. Gestão de Despesas e Fechamento de Caixa
| ID | Descrição do Requisito | Atores Envolvidos | Prioridade |
|:---:|---|:---:|:---:|
| **RF-13** | O sistema deve aceitar e atrelar injeções de despesas geradas fora de rede apenas numa viagem atualmente em andamento. | *Motorista* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-14** | O tipo de gasto financeiro não será digitável, operando bloqueado apenas com as frentes: `ABASTECIMENTO`, `ALIMENTACAO`, `MANUTENCAO`, `PEDAGIO` e `OUTROS`. | *Sistema* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-15** | Despesas podem facultativamente trazer Anexos Form-Data (Fotos da nota fiscal emitidas na estrada), vinculando posteriormente um link S3 à despesa salva. | *Motorista* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |
| **RF-16** | Os IDs das despesas consumidas na Cloud poderão vir forjados do Front-End (UUID Local) buscando sanar inconsistências ou duplicação de dados durante áreas assombreadas (Idempotência). | *Sistema* | ![Alta](https://img.shields.io/badge/Alta-red?style=flat-square) |

### 🔔 5. Notificações e Insights
| ID | Descrição do Requisito | Atores Envolvidos | Prioridade |
|:---:|---|:---:|:---:|
| **RF-17** | O software emitirá lembretes (Ex: Lembrete de concluir viagem esquecida em aberto ou caixa passível de faturamento). | *Sistema* | ![Média](https://img.shields.io/badge/Média-yellow?style=flat-square) |
| **RF-18** | Os fluxos permitirão a consulta de avisos listados com transição para `lida=true`. | *Motorista / Admin* | ![Baixa](https://img.shields.io/badge/Baixa-brightgreen?style=flat-square) |

---

## ⚙️ Requisitos Não Funcionais (RNF)

Os Requisitos Não Funcionais descrevem **os aspectos qualitativos** da plataforma, como performance, limites operacionais, arquitetura e padronização.

### 🛡️ 1. Segurança, Privacidade e Validações
- **[RNF-01]** As senhas dos usuários submetidas pelo payload devem sofrer imediatamente sanitização e Hash (via `bcryptjs` no AuthHelper) antes de tocar o Data Lake documental (MongoDB).
- **[RNF-02]** A API nunca confiará num request vazio, todos os endpoints do MVC devem cruzar obrigatoriamente a malha rigorosa dos artefatos de Validação usando a lib `zod` em interceptadores.
- **[RNF-03]** Autorização Abstrata (ABAC): O backend contará com uma trava contextual polimorfa `ensurePermission` (Validando não só token, mas atestando a restrição de Ownership - Ex: "*O motorista X é mesmo dono dessa viagem Y?*").
- **[RNF-04]** Rate Limiting e Helmet preventivo com tolerâncias de repetitividade agressiva em endpoints abertos por IPs, minimizando Bruteforces na autenticação.

### 🚀 2. Arquitetura e Engenharia de Software
- **[RNF-05] Tecnologias e Camadas:** A Engine principal do Web Server rodará sob **Node.js (Express)** amparado pelo isolamento em Design Pattern Service-Repository. 
- **[RNF-06] Sincronia Offline-First:** Toda estruturação da API deve ser tolerante a *Timestamps* geradas pelo mobile via Body Param, sem depender do `createdAt` do servidor.
- **[RNF-07] Desacoplamento Físico de Imagens:** Nenhuma imagem trafegada ocupará Buffer do Mongoose. Empregaremos a cloud persistente Storage S3-Compatible (MinIO/Garage) despachando a recepção da Engine e salvando URLs relativas nos docs DB.
- **[RNF-08] Padrão Ambiente de Container:** A base local fluirá em imagem isolada provisionada no repositório com orquestração de Compose `docker-compose.yml`.

### 📈 3. Dados, Precisão e Consistência (Database)
- **[RNF-09] Banco Orientado a Documento**: Toda gerência se dará sobre schemaless modeladas (`MongoDB/Mongoose`), favorecendo que Snapshots complexos de Viagens não exijam migrações agressivas ou Joins travados.
- **[RNF-10] Bloqueios em Coleções Nativas**: O bloqueio que impede uma duplicata do chassi de um cavalo (Múltiplas placas iguais) deve ser ditado como constelação Index direta da Storage nativa Mongoose (`Unique Constraint: true`).
- **[RNF-11] Cíclos de Paginação Constante**: Todas consultas abertas que listarem Viagens, Logs ou Veículos implementarão `mongoose-paginate-v2` para nunca devolver grandes pacotes brutos, exaurindo a memória dos aparelhos dos condutores remotos.

---
> 💡 *Nota*: A base destes domínios arquitetônicos foi discutida e estrita para que, no desenvolvimento, qualquer modificação e desvio da regra de negócios atenda em uníssono as demandas singulares de uma arquitetura baseada para o campo mobile *Offline-First*.
