#!/usr/bin/env node

// Set environment variables
process.env.AUTH_AZURE_AD_CLIENT_ID = 'test-client-id';
process.env.AUTH_AZURE_AD_CLIENT_SECRET = 'test-client-secret';
process.env.AUTH_AZURE_AD_TENANT_ID = 'test-tenant-id';

console.log('Testing Azure AD configuration:');
const { config } = require('./lib/auth');
console.log('Providers length:', config.providers.length);
console.log('Provider structure:', JSON.stringify(config.providers[0], null, 2));

console.log('\n\nTesting local dev configuration:');
// Clear Azure variables for local dev test
delete process.env.AUTH_AZURE_AD_CLIENT_ID;
delete process.env.AUTH_AZURE_AD_CLIENT_SECRET;
delete process.env.AUTH_AZURE_AD_TENANT_ID;

// Clear module cache to force reload
delete require.cache[require.resolve('./lib/auth')];
const { config: localConfig } = require('./lib/auth');
console.log('Local providers length:', localConfig.providers.length);
console.log('Local provider structure:', JSON.stringify(localConfig.providers[0], null, 2));