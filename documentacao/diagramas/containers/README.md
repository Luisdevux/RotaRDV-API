# Diagrama de Containers (C4 Model - Nível 2)

O **Diagrama de Containers** do modelo **C4 (C4 Model for Software Architecture)** descreve a arquitetura de software em alto nível, mapeando os diferentes "containers" executáveis que compõem o sistema, suas responsabilidades, tecnologias utilizadas e protocolos de comunicação.

> [!NOTE]
> No modelo C4, o termo **"Container"** não se limita a um container Docker; ele representa qualquer unidade executável ou repositório de dados independente (aplicação móvel, aplicação web, serviço de backend, banco de dados, storage de arquivos). No ecossistema RotaRDV, todos os serviços de backend rodam também como containers Docker conteinerizados.

---

## Containers do Sistema RotaRDV

1. **Aplicativo Móvel (`mobile_app`):**
   - **Tecnologia:** Flutter / Dart / Dio / IsarDB.
   - **Responsabilidade:** Fornecer interface rica e **100% Offline-First** estruturada sob arquitetura MVVM (Provider), com cliente HTTP resiliente (`DioClient` com `QueuedInterceptor`), para os motoristas registrarem viagens, odômetros, abastecimentos, refeições e fotografarem cupons fiscais em rodovias sem sinal.
   - **Protocolo:** HTTPS / JSON REST (Porta 443 via Cloudflare Edge).

2. **Cloudflare Tunnel (`cf_tunnel`):**
   - **Tecnologia:** Daemon `cloudflared` em Pod K3s (`kube-system`).
   - **Responsabilidade:** Conectar o cluster K3s na Oracle Cloud de forma segura à borda global da Cloudflare via túnel outbound criptografado, dispensando portas abertas no firewall público da OCI.

3. **Traefik Ingress Controller (`traefik`):**
   - **Tecnologia:** Traefik v2 em Pod K3s (`kube-system`).
   - **Responsabilidade:** Roteador interno do cluster, distribuindo o tráfego HTTP para os Services internos dos pods.

4. **API Gateway & Backend (`backend_api`):**
   - **Tecnologia:** Node.js 22 / Express 5.2 (Pod K3s no namespace `rotardv-prod`).
   - **Responsabilidade:** Regras de negócio, autorização RBAC hierárquica, isolamento multi-tenant (`empresa_id`), otimização de imagens com Sharp mozjpeg 80%, sanitização SVG anti-XSS via DOMPurify e orquestração do motor de sincronização em lote (`bulkWrite`).
   - **Porta:** 5040 (ClusterIP interno).

5. **Banco de Dados de Aplicação (`mongodb`):**
   - **Tecnologia:** MongoDB 7.0 (StatefulSet K3s no namespace `rotardv-prod` com volume persistente local-path de 20GB SSD).
   - **Responsabilidade:** Armazenamento transacional e flexível de usuários, transportadoras, veículos, viagens com snapshots imutáveis e despesas polimórficas (Mongoose Discriminators).
   - **Protocolo:** MongoDB Wire Protocol (Porta 27017).

6. **Object Storage Nuvem (`garage_s3`):**
   - **Tecnologia:** Garage Cloud S3 (`s3.fslab.dev:443`).
   - **Responsabilidade:** Armazenamento seguro de fotos de notas fiscais e comprovantes digitais.
   - **Protocolo:** S3 API / SigV4 com TLS.

---

## Sistemas Externos Integrados

- **Google Identity Platform:** Provedor federado de identidade para login social com contas Google via `google-auth-library` (OAuth 2.0).
- **Servidor SMTP Hermes:** Disparo institucional de e-mails de ativação de conta (24h) e recuperação de senha (1h).
