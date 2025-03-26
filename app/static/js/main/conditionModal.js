
// import { populateColumnDropdown } from './someDropdownModule.js';
// or wherever you define populateColumnDropdown

import { showAlert } from './ui.js';
import { updateConditionsTable } from './conditions.js';
// if static.currentConditions is in conditions.js, import it too:
import { state } from './conditions.js'; // or however you hold `static.currentConditions`



// This function runs once, typically after the DOM is loaded
export function initializeConditionModal() {
  // 1. Attach the "add condition" button listener
  const addConditionBtn = document.getElementById('addConditionBtn');

  if (addConditionBtn) {
    addConditionBtn.addEventListener('click', () => {
      console.log('Condition button clicked');
      const modalElement = document.getElementById('ConditionModal');
      if (!modalElement) {
        console.error('Modal element not found!');
        return;
      }
      try {
        const conditionModal = new bootstrap.Modal(modalElement);
        // Reset form
        document.getElementById('conditionIndex').value = -1;
        const form = document.getElementById('conditionForm');
        if (form) form.reset();
        // Show modal
        conditionModal.show();
      } catch (error) {
        console.error('Error showing modal:', error);
      }
    });
  } else {
    console.error('Add Condition button not found!');
  }

  // 2. Attach a listener to the "save" button
  const saveConditionBtn = document.getElementById('saveConditionBtn');
  if (saveConditionBtn) {
    saveConditionBtn.addEventListener('click', saveCondition);
  }

  // 3. Set up transformation checkboxes
  const transformCheckboxes = [
    { check: 'castCheck', div: 'div-castCheck' },
    { check: 'trimCheck', div: null }, // No extra div for trim
    { check: 'replaceCheck', div: 'div-replaceCheck' },
    { check: 'substringCheck', div: 'div-substringCheck' },
    { check: 'sqlCheck', div: 'div-sqlCheck' }
  ];

  transformCheckboxes.forEach(item => {
    const checkbox = document.getElementById(item.check);
    if (checkbox && item.div) {
      checkbox.addEventListener('change', function() {
        const div = document.getElementById(item.div);
        if (div) {
          div.style.display = this.checked ? 'block' : 'none';
        }
      });
    }
  });

  // 4. Initialize cast options if needed
  const castOptions = document.getElementById('cast-Options');
  if (castOptions && castOptions.options.length === 0) {
    const dataTypes = ['string', 'integer', 'float', 'date', 'datetime', 'boolean'];
    dataTypes.forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type;
      castOptions.appendChild(option);
    });
  }
}

// The function that saves (creates/updates) a condition
export function saveCondition() {
  const index = parseInt(document.getElementById('conditionIndex').value, 10);

  // Build the condition object
  const condition = {
    parameter: document.getElementById('Parameter').value,
    Name: document.getElementById('Name').value,
    display_name: document.getElementById('Name').value,
    Column: document.getElementById('Column').value,
    Operator: document.getElementById('Operator').value,
    IgnoreIf: document.getElementById('IgnoreIf').value,
    required: false,
    data_type: 'string',  // default
    category: 'Identification', // default
    transformations: {}
  };

  // Collect transformation options
  // 1. Cast
  if (document.getElementById('castCheck').checked) {
    const castType = document.getElementById('cast-Options').value;
    if (castType) {
      condition.transformations.cast = castType;
    }
  }
  // 2. Trim
  if (document.getElementById('trimCheck').checked) {
    condition.transformations.trim = true;
  }
  // 3. Replace
  if (document.getElementById('replaceCheck').checked) {
    const oldVal = document.getElementById('replaceOld').value;
    const newVal = document.getElementById('replaceNew').value;
    condition.transformations.replace = [oldVal || null, newVal || null];
  }
  // 4. Substring
  if (document.getElementById('substringCheck').checked) {
    const start = parseInt(document.getElementById('substringStart').value, 10) || 0;
    const length = parseInt(document.getElementById('substringLength').value, 10) || 0;
    if (start >= 0 && length > 0) {
      condition.transformations.substring = [start, length];
    }
  }
  // 5. SQL
  if (document.getElementById('sqlCheck').checked) {
    const sqlCommand = document.getElementById('sqlCommand').value;
    if (sqlCommand) {
      condition.transformations.sqlCommand = sqlCommand;
    }
  }

  // Determine if we're in "edit" or "add" mode
  const isEditMode = document.getElementById('EditApi') &&
        (document.getElementById('EditApi').classList.contains('show') ||
         window.getComputedStyle(document.getElementById('EditApi')).display !== 'none');

  if (isEditMode) {
    // If you're storing conditions in a "static.currentConditions" or something from a shared state:
    if (index === -1) {
      state.currentConditions.push(condition);
    } else {
      state.currentConditions[index] = condition;
    }
    // Re-render
    updateConditionsTable();
  } else {
    // Add mode
    if (!window.addConditions) {
      window.addConditions = [];
    }
    if (index === -1) {
      window.addConditions.push(condition);
    } else {
      window.addConditions[index] = condition;
    }
    // Re-render "add" conditions
    updateConditionsTable();
  }

  // Close modal
  const conditionModalElem = document.getElementById('ConditionModal');
  if (conditionModalElem) {
    bootstrap.Modal.getInstance(conditionModalElem).hide();
  }
}
