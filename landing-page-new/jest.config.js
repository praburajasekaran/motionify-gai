/** @type {import('jest').Config} */
const jestConfig = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  setupFilesAfterEnv: [],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/app/api/payments/**/*.ts',
    '!src/app/api/payments/__tests__/**'
  ],
  testTimeout: 30000,
  verbose: true,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transform: {
    '^.+\\.ts$': ['@swc/jest', {
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: false
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true
        },
        target: 'es2017'
      }
    }]
  }
};

module.exports = jestConfig;
