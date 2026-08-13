import { HermesClient, MemoryAdapter } from "@ruanlopes1350/hermes-client";

const hermes = new HermesClient({
  baseUrl: 'https://api.hermes.qa.fslab.dev',
  // Procura a variável HERMES_API_KEY no arquivo .env da raiz do projeto
  storageAdapter: new EnvAdapter('.env', 'HERMES_API_KEY'),
});
