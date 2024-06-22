targetScope = 'subscription'

@minLength(1)
@maxLength(20)
@description('Name of the environment which is used to generate a short unique hash used in all resources.')
param environmentName string

param resourceToken string = toLower(uniqueString(subscription().id, environmentName, location))

@description('Location for all resources.')
param location string = 'swedencentral'

@description('Use semantic search')
param azureSearchUseSemanticSearch bool = false

@description('Azure OpenAI Embedding Model Deployment Name')
param azureOpenAIEmbeddingModel string = 'text-embedding-ada-002'

@description('Azure OpenAI Embedding Model Name')
param azureOpenAIEmbeddingModelName string = 'text-embedding-ada-002'

@description('Azure OpenAI GPT Model Deployment Name')
param azureOpenAIGPTModel string = 'gpt-4o'

@description('Azure OpenAI GPT Model Version')
param azureOpenAIGPTModelVersion string = '2024-05-13'

@description('Name of Azure OpenAI Resource')
param azureOpenAIResourceName string = 'openai-${resourceToken}'

@description('Name of Azure Cognitive Search')
param azureAISearchName string = 'search-${resourceToken}'

@description('Name of Storage Account')
param storageAccountName string = 'str${resourceToken}'

@description('Azure OpenAI Model Capacity')
param azureOpenAIModelCapacity int = 30

@description('Azure OpenAI Embedding Model Capacity')
param azureOpenAIEmbeddingModelCapacity int = 30

@description('Name of Document Intelligence resource')
param docIntelligenceName string = 'rerag-docintelligence-${resourceToken}'

var tags = { 'environment': 'production' }

// Resource Group
resource rg 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: 'rg-${environmentName}'
  location: location
  tags: tags
}


// module containerApps './core/host/container-apps.bicep' = {
//   name: 'container-apps'
//   scope: rg
//   params: {
//     name: 'app'
//     location: location
//     tags: tags
//     containerAppsEnvironmentName: !empty(containerAppsEnvironmentName) ? containerAppsEnvironmentName : '${abbrs.appManagedEnvironments}${resourceToken}'
//     containerRegistryName: !empty(containerRegistryName) ? containerRegistryName : '${abbrs.containerRegistryRegistries}${resourceToken}'
//     containerRegistryAdminUserEnabled: true
//     logAnalyticsWorkspaceName: monitoring.outputs.logAnalyticsWorkspaceName
//     applicationInsightsName: monitoring.outputs.applicationInsightsName
//   }
// }

// Azure OpenAI Resource
module openai 'core/ai/cognitiveservices.bicep' = {
  name: azureOpenAIResourceName
  scope: rg
  params: {
    name: azureOpenAIResourceName
    location: location
    tags: tags
    sku: {
      name: 'S0'
    }
    managedIdentity: true
    deployments: [
      {
        name: azureOpenAIGPTModel
        model: {
          format: 'OpenAI'
          name: azureOpenAIGPTModel
          version: azureOpenAIGPTModelVersion
        }
        sku: {
          name: 'Standard'
          capacity: azureOpenAIModelCapacity
        }
      }
      {
        name: azureOpenAIEmbeddingModel
        model: {
          format: 'OpenAI'
          name: azureOpenAIEmbeddingModelName
          version: '2'
        }
        sku: {
          name: 'Standard'
          capacity: azureOpenAIEmbeddingModelCapacity
        }
      }
    ]
  }
}

// Azure Cognitive Search
module search './core/search/search-services.bicep' = {
  name: azureAISearchName
  scope: rg
  params: {
    name: azureAISearchName
    location: location
    tags: tags
    sku: {
      name: 'basic'
    }
    authOptions: {
      aadOrApiKey: {
        aadAuthFailureMode: 'http403'
      }
    }
    semanticSearch: azureSearchUseSemanticSearch ? 'free' : null
  }
}

// Storage Account
module storage 'core/storage/storage-account.bicep' = {
  name: storageAccountName
  scope: rg
  params: {
    name: storageAccountName
    location: location
    sku: {
      name: 'Standard_GRS'
    }
    containers: [
    ]

    queues: [
    ]
  }
}


module formrecognizer 'core/ai/cognitiveservices.bicep' = {
  name: docIntelligenceName 
  scope: rg
  params: {
    name: docIntelligenceName
    location: 'eastus'
    tags: tags
    kind: 'FormRecognizer'
  }
}

// Role Assignments
module searchServiceRoleOpenai 'core/security/role.bicep' = {
  scope: rg
  name: 'search-service-role-openai'
  params: {
    principalId: openai.outputs.identityPrincipalId
    roleDefinitionId: '7ca78c08-252a-4471-8644-bb5ff32d4ba0'
    principalType: 'ServicePrincipal'
  }
}

module searchIndexRoleOpenai 'core/security/role.bicep' = {
  scope: rg
  name: 'search-index-role-openai'
  params: {
    principalId: openai.outputs.identityPrincipalId
    roleDefinitionId: '1407120a-92aa-4202-b7e9-c0e197c71c8f'
    principalType: 'ServicePrincipal'
  }
}

module blobDataReaderRoleSearch 'core/security/role.bicep' = {
  scope: rg
  name: 'blob-data-reader-role-search'
  params: {
    principalId: search.outputs.identityPrincipalId
    roleDefinitionId: '2a2b9908-6ea1-4ae2-8e65-a410df84e7d1'
    principalType: 'ServicePrincipal'
  }
}

module openAiRoleSearchService 'core/security/role.bicep' = {
  scope: rg
  name: 'openai-role-searchservice'
  params: {
    principalId: search.outputs.identityPrincipalId
    roleDefinitionId: '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd'
    principalType: 'ServicePrincipal'
  }
}

module storageBlobDataContributorRoleOpenAI 'core/security/role.bicep' = {
  scope: rg
  name: 'storage-blob-data-contributor-openai'
  params: {
    principalId: openai.outputs.identityPrincipalId
    roleDefinitionId: 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
    principalType: 'ServicePrincipal'
  }
}

module storageBlobDataContributorRoleSearch 'core/security/role.bicep' = {
  scope: rg
  name: 'storage-blob-data-contributor-search'
  params: {
    principalId: search.outputs.identityPrincipalId
    roleDefinitionId: 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
    principalType: 'ServicePrincipal'
  }
}
