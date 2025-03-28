// document.addEventListener('DOMContentLoaded', function() {
//     // Wait for DOM to be fully loaded
//     const saveConditionBtn = document.getElementById('saveConditionBtn');
//     const addConditionBtn = document.getElementById('addConditionBtn');
//
//     // Check if button exists before adding event listener
//     if (addConditionBtn) {
//         addConditionBtn.addEventListener('click', function() {
//             console.log("Condition button clicked");
//
//             // Make sure modal element exists
//             const modalElement = document.getElementById('ConditionModal');
//             if (!modalElement) {
//                 console.error("Modal element not found!");
//                 return;
//             }
//
//             try {
//                 // Initialize the modal
//                 const conditionModal = new bootstrap.Modal(modalElement);
//
//                 // Reset form
//                 document.getElementById('conditionIndex').value = -1;
//                 if (document.getElementById('conditionForm')) {
//                     document.getElementById('conditionForm').reset();
//                 }
//
//                 // Show modal
//                 conditionModal.show();
//                 console.log("Modal should be visible now");
//             } catch (error) {
//                 console.error("Error showing modal:", error);
//             }
//         });
//     } else {
//         console.error("Add Condition button not found!");
//     }
//
//     initializeConditionModal();
// });
//
// function initializeConditionModal() {
// // Set up event handlers
//
// const saveConditionBtn = document.getElementById('saveConditionBtn');
// const conditionModal = new bootstrap.Modal(document.getElementById('ConditionModal'));
// const addConditionBtn = document.getElementById('addConditionBtn')
// console.log("y",conditionModal)
//
// if (saveConditionBtn) {
//     saveConditionBtn.addEventListener('click', saveCondition);
// }
//
// // Handle the checkboxes for transformation options
// const transformCheckboxes = [
//     { check: 'castCheck', div: 'div-castCheck' },
//     { check: 'trimCheck', div: null }, // No options for trim
//     { check: 'replaceCheck', div: 'div-replaceCheck' },
//     { check: 'substringCheck', div: 'div-substringCheck' },
//     { check: 'sqlCheck', div: 'div-sqlCheck' }
// ];
//
// transformCheckboxes.forEach(item => {
//     const checkbox = document.getElementById(item.check);
//     if (checkbox && item.div) {
//         checkbox.addEventListener('change', function() {
//             const div = document.getElementById(item.div);
//             if (div) {
//                 div.style.display = this.checked ? 'block' : 'none';
//             }
//         });
//     }
// });
//
// // Initialize cast options
// const castOptions = document.getElementById('cast-Options');
// if (castOptions && castOptions.options.length === 0) {
//     const dataTypes = ['string', 'integer', 'float', 'date', 'datetime', 'boolean'];
//     dataTypes.forEach(type => {
//         const option = document.createElement('option');
//         option.value = type;
//         option.textContent = type;
//         castOptions.appendChild(option);
//     });
// }
// }
//
// function saveCondition() {
// const index = parseInt(document.getElementById('conditionIndex').value);
//
// // Get basic condition properties
// const condition = {
//     parameter: document.getElementById('Parameter').value,
//     Name: document.getElementById('Name').value,
//     display_name: document.getElementById('Name').value,
//     Column: document.getElementById('Column').value,
//     Operator: document.getElementById('Operator').value,
//     IgnoreIf: document.getElementById('IgnoreIf').value,
//     required: false,
//     data_type: "string",  // Set default value
//     category: "Identification", // Set default value
//     transformations: {}
// };
//
// // Collect transformation options
// // 1. Cast transformation
// if (document.getElementById('castCheck').checked) {
//     const castType = document.getElementById('cast-Options').value;
//     if (castType) {
//         condition.transformations.cast = castType;
//     }
// }
//
// // 2. Trim transformation
// if (document.getElementById('trimCheck').checked) {
//     condition.transformations.trim = true;
// }
//
// // 3. Replace transformation
// if (document.getElementById('replaceCheck').checked) {
//     const oldVal = document.getElementById('replaceOld').value;
//     const newVal = document.getElementById('replaceNew').value;
//     condition.transformations.replace = [
//         oldVal || null,
//         newVal || null
//     ];
// }
//
// // 4. Substring transformation
// if (document.getElementById('substringCheck').checked) {
//     const start = parseInt(document.getElementById('substringStart').value) || 0;
//     const length = parseInt(document.getElementById('substringLength').value) || 0;
//     if (start >= 0 && length > 0) {
//         condition.transformations.substring = [start, length];
//     }
// }
//
// // 5. SQL command
// if (document.getElementById('sqlCheck').checked) {
//     const sqlCommand = document.getElementById('sqlCommand').value;
//     if (sqlCommand) {
//         condition.transformations.sqlCommand = sqlCommand;
//     }
// }
//
// // Get context - determine if we're in edit or add mode
// const isEditMode = document.getElementById('EditApi') &&
//                   (document.getElementById('EditApi').classList.contains('show') ||
//                    window.getComputedStyle(document.getElementById('EditApi')).display !== 'none');
//
// // Use the appropriate conditions array based on modal
// if (isEditMode) {
//     // Edit API modal - use static.currentConditions
//     if (index === -1) {
//         // Add new condition
//         static.currentConditions.push(condition);
//     } else {
//         // Update existing condition
//         static.currentConditions[index] = condition;
//     }
//
//     // Update the conditions table
//     updateConditionsTable();
// } else {
//     // Add API modal - use window.addConditions array if it exists, otherwise create it
//     if (!window.addConditions) {
//         window.addConditions = [];
//     }
//
//     if (index === -1) {
//         // Add new condition
//         window.addConditions.push(condition);
//     } else {
//         // Update existing condition
//         window.addConditions[index] = condition;
//     }
//
//     // Update the add conditions table
//     updateAddConditionsTable();
// }
//
// // Close modal
// bootstrap.Modal.getInstance(document.getElementById('ConditionModal')).hide();
// }
//
// function editCondition(index) {
// const condition = static.currentConditions[index];
//
// document.getElementById('conditionIndex').value = index;
// document.getElementById('Parameter').value = condition.parameter || condition.Parameter || '';
// document.getElementById('Name').value = condition.Name || condition.display_name || '';
//
// // Set loading placeholder and then populate dropdown
// document.getElementById('Column').innerHTML = '<option value="">Loading columns...</option>';
// populateColumnDropdown('Column', condition.Column || condition.column);
//
// document.getElementById('Operator').value = condition.Operator || condition.operator || '=';
// document.getElementById('IgnoreIf').value = condition.IgnoreIf || '';
//
// // Set transformation values
// const transformations = condition.transformations || {};
//
// // 1. Cast
// document.getElementById('castCheck').checked = !!transformations.cast;
// if (transformations.cast) {
//     const castDiv = document.getElementById('div-castCheck');
//     if (castDiv) castDiv.style.display = 'block';
//
//     const castOptions = document.getElementById('cast-Options');
//     if (castOptions) castOptions.value = transformations.cast;
// }
//
// // 2. Trim
// document.getElementById('trimCheck').checked = !!transformations.trim;
//
// // 3. Replace
// const hasReplace = Array.isArray(transformations.replace);
// document.getElementById('replaceCheck').checked = hasReplace;
// if (hasReplace) {
//     const replaceDiv = document.getElementById('div-replaceCheck');
//     if (replaceDiv) replaceDiv.style.display = 'block';
//
//     document.getElementById('replaceOld').value = transformations.replace[0] || '';
//     document.getElementById('replaceNew').value = transformations.replace[1] || '';
// }
//
// // 4. Substring
// const hasSubstring = Array.isArray(transformations.substring);
// document.getElementById('substringCheck').checked = hasSubstring;
// if (hasSubstring) {
//     const substringDiv = document.getElementById('div-substringCheck');
//     if (substringDiv) substringDiv.style.display = 'block';
//
//     document.getElementById('substringStart').value = transformations.substring[0] || 0;
//     document.getElementById('substringLength').value = transformations.substring[1] || 0;
// }
//
// // 5. SQL Command
// document.getElementById('sqlCheck').checked = !!transformations.sqlCommand;
// if (transformations.sqlCommand) {
//     const sqlDiv = document.getElementById('div-sqlCheck');
//     if (sqlDiv) sqlDiv.style.display = 'block';
//
//     document.getElementById('sqlCommand').value = transformations.sqlCommand || '';
// }
//
// const conditionModal = new bootstrap.Modal(document.getElementById('ConditionModal'));
// conditionModal.show();
// }
//
// // Export functions that need to be used from other files
// window.saveCondition = saveCondition;
// window.editCondition = editCondition;