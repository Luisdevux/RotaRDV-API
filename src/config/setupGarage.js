import garageClient from "./garageConnect.js";

async function setupGarage() {
    const bucketName = process.env.GARAGE_BUCKET_FOTOS;

    if (!bucketName) {
      throw new Error("A variável de ambiente do nome do bucket do Garage não está definida.");
    }

    if (!garageClient) {
      throw new Error("A variável de ambiente do cliente do Garage não está definida.");
    }

    try {
        const exists = await garageClient.bucketExists(bucketName);

        if (!exists) {
            await garageClient.makeBucket(bucketName);
            console.info(`Bucket "${bucketName}" criado com sucesso no Garage.`);
        } else {
            console.info(`Bucket "${bucketName}" já existe no Garage.`);
        }
    } catch (erro) {
        throw new Error(`Erro ao verificar/criar o bucket "${bucketName}": ${erro.message}`);
    }
}

export default setupGarage;
