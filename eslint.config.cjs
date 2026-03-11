const nextConfig = require('eslint-config-next');

module.exports = [
  ...nextConfig,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];
