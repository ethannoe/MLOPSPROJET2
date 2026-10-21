const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    // Surchargeable : npx cypress run --config baseUrl=http://<ip>
    baseUrl: 'http://localhost:3000',
    supportFile: false,
    video: false,
    screenshotOnRunFailure: true,
  },
});
