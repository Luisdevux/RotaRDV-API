export const templateSucessoVerificacao = (appSchemeUrl = 'rotardv://auth/verified') => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verificado - RotaRDV</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background-color: #f4f6f8; }
        .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; max-width: 420px; }
        h1 { color: #2e7d32; font-size: 24px; margin-bottom: 12px; }
        p { color: #555; line-height: 1.5; font-size: 15px; margin-bottom: 24px; }
        .btn { display: inline-block; padding: 12px 24px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Email Verificado com Sucesso!</h1>
        <p>Sua conta no RotaRDV foi ativada. Você já pode retornar ao aplicativo e começar sua jornada.</p>
        <a class="btn" href="${appSchemeUrl}">Abrir Aplicativo RotaRDV</a>
    </div>
</body>
</html>
`;

export const templateErroVerificacao = (detalhe, appSchemeUrl = 'rotardv://auth/login') => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Erro de Verificação - RotaRDV</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background-color: #f4f6f8; }
        .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; max-width: 420px; }
        h1 { color: #d32f2f; font-size: 24px; margin-bottom: 12px; }
        p { color: #555; line-height: 1.5; font-size: 15px; margin-bottom: 24px; }
        .btn { display: inline-block; padding: 12px 24px; background-color: #555; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Erro na Verificação</h1>
        <p>${detalhe}</p>
        <a class="btn" href="${appSchemeUrl}">Voltar ao Aplicativo</a>
    </div>
</body>
</html>
`;
