# RotaRDV (TCC-Despesas) - Documento de Handover e Contexto

Este documento contém o estado atual, decisões de arquitetura e histórico de tudo o que foi desenvolvido até o momento. Ele serve para continuar o desenvolvimento em qualquer outra máquina, mantendo o mesmo padrão de excelência e design.

## 1. Visão Geral do Projeto
O sistema tem como objetivo o controle de despesas (foco no RotaRDV), contando com um aplicativo Mobile (para o Motorista) e um futuro painel Web (para a Administração/Gestão).

- **Mobile:** Flutter (MVVM com `provider`).
- **Backend:** Node.js (Express, MongoDB/Mongoose, Autenticação JWT).
- **Design:** Fiel ao Figma (Cores definidas, design "Edge-to-Edge" moderno, inputs padronizados).

---

## 2. O que já foi implementado (Milestone V1 - Testes)

### 2.1 Backend (API Node.js)
- **Segurança Reforçada (`fipe50`):** Implementamos regras rigorosas de senhas. Toda nova senha agora deve ter no mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial (Regex: `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/`).
- **Autenticação Híbrida/Descomplicada:**
  - Padronizamos o fluxo de Login para ser **estritamente via E-mail e Senha**, tanto para a API (no `LoginSchema.js`) quanto para o App Mobile. Isso reduz complexidades (corner cases) de validação e facilita a recuperação de senha.
  - O fluxo verifica se o usuário é Ativo, e se confirmou o E-mail.
- **Login com Google:** O endpoint recebe o `idToken` do Front, verifica a assinatura junto ao Google e devolve o JWT da nossa API.
- **Refresh Tokens:** Fluxo de Refresh Token montado com persistência correta no MongoDB, garantindo que o token de acesso (AccessToken) permaneça "stateless" por segurança.

### 2.2 Frontend (App Mobile Flutter)
- **Arquitetura (MVVM):** 
  - Subtituímos padrões antigos e adotamos o `provider` para gerenciar estado.
  - Implementado o `AuthViewModel` (gerencia `isLoadingLocal`, `isLoadingGoogle`, e o estado do `currentUser`) e o `AuthService` (comunicação direta com a API via `http`).
- **UI / UX (Tela de Login Fiel ao Figma):**
  - **Edge-to-Edge:** Fundo estendido atrás da Status Bar e da Navigation Bar. Usamos `AnnotatedRegion<SystemUiOverlayStyle>` para colorir dinamicamente a Status Bar conforme o tema.
  - **Correção de Overflow de Teclado:** Construímos a tela usando `CustomScrollView` com `SliverFillRemaining(hasScrollBody: false)`. Isso garante que o rodapé da empresa fique colado embaixo em telas grandes e evite o "Bottom Overflowed" quando o teclado do celular sobe!
  - **Identidade Visual:** Todas as cores foram parametrizadas no `AppColors` e consumidas via `Theme.of(context)`. Nenhum branco ou cinza foi inserido em código duro ("chumbado").
  - **Botão Customizado:** Botão de "Entrar no App" remodelado com ícone da seta à direita para indicar "Avanço" usando um `Row` robusto. Feedback visual com `CircularProgressIndicator` nativo ao invés da seta durante o loading.
- **Tela Home (V1):**
  - Limpa, possuindo apenas o `AppColors.background`.
  - Implementado o botão **"Sair"** que se integra com o `AuthViewModel.logout()`, limpando a sessão (e cache do Google) e redirecionando corretamente de volta ao `/login`.

---

## 3. Comandos Importantes e "Pegadinhas" 

### 3.1 Hot Reload vs Hot Restart no Flutter
Ao mudar **assinaturas de métodos** (ex: mudar os parâmetros de `login(cpf, senha)` para `login(email, senha)`), o **Hot Reload** padrão (`r`) pode falhar com o erro na Dart VM: `Unhandled Exception: Lookup failed: login in @methods...`.
- **Solução:** O Flutter precisa de um **Hot Restart** (reiniciar a aplicação do zero usando `Shift + R` no terminal, ou o botão de atualizar circular no VSCode).

### 3.2 Executando o Projeto
- **Backend:** Rodar na pasta `tcc-despesas-api` o comando apropriado (ex: `npm run dev`).
- **Mobile:** Rodar na pasta `tcc-despesas-mobile` o comando `flutter run` ou usar o VSCode.

### 3.3 Variáveis de Ambiente (.env)
Se você for clonar/puxar este código em uma máquina nova, não se esqueça de configurar:
- **Mobile (`tcc-despesas-mobile/.env`):** Precisa ter `API_BASE_URL` (sedinando para o IP local da API) e `GOOGLE_CLIENT_ID`.
- **Backend (`tcc-despesas-api/.env`):** Necessita de conexão com o Mongo (`MONGO_URI`), Chaves JWT, etc.

---

## 4. Próximos Passos (Roadmap da V2)

1. **Desenvolvimento do Painel Web (React/Next ou Vue):**
   - Criar um painel administrativo.
   - O login será idêntico (email e senha), batendo na mesma API que já está pronta!
2. **Dashboard do Mobile (Home Page):**
   - Popular a `HomePage` com os gráficos do usuário logado (usando plugins de gráficos para Flutter como `fl_chart`).
   - Puxar o nome do motorista na barra superior através do `authVM.currentUser['nome']`.
3. **Módulo de Despesas:**
   - Criar endpoints na API Node.js para inserção/leitura de despesas (com upload de foto de recibos, se aplicável).
   - Tela no mobile para lançar um gasto de viagem (Alimentação, Combustível, Pedágio).
4. **Verificação dos Seeds do Backend:**
   - Como implementamos o Regex forte para senhas, os seeds antigos do banco podem falhar ao logar se tiverem senhas muito simples (como `123456`). Pode ser necessário rodar scripts para resetar as senhas das contas de teste ou adaptar os seeds de desenvolvimento com o hash gerado da nova política.

---

## 5. Convenções Adotadas

- NUNCA adicionar cores ou espaçamentos *hardcoded*. Use sempre o arquivo central `app_theme.dart`.
- Sempre gerencie carregamentos com variáveis lógicas (`isLoading... = true`) notificando a tela via `notifyListeners()`.
- Para mensagens de erro e sucesso, o padrão atual é o `ScaffoldMessenger` com `SnackBar`, utilizando as cores semânticas (`AppColors.error`, `AppColors.success`).
- Toda nova tela com inputs deve herdar a solução de teclado usando `CustomScrollView`.
