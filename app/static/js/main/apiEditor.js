// apiEditor.js
// Handles the Add/Edit forms for APIs, bridging to conditions and transformations

import { showAlert, showDeleteConfirmation } from './ui.js';
import { state, updateConditionsTable, saveCondition, deleteConditionConfirmed } from './conditions.js';
import { currentTransformations, updateTransformationsContainer, saveTransformation, deleteTransformationConfirmed } from './transformations.js';

// For storing the "editing" API details, if needed
let currentEditingApi = null;

// Called when user clicks "Create API" in the Add API modal
// export async function createNewApi() {
//   const apiId = document.getElementById('addApiId').value;
//   if (!apiId) {
//     showAlert('API ID is required', 'danger');
//     return;
//   }
//
//   // Gather form data for the new API
//   const apiData = {
//     id: apiId,
//     name: document.getElementById('addApiName').value || apiId,
//     version: document.getElementById('addApiVersion').value || '1.0.0',
//     description: document.getElementById('addApiDescription').value || '',
//     tags: document.getElementById('addApiTags').value || '',
//     database: {
//       type: document.getElementById('addDatabaseType').value,
//       name: document.getElementById('addDatabaseName').value,
//       table: document.getElementById('addTable').value,
//       last_update_table: document.getElementById('addLastUpdateTable').value || null
//     },
//     pagination: {
//       enabled: document.getElementById('addEnablePagination').checked,
//       default_limit: parseInt(document.getElementById('addDefaultLimit').value) || 10,
//       max_limit: parseInt(document.getElementById('addMaxLimit').value) || 100
//     },
//     ordering: {
//       default_field: document.getElementById('addDefaultOrderField').value,
//       default_direction: document.getElementById('addDefaultOrderDirection').value || 'ASC'
//     },
//     cache: {
//       enabled: document.getElementById('addEnableCache').checked,
//       ttl: parseInt(document.getElementById('addCacheTTL').value) || 60
//     },
//     // Use the selected fields
//     response_fields: Array.from(document.getElementById('addResponseFields').selectedOptions).map(o => o.value),
//     conditions: window.addConditions || [],
//     transformations: []
//   };
//
//   try {
//     const response = await fetch('/api/update_api', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(apiData)
//     });
//     const data = await response.json();
//
//     if (data.success) {
//       showAlert('API created successfully');
//       window.addConditions = []; // reset
//       bootstrap.Modal.getInstance(document.getElementById('addApiModal')).hide();
//       setTimeout(() => window.location.reload(), 1500);
//     } else {
//       showAlert(`Error creating API: ${data.error}`, 'danger');
//     }
//   } catch (error) {
//     showAlert('Error creating API: ' + error.message, 'danger');
//   }
// }

// // Called when user clicks "Edit" on a specific API row
// export async function editApi(apiId) {
//   try {
//     const response = await fetch(`/api/api_details/${apiId}`);
//     const apiDetails = await response.json();
//
//     currentEditingApi = apiDetails;
//     document.getElementById('editApiId').value = apiId;
//     document.getElementById('editApiName').value = apiDetails.name || apiId;
//     document.getElementById('editApiVersion').value = apiDetails.version || '1.0.0';
//     document.getElementById('editApiDescription').value = apiDetails.description || '';
//
//     // Show the modal first so elements are in the DOM
//     const editModal = new bootstrap.Modal(document.getElementById('EditApi'));
//     editModal.show();
//
//     // Then load DB settings in sequence
//     loadEditApiDatabaseSettings(apiDetails);
//   } catch (error) {
//     showAlert('Error loading API details for editing: ' + error.message, 'danger');
//   }
// }
//
// async function loadEditApiDatabaseSettings(apiDetails) {
//   if (!apiDetails || !apiDetails.database) {
//     console.error('Missing database info');
//     return;
//   }
//   const { type, name, table } = apiDetails.database;
//
//   // Set fields
//   document.getElementById('editDatabaseType').value = type || '';
//   document.getElementById('editDatabaseName').value = name || '';
//
//   // Then load tables
//   await loadDatabaseTables(type, 'editTable', 'editLastUpdateTable');
//   document.getElementById('editTable').value = table;
//
//   // Then load columns
//   await loadTableColumnsPromise(table, 'responseFields', 'defaultOrderField');
//
//   // Now set the response fields from apiDetails
//   if (apiDetails.response && Array.isArray(apiDetails.response.fields)) {
//     const responseFieldsSelect = document.getElementById('responseFields');
//     const fields = apiDetails.response.fields;
//     Array.from(responseFieldsSelect.options).forEach(opt => {
//       opt.selected = fields.includes(opt.value);
//     });
//   }
//
//   // Pagination
//   if (apiDetails.pagination) {
//     document.getElementById('enablePagination').checked = apiDetails.pagination.enabled;
//     document.getElementById('defaultLimit').value = apiDetails.pagination.default_limit || 10;
//     document.getElementById('maxLimit').value = apiDetails.pagination.max_limit || 100;
//   }
//
//   // Ordering
//   if (apiDetails.ordering) {
//     document.getElementById('defaultOrderField').value = apiDetails.ordering.default_field || '';
//     document.getElementById('defaultOrderDirection').value = apiDetails.ordering.default_direction || 'ASC';
//   }
//
//   // Cache
//   if (apiDetails.cache) {
//     document.getElementById('enableCache').checked = apiDetails.cache.enabled;
//     document.getElementById('cacheTTL').value = apiDetails.cache.ttl || 60;
//   }
//
//   // Conditions
//   if (apiDetails.conditions) {
//     state.currentConditions.splice(0, state.currentConditions.length, ...apiDetails.conditions); // replace array contents
//     updateConditionsTable();
//   }
//
//   // Transformations
//   if (apiDetails.transformations) {
//     currentTransformations.splice(0, currentTransformations.length, ...apiDetails.transformations);
//     updateTransformationsContainer();
//   }
// }
//
// export async function loadTableColumnsPromise(tableName, responseFieldsId, orderFieldId) {
//   if (!tableName) return;
//   const dbType = document.getElementById('editDatabaseType').value;
//   const dbName = document.getElementById('editDatabaseName').value;
//
//   const url = `/api/get_table_columns?db_type=${encodeURIComponent(dbType)}&database=${encodeURIComponent(dbName)}&table=${encodeURIComponent(tableName)}`;
//   const resp = await fetch(url);
//   if (!resp.ok) {
//     throw new Error(`HTTP error! status: ${resp.status}`);
//   }
//
//   const columns = await resp.json();
//
//   const responseFields = document.getElementById(responseFieldsId);
//   if (responseFields) {
//     const currentValues = Array.from(responseFields.selectedOptions).map(o => o.value);
//     responseFields.innerHTML = '';
//     columns.forEach(col => {
//       const opt = document.createElement('option');
//       opt.value = col;
//       opt.textContent = col;
//       opt.selected = currentValues.includes(col);
//       responseFields.appendChild(opt);
//     });
//   }
//
//   const orderField = document.getElementById(orderFieldId);
//   if (orderField) {
//     const currentVal = orderField.value;
//     orderField.innerHTML = '<option value="">Select Field</option>';
//     columns.forEach(col => {
//       const opt = document.createElement('option');
//       opt.value = col;
//       opt.textContent = col;
//       orderField.appendChild(opt);
//     });
//     if (columns.includes(currentVal)) {
//       orderField.value = currentVal;
//     }
//   }
//
//   return columns;
// }

export async function saveApi() {
  const apiData = {
    id: document.getElementById('editApiId').value,
    name: document.getElementById('editApiName').value,
    version: document.getElementById('editApiVersion').value,
    description: document.getElementById('editApiDescription').value,
    database: {
      type: document.getElementById('editDatabaseType').value,
      name: document.getElementById('editDatabaseName').value,
      table: document.getElementById('editTable').value,
      last_update_table: document.getElementById('editLastUpdateTable').value || null
    },
    pagination: {
      enabled: document.getElementById('enablePagination').checked,
      default_limit: parseInt(document.getElementById('defaultLimit').value),
      max_limit: parseInt(document.getElementById('maxLimit').value)
    },
    ordering: {
      default_field: document.getElementById('defaultOrderField').value,
      default_direction: document.getElementById('defaultOrderDirection').value
    },
    cache: {
      enabled: document.getElementById('enableCache').checked,
      ttl: parseInt(document.getElementById('cacheTTL').value)
    },
    conditions: state.currentConditions,
    response: {
      fields: Array.from(document.getElementById('responseFields').selectedOptions).map(o => o.value),
      transformations: currentTransformations
    }
  };

  try {
    const response = await fetch('/api/update_api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiData)
    });
    const data = await response.json();
    if (data.success) {
      showAlert('API saved successfully');
      bootstrap.Modal.getInstance(document.getElementById('EditApi')).hide();
      setTimeout(() => window.location.reload(), 1500);
    } else {
      showAlert(`Error saving API: ${data.error}`, 'danger');
    }
  } catch (error) {
    showAlert('Error saving API: ' + error.message, 'danger');
  }
}

// Delete API
export function deleteApi(apiId) {
  showDeleteConfirmation('api', apiId, `Are you sure you want to delete the API "${apiId}"?`);
}

export async function deleteApiConfirmed(apiId) {
  try {
    const response = await fetch(`/api/delete_api/${apiId}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    if (data.success) {
      showAlert(`API "${apiId}" deleted successfully`);
      setTimeout(() => window.location.reload(), 1500);
    } else {
      showAlert(`Error deleting API: ${data.error}`, 'danger');
    }
  } catch (error) {
    showAlert('Error deleting API: ' + error.message, 'danger');
  }
}
// async function loadDatabaseTables(dbType, tableSelectId = 'editTable', lastUpdateTableSelectId = 'editLastUpdateTable') {
//     if (!dbType) return;
//
//     const tableSelect = document.getElementById(tableSelectId);
//     const lastUpdateTableSelect = document.getElementById(lastUpdateTableSelectId);
//
//     if (!tableSelect) return;
//
//     const dbNameInput = document.getElementById('addDatabaseName') || document.getElementById('editDatabaseName');
//     if (!dbNameInput || !dbNameInput.value) {
//         showAlert('Please enter a database name first', 'warning');
//         return;
//     }
//
//     const databaseName = dbNameInput.value;
//
//     tableSelect.innerHTML = '<option value="">Loading tables...</option>';
//     if (lastUpdateTableSelect) {
//         lastUpdateTableSelect.innerHTML = '<option value="">Loading tables...</option>';
//     }
//
//     try {
//         const response = await fetch(
//             `/api/get_database_tables/${encodeURIComponent(dbType)}?database=${encodeURIComponent(databaseName)}`
//         );
//         if (!response.ok) {
//             throw new Error(`HTTP error! status: ${response.status}`);
//         }
//
//         const tables = await response.json();
//
//         tableSelect.innerHTML = '<option value="">Select Table/Collection</option>';
//         tables.forEach(table => {
//             const option = document.createElement('option');
//             option.value = table;
//             option.textContent = table;
//             tableSelect.appendChild(option);
//         });
//
//         if (lastUpdateTableSelect) {
//             lastUpdateTableSelect.innerHTML = '<option value="">Select Last Update Table</option>';
//             tables.forEach(table => {
//                 const option = document.createElement('option');
//                 option.value = table;
//                 option.textContent = table;
//                 lastUpdateTableSelect.appendChild(option);
//             });
//         }
//
//         if (tables.length > 0) {
//             showAlert(`Found ${tables.length} tables in ${databaseName}`, 'success');
//         } else {
//             showAlert(`No tables found in database ${databaseName}`, 'warning');
//         }
//     } catch (error) {
//         showAlert(`Error loading tables: ${error.message}`, 'danger');
//         tableSelect.innerHTML = '<option value="">Select Table/Collection</option>';
//         if (lastUpdateTableSelect) {
//             lastUpdateTableSelect.innerHTML = '<option value="">Select Last Update Table</option>';
//         }
//     }
// }

// Expose the condition/transform saving to the global scope, or you can re-wire the buttons differently
window.saveCondition = saveCondition;
window.deleteConditionConfirmed = deleteConditionConfirmed;
window.saveTransformation = saveTransformation;
window.deleteTransformationConfirmed = deleteTransformationConfirmed;
window.deleteApiConfirmed = deleteApiConfirmed;
window.editApi = editApi;
window.deleteApi = deleteApi;
window.saveApi = saveApi;
window.createNewApi = createNewApi;
window.loadDatabaseTables = loadDatabaseTables;

