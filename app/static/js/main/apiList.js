import { apiCache } from './apiCache.js';
import { showAlert } from './ui.js';
import {openApiModal} from "./apiEditor2.js";

export async function initializeApiList() {
  // The main function to load and populate the API list
  const apiTableBody = document.getElementById('apiTableBody');
  if (!apiTableBody) {
    console.warn('API table body element not found');
    return;
  }

  // Otherwise, fetch from the server
  try {
    const response = await fetch('/api/api_details');
    if (!response.ok) {
      throw new Error('Network response was not ok: ' + response.statusText);
    }

    const apis = await response.json();
    populateApiTable(apiTableBody, apis);
  } catch (error) {
    showAlert('Error loading API details: ' + error.message, 'danger');
    apiTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-danger">
          <i class="bi bi-exclamation-triangle me-2"></i>
          Error loading API data: ${error.message}
        </td>
      </tr>
    `;
  }
}

export function populateApiTable(tableBody, apis) {
  tableBody.innerHTML = '';

  if (!apis || (Array.isArray(apis) && apis.length === 0) || (typeof apis === 'object' && Object.keys(apis).length === 0)) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center">
          No APIs found. Click "Add New API" to create one.
        </td>
      </tr>
    `;
    return;
  }

  // Build table rows
  apis.forEach(api => {
    const row = document.createElement('tr');

    // Format DB info
    let dbType = '', dbTable = '';
    if (api.database) {
      dbType = api.database.type || '';
      dbTable = api.database.table || '';
    }

    // Description
    const description = api.description || '';

    row.innerHTML = `
      <td>${api.id}</td>
      <td>${api.name || api.id}</td>
      <td>${api.version || new Date().toLocaleString()}</td>
      <td>${dbType}</td>
      <td>${dbTable}</td>
      <td class="text-truncate" style="max-width: 200px;">${description}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="openApiModal('edit',apiId='${api.id}')">
          Edit
        </button>
        <button class="btn btn-sm btn-outline-danger me-1" onclick="deleteApi('${api.id}')">
          Delete
        </button>
      </td>
    `;

    tableBody.appendChild(row);
  });
}
