#!/usr/bin/env ts-node

// Set environment variables
process.env.AUTH_AZURE_AD_CLIENT_ID = 'test-client-id';
process.env.AUTH_AZURE_AD_CLIENT_SECRET = 'test-client-secret';
process.env.AUTH_AZURE_AD_TENANT_ID = 'test-tenant-id';

console.log('Testing Azure AD configuration:');
import { config } from '@/lib/auth';
console.log('Providers length:', config.providers.length);
console.log('Provider structure:', JSON.stringify(config.providers[0], null, 2));