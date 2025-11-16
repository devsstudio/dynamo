module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/test'],
    testMatch: ['**/*.spec.ts'],
    setupFiles: ["reflect-metadata"],
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
            tsconfig: '<rootDir>/tsconfig.json',
            // You can include any other ts-jest specific configuration here
        }],
    },
    moduleNameMapper: {
        '^@src/(.*)$': '<rootDir>/src/$1',
    },
};