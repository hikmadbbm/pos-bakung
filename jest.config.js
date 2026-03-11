module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src/tests'],
  verbose: true,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
