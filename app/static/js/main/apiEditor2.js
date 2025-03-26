import { showAlert, showDeleteConfirmation } from './ui.js';
import { state, updateConditionsTable, saveCondition, deleteConditionConfirmed } from './conditions.js';
import {
  stateTransform,
  updateTransformationsContainer,
  saveTransformation,
  deleteTransformationConfirmed,

} from './transformations.js';

export async function openApiModal(mode, apiId = '') {
  const modalElem = document.getElementById('apiModal');
  const modalInstance = new bootstrap.Modal(modalElem);

  const modeInput = document.getElementById('apiMode');
  modeInput.value = mode;

  // Some references for clarity
  const apiForm = document.getElementById('apiForm');
  const apiIdContainer = document.getElementById('apiIdContainer');
  const apiIdHidden = document.getElementById('apiIdHidden');
  const apiIdInput = document.getElementById('apiIdInput');
  const actionBtn = document.getElementById('apiModalActionBtn');
  const modalLabel = document.getElementById('apiModalLabel');

  // If "add" mode
  if (mode === 'add') {
    // Clear form
    apiForm.reset();
    apiIdHidden.value = '';
    apiIdInput.value = '';

    // Show the "API ID" container so user can set new ID
    apiIdContainer.style.display = 'block';

    // Reset conditions & transformations
    state.currentConditions = [];
    stateTransform.currentTransformations = [];
    updateConditionsTable();
    updateTransformationsContainer();

    // Update modal UI
    actionBtn.textContent = 'Create API';
    modalLabel.textContent = 'Add New API';
  }
  // If "edit" mode
  else if (mode === 'edit') {
    // Hide the "API ID" input, because the user can’t change an existing ID
    apiIdContainer.style.display = 'none';

    try {
      // Load the existing API details
      const response = await fetch(`/api/api_details/${apiId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const apiData = await response.json();

      // Update the UI fields for “edit”
      actionBtn.textContent = 'Save Changes';
      modalLabel.textContent = 'Edit API';

      // Clear form to avoid leftover data
      apiForm.reset();

      // Fill hidden ID
      apiIdHidden.value = apiData.id || '';

      // Fill main fields
      document.getElementById('apiName').value = apiData.name || '';
      document.getElementById('apiVersion').value = apiData.version || '';
      document.getElementById('apiDescription').value = apiData.description || '';

      // Database
      document.getElementById('databaseType').value = apiData.database?.type || '';
      document.getElementById('databaseName').value = apiData.database?.name || '';
      document.getElementById('tableSelect').value = apiData.database?.table || '';
      document.getElementById('lastUpdateTable').value = apiData.database?.last_update_table || '';

      // Pagination
      document.getElementById('enablePagination').checked = !!(apiData.pagination?.enabled);
      document.getElementById('defaultLimit').value = apiData.pagination?.default_limit ?? 10;
      document.getElementById('maxLimit').value = apiData.pagination?.max_limit ?? 100;

      // Ordering
      document.getElementById('defaultOrderField').value = apiData.ordering?.default_field || '';
      document.getElementById('defaultOrderDirection').value = apiData.ordering?.default_direction || 'ASC';

      // Cache
      document.getElementById('enableCache').checked = !!(apiData.cache?.enabled);
      document.getElementById('cacheTTL').value = apiData.cache?.ttl ?? 60;

      // Response Fields
      const responseFieldsSelect = document.getElementById('responseFields');
      Array.from(responseFieldsSelect.options).forEach(opt => (opt.selected = false));
      if (apiData.response && Array.isArray(apiData.response.fields)) {
        apiData.response.fields.forEach(field => {
          const match = Array.from(responseFieldsSelect.options).find(o => o.value === field);
          if (match) match.selected = true;
        });
      }

      // Conditions
      if (Array.isArray(apiData.conditions)) {
        state.currentConditions = apiData.conditions.slice();
      } else {
        state.currentConditions = [];
      }
      updateConditionsTable();

      // Transformations
      if (Array.isArray(apiData.transformations)) {
        stateTransform.currentTransformations = apiData.transformations.slice();
      } else {
        stateTransform.currentTransformations = [];
      }
      updateTransformationsContainer();
      await loadEditApiDatabaseSettings(apiData);

    } catch (error) {
      showAlert('Error loading API details for editing: ' + error.message, 'danger');
      // Optionally close the modal or keep it open
    }
  }
  // If some unknown mode, handle it
  else {
    console.warn('openApiModal called with unknown mode:', mode);
  }

  // Finally, show the modal
  modalInstance.show();
}



export function createOrSaveApi() {
  const mode = document.getElementById('apiMode').value;
  // If "add", we need the user-supplied ID
  let newId = '';
  if (mode === 'add') {
    newId = document.getElementById('apiIdInput').value.trim();
    if (!newId) {
      showAlert('Please enter an API ID for new APIs', 'danger');
      return;
    }
  }
  // If "edit", we use the hidden ID
  const existingId = document.getElementById('apiIdHidden').value.trim();

  // Collect form data
  const apiData = {
    id: mode === 'add' ? newId : existingId,
    name: document.getElementById('apiName').value,
    version: document.getElementById('apiVersion').value,
    description: document.getElementById('apiDescription').value,
    database: {
      type: document.getElementById('databaseType').value,
      name: document.getElementById('databaseName').value,
      table: document.getElementById('tableSelect').value,
      last_update_table: document.getElementById('lastUpdateTable').value || null
    },
    pagination: {
      enabled: document.getElementById('enablePagination').checked,
      default_limit: parseInt(document.getElementById('defaultLimit').value) || 10,
      max_limit: parseInt(document.getElementById('maxLimit').value) || 100
    },
    ordering: {
      default_field: document.getElementById('defaultOrderField').value,
      default_direction: document.getElementById('defaultOrderDirection').value
    },
    cache: {
      enabled: document.getElementById('enableCache').checked,
      ttl: parseInt(document.getElementById('cacheTTL').value) || 60
    },
    response_fields: Array.from(document.getElementById('responseFields').selectedOptions).map(o => o.value),
    conditions: state.currentConditions,
    transformations: stateTransform.currentTransformations
  };

  // Depending on your server endpoints, you might do a different fetch:
  // e.g. POST to /api/create_api for add, or /api/update_api for edit.
  // We'll assume a single /api/update_api can handle both.

  fetch('/api/update_api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(apiData)
  })
  .then(resp => resp.json())
  .then(data => {
    if (data.success) {
      showAlert(`API ${mode === 'add' ? 'created' : 'updated'} successfully`);
      bootstrap.Modal.getInstance(document.getElementById('apiModal')).hide();
      setTimeout(() => window.location.reload(), 1500);
    } else {
      showAlert(`Error saving API: ${data.error}`, 'danger');
    }
  })
  .catch(err => {
    console.error('Error:', err);
    showAlert('Error saving API', 'danger');
  });
}

export async function loadTableColumnsPromise(tableName, responseFieldsId, orderFieldId,apiData) {
  if (!tableName) return;
  const dbType = document.getElementById('databaseType').value;
  const dbName = document.getElementById('databaseName').value;

  const url = `/api/get_table_columns?db_type=${encodeURIComponent(dbType)}&database=${encodeURIComponent(dbName)}&table=${encodeURIComponent(tableName)}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`HTTP error! status: ${resp.status}`);
  }
  const columns = await resp.json();
  const responseFields = document.getElementById(responseFieldsId);
  if (responseFields) {
    const currentValues = apiData.response.fields;
    responseFields.innerHTML = '';
    columns.forEach(col => {
      const opt = document.createElement('option');
      opt.value = col;
      opt.textContent = col;
      opt.selected = currentValues.includes(col);
      responseFields.appendChild(opt);
    });
  }

  const orderField = document.getElementById(orderFieldId);
  if (orderField) {
    const currentVal = apiData.ordering.default_field;
    orderField.innerHTML = '<option value="">Select Field</option>';
    columns.forEach(col => {
      const opt = document.createElement('option');
      opt.value = col;
      opt.textContent = col;
      orderField.appendChild(opt);
    });
    if (columns.includes(currentVal)) {
      orderField.value = currentVal;
    }
  }

  return columns;
}



 export async function loadDatabaseTables(dbType, tableSelectId, lastUpdateTableSelectId) {
  if (!dbType) return;
  const tableSelect = document.getElementById(tableSelectId);
  const lastUpdateTableSelect = document.getElementById(lastUpdateTableSelectId);
  const dbName = document.getElementById('databaseName').value;

  tableSelect.innerHTML = '<option>Loading tables...</option>';
  if (lastUpdateTableSelect) {
    lastUpdateTableSelect.innerHTML = '<option>Loading tables...</option>';
  }

  const resp = await fetch(`/api/get_database_tables/${encodeURIComponent(dbType)}?database=${encodeURIComponent(dbName)}`);
  if (!resp.ok) {
    throw new Error(`HTTP error! status: ${resp.status}`);
  }
  const tables = await resp.json();

  tableSelect.innerHTML = '<option value="">Select Table/Collection</option>';
  tables.forEach(tbl => {
    const opt = document.createElement('option');
    opt.value = tbl;
    opt.textContent = tbl;
    tableSelect.appendChild(opt);
  });

  if (lastUpdateTableSelect) {
    lastUpdateTableSelect.innerHTML = '<option value="">Select Last Update Table</option>';
    tables.forEach(tbl => {
      const opt = document.createElement('option');
      opt.value = tbl;
      opt.textContent = tbl;
      lastUpdateTableSelect.appendChild(opt);
    });
  }


  return tables;
}
async function loadEditApiDatabaseSettings(apiDetails) {
  if (!apiDetails || !apiDetails.database) {
    console.error('Missing database info');
    return;
  }
  const { type, name, table } = apiDetails.database;

  // Set fields
  document.getElementById('databaseType').value = apiDetails.database?.type || '';
  document.getElementById('databaseName').value = apiDetails.database?.name || '';


  // Then load tables
  await loadDatabaseTables(type, 'tableSelect', 'lastUpdateTable');
  document.getElementById('tableSelect').value = table;
  document.getElementById('lastUpdateTable').value = apiDetails.lastUpdateTableName;

  await loadTableColumnsPromise(table, 'responseFields', 'defaultOrderField',apiDetails);
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
// Expose the condition/transform saving to the global scope, or you can re-wire the buttons differently
window.saveCondition = saveCondition;
window.deleteConditionConfirmed = deleteConditionConfirmed;
window.saveTransformation = saveTransformation;
window.deleteTransformationConfirmed = deleteTransformationConfirmed;
window.deleteApiConfirmed = deleteApiConfirmed;
window.openApiModal  = openApiModal ;
window.deleteApi = deleteApi;
// window.saveApi = saveApi;
// window.createNewApi = createNewApi;
window.loadDatabaseTables = loadDatabaseTables;

