const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^react-markdown$': '<rootDir>/__mocks__/react-markdown.js',
  },
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/e2e/', '/tests/e2e/'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-markdown|remark|unified|bail|is-plain-obj|trough|vfile|unist-util-stringify-position|mdast-util-.*|micromark.*|decode-named-character-reference|character-entities|property-information|hast-util-whitespace|remark-.*|space-separated-tokens|comma-separated-tokens|pretty-bytes|ccount|@xyflow|react-plotly)/)',
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx|mjs)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        allowJs: true
      }
    }]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'mjs'],
  collectCoverageFrom: [
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'app/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  }
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)