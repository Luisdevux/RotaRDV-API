# Diagrama de Containers (C4 Model - Nível 2)

O **Diagrama de Containers** do modelo **C4 (C4 Model for Software Architecture)** descreve a arquitetura de software em alto nível, mapeando os diferentes "containers" executáveis que compõem o sistema, suas responsabilidades, tecnologias utilizadas e protocolos de comunicação.

> [!NOTE]
> No modelo C4, o termo **"Container"** não se limita a um container Docker; ele representa qualquer unidade executável ou repositório de dados independente (aplicação móvel, aplicação web, serviço de backend, banco de dados, storage de arquivos). No ecossistema RotaRDV, todos os serviços de backend rodam também como containers Docker conteinerizados.

---

## Containers do Sistema RotaRDV

1. **Aplicativo Móvel (`mobile_app`):**
   - **Tecnologia:** Flutter / Dart / IsarDB.
   - **Responsabilidade:** Fornecer interface rica e **100% Offline-First** para os motoristas registrarem viagens, odômetros, abastecimentos, refeições e fotografarem cupons fiscais em rodovias sem sinal.
   - **Protocolo:** HTTPS / JSON REST (Porta 443).

2. **Painel Web Administrativo (`web_app`):**
   - **Tecnologia:** Web Single Page Application (React / HTML5 / JS).
   - **Responsabilidade:** Interface de controle da frota, acompanhamento de viagens em andamento, auditoria e aprovação de prestações de contas e relatórios analíticos.
   - **Protocolo:** HTTPS / JSON REST (Porta 443).

3. **Proxy Reverso & Gateway (`nginx_proxy`):**
   - **Tecnologia:** Nginx / SSL Let's Encrypt / Docker.
   - **Responsabilidade:** Ponto único de entrada, terminação TLS 1.3 na porta 443, proxy reverso para o backend na porta 3000, rate limiting e cabeçalhos de segurança.

4. **API Gateway & Backend (`backend_api`):**
   - **Tecnologia:** Node.js 20 / Express 5.2 / Docker Container.
   - **Responsabilidade:** Regras de negócio, autorização RBAC hierárquica, isolamento multi-tenant (`empresa_id`), otimização de imagens com Sharp mozjpeg 80%, sanitização SVG anti-XSS via DOMPurify e orquestração do motor de sincronização em lote (`bulkWrite`).

5. **Banco de Dados de Aplicação (`mongodb`):**
   - **Tecnologia:** MongoDB 7.0 / Docker Container com volume persistente.
   - **Responsabilidade:** Armazenamento transacional e flexível de usuários, transportadoras, veículos, viagens com snapshots imutáveis e despesas polimórficas (Mongoose Discriminators).
   - **Protocolo:** MongoDB Wire Protocol (Porta 27017).

6. **Object Storage Nuvem (`garage_s3`):**
   - **Tecnologia:** Garage S3 Daemon / Docker Container.
   - **Responsabilidade:** Armazenamento seguro de fotos de notas fiscais e comprovantes digitais.
   - **Protocolo:** S3 API / SigV4 (Porta 3900).

---

## Sistemas Externos Integrados

- **Google / Firebase Authentication:** Provedor federado de identidade para login social com contas Google.
- **Servidor SMTP Hermes:** Disparo institucional de e-mails de ativação de conta (24h) e recuperação de senha (1h).
