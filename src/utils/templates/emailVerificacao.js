const emailVerificacao = (linkVerificacao, nomeUsuario) => {
    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <body style="font-family: sans-serif;">
        <h2>Verificação de Email - RotaRDV</h2>
        <p>Olá, <strong>${nomeUsuario}</strong>!</p>
        <p>Para confirmar seu email, clique no link abaixo:</p>
        <a href="${linkVerificacao}" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Verificar Email</a>
        <p>Ou copie e cole o link: ${linkVerificacao}</p>
        <p>Este link é válido por 24 horas.</p>
    </body>
    </html>
    `;
};

export default emailVerificacao;
