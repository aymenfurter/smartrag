metadata description = 'Creates a Cosmos DB role assignment for a principal.'

param cosmosDbAccountId string
param principalId string
param roleDefinitionId string


var cosmosDbAccountName = split(cosmosDbAccountId, '/')[8]
var roleAssignmentId = guid(roleDefinitionId, principalId, cosmosDbAccountId)

resource cosmosDbRoleAssignment 'Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments@2023-11-15' = {
  name: '${cosmosDbAccountName}/${roleAssignmentId}'
  properties: {
    roleDefinitionId: '${cosmosDbAccountId}/sqlRoleDefinitions/${roleDefinitionId}'
    principalId: principalId
    scope: cosmosDbAccountId
  }
}
