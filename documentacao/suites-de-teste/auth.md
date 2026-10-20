# Plano de Teste: Autenticação e Sessão (Auth)

Esta documentação detalha os testes de integração de endpoints e testes unitários de serviços implementados para o módulo de **Autenticação, Gestão de Tokens JWT e Segurança de Acesso**.

Arquivos correspondentes:
- **Rotas:** [`src/test/routes/authRoutes.test.js`](../../src/test/routes/authRoutes.test.js)
- **Serviço:** [`src/test/services/AuthService.test.js`](../../src/test/services/AuthService.test.js)

---

### POST /login

| Cenário / Funcionalidade | Comportamento Esperado | Verificações (Execução) | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Login com Credenciais Válidas** | Realiza login, gera Access Token (30m) e emite Refresh Token (30d). | Requisição `POST /login` enviando payload com `{ email, senha }` corretos de usuário ativo. | Retorna HTTP `200` com objeto `data.tokens` contendo `accessToken` e `refreshToken`, além dos dados do usuário logado. |
| **Persistência de Refresh Token** | Armazena o Refresh Token emitido na base de dados (`refreshtoken`) para rastreamento de sessão. | Chamada a `service.login()` e verificação no banco via `Usuario.findById()`. | Usuário no MongoDB possui campo `refreshtoken` populado com o hash/token válido. |
| **Bloqueio de Contas Inativas** | Impede acesso de usuários marcados como inativos pela administração. | Requisição `POST /login` ou chamada a `service.login()` com `status: 'inativo'`. | Retorna HTTP `403` / Lança `CustomError` (403, `forbidden`) informando que a conta está desativada. |
| **Bloqueio de E-mail Não Verificado** | Impede login local de contas cujo e-mail ainda não passou pela verificação transacional. | Requisição `POST /login` ou chamada a `service.login()` com `email_verificado: false`. | Retorna HTTP `403` / Lança `CustomError` (403, `forbidden`) informando pendência de confirmação de e-mail. |
| **Credenciais Inválidas (Senha)** | Rejeita autenticação com senha incorreta sem expor detalhes estruturais. | Requisição `POST /login` enviando senha divergente do hash gravado no banco. | Retorna HTTP `401` / Lança `CustomError` (401, `unauthorized`) informando credenciais inválidas. |
| **Usuário Inexistente** | Rejeita autenticação de e-mail não cadastrado no banco. | Requisição `POST /login` com e-mail inexistente. | Retorna HTTP `401` / Lança `CustomError` (401, `unauthorized`) com mensagem genérica de credenciais. |
| **Contas Google-Only** | Bloqueia tentativa de autenticação via senha em contas criadas exclusivamente pelo Google. | Requisição `POST /login` em conta com `authProvider: 'google'` e senha nula. | Retorna HTTP `401` / Lança `CustomError` (401, `googleOnly` / `unauthorized`) instruindo login via provedor Google. |

---

### POST /refresh

| Cenário / Funcionalidade | Comportamento Esperado | Verificações (Execução) | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Renovação com Refresh Token Válido** | Emite novo Access Token sem exigir novas credenciais do usuário. | Requisição `POST /refresh` enviando `{ refresh_token }` legítimo e salvo no banco. | Retorna HTTP `200` com novo `accessToken` e o mesmo `refreshToken`. |
| **Rejeição de Token Adulterado** | Rejeita tokens com assinatura JWT violada ou forjada. | Requisição `POST /refresh` ou chamada a `service.refresh()` com token inválido. | Retorna HTTP `401` / Lança `CustomError` (401, `invalidToken` / `unauthorized`). |
| **Ausência de Refresh Token** | Rejeita requisição quando o campo `refresh_token` não for fornecido no payload. | Requisição `POST /refresh` com corpo vazio `{}`. | Retorna HTTP `400` com erro de validação. |

---

### POST /logout

| Cenário / Funcionalidade | Comportamento Esperado | Verificações (Execução) | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Encerramento de Sessão e Revogação** | Revoga o Refresh Token no banco de dados e encerra a sessão ativa. | Requisição `POST /logout` enviando `{ access_token }` e chamada a `service.logout()`. | Retorna HTTP `200`. O campo `refreshtoken` do usuário no banco é setado para `null`. |
| **Ausência de Token no Logout** | Rejeita tentativa de logout quando nenhum access token for enviado na requisição. | Requisição `POST /logout` com corpo vazio `{}`. | Retorna HTTP `400` com erro de token obrigatório. |

---

### POST /recover (Recuperação de Senha)

| Cenário / Funcionalidade | Comportamento Esperado | Verificações (Execução) | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Prevenção contra Enumeração de Contas** | Responde com mensagem de sucesso neutra independentemente do e-mail existir na base, impedindo enumeração de usuários por atacantes. | Requisição `POST /recover` com e-mail qualquer não cadastrado. | Retorna HTTP `200` com mensagem padrão sobre instruções de recuperação enviadas por e-mail. |

---

### POST /signup (Onboarding Corporativo)

| Cenário / Funcionalidade | Comportamento Esperado | Verificações (Execução) | Critérios de Aceite |
| :--- | :--- | :--- | :--- |
| **Criação Atômica de Empresa e Admin Master** | Realiza o cadastro corporativo criando a entidade Empresa e o usuário Administrador Master com vínculo mútuo. | Requisição `POST /signup` enviando dados da transportadora e do administrador responsável. | Retorna HTTP `201` com `empresa` e `usuario` (role `admin`, `isAdmin: true`, `email_verificado: true`). `empresa.admin_id` aponta para o usuário e `usuario.empresa_id` aponta para a empresa. |
| **Bloqueio por CNPJ Duplicado** | Impede o onboarding se o CNPJ já estiver cadastrado no sistema. | Tentativa de `POST /signup` com CNPJ já existente na base. | Retorna HTTP `400` com mensagem informando duplicidade de CNPJ. |
