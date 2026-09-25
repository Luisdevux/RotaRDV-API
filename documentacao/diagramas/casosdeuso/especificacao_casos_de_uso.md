# Especificação Detalhada de Casos de Uso - Sistema RotaRDV

Documento formal de Engenharia de Software para o ecossistema **RotaRDV** (`tcc-despesas-api` e `tcc-despesas-mobile`), contemplando os fluxos funcionais, regras de negócio normativas, fluxos alternativos e de exceção.

---

## Matriz de Rastreabilidade de Casos de Uso

| ID | Nome do Caso de Uso | Atores Primários | Complexidade |
| :--- | :--- | :--- | :--- |
| **UC-01** | Autenticar Usuário e Gerenciar Sessão JWT | Motorista, Gestor, SuperAdmin | Alta |
| **UC-02** | Registrar Conta de Usuário e Ativação por E-mail | Visitante / Usuário | Média |
| **UC-03** | Recuperar Senha com Token Temporário | Usuário Cadastrado | Média |
| **UC-04** | Iniciar Viagem Rodoviária e Gerar Snapshots | Motorista | Alta |
| **UC-05** | Lançar Despesa com Polimorfismo e Discriminators | Motorista | Alta |
| **UC-06** | Anexar Comprovante Fiscal e Otimizar Mídia | Motorista | Média |
| **UC-07** | Sincronizar Dados em Modo Offline-First (Push/Pull) | Motorista (Mobile Engine) | Muito Alta |
| **UC-08** | Encerrar Viagem e Calcular Resumo Financeiro Dinâmico | Motorista | Alta |
| **UC-09** | Gerenciar Transportadoras e Multi-Tenancy | Super Administrador | Alta |
| **UC-10** | Gerenciar Frota, Veículos e Alocação de Condutores | Gestor de Frota | Alta |
| **UC-11** | Visualizar Resumo Financeiro e Auditoria de Despesas | Gestor, Administrador | Média |
| **UC-12** | Excluir Fotos Locais Antigas de Comprovantes (Storage Cleaner) | Sistema Mobile Background | Baixa |

---

## Catálogo de Regras de Negócio (RN)

- **RN-01 (RBAC Hierárquico):** Perfis de acesso:
  - `superAdmin`: Acesso global ilimitado; cadastra empresas e ativa/inativa tenants.
  - `admin`: Administrador interno da transportadora associada (`empresa_id`).
  - `gestor`: Gerencia veículos, viagens e motoristas do seu `empresa_id`.
  - `motorista`: Opera exclusivamente suas próprias viagens e despesas via Mobile.
- **RN-02 (Vida Útil de Tokens JWT):** Access Token expira em 30 minutos; Refresh Token expira em 30 dias. Token de verificação de conta tem validade de 24 horas; Token de recuperação de senha tem validade de 1 hora.
- **RN-03 (Unicidade de Viagem Ativa por Condutor):** Um motorista não pode iniciar uma nova viagem se já possuir uma com status `em_andamento`.
- **RN-04 (Exclusividade de Veículo em Trânsito):** Um veículo não pode ser alocado em uma nova viagem se já estiver associado a outra viagem com status `em_andamento`.
- **RN-05 (Integridade do Odômetro Inicial):** O odômetro inicial (`km_inicial`) da nova viagem deve ser estritamente maior ou igual ao último odômetro registrado para o veículo (`ultimaKmDoVeiculo`).
- **RN-06 (Imutabilidade de Snapshots):** Ao abrir uma viagem, o sistema congela `usuario_snapshot` (nome, email) e `veiculo_snapshot` (placa, modelo, reboques) para garantir integridade histórica caso os cadastros originais sofram alterações posteriores.
- **RN-07 (Consistência Cronológica de Despesas):** A data de realização da despesa (`data`) não pode ser anterior à data de início da viagem (`viagem.data_inicio`).
- **RN-08 (Despesas Apenas em Viagens Ativas):** Não é permitido lançar despesas em viagens com status diferente de `em_andamento`.
- **RN-09 (Odômetro Mínimo em Abastecimentos):** Para despesas do tipo `ABASTECIMENTO`, o odômetro informado (`km_atual`) deve ser maior ou igual ao `km_inicial` da viagem.
- **RN-10 (Integridade do Odômetro Final):** Ao encerrar a viagem, o `km_final` deve ser estritamente maior que o `km_inicial`.
- **RN-11 (Auditoria Financeira Dinâmica):** O Resumo Financeiro da viagem (`total_despesas`, `total_abastecimento`, `litros_combustivel`, `consumo_medio_kml`, `custo_medio_km`, `saldo_reembolso_adiantamento`) é calculado sob demanda via pipeline de agregação (`$aggregate`) do MongoDB, impedindo inconsistências com inserções ou deleções posteriores.
- **RN-12 (Isolamento Multi-Tenant em Camadas):** Toda consulta de leitura ou escrita executada por `gestor` ou `admin` é forçadamente filtrada por `empresa_id: usuarioLogado.empresa_id` via `filtrosOverride`.
- **RN-13 (Validação Universal de CNPJ):** O CNPJ da transportadora é validado tanto pelo algoritmo clássico de 14 dígitos numéricos quanto pela nova regra alfanumérica da Instrução Normativa RFB nº 2.229/2024.
- **RN-14 (Integridade Referencial na Exclusão de Empresas):** Uma empresa só pode ser excluída pelo `superAdmin` se não houver nenhum motorista (`contarMotoristas === 0`) e nenhum veículo (`contarVeiculos === 0`) cadastrado.
- **RN-15 (Autonomia Offline com UUIDs v4):** O aplicativo móvel gera identificadores universais únicos (UUID v4) localmente para viagens e despesas no IsarDB, garantindo integridade sem necessidade de round-trip prévio com o servidor.
- **RN-16 (Sincronização em Lote Desordenada):** O Push Sync utiliza `bulkWrite({ ordered: false })` no MongoDB, garantindo que a falha em um registro isolado não aborte o processamento dos demais registros válidos do lote.
- **RN-17 (Preservação Polimórfica em Sync):** O `bulkWrite` de despesas opera diretamente na collection nativa do Mongoose (`Despesa.collection.bulkWrite`) para evitar que o cast de schema elimine os campos específicos dos Discriminators (`litros`, `km_atual`, `oficina_nome`, `praca_nome`).
- **RN-18 (Upload Desacoplado de Comprovantes):** O envio de imagens físicas de comprovantes é desacoplado do lote JSON de sincronização de metadados, possuindo fila própria com retentativas e auto-recuperação (`resolverOuRecuperarFotoLocal`).
- **RN-19 (Otimização e Sanitização de Mídia):** Toda foto enviada é processada pelo Sharp (conversão para mozjpeg qualidade 80% e limitação de 1920px). Arquivos SVG são sanitizados contra vetores de ataque XSS via DOMPurify + JSDOM.
- **RN-20 (Exclusão Automática de Fotos Locais):** Fotos de comprovantes sincronizadas há mais de 15 dias são excluídas do armazenamento local do aparelho pelo `StorageCleanerService`, liberando espaço físico no dispositivo do motorista.

---

## Especificações Detalhadas dos Casos de Uso

---

### UC-01: Autenticar Usuário e Gerenciar Sessão JWT
- **Atores:** Motorista, Gestor, SuperAdmin.
- **Pré-condições:** Usuário cadastrado no banco de dados e conta ativada (`email_verificado: true` ou login federado Google).
- **Fluxo Principal (Autenticação Local):**
  1. O usuário informa e-mail e senha na tela de login (`POST /auth/login`).
  2. O API Gateway valida a estrutura dos dados via `LoginSchema` do Zod.
  3. O `AuthService` localiza o usuário pelo e-mail com projeção do campo `+senha`.
  4. O sistema valida se `usuario.status === 'ativo'` e se `email_verificado === true`.
  5. O `AuthService` compara a senha fornecida com o hash persistido via `bcrypt.compare`.
  6. O sistema gera o par de tokens:
     - `accessToken`: JWT assinado com chave privada, validade de 30 minutos.
     - `refreshToken`: JWT assinado com chave secreta distinta, validade de 30 dias.
  7. O `refreshToken` é persistido com hash no documento do usuário.
  8. A API retorna HTTP 200 com os tokens e os dados cadastrais (role, empresa, veiculo vinculado).
- **Fluxo Alternativo 1A (Login Social com Google OAuth):**
  1. No passo 1, o usuário opta por "Entrar com Google" no App Mobile.
  2. O cliente autentica via Google Sign-In e obtém o `idToken`.
  3. O cliente envia `POST /google` com o token recebido.
  4. O backend valida a autenticidade do token junto aos servidores do Google via `google-auth-library` (`OAuth2Client`).
  5. Se o usuário não existir, é provisionado com role `motorista` e `email_verificado: true`. Prossegue ao passo 6.
- **Fluxo Alternativo 1B (Renovação Transparente de Token - Refresh):**
  1. O cliente detecta expiração do `accessToken` (HTTP 401).
  2. O cliente envia requisição para `POST /refresh` contendo o `refreshToken`.
  3. O backend decodifica o token, valida se o hash coincide com o persistido e confere a expiração.
  4. O sistema emite um novo `accessToken` de 30 minutos e retorna HTTP 200.
- **Fluxos de Exceção:**
  - **FE-01.1 (Credenciais Inválidas):** Senha incorreta ou e-mail inexistente. Retorna HTTP 401 (Unauthorized: "Credenciais inválidas").
  - **FE-01.2 (Conta Inativa ou Não Verificada):** `status !== 'ativo'` ou `email_verificado === false`. Retorna HTTP 403 (Forbidden: "Conta inativa ou e-mail pendente de confirmação").
  - **FE-01.3 (Refresh Token Revogado ou Expirado):** Retorna HTTP 401 (Unauthorized: "Sessão expirada. Faça login novamente").
- **Pós-condições:** Sessão iniciada; tokens armazenados de forma segura (SharedPreferences no Flutter).

---

### UC-04: Iniciar Viagem Rodoviária e Gerar Snapshots
- **Atores:** Motorista Rodoviário.
- **Pré-condições:** Motorista autenticado, sem outra viagem em andamento, veículo cadastrado e liberado.
- **Fluxo Principal:**
  1. O motorista seleciona a opção "Iniciar Viagem" no app e informa: Cidade/UF de Origem, Cidade/UF de Destino e Odômetro Inicial (`km_inicial`).
  2. O app persiste a viagem no IsarDB local com `status: 'em_andamento'` e dispara sincronização (`POST /viagens`).
  3. O `ViagemService` checa se o motorista já possui viagem com `status: 'em_andamento'`.
  4. O serviço checa se o veículo vinculado já está alocado em outra viagem `em_andamento`.
  5. O serviço busca o último odômetro registrado para o veículo (`ultimaKmDoVeiculo`) e valida se `km_inicial >= ultimaKmDoVeiculo`.
  6. O serviço captura os dados atuais do condutor e do veículo/reboque e gera:
     - `usuario_snapshot: { nome, email }`
     - `veiculo_snapshot: { placa, modelo, reboque: { modelo, placas } }`
  7. A viagem é inserida no MongoDB com UUID v4 e `status: 'em_andamento'`.
  8. A API retorna HTTP 201 com o payload da viagem criada.
- **Fluxos de Exceção:**
  - **FE-04.1 (Conflito de Viagem Ativa do Motorista):** Motorista já tem viagem aberta. Retorna HTTP 409 (Conflict: "Você já possui uma viagem em andamento").
  - **FE-04.2 (Conflito de Veículo Ocupado):** Veículo em trânsito por outro condutor. Retorna HTTP 409 (Conflict: "Este veículo já está em trânsito em outra viagem ativa").
  - **FE-04.3 (Odômetro Inicial Retrocedido):** `km_inicial < ultimaKmDoVeiculo`. Retorna HTTP 400 (Bad Request: "O KM inicial não pode ser menor que o último KM registrado").
- **Pós-condições:** Viagem aberta; histórico do veículo auditável; snapshots imutáveis fixados.

---

### UC-05: Lançar Despesa com Polimorfismo e Discriminators
- **Atores:** Motorista Rodoviário.
- **Pré-condições:** Viagem vinculada existente e em andamento (`status === 'em_andamento'`).
- **Fluxo Principal:**
  1. O motorista clica em "Nova Despesa", escolhe o tipo: `ABASTECIMENTO`, `ALIMENTACAO`, `MANUTENCAO`, `PEDAGIO` ou `OUTROS`.
  2. Informa dados comuns: Valor Total, Data, Local e Descrição.
  3. Conforme o tipo selecionado, preenche os campos especializados:
     - `ABASTECIMENTO`: Quantidade de Litros, Valor por Litro, Tipo de Combustível (`DIESEL_S10`, `DIESEL_S500`, etc.) e Odômetro Atual (`km_atual`).
     - `ALIMENTACAO`: Tipo de Refeição (ex: Almoço, Jantar).
     - `MANUTENCAO`: Nome da Oficina / Estabelecimento.
     - `PEDAGIO`: Nome da Praça de Pedágio / Concessionária.
  4. O app salva o registro localmente no IsarDB e envia `POST /despesas`.
  5. O `DespesaService` valida:
     - Permissão do usuário sobre a viagem (pertencimento ou gestor da empresa).
     - Status da viagem (obrigatoriamente `em_andamento`).
     - Data da despesa (não pode ser anterior ao início da viagem).
     - Se `ABASTECIMENTO`, valida se `km_atual >= viagem.km_inicial`.
  6. O Mongoose instancia o discriminator correto através da chave `tipo`.
  7. A despesa é persistida na coleção `despesas` do MongoDB.
  8. A API retorna HTTP 201 Created.
- **Fluxos de Exceção:**
  - **FE-05.1 (Viagem Encerrada ou Cancelada):** Retorna HTTP 400 (Bad Request: "Não é possível lançar despesas. A viagem está encerrada").
  - **FE-05.2 (Data Incoerente):** `data < viagem.data_inicio`. Retorna HTTP 400 (Bad Request: "A data da despesa não pode ser anterior ao início da viagem").
  - **FE-05.3 (KM Incompatível):** `km_atual < viagem.km_inicial`. Retorna HTTP 400 (Bad Request: "O KM de abastecimento não pode ser menor que o KM inicial da viagem").
- **Pós-condições:** Despesa polimórfica salva e vinculada à viagem.

---

### UC-06: Anexar Comprovante Fiscal e Otimizar Mídia
- **Atores:** Motorista Rodoviário.
- **Pré-condições:** Despesa previamente registrada (local ou remota).
- **Fluxo Principal:**
  1. O motorista tira foto da nota/cupom pelo aplicativo móvel.
  2. O arquivo binário é temporariamente salvo no dispositivo (`/comprovantes/comprovante_{uuid}.jpg`).
  3. O app envia requisição `POST /despesas/:id/foto` com `multipart/form-data`.
  4. O `UploadService` intercepta o upload e executa dupla validação:
     - Extensão do arquivo permitida (`.jpg`, `.jpeg`, `.png`, `.svg`).
     - MIME Type real do arquivo (`image/jpeg`, `image/png`, `image/svg+xml`).
     - Tamanho máximo bruto (<= 50MB).
  5. Se for imagem rasterizada:
     - Processa via biblioteca `sharp`: converte para `mozjpeg` com qualidade 80% e redimensiona até o limite de 1920x1920 mantendo proporção.
  6. Se for SVG:
     - Sanitiza o conteúdo XML com `DOMPurify` e `JSDOM` removendo scripts maliciosos (anti-XSS).
  7. O buffer otimizado é enviado via SDK S3 para o Object Storage Garage S3.
  8. A URL pública segura gerada é persistida no campo `foto_anexo` da despesa no MongoDB.
  9. A API retorna HTTP 200 OK com a URL da foto.
- **Fluxo Alternativo 6A (Exclusão com Retentativa em Background):**
  1. Usuário solicita remoção da foto (`DELETE /despesas/:id/foto`).
  2. O serviço zera o campo `foto_anexo` no banco imediatamente.
  3. Dispara a deleção física no S3 Garage em background via `deleteImagemComRetry` com backoff exponencial.
- **Pós-condições:** Comprovante compactado, seguro e persistido na nuvem.

---

### UC-07: Sincronizar Dados em Modo Offline-First (Push/Pull)
- **Atores:** Motorista (Sistema Mobile Automatizado).
- **Pré-condições:** Aplicativo aberto e alteração no estado de conectividade (ou trigger periódico/manual).
- **Fluxo Principal:**
  1. O `ConnectivityListener` do Flutter detecta restauração da conexão (Wi-Fi ou Dados Móveis) e aguarda 1 segundo para estabilização de rede.
  2. **Fase Push:**
     - O app coleta todas as viagens e despesas do IsarDB com `syncStatus != 'sincronizado'`.
     - Se houver registros deletados, adiciona a flag `is_deleted: true`.
     - Envia `POST /sync/push` com as coleções.
     - A API autentica o motorista e identifica seu veículo vinculado.
     - Processa viagens: executa `Viagem.bulkWrite` com `updateOne` (com upsert) ou `deleteOne` (se `is_deleted`).
     - Processa despesas: valida pertencimento a viagens do motorista e executa `Despesa.collection.bulkWrite` nativo não ordenado (`ordered: false`).
     - A API responde HTTP 200 com resumo das operações.
     - O app remove fisicamente do IsarDB os itens com `is_deleted` e altera os demais para `sincronizado`.
  3. **Fase Upload de Mídia:**
     - O app itera sobre despesas com comprovantes pendentes de upload.
     - Utiliza `resolverOuRecuperarFotoLocal` para garantir o arquivo físico correto.
     - Envia cada imagem via `POST /despesas/:id/foto` de forma desacoplada.
  4. **Fase Pull (Delta Sync):**
     - O app obtém o timestamp da última sincronização (`last_sync_timestamp`).
     - Envia `GET /sync/pull?updatedAfter={timestamp}`.
     - A API consulta viagens e despesas com `updatedAt > timestamp` e os dados do veículo atual do motorista.
     - O app recebe o lote e atualiza atomicamente o IsarDB com os registros mais novos.
     - Atualiza o `last_sync_timestamp` no SharedPreferences.
- **Fluxos de Exceção:**
  - **FE-07.1 (Falha Intermitente de Rede):** O motorista entra em zona de sombra durante o sync. O sistema efetua até 3 tentativas com backoff. Em caso de insucesso, mantém todos os dados intactos no IsarDB sem perda.
- **Pós-condições:** Banco local e nuvem com dados idênticos e consolidados.

---

### UC-08: Encerrar Viagem e Calcular Resumo Financeiro Dinâmico
- **Atores:** Motorista Rodoviário.
- **Pré-condições:** Viagem em andamento pertencente ao motorista.
- **Fluxo Principal:**
  1. O motorista seleciona a opção "Encerrar Viagem" no app.
  2. Informa o Odômetro Final (`km_final`).
  3. O app envia requisição `PUT /viagens/:id/encerrar` (ou agenda no Isar).
  4. O `ViagemService` valida se o odômetro final é maior que o inicial (`km_final > viagem.km_inicial`).
  5. O serviço dispara a função privada `_calcularResumoFinanceiro(viagemId)` via MongoDB Aggregation Pipeline:
     - `$match`: Filtra todas as despesas da viagem.
     - `$group`: Agrupa por `$tipo` somando valores e quantidades de litros.
     - Calcula: `km_total_rodado = km_final - km_inicial`.
     - Calcula: `consumo_medio_kml = km_total_rodado / total_litros_combustivel`.
     - Calcula: `custo_medio_km = total_geral_despesas / km_total_rodado`.
     - Calcula: `saldo_acerto = adiantamento_recebido - total_geral_despesas`.
  6. O documento da viagem é atualizado no MongoDB com `status: 'encerrada'`, `data_fim: new Date()`, `km_final` e o resumo financeiro estruturado.
  7. A API retorna HTTP 200 com os dados consolidados.
- **Fluxos de Exceção:**
  - **FE-08.1 (KM Final Inválido):** `km_final <= km_inicial`. Retorna HTTP 400 (Bad Request: "O KM final deve ser estritamente maior que o KM inicial").
- **Pós-condições:** Viagem finalizada; resumo financeiro imutável pronto para auditoria.

---

### UC-09: Gerenciar Transportadoras e Multi-Tenancy
- **Atores:** Super Administrador.
- **Pré-condições:** Usuário logado com permissão `role === 'superAdmin'`.
- **Fluxo Principal (Cadastro de Tenant):**
  1. O SuperAdmin preenche dados da empresa: Razão Social, Nome Fantasia, CNPJ, Inscrição Estadual, Email Institucional, Telefone, Endereço e indica o Gestor Responsável (`gestor_id`).
  2. O endpoint `POST /empresas` é acionado.
  3. O `EmpresaService` valida o CNPJ (numérico ou alfanumérico conforme IN RFB 2.229/2024).
  4. Valida a unicidade do e-mail institucional e do CNPJ.
  5. Persiste a empresa no MongoDB com `status: 'ativo'`.
  6. Localiza o usuário indicado em `gestor_id` e atualiza seus campos: `role: 'gestor'`, `empresa_id: empresa._id` e cargo.
  7. Retorna HTTP 201 Created.
- **Fluxo Alternativo 9A (Exclusão Segura com Trava Referencial):**
  1. SuperAdmin solicita `DELETE /empresas/:id`.
  2. O serviço consulta se existem motoristas vinculados (`contarMotoristas`).
  3. Se houver condutores, retorna HTTP 409 Conflict impedindo a exclusão.
  4. O serviço consulta se existem veículos vinculados (`contarVeiculos`).
  5. Se houver veículos, retorna HTTP 409 Conflict impedindo a exclusão.
  6. Se contadores forem zero, a empresa é excluída e retorna HTTP 200.
- **Pós-condições:** Nova transportadora criada e isolada ou removida em conformidade com as regras de integridade.

---

### UC-10: Gerenciar Frota, Veículos e Alocação de Condutores
- **Atores:** Gestor de Frota da Transportadora.
- **Pré-condições:** Gestor autenticado e vinculado à sua empresa (`empresa_id`).
- **Fluxo Principal:**
  1. O gestor acessa o módulo de frota e cadastra um novo veículo informando: Placa (Mercosul ou padrão clássico), Modelo, Marca, Ano, Tipo (`TRUCK`, `TOCO`, `CAVALO_MECANICO`, etc.), Capacidade do Tanque e Reboques associados (modelo e placas dos semi-reboques).
  2. O sistema valida se a placa já não está em uso no sistema e associa `empresa_id = gestor.empresa_id`.
  3. O gestor seleciona um motorista cadastrado da sua empresa e vincula o veículo (`usuario.veiculo_id = veiculo._id`).
  4. O sistema atualiza o registro do motorista.
  5. A partir deste momento, ao abrir viagens ou sincronizar offline, o motorista utilizará este veículo como padrão no auto-snapshot.
- **Pós-condições:** Veículo ativo e condutor devidamente alocado.

---

### UC-11: Visualizar Resumo Financeiro e Auditoria de Despesas
- **Atores:** Gestor de Frota, Administrador.
- **Pré-condições:** Usuário autenticado com role `gestor` ou `admin`.
- **Fluxo Principal:**
  1. O usuário consulta as métricas consolidadas da frota ou de viagens específicas.
  2. O cliente solicita `GET /viagens` ou `GET /despesas` com filtros de período (mês/ano) e parâmetros de paginação.
  3. O backend aplica o filtro mandatório de isolamento multi-tenant: `{ empresa_id: usuarioLogado.empresa_id }`.
  4. O MongoDB executa pipelines de agregação para agrupar:
     - Total gasto por tipo de despesa (gráfico pizza/rosca).
     - Consumo médio de combustível por veículo (km/l).
     - Custo médio por quilômetro rodado por rota (R$/km).
     - Relação de viagens encerradas vs. em andamento.
  5. Os dados são renderizados em gráficos e tabelas com opção de detalhamento até o nível de comprovante digital (foto).
- **Pós-condições:** Informações gerenciais exibidas com segurança e auditoria garantida.

---

### UC-12: Excluir Fotos Locais Antigas de Comprovantes (Storage Cleaner)
- **Atores:** Sistema Mobile Background (`StorageCleanerService`).
- **Pré-condições:** Sincronização de dados e comprovantes concluída com êxito.
- **Fluxo Principal:**
  1. O serviço `StorageCleanerService` é acionado logo após a conclusão do ciclo `syncAll()`.
  2. Escaneia o diretório de arquivos locais de comprovantes no dispositivo (`/comprovantes/`).
  3. Cruza cada arquivo com os registros da coleção `despesas` no IsarDB.
  4. Se a despesa correspondente tiver `syncStatus == 'sincronizado'`, possuir URL remota válida no Garage S3 (`foto_anexo.isNotEmpty`) e a data da foto for superior a 15 dias:
     - O arquivo físico local é deletado do disco do smartphone.
  5. Registra log informativo da quantidade de bytes liberados no armazenamento do aparelho.
- **Pós-condições:** Armazenamento interno do smartphone otimizado sem perda de comprovantes na nuvem.
