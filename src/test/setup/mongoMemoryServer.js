// src/test/setup/mongoMemoryServer.js

import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

export default async function globalSetup() {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    process.env.DB_URL = uri;

    return async () => {
        if (mongoServer) {
            await mongoServer.stop();
        }
    };
}
