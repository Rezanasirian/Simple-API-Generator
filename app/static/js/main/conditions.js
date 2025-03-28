

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
  // Fetch the condition object from state
  const condition = state.currentConditions[index];

  // Set the condition index for saving the edited condition
  document.getElementById('conditionIndex').value = index;

  // Populate Parameter and Name
  document.getElementById('Parameter').value = condition.parameter || condition.Parameter || '';
  document.getElementById('Name').value = condition.Name || condition.display_name || '';

  // Re-populate the Column dropdown
  document.getElementById('Column').innerHTML = '<option value="">Loading columns...</option>';
  // populateColumnDropdown('Column', condition.Column || condition.column);

  // Populate Operator
  document.getElementById('Operator').value = condition.operator || condition.operator || '=';

  // Populate IgnoreIf
  document.getElementById('IgnoreIf').value = condition.ignoreIf || '';

  // Populate Data Type and Category
  document.getElementById('dataType').value = condition.data_type || '';
  document.getElementById('category').value = condition.category || '';

  // Set "Required" checkbox based on condition's required property
  document.getElementById('requiredCheck').checked = condition.required || false;

  // Populate Validation (Min and Max)
  document.getElementById('minValidation').value = condition.validation?.min || '';
  document.getElementById('maxValidation').value = condition.validation?.max || '';

  // Handle transformations checkboxes
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
  const hasReplace = transformations.replace && transformations.replace.from && transformations.replace.to;
  document.getElementById('replaceCheck').checked = hasReplace;
  const replaceDiv = document.getElementById('div-replaceCheck');
  if (replaceDiv) replaceDiv.style.display = hasReplace ? 'block' : 'none';
  if (hasReplace) {
    document.getElementById('replaceOld').value = transformations.replace.from || '';
    document.getElementById('replaceNew').value = transformations.replace.to || '';
  }

  // Substring
  const hasSubstring = transformations.substring && transformations.substring.start && transformations.substring.end;
  document.getElementById('substringCheck').checked = hasSubstring;
  const substringDiv = document.getElementById('div-substringCheck');
  if (substringDiv) substringDiv.style.display = hasSubstring ? 'block' : 'none';
  if (hasSubstring) {
    document.getElementById('substringStart').value = transformations.substring.start || 0;
    document.getElementById('substringLength').value = transformations.substring.end || 0;
  }

  // SQL
  document.getElementById('sqlCheck').checked = !!transformations.sql;
  const sqlDiv = document.getElementById('div-sqlCheck');
  if (sqlDiv) sqlDiv.style.display = transformations.sql ? 'block' : 'none';
  if (transformations.sql) {
    document.getElementById('sqlCommand').value = transformations.sql;
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

  // Get values from the modal
  const parameter = document.getElementById('Parameter').value;
  const name = document.getElementById('Name').value;
  const column = document.getElementById('Column').value;
  const operator = document.getElementById('Operator').value;
  const ignoreIf = document.getElementById('IgnoreIf').value;
  const required = !!document.querySelector('input[name="required"]:checked'); // Assuming you have a 'required' checkbox
  const dataType = document.getElementById('dataType').value; // Assuming you have an input for data_type
  const category = document.getElementById('category').value; // Assuming you have an input for category

  // Handle transformations (example for each transformation type)
  const transformations = {};
  if (document.getElementById('castCheck').checked) {
    transformations.cast = document.getElementById('cast-Options').value;
  }
  if (document.getElementById('trimCheck').checked) {
    transformations.trim = true;
  }
  if (document.getElementById('replaceCheck').checked) {
    transformations.replace = {
      from: document.getElementById('replaceOld').value,
      to: document.getElementById('replaceNew').value
    };
  }
  if (document.getElementById('substringCheck').checked) {
    transformations.substring = {
      start: document.getElementById('substringStart').value,
      end: document.getElementById('substringLength').value
    };
  }
  if (document.getElementById('sqlCheck').checked) {
    transformations.sql = document.getElementById('sqlCommand').value;
  }

  // Validation (min, max values)
  const validation = {};
  if (document.getElementById('minValidation').value) {
    validation.min = document.getElementById('minValidation').value;
  }
  if (document.getElementById('maxValidation').value) {
    validation.max = document.getElementById('maxValidation').value;
  }

  const newCondition = {
    [parameter]: {
      action: index === -1 ? 'add_condition' : 'update_condition',
      parameter: parameter,
      name: name,
      display_name: name, // Assuming 'name' is also used as 'display_name'
      column: column,
      operator: operator,
      ignoreIf: ignoreIf,
      required: required,
      data_type: dataType,
      category: category,
      transformations: transformations,
      validation: validation
    }
  };

  // If index === -1, we add; otherwise, we update.
  if (index === -1) {
    state.currentConditions.push(newCondition);
  } else {
    state.currentConditions[index] = newCondition;
  }
  console.log(state.currentConditions)
  updateConditionsTable();
  // Hide the modal
  bootstrap.Modal.getInstance(document.getElementById('ConditionModal')).hide();
}

