@description('Main Bicep template for Elastics Terminal Azure deployment')

// Parameters
@description('Location for all resources')
param location string = resourceGroup().location

@description('Name of the application')
param appName string = 'elastics-terminal'

@description('Container image for the application')
param containerImage string = 'elasticsterminalacr.azurecr.io/elastics-terminal:latest'

@description('PostgreSQL administrator password')
@secure()
param postgresPassword string

@description('Redis password')
@secure()
param redisPassword string

@description('Anthropic API key')
@secure()
param anthropicApiKey string

@description('Basic authentication password')
@secure()
param basicAuthPassword string

// Variables
var resourcePrefix = '${appName}-${uniqueString(resourceGroup().id)}'
var containerRegistryName = replace('${resourcePrefix}acr', '-', '')
var postgresServerName = '${resourcePrefix}-postgres'
var redisServerName = '${resourcePrefix}-redis'
var containerAppEnvName = '${resourcePrefix}-env'
var containerAppName = '${resourcePrefix}-app'
var logAnalyticsName = '${resourcePrefix}-logs'
var appInsightsName = '${resourcePrefix}-insights'

// Log Analytics Workspace
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

// Container Registry
resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: containerRegistryName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

// PostgreSQL Server
resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-03-01-preview' = {
  name: postgresServerName
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '14'
    administratorLogin: 'elasticsadmin'
    administratorLoginPassword: postgresPassword
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

// PostgreSQL Database
resource postgresDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-03-01-preview' = {
  name: 'elastics_terminal'
  parent: postgresServer
  properties: {
    charset: 'utf8'
    collation: 'en_US.utf8'
  }
}

// PostgreSQL Firewall Rule (Allow Azure Services)
resource postgresFirewallRule 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-03-01-preview' = {
  name: 'AllowAzureServices'
  parent: postgresServer
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// Redis Cache
resource redisCache 'Microsoft.Cache/Redis@2023-08-01' = {
  name: redisServerName
  location: location
  properties: {
    sku: {
      name: 'Basic'
      family: 'C'
      capacity: 0
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    redisConfiguration: {
      'maxmemory-policy': 'allkeys-lru'
    }
  }
}

// Container Apps Environment
resource containerAppEnvironment 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: containerAppEnvName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// Container App
resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: containerAppName
  location: location
  properties: {
    managedEnvironmentId: containerAppEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 3000
        allowInsecure: false
        traffic: [
          {
            weight: 100
            latestRevision: true
          }
        ]
      }
      registries: [
        {
          server: containerRegistry.properties.loginServer
          username: containerRegistry.listCredentials().username
          passwordSecretRef: 'registry-password'
        }
      ]
      secrets: [
        {
          name: 'registry-password'
          value: containerRegistry.listCredentials().passwords[0].value
        }
        {
          name: 'postgres-password'
          value: postgresPassword
        }
        {
          name: 'redis-password'
          value: redisCache.listKeys().primaryKey
        }
        {
          name: 'anthropic-api-key'
          value: anthropicApiKey
        }
        {
          name: 'basic-auth-password'
          value: basicAuthPassword
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'elastics-terminal'
          image: containerImage
          resources: {
            cpu: json('1.0')
            memory: '2Gi'
          }
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'NEXT_TELEMETRY_DISABLED'
              value: '1'
            }
            {
              name: 'PYTHONUNBUFFERED'
              value: '1'
            }
            {
              name: 'ANTHROPIC_API_KEY'
              secretRef: 'anthropic-api-key'
            }
            {
              name: 'BASIC_AUTH_EMAIL'
              value: 'wojciech@elastics.ai'
            }
            {
              name: 'BASIC_AUTH_PASSWORD'
              secretRef: 'basic-auth-password'
            }
            {
              name: 'DATABASE_URL'
              value: 'postgresql://elasticsadmin:${postgresPassword}@${postgresServer.properties.fullyQualifiedDomainName}:5432/elastics_terminal?sslmode=require'
            }
            {
              name: 'REDIS_URL'
              value: 'rediss://:${redisCache.listKeys().primaryKey}@${redisCache.properties.hostName}:${redisCache.properties.sslPort}'
            }
            {
              name: 'WS_HOST'
              value: '0.0.0.0'
            }
            {
              name: 'WS_PORT'
              value: '8765'
            }
            {
              name: 'AUTO_OPTIMIZE'
              value: 'true'
            }
            {
              name: 'BROADCAST_EVENTS'
              value: 'true'
            }
            {
              name: 'ENABLE_OPTIONS'
              value: 'true'
            }
            {
              name: 'APPLICATION_INSIGHTS_CONNECTION_STRING'
              value: appInsights.properties.ConnectionString
            }
          ]
          ports: [
            {
              containerPort: 3000
              name: 'http'
            }
            {
              containerPort: 8000
              name: 'api'
            }
            {
              containerPort: 8765
              name: 'websocket'
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 10
        rules: [
          {
            name: 'cpu-scaling'
            custom: {
              type: 'cpu'
              metadata: {
                type: 'Utilization'
                value: '70'
              }
            }
          }
        ]
      }
    }
  }
}

// Outputs
output containerAppUrl string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
output containerRegistryLoginServer string = containerRegistry.properties.loginServer
output postgresServerFqdn string = postgresServer.properties.fullyQualifiedDomainName
output redisHostname string = redisCache.properties.hostName
output applicationInsightsConnectionString string = appInsights.properties.ConnectionString