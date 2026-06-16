const emailRecuperacaoSenha = (token, nomeUsuario) => {
    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <body style="font-family: sans-serif;">
        <h2>Recuperação de Senha - RotaRDV</h2>
        <p>Olá, <strong>${nomeUsuario}</strong>!</p>
        <p>Você solicitou a recuperação de senha. Utilize o código abaixo para redefinir sua senha:</p>
        <div style="padding: 20px; background-color: #f4f4f4; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px;">
            ${token}
        </div>
        <p>Este código é válido por 1 hora.</p>
        <p>Se você não solicitou isso, por favor ignore este email.</p>
    </body>
    </html>
    `;
};

export default emailRecuperacaoSenha;
