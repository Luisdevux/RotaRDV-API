export const templateSucessoVerificacao = (appSchemeUrl) => `
<!DOCTYPE html>
<html>
<body>
    <h1>Email Verificado!</h1>
    <p>Seu email foi verificado com sucesso. Você já pode voltar para o aplicativo.</p>
</body>
</html>
`;

export const templateErroVerificacao = (detalhe, appSchemeUrl) => `
<!DOCTYPE html>
<html>
<body>
    <h1>Erro na Verificação</h1>
    <p>${detalhe}</p>
</body>
</html>
`;
