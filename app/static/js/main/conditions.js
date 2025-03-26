

import { showDeleteConfirmation } from './ui.js';

export let state = {
  currentConditions : []
}
// We expose a single array for "edit" usage, or you could store it in a class.

export function updateConditionsTable() {
  const conditionsTableBody = document.getElementById('conditionsTableBody');
  if (!conditionsTableBody) return;

  // If empty, show a placeholder row
  if (!state.currentConditions || state.currentConditions.length === 0) {
    conditionsTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted">
          No conditions found.
        </td>
      </tr>
    `;
    return;
  }

  conditionsTableBody.innerHTML = ''; // Clear existing rows

  // Build rows
  state.currentConditions.forEach((conditionWrapper, index) => {
    // If your data is really wrapped, continue using Object.values(...)[0].

    const condition = Object.values(conditionWrapper)[0];

    const row = document.createElement('tr');
    row.dataset.index = index;

    row.innerHTML = `
      <td>${condition.parameter}</td>
      <td>${condition.display_name || condition.parameter}</td>
      <td>${condition.column}</td>
      <td>${condition.operator}</td>
      <td>${condition.data_type || condition.type}</td>
      <td>
        <div class="btn-group">
          <button type="button" class="btn btn-sm btn-primary me-1 edit-condition">
            <i class="bi bi-pencil"></i>
          </button>
          <button type="button" class="btn btn-sm btn-danger delete-condition">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </td>
    `;

    conditionsTableBody.appendChild(row);
  });
}

// “Edit” an existing condition
export function editCondition(index) {
  // e.g., let condition = staticState.currentConditions[index];
  // Adjust if you store conditions differently
  const condition = state.currentConditions[index];

  document.getElementById('conditionIndex').value = index;
  document.getElementById('Parameter').value = condition.parameter || condition.Parameter || '';
  document.getElementById('Name').value = condition.Name || condition.display_name || '';

  // Re-populate the Column dropdown
  document.getElementById('Column').innerHTML = '<option value="">Loading columns...</option>';
  populateColumnDropdown('Column', condition.Column || condition.column);

  document.getElementById('Operator').value = condition.Operator || condition.operator || '=';
  document.getElementById('IgnoreIf').value = condition.IgnoreIf || '';

  // Now handle transformations checkboxes
  const transformations = condition.transformations || {};

  // Cast
  document.getElementById('castCheck').checked = !!transformations.cast;
  const castDiv = document.getElementById('div-castCheck');
  if (castDiv) castDiv.style.display = transformations.cast ? 'block' : 'none';

  const castOptions = document.getElementById('cast-Options');
  if (castOptions && transformations.cast) {
    castOptions.value = transformations.cast;
  }

  // Trim
  document.getElementById('trimCheck').checked = !!transformations.trim;

  // Replace
  const hasReplace = Array.isArray(transformations.replace);
  document.getElementById('replaceCheck').checked = hasReplace;
  const replaceDiv = document.getElementById('div-replaceCheck');
  if (replaceDiv) replaceDiv.style.display = hasReplace ? 'block' : 'none';
  if (hasReplace) {
    document.getElementById('replaceOld').value = transformations.replace[0] || '';
    document.getElementById('replaceNew').value = transformations.replace[1] || '';
  }

  // Substring
  const hasSubstring = Array.isArray(transformations.substring);
  document.getElementById('substringCheck').checked = hasSubstring;
  const substringDiv = document.getElementById('div-substringCheck');
  if (substringDiv) substringDiv.style.display = hasSubstring ? 'block' : 'none';
  if (hasSubstring) {
    document.getElementById('substringStart').value = transformations.substring[0] || 0;
    document.getElementById('substringLength').value = transformations.substring[1] || 0;
  }

  // SQL
  document.getElementById('sqlCheck').checked = !!transformations.sqlCommand;
  const sqlDiv = document.getElementById('div-sqlCheck');
  if (sqlDiv) sqlDiv.style.display = transformations.sqlCommand ? 'block' : 'none';
  if (transformations.sqlCommand) {
    document.getElementById('sqlCommand').value = transformations.sqlCommand;
  }

  // Show the modal
  const conditionModalElem = document.getElementById('ConditionModal');
  if (conditionModalElem) {
    const conditionModal = new bootstrap.Modal(conditionModalElem);
    conditionModal.show();
  }
}


// Called when user clicks “Delete”
export function deleteCondition(index) {
  showDeleteConfirmation('condition', index, 'Are you sure you want to delete this condition?');
}

// Actually remove from the array after user confirms
export function deleteConditionConfirmed(index) {
  state.currentConditions.splice(index, 1);
  updateConditionsTable();
}

// Save a condition (new or edited)
export function saveCondition() {
  const index = parseInt(document.getElementById('conditionIndex').value);
  const newCondition = {
    parameter: document.getElementById('conditionParameter').value,
    display_name: document.getElementById('conditionDisplayName').value,
    column: document.getElementById('conditionColumn').value,
    operator: document.getElementById('conditionOperator').value,
    type: document.getElementById('conditionType').value
  };

  // If index === -1, we add. Otherwise update.
  if (index === -1) {
    state.currentConditions.push(newCondition);
  } else {
    state.currentConditions[index] = newCondition;
  }

  updateConditionsTable();
  // Hide the modal
  bootstrap.Modal.getInstance(document.getElementById('addConditionModal')).hide();
}
