import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globalSetup: ['./src/test/setup/mongoMemoryServer.js'],
        setupFiles: ['./src/test/setup/setupTests.js'],
        environment: 'node',
        testTimeout: 30000,
        hookTimeout: 30000,
        fileParallelism: false,
    },
});
