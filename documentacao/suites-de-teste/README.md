# 🧪 Suítes de Teste - RotaRDV API

Este diretório consolida a documentação técnica, especificação de cenários e matriz de rastreabilidade de todas as **Suítes de Testes Automatizados** da API **RotaRDV**, cobrindo tanto os testes de integração (rotas HTTP) quanto os testes unitários (serviços e regras de negócio).

A infraestrutura de testes é executada com **[Vitest](https://vitest.dev/)** em conjunto com **[MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)**, garantindo isolamento completo, integridade referencial real e execução ultrarrápida com dados em memória sem dependência de serviços externos.

---

## 📁 Catálogo das Suítes de Teste

| Suíte / Documento | Módulos e Arquivos Cobertos | Requisitos Relacionados | Total de Testes |
| :--- | :--- | :---: | :---: |
| [**Autenticação e Sessão (`auth.md`)**](./auth.md) | `src/test/routes/authRoutes.test.js`<br>`src/test/services/AuthService.test.js` | RF-01 a RF-06 | 21 testes |
| [**Controle de Viagens (`viagem.md`)**](./viagem.md) | `src/test/routes/viagemRoutes.test.js`<br>`src/test/services/ViagemService.test.js` | RF-22 a RF-26 | 14 testes |
| [**Gestão de Despesas (`despesa.md`)**](./despesa.md) | `src/test/routes/despesaRoutes.test.js`<br>`src/test/services/DespesaService.test.js` | RF-27 a RF-30 | 13 testes |
| [**Sincronização Offline-First (`sync.md`)**](./sync.md) | `src/test/routes/syncRoutes.test.js`<br>`src/test/services/SyncService.test.js` | RF-31, RF-32 | 13 testes |
| [**Gestão de Empresas (`empresa.md`)**](./empresa.md) | `src/test/routes/empresaRoutes.test.js`<br>`src/test/services/EmpresaService.test.js` | RF-09 a RF-18 | 10 testes |
| [**Usuários e Hierarquia (`usuario.md`)**](./usuario.md) | `src/test/services/UsuarioService.test.js` | RF-01, RF-08 | 10 testes |
| [**Gestão de Frotas (`veiculo.md`)**](./veiculo.md) | `src/test/services/VeiculoService.test.js` | RF-19 a RF-21 | 7 testes |
| [**Validadores e Invariantes (`validadores_dominio.md`)**](./validadores_dominio.md) | `src/test/utils/domainValidators.test.js`<br>`src/test/utils/validationHelper.test.js` | Invariantes de Domínio | 22 testes |
| **Total Consolidado** | **14 arquivos de teste** | **100% dos fluxos centrais** | **110 testes** |

---

## 🚀 Como Executar os Testes

Os scripts de execução estão configurados no `package.json`:

```bash
# Executa a suíte completa de testes (110 testes)
npm test

# Executa em modo interativo (watch)
npm run test:watch

# Executa apenas testes unitários das regras de negócio (Services)
npm run test:services

# Executa apenas testes de integração de endpoints (Routes)
npm run test:routes

# Executa apenas testes de validadores de domínio e helpers matemáticos
npm run test:utils

# Execução direcionada por domínio de negócio:
npm run test:auth
npm run test:viagens
npm run test:despesas
npm run test:sync
npm run test:empresas
```

---

## 🏛️ Padrões e Arquitetura de Teste Adotados

1. **Setup Global Único (`src/test/setup/`):**
   - O `MongoMemoryServer` é inicializado uma única vez através do `globalSetup` (`mongoMemoryServer.js`) e compartilha a string de conexão via `process.env.DB_URL`.
   - Limpeza granular das coleções (`deleteMany({})`) executada no `afterEach`, mantendo os testes 100% determinísticos e independentes sem risco de efeito colateral.

2. **Padrão Factory sem Mocks Artificiais (Modelo Terra Fértil):**
   - Criação de entidades através de funções geradoras locais nos próprios arquivos de teste (`criarUsuario()`, `criarVeiculo()`, `criarViagem()`, `criarDespesa()`, `criarEmpresa()`).
   - Permite sobrescrever pontualmente apenas os atributos necessários para o cenário avaliado (`{ ...extra }`).

3. **Validação Estrita de Exceções de Domínio:**
   - Erros lançados pelas regras de negócio são verificados diretamente contra a instância `CustomError`, validando `statusCode`, `errorType` e `field`, garantindo que os contratos de erro da API sejam respeitados.
