// src/docs/config/head.js

// Função para obter os servidores na ordem correta (dev/prod)
const getServersInCorrectOrder = () => {
    const prodUrl = {
        url: process.env.SWAGGER_PROD_URL || `http://localhost:5040/prod`
    };
    const devUrl = {
        url: process.env.SWAGGER_DEV_URL || "http://localhost:5040"
    };

    if (process.env.NODE_ENV === "development") return [devUrl, prodUrl];
    else return [prodUrl, devUrl];
};

const getSwaggerOptions = async () => {
    const t = process.env.NODE_ENV === 'development' ? `?t=${Date.now()}` : '';

    // Paths
    const authPaths = (await import(new URL("../paths/auth.js",
        import.meta.url).href + t)).default;
    const usuarioPaths = (await import(new URL("../paths/usuario.js",
        import.meta.url).href + t)).default;
    const veiculoPaths = (await import(new URL("../paths/veiculo.js",
        import.meta.url).href + t)).default;
    const viagemPaths = (await import(new URL("../paths/viagem.js",
        import.meta.url).href + t)).default;
    const despesaPaths = (await import(new URL("../paths/despesa.js",
        import.meta.url).href + t)).default;

    // Schemas
    const authSchemas = (await import(new URL("../schemas/authSchema.js",
        import.meta.url).href + t)).default;
    const usuarioSchemas = (await import(new URL("../schemas/usuarioSchema.js",
        import.meta.url).href + t)).default;
    const veiculoSchemas = (await import(new URL("../schemas/veiculoSchema.js",
        import.meta.url).href + t)).default;
    const viagemSchemas = (await import(new URL("../schemas/viagemSchema.js",
        import.meta.url).href + t)).default;
    const despesaSchemas = (await import(new URL("../schemas/despesaSchema.js",
        import.meta.url).href + t)).default;

    return {
        swaggerDefinition: {
            openapi: "3.0.0",
            info: {
                title: "RotaRDV API",
                version: "1.0.0",
                description: `
### 📋 Visão Geral
Documentação oficial da RotaRDV API - O sistema central de gerenciamento de despesas de viagens para transportadoras rodoviárias.
Esta API é responsável por orquestrar a infraestrutura do aplicativo móvel e um painel de administração web (Implementação Futura), permitindo aos motoristas registrarem suas viagens, despesas associadas (abastecimento, alimentação, manutenção, pedágio) e uso de veículos, provendo dados consistentes para controle de frotas.

---

### 🚀 Principais Features
*   **Autenticação JWT Segura:** Sistema robusto com tokens de recuperação e \`refresh_tokens\`.
*   **Gestão de Frota e Motoristas:** Controle de vínculos entre motoristas, veículos, viagens e transportadoras.
*   **Registro Histórico de Viagens:** Snapshot de veículos durante as viagens, garantindo integridade de relatório mesmo que frotas sejam atualizadas.
*   **Controle de Despesas Categorizadas:** Vínculo de gastos (1:1) com tipagem dinâmica e armazenamento de notas fiscais associadas às viagens.
*   **Integração Cloud-Native (S3):** Gerenciamento inteligente de notas e fotos de perfil (upload multipart/form-data) persistidas no Garage/MinIO.

---

### 🔐 Segurança
Todo fluxo seguro exige injeção do JWT no cabeçalho através do botão **Authorize** ao topo.

*Utilize as credenciais de admin para acessar algumas das rotas fechadas.*
                `,
                contact: {
                    name: "Suporte RotaRDV - Sistema de Registro e Despesas de Viagens",
                    email: "contatorotardv2026@gmail.com",
                },
            },
            servers: getServersInCorrectOrder(),
            tags: [
                {
                    name: "Auth",
                    description: "Rotas para autenticação e autorização"
                },
                {
                    name: "Usuários",
                    description: "Rotas para o gerenciamento de usuários"
                },
                {
                    name: "Veículos",
                    description: "Rotas para o gerenciamento da frota (Veículos e Reboques)"
                },
                {
                    name: "Viagens",
                    description: "Rotas para o registro e controle de viagens"
                },
                {
                    name: "Despesas",
                    description: "Rotas para o controle de despesas e abastecimentos"
                }
            ],
            paths: {
                ...authPaths,
                ...usuarioPaths,
                ...veiculoPaths,
                ...viagemPaths,
                ...despesaPaths,
            },
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: "http",
                        scheme: "bearer",
                        bearerFormat: "JWT"
                    }
                },
                schemas: {
                    ...authSchemas,
                    ...usuarioSchemas,
                    ...veiculoSchemas,
                    ...viagemSchemas,
                    ...despesaSchemas,
                }
            },
            security: [{
                bearerAuth: []
            }]
        },
        apis: ["./src/routes/*.js"]
    };
};

export default getSwaggerOptions;
