// server.js

import "dotenv/config";
import app from "./src/app.js";
const port = process.env.APP_PORT || process.env.API_PORT || 5020;

app.listen(port, (error) => {
    if (error) {
        console.error('Erro ao iniciar o servidor:', error);
        process.exit(1);
    }
    if (process.env.NODE_ENV === "production") {
        console.log(`Servidor escutando na porta: ${port} em produção`);
    } else {
        console.log(`Servidor escutando em http://localhost:${port}`);
    }
});
