// // API List JavaScript
// // Global flag to track if the API list has already been loaded
// let apiListLoaded = false;
// let pageInitialized = false;
//
// // ////console.log('apiList.js  - initial state:', { apiListLoaded, pageInitialized });
// let static = {
//     currentConditions:[],
//     currentTransformations:[]
// };
//
// // Create a cache for API data to prevent duplicate fetches
// const apiCache = {
//     data: null,
//     timestamp: null,
//     isValid: function() {
//         if (!this.data || !this.timestamp) return false;
//         // Cache valid for 5 minutes
//         return (Date.now() - this.timestamp) < 300000;
//     },
//     set: function(data) {
//         this.data = data;
//         this.timestamp = Date.now();
//         ////console.log('API data cached at:', new Date(this.timestamp).toISOString());
//     },
//     get: function() {
//         return this.data;
//     },
//     clear: function() {
//         this.data = null;
//         this.timestamp = null;
//     }
// };
//
// document.addEventListener('DOMContentLoaded', function() {
//     ////console.log('DOMContentLoaded fired, checking initialization state:', { apiListLoaded, pageInitialized });
//
//     // Check if already initialized to prevent double loading
//     // if (pageInitialized) {
//     //     ////console.log('Page already initialized, skipping');
//     //     return;
//     // }
//
//     // Mark as initialized immediately
//     // Only initialize if not already loaded
//         //console.log('Initializing API list');
//         initializeApiList();
//         initializeEventListeners();
//         initializeSidebarToggle(); // Initialize sidebar toggle functionality
//
// });
//
// /**
//  * Initialize the API list by fetching and displaying API data
//  */
// function initializeApiList() {
//     // Set the loaded flag to prevent double initialization
//     // apiListLoaded = true;
//
//     const apiTableBody = document.getElementById('apiTableBody');
//     if (!apiTableBody) {
//         console.warn('API table body element not found');
//         return;
//     }
//
//
//     // Check if we have cached data first
//     if (apiCache.isValid()) {
//         populateApiTable(apiTableBody, apiCache.get());
//         return;
//     }
//
//     // First try to use the server-provided data
//     // if (window.apiList && window.apiConfigs) {
//     //
//     //     // Cache the data for future use
//     //     apiCache.set({ apiList: window.apiList, apiConfigs: window.apiConfigs });
//     //
//     //     populateApiTable(apiTableBody, window.apiList, window.apiConfigs);
//     //     return;
//     // }
//
//     // Prevent multiple API fetches
//     // if (apiTableBody.dataset.fetchInProgress === 'true') {
//     //     //console.log('API fetch already in progress, skipping');
//     //     return;
//     // }
//
//     // Otherwise fetch from API endpoint
//     //console.log('Fetching API data from endpoint');
//     // apiTableBody.dataset.fetchInProgress = 'true';
//
//     fetch('/api/api_details')
//         .then(response => {
//             if (!response.ok) {
//                 throw new Error('Network response was not ok: ' + response.statusText);
//             }
//             return response.json();
//         })
//         .then(apis => {
//
//             // Cache the data for future use
//             apiCache.set(apis);
//
//             populateApiTable(apiTableBody, apis);
//             apiTableBody.dataset.fetchInProgress = 'false';
//         })
//         .catch(error => {
//             //console.error('Error fetching API details:', error);
//             showAlert('Error loading API details', 'danger');
//             apiTableBody.dataset.fetchInProgress = 'false';
//
//             // Show error in the table
//             apiTableBody.innerHTML = `
//                 <tr>
//                     <td colspan="7" class="text-center text-danger">
//                         <i class="bi bi-exclamation-triangle me-2"></i>
//                         Error loading API data: ${error.message}
//                     </td>
//                 </tr>
//             `;
//         });
// }
//
// // Helper function to populate the API table
// function populateApiTable(tableBody, apis, apiConfigs = null) {
//
//
//     tableBody.innerHTML = '';
//
//     // If we have no APIs to show
//     if (!apis || (Array.isArray(apis) && apis.length === 0) || (typeof apis === 'object' && Object.keys(apis).length === 0)) {
//         tableBody.innerHTML = `
//             <tr>
//                 <td colspan="7" class="text-center">
//                     No APIs found. Click "Add New API" to create one.
//                 </td>
//             </tr>
//         `;
//         tableBody.dataset.populated = 'true';
//         return;
//     }
//
//     // If we have apiConfigs, we need to process api_list format
//     if (apiConfigs) {
//         // Convert from api_list and api_configs format to expected format
//         apis = apis.map(apiName => {
//             const config = apiConfigs[apiName] || {};
//
//             // Extract database information, accounting for different structures
//             let dbInfo = {
//                 type: '',
//                 table: '',
//                 name: ''
//             };
//
//             // Handle different database property structures
//             if (config.database) {
//                 dbInfo.type = config.database.type || '';
//                 dbInfo.table = config.database.table || '';
//                 dbInfo.name = config.database.name || '';
//             }
//
//             // Check for alternative property names
//             if (config.TableName && !dbInfo.table) {
//                 dbInfo.table = config.TableName;
//             }
//
//             if (config.DatabaseType && !dbInfo.type) {
//                 dbInfo.type = config.DatabaseType;
//             }
//
//             return {
//                 id: apiName,
//                 name: config.name || apiName,
//                 displayName: config.displayName || config.name || apiName,
//                 version: config.version || new Date().toLocaleString(),
//                 description: config.description || '',
//                 database: dbInfo
//             };
//         });
//     }
//
//     // Now build the table rows
//     apis.forEach(api => {
//         const row = document.createElement('tr');
//
//         // Format the database information
//         let dbType = '';
//         let dbTable = '';
//
//         // Handle different database field structures
//         if (api.database) {
//             // Direct properties
//             if (typeof api.database.type === 'string') {
//                 dbType = api.database.type;
//             }
//             if (typeof api.database.table === 'string') {
//                 dbTable = api.database.table;
//             }
//
//             // Handle legacy/different formats
//             if (!dbType && api.database.DatabaseType) {
//                 dbType = api.database.DatabaseType;
//             }
//             if (!dbTable && api.database.TableName) {
//                 dbTable = api.database.TableName;
//             }
//         }
//
//         // Get text-friendly version of the API description
//         const description = api.description || '';
//
//         // Build the HTML for the row
//         row.innerHTML = `
//             <td>${api.id}</td>
//             <td>${api.name || api.displayName || api.id}</td>
//             <td>${api.version || new Date().toLocaleString()}</td>
//             <td>${dbType}</td>
//             <td>${dbTable}</td>
//             <td class="text-truncate" style="max-width: 200px;">${description}</td>
//             <td>
//                 <button class="btn btn-sm btn-outline-primary me-1" onclick="editApi('${api.id}')">
//                     Edit
//                 </button>
//                 <button class="btn btn-sm btn-outline-danger me-1" onclick="deleteApi('${api.id}')">
//                     Delete
//                 </button>
//             </td>
//         `;
//
//         tableBody.appendChild(row);
//     });
//
//
//     // Initialize DataTable if library is available
//     // if (typeof simpleDatatables !== 'undefined') {
//     //     // Check if we already have a dataTable instance
//     //     try {
//     //         // If DataTable is already initialized, destroy it first
//     //         if (window.apiDataTable) {
//     //             window.apiDataTable.destroy();
//     //         }
//     //
//     //         // Find the table element
//     //         const tableElement = document.querySelector("table.datatable-table");
//     //         if (!tableElement) {
//     //             return;
//     //         }
//     //
//     //         //console.log('Initializing new DataTable instance');
//     //         // Initialize new DataTable
//     //         window.apiDataTable = new simpleDatatables.DataTable(tableElement, {
//     //             perPage: 10,
//     //             perPageSelect: [5, 10, 15, 20, 25, 50],
//     //             searchable: true,
//     //             sortable: true,
//     //             fixedHeight: false,
//     //             labels: {
//     //                 placeholder: "Search APIs...",
//     //                 perPage: "{select} entries per page",
//     //                 noRows: "No APIs found",
//     //                 info: "Showing {start} to {end} of {rows} entries"
//     //             }
//     //         });
//     //     } catch (error) {
//     //     }
//     // }
// }
//
// // Add this function to initialize the database fields with active database settings
// function initializeAddApiModal() {
//     updateTransformationsContainer();
//
//     window.addConditions = window.addConditions || [];
//
//     const addApiModal = document.getElementById('addApiModal');
//     if (addApiModal) {
//         // When the modal is shown, initialize database fields
//         addApiModal.addEventListener('shown.bs.modal', function() {
//             // Reset conditions for a new API
//             window.addConditions = [];
//             updateAddConditionsTable();
//
//             // Get selected database type (which should be pre-selected by the template)
//             const dbType = document.getElementById('addDatabaseType').value;
//             const dbNameInput = document.getElementById('addDatabaseName');
//
//             if (dbType && dbNameInput) {
//                 // Pre-fill database name if not already filled
//                 if (!dbNameInput.value) {
//                     // Try to get database name from data attribute if present
//                     const dbConfigData = document.getElementById('dbConfigData');
//                     if (dbConfigData) {
//                         const dbConfig = JSON.parse(dbConfigData.dataset.dbConfig || '{}');
//                         if (dbConfig.db_name) {
//                             dbNameInput.value = dbConfig.db_name;
//                         }
//                     }
//                 }
//
//                 // If database type and name are set, load tables
//                 if (dbNameInput.value) {
//                     loadDatabaseTables(dbType, 'addTable', 'addLastUpdateTable');
//                 }
//             }
//         });
//     }
// }
//
// /**
//  * Populate a dropdown with columns from the currently selected table
//  * @param {string} selectElementId - ID of the select element to populate
//  * @param {string|null} selectedValue - Value to select after populating (optional)
//  */
// function populateColumnDropdown(selectElementId, selectedValue = null) {
//     const selectElement = document.getElementById(selectElementId);
//     if (!selectElement) {
//         //console.error(`Column select element with ID '${selectElementId}' not found`);
//         return;
//     }
//
//     // Get context - determine if we're in edit or add mode
//     const isEditMode = document.getElementById('EditApi') &&
//                       (document.getElementById('EditApi').classList.contains('show') ||
//                        window.getComputedStyle(document.getElementById('EditApi')).display !== 'none');
//
//     const tableSelect = isEditMode ?
//                         document.getElementById('editTable') :
//                         document.getElementById('addTable');
//
//     const dbTypeSelect = isEditMode ?
//                          document.getElementById('editDatabaseType') :
//                          document.getElementById('addDatabaseType');
//
//     const dbNameInput = isEditMode ?
//                         document.getElementById('editDatabaseName') :
//                         document.getElementById('addDatabaseName');
//
//     if (!tableSelect || !dbTypeSelect || !dbNameInput) {
//         //console.error('Required elements for column loading not found');
//         return;
//     }
//
//     const tableName = tableSelect.value;
//     const dbType = dbTypeSelect.value;
//     const dbName = dbNameInput.value;
//
//     if (!tableName || !dbType || !dbName) {
//         // Clear the dropdown and add a placeholder option
//         selectElement.innerHTML = '<option value="">Select Table First</option>';
//         return;
//     }
//
//
//     // Show loading state
//     selectElement.innerHTML = '<option value="">Loading columns...</option>';
//
//     // Build the URL with all required parameters
//     const url = `/api/get_table_columns?db_type=${encodeURIComponent(dbType)}&database=${encodeURIComponent(dbName)}&table=${encodeURIComponent(tableName)}`;
//
//     fetch(url)
//         .then(response => {
//             if (!response.ok) {
//                 throw new Error(`HTTP error! status: ${response.status}`);
//             }
//             return response.json();
//         })
//         .then(columns => {
//
//             // Clear existing options
//             selectElement.innerHTML = '<option value="">Select Column</option>';
//
//             // Add columns as options
//             columns.forEach(column => {
//                 const option = document.createElement('option');
//                 option.value = column;
//                 option.textContent = column;
//                 selectElement.appendChild(option);
//             });
//
//             // Select the value if provided
//             if (selectedValue && columns.includes(selectedValue)) {
//                 selectElement.value = selectedValue;
//             }
//         })
//         .catch(error => {
//             //console.error(`Error loading columns for ${selectElementId}:`, error);
//             selectElement.innerHTML = '<option value="">Error loading columns</option>';
//         });
// }
//
// /**
//  * Initialize Condition Modal handlers for column selection
//  */
// // function initializeConditionModal() {
//     // For Edit API modal
//     // const addConditionButton = document.getElementById('addConditionBtn');
//     // if (addConditionButton) {
//     //     addConditionButton.addEventListener('click', function() {
//     //         // Reset form for adding a new condition
//     //         document.getElementById('conditionIndex').value = -1;
//     //         document.getElementById('conditionParameter').value = '';
//     //         document.getElementById('conditionDisplayName').value = '';
//     //         document.getElementById('conditionColumn').innerHTML = '<option value="">Loading columns...</option>';
//     //         document.getElementById('conditionOperator').value = 'eq';
//     //         document.getElementById('conditionType').value = 'string';
//     //
//     //         // Load columns for the column dropdown
//     //         populateColumnDropdown('conditionColumn');
//     //
//     //         // Show the modal
//     //         const conditionModal = new bootstrap.Modal(document.getElementById('addConditionModal'));
//     //         conditionModal.show();
//     //     });
//     // }
//
//     // For Add API modal
//     // const addNewConditionButton = document.getElementById('addNewConditionBtn');
//     // if (addNewConditionButton) {
//     //     addNewConditionButton.addEventListener('click', function() {
//     //         // Reset form for adding a new condition
//     //         document.getElementById('conditionIndex').value = -1;
//     //         document.getElementById('conditionParameter').value = '';
//     //         document.getElementById('conditionDisplayName').value = '';
//     //         document.getElementById('conditionColumn').innerHTML = '<option value="">Loading columns...</option>';
//     //         document.getElementById('conditionOperator').value = 'eq';
//     //         document.getElementById('conditionType').value = 'string';
//     //
//     //         // Load columns for the column dropdown
//     //         populateColumnDropdown('conditionColumn');
//     //
//     //         // Show the modal
//     //         const conditionModal = new bootstrap.Modal(document.getElementById('addConditionModal'));
//     //         conditionModal.show();
//     //     });
//     // }
//     //
//     // When the modal is shown, make sure we have the latest columns
//     // const conditionModal = document.getElementById('addConditionModal');
//     // if (conditionModal) {
//     //     conditionModal.addEventListener('shown.bs.modal', function() {
//     //         populateColumnDropdown('conditionColumn', document.getElementById('conditionColumn').value);
//     //     });
//     // }
// // }
//
// /**
//  * Initialize Transformation Modal handlers for column selection
//  */
// function initializeTransformationModal() {
//     const addTransformationButton = document.getElementById('addTransformationBtn');
//     if (addTransformationButton) {
//         addTransformationButton.addEventListener('click', function() {
//             // Reset form for adding a new transformation
//             document.getElementById('transformationIndex').value = -1;
//             document.getElementById('transformationSource').innerHTML = '<option value="">Loading selected fields...</option>';
//             document.getElementById('transformationType').value = 'copy';
//             document.getElementById('transformationTarget').value = '';
//             document.getElementById('transformationParams').value = '';
//
//             // Load only selected response fields for the source dropdown
//             populateTransformationSourceDropdown();
//
//             // Show the modal
//             const transformationModal = new bootstrap.Modal(document.getElementById('addTransformationModal'));
//             transformationModal.show();
//         });
//     }
//
//     // When the modal is shown, make sure we have the latest selected fields
//     const transformationModal = document.getElementById('addTransformationModal');
//     if (transformationModal) {
//         transformationModal.addEventListener('shown.bs.modal', function() {
//             populateTransformationSourceDropdown(document.getElementById('transformationSource').value);
//         });
//     }
// }
//
// /**
//  * Populate transformation source dropdown with only the selected response fields
//  * @param {string|null} selectedValue - Value to select after populating (optional)
//  */
// function populateTransformationSourceDropdown(selectedValue = null) {
//     const sourceSelect = document.getElementById('transformationSource');
//     if (!sourceSelect) {
//         console.error('Transformation source select element not found');
//         return;
//     }
//
//     // Get context - determine if we're in edit or add mode
//     const isEditMode = document.getElementById('EditApi') &&
//                       (document.getElementById('EditApi').classList.contains('show') ||
//                        window.getComputedStyle(document.getElementById('EditApi')).display !== 'none');
//
//     // Get the response fields select element based on mode
//     const responseFieldsSelect = isEditMode ?
//                                 document.getElementById('responseFields') :
//                                 document.getElementById('addResponseFields');
//
//     if (!responseFieldsSelect) {
//         console.error('Response fields select element not found');
//         sourceSelect.innerHTML = '<option value="">Response fields not found</option>';
//         return;
//     }
//
//     // Get the selected response fields
//     const selectedFields = Array.from(responseFieldsSelect.selectedOptions)
//         .map(option => option.value);
//
//     // If no fields are selected, show a message
//     if (selectedFields.length === 0) {
//         sourceSelect.innerHTML = '<option value="">No response fields selected</option>';
//         return;
//     }
//
//     // Clear existing options
//     sourceSelect.innerHTML = '<option value="">Select Field</option>';
//
//     // Add selected fields as options
//     selectedFields.forEach(field => {
//         const option = document.createElement('option');
//         option.value = field;
//         option.textContent = field;
//         sourceSelect.appendChild(option);
//     });
//
//     // Select the value if provided and it exists in the options
//     if (selectedValue && selectedFields.includes(selectedValue)) {
//         sourceSelect.value = selectedValue;
//     }
//
//     console.log(`Populated transformation source dropdown with ${selectedFields.length} selected fields`);
// }
//
// /**
//  * Edit a condition at specified index
//  * @param {number} index - Index of the condition to edit
//  */
// function editCondition(index) {
//     const condition = static.currentConditions[index];
//
//     document.getElementById('conditionIndex').value = index;
//     document.getElementById('conditionParameter').value = condition.parameter;
//     document.getElementById('conditionDisplayName').value = condition.display_name || '';
//
//     // Set loading placeholder and then populate dropdown
//     document.getElementById('conditionColumn').innerHTML = '<option value="">Loading columns...</option>';
//     populateColumnDropdown('conditionColumn', condition.column);
//
//     document.getElementById('conditionOperator').value = condition.operator;
//     document.getElementById('conditionType').value = condition.type;
//
//     const conditionModal = new bootstrap.Modal(document.getElementById('addConditionModal'));
//     conditionModal.show();
// }
//
// /**
//  * Edit a transformation at specified index
//  * @param {number} index - Index of the transformation to edit
//  */
// function editTransformation(index) {
//     const transformation = static.currentTransformations[index];
//
//     document.getElementById('transformationIndex').value = index;
//
//     // Set loading placeholder and then populate dropdown with only selected response fields
//     document.getElementById('transformationSource').innerHTML = '<option value="">Loading selected fields...</option>';
//     populateTransformationSourceDropdown(transformation.source);
//
//     document.getElementById('transformationType').value = transformation.type;
//     document.getElementById('transformationTarget').value = transformation.target;
//     document.getElementById('transformationParams').value = transformation.params;
//
//     const transformationModal = new bootstrap.Modal(document.getElementById('addTransformationModal'));
//     transformationModal.show();
// }
//
// /**
//  * Initialize event listeners for buttons and forms
//  */
// function initializeEventListeners() {
//     // Initialize database info in add API modal
//     initializeAddApiModal();
//
//     // Initialize condition and transformation modals
//     // initializeConditionModal();
//     initializeTransformationModal();
//
//     // Initialize delete confirmation modal
//     const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
//     if (confirmDeleteBtn) {
//         confirmDeleteBtn.addEventListener('click', performDelete);
//     }
//
//     // Add new API form submission
//     const addApiForm = document.getElementById('addApiForm');
//     if (addApiForm) {
//         //console.log('Initializing event listeners for API form');
//
//         // Database type change event for the Add API modal
//         const addDatabaseType = document.getElementById('addDatabaseType');
//         if (addDatabaseType) {
//             addDatabaseType.addEventListener('change', function() {
//                 //console.log('Database type changed to', this.value);
//                 // Clear the table and columns dropdowns when database type changes
//                 const tableSelect = document.getElementById('addTable');
//                 if (tableSelect) {
//                     tableSelect.innerHTML = '<option value="">Select Table/Collection</option>';
//                 }
//
//                 const responseFields = document.getElementById('addResponseFields');
//                 if (responseFields) {
//                     responseFields.innerHTML = '';
//                 }
//
//                 const orderField = document.getElementById('addDefaultOrderField');
//                 if (orderField) {
//                     orderField.innerHTML = '<option value="">Select Field</option>';
//                 }
//
//                 // Highlight the database name field to indicate it needs to be filled
//                 const dbNameInput = document.getElementById('addDatabaseName');
//                 if (dbNameInput) {
//                     dbNameInput.classList.add('border-primary');
//                     setTimeout(() => dbNameInput.classList.remove('border-primary'), 2000);
//                 }
//             });
//         }
//
//         // Table change event for the Add API modal
//         const addTable = document.getElementById('addTable');
//         if (addTable) {
//             addTable.addEventListener('change', function() {
//                 console.log('Table changed to', this.value);
//                 if (this.value) {
//                     // First make sure the response fields UI is enhanced
//                     enhanceResponseFieldsUI();
//                     // Then load columns for the selected table
//                     loadTableColumns(this.value, 'addResponseFields', 'addDefaultOrderField');
//                 } else {
//                     // Clear the columns dropdowns when no table is selected
//                     const responseFields = document.getElementById('addResponseFields');
//                     if (responseFields) {
//                         responseFields.innerHTML = '';
//                         // If we have checkbox UI, clear it as well
//                         if (window.populateResponseFieldCheckboxes) {
//                             window.populateResponseFieldCheckboxes([], []);
//                         }
//                     }
//
//                     const orderField = document.getElementById('addDefaultOrderField');
//                     if (orderField) {
//                         orderField.innerHTML = '<option value="">Select Field</option>';
//                     }
//                 }
//             });
//         }
//
//         // Database name event for autoloading tables when user leaves the field
//         const dbNameInput = document.getElementById('addDatabaseName');
//         if (dbNameInput) {
//             dbNameInput.addEventListener('blur', function() {
//                 const dbType = document.getElementById('addDatabaseType').value;
//                 if (dbType && this.value) {
//                     // Auto-load tables when the database name is entered and focus leaves the field
//                     loadDatabaseTables(dbType, 'addTable', 'addLastUpdateTable');
//                 }
//             });
//         }
//
//         // Create API button
//         const createApiBtn = document.getElementById('createApiBtn');
//         if (createApiBtn) {
//             createApiBtn.addEventListener('click', function() {
//                 // Validate that we have database info before creating
//                 const dbType = document.getElementById('addDatabaseType').value;
//                 const dbName = document.getElementById('addDatabaseName').value;
//                 const table = document.getElementById('addTable').value;
//
//                 if (!dbType || !dbName || !table) {
//                     // Switch to database tab if not filled
//                     document.getElementById('add-database-tab').click();
//
//                     if (!dbType) {
//                         document.getElementById('addDatabaseType').focus();
//                         showAlert('Please select a database type', 'warning');
//                         return;
//                     }
//
//                     if (!dbName) {
//                         document.getElementById('addDatabaseName').focus();
//                         showAlert('Please enter a database name', 'warning');
//                         return;
//                     }
//
//                     if (!table) {
//                         document.getElementById('addTable').focus();
//                         showAlert('Please select a table/collection', 'warning');
//                         return;
//                     }
//                 }
//
//                 // Validate that we have selected response fields
//                 const responseFields = document.getElementById('addResponseFields');
//                 if (responseFields && responseFields.selectedOptions.length === 0) {
//                     // Switch to response tab if no fields selected
//                     document.getElementById('add-response-tab').click();
//                     responseFields.focus();
//                     showAlert('Please select at least one response field', 'warning');
//                     return;
//                 }
//
//                 createNewApi();
//             });
//         }
//     }
//
//     // Add event listener for the edit table dropdown
//     const editTable = document.getElementById('editTable');
//     if (editTable) {
//         editTable.addEventListener('change', function() {
//             console.log('Edit table changed to', this.value);
//             if (this.value) {
//                 loadTableColumns(this.value, 'responseFields', 'defaultOrderField');
//             } else {
//                 // Clear the columns dropdowns when no table is selected
//                 const responseFields = document.getElementById('responseFields');
//                 if (responseFields) {
//                     responseFields.innerHTML = '';
//                 }
//
//                 const orderField = document.getElementById('defaultOrderField');
//                 if (orderField) {
//                     orderField.innerHTML = '<option value="">Select Field</option>';
//                 }
//             }
//         });
//     }
// }
//
// /**
//  * Create a new API from the Add API form
//  */
// function createNewApi() {
//     const form = document.getElementById('addApiForm');
//     if (!form) return;
//
//     // Basic validation
//     const apiId = document.getElementById('addApiId').value;
//     if (!apiId) {
//         showAlert('API ID is required', 'danger');
//         return;
//     }
//
//     const databaseType = document.getElementById('addDatabaseType').value;
//     if (!databaseType) {
//         showAlert('Database type is required', 'danger');
//         return;
//     }
//
//     const table = document.getElementById('addTable').value;
//     if (!table) {
//         showAlert('Table/Collection is required', 'danger');
//         return;
//     }
//
//     // Gather form data
//     const apiData = {
//         id: apiId,
//         name: document.getElementById('addApiName').value || apiId,
//         version: document.getElementById('addApiVersion').value || '1.0.0',
//         description: document.getElementById('addApiDescription').value || '',
//         tags: document.getElementById('addApiTags').value || '',
//
//         database: {
//             type: databaseType,
//             name: document.getElementById('addDatabaseName').value,
//             table: table,
//             last_update_table: document.getElementById('addLastUpdateTable').value || null
//         },
//
//         pagination: {
//             enabled: document.getElementById('addEnablePagination').checked,
//             default_limit: parseInt(document.getElementById('addDefaultLimit').value) || 10,
//             max_limit: parseInt(document.getElementById('addMaxLimit').value) || 100
//         },
//
//         ordering: {
//             default_field: document.getElementById('addDefaultOrderField').value,
//             default_direction: document.getElementById('addDefaultOrderDirection').value || 'ASC'
//         },
//
//         cache: {
//             enabled: document.getElementById('addEnableCache').checked,
//             ttl: parseInt(document.getElementById('addCacheTTL').value) || 60
//         },
//
//         response_fields: Array.from(document.getElementById('addResponseFields').selectedOptions).map(option => option.value),
//         conditions: window.addConditions || [],
//         transformations: []
//     };
//
//     // Submit API data
//     fetch('/api/update_api', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify(apiData)
//     })
//     .then(response => response.json())
//     .then(data => {
//         if (data.success) {
//             showAlert('API created successfully');
//             // Clear the conditions in case user opens the add modal again
//             window.addConditions = [];
//             // Close modal and refresh page
//             bootstrap.Modal.getInstance(document.getElementById('addApiModal')).hide();
//             setTimeout(() => window.location.reload(), 1500);
//         } else {
//             showAlert(`Error creating API: ${data.error}`, 'danger');
//         }
//     })
//     .catch(error => {
//         //console.error('Error creating API:', error);
//         showAlert('Error creating API', 'danger');
//     });
// }
//
// /**
//  * Edit an API by loading its details into edit modal
//  * @param {string} apiId - The ID of the API to edit
//  */
// function editApi(apiId) {
//
//     // Load API details and open edit modal
//     fetch(`/api/api_details/${apiId}`)
//         .then(response => response.json())
//         .then(apiDetails => {
//             //console.log("Loading API details:", apiDetails); // Debug logging
//
//             // Populate general form fields
//             document.getElementById('editApiId').value = apiId;
//             document.getElementById('editApiName').value = apiDetails.name || apiId;
//             document.getElementById('editApiVersion').value = apiDetails.version || '1.0.0';
//             document.getElementById('editApiDescription').value = apiDetails.description || '';
//
//
//             // Store API details for reference during the loading sequence
//             window.currentEditingApi = apiDetails;
//             static.currentConditions = apiDetails.conditions
//             updateConditionsTable()
//             // Open modal first so elements are visible in the DOM
//             const editModal = new bootstrap.Modal(document.getElementById('EditApi'));
//             editModal.show();
//
//             // Set up event listener for when modal is fully shown
//             document.getElementById('EditApi').addEventListener('shown.bs.modal', function onModalShown() {
//                 // Remove the event listener to prevent multiple executions
//                 document.getElementById('EditApi').removeEventListener('shown.bs.modal', onModalShown);
//
//                 // Now handle database settings in sequence
//                 loadEditApiDatabaseSettings(apiDetails);
//             }, { once: true }); // Use once option to automatically remove after first execution
//         })
//         .catch(error => {
//             //console.error('Error fetching API details:', error);
//             showAlert('Error loading API details for editing', 'danger');
//         });
// }
//
// /**
//  * Load database settings for edit API modal in proper sequence
//  * @param {Object} apiDetails - The API details object
//  */
// function loadEditApiDatabaseSettings(apiDetails) {
//     if (!apiDetails || !apiDetails.database) {
//         //console.error("Missing database information in API details");
//         return;
//     }
//
//     const dbType = apiDetails.database.type;
//     const dbName = apiDetails.database.name;
//     const dbTable = apiDetails.database.table;
//
//     //console.log(`Loading database settings: type=${dbType}, name=${dbName}, table=${dbTable}`);
//
//     // Step 1: Set database type and name
//     const dbTypeSelect = document.getElementById('editDatabaseType');
//     const dbNameInput = document.getElementById('editDatabaseName');
//
//     if (dbTypeSelect && dbNameInput) {
//         dbTypeSelect.value = dbType || '';
//         dbNameInput.value = dbName || '';
//
//         // Only proceed if we have both type and name
//         if (dbType && dbName) {
//             // Step 2: Load tables with the database type and name
//
//             // We'll use a promise-based approach for better control
//             loadDatabaseTablesPromise(dbType, 'editTable', 'editLastUpdateTable')
//                 .then(() => {
//
//                     // Step 3: Set the selected table
//                     const tableSelect = document.getElementById('editTable');
//                     if (tableSelect && dbTable) {
//                         tableSelect.value = dbTable;
//
//                         // Step 4: Load columns for the selected table
//                         //console.log("Loading columns for table:", dbTable);
//                         return loadTableColumnsPromise(dbTable, 'responseFields', 'defaultOrderField');
//                     }
//                 })
//                 .then(() => {
//
//                     // Step 5: Set selected response fields if available
//                     if (apiDetails.response.fields && apiDetails.response.fields.length > 0) {
//                         const responseFieldsSelect = document.getElementById('responseFields');
//                         if (responseFieldsSelect) {
//                             // Select the matching options
//                             Array.from(responseFieldsSelect.options).forEach(option => {
//                                 option.selected = apiDetails.response.fields.includes(option.value);
//                             });
//                         }
//                     }
//
//                     // Step 6: Set pagination, ordering, cache settings
//                     populateOtherApiSettings(apiDetails);
//                 })
//                 .catch(error => {
//                     //console.error("Error in database loading sequence:", error);
//                     showAlert("Error loading database details: " + error.message, "danger");
//                 });
//         }
//     }
// }
//
// /**
//  * Promise-based version of loadDatabaseTables for better control flow
//  */
// function loadDatabaseTablesPromise(dbType, tableSelectId, lastUpdateTableSelectId) {
//     return new Promise((resolve, reject) => {
//         if (!dbType) {
//             reject(new Error("Database type is required"));
//             return;
//         }
//
//         const tableSelect = document.getElementById(tableSelectId);
//         const lastUpdateTableSelect = document.getElementById(lastUpdateTableSelectId);
//
//         if (!tableSelect) {
//             reject(new Error("Table select element not found"));
//             return;
//         }
//
//         // Get the database name
//         const dbNameInput = document.getElementById('editDatabaseName'); // Use specific ID for edit mode
//         if (!dbNameInput || !dbNameInput.value) {
//             reject(new Error("Database name is required"));
//             return;
//         }
//
//         const databaseName = dbNameInput.value;
//         //console.log(`Loading tables for ${dbType} database ${databaseName}`);
//
//         // Show loading state
//         tableSelect.innerHTML = '<option value="">Loading tables...</option>';
//         if (lastUpdateTableSelect) {
//             lastUpdateTableSelect.innerHTML = '<option value="">Loading tables...</option>';
//         }
//
//         fetch(`/api/get_database_tables/${encodeURIComponent(dbType)}?database=${encodeURIComponent(databaseName)}`)
//             .then(response => {
//                 if (!response.ok) {
//                     throw new Error(`HTTP error! status: ${response.status}`);
//                 }
//                 return response.json();
//             })
//             .then(tables => {
//                 //console.log(`Loaded ${tables.length} tables for database ${databaseName}`);
//
//                 // Populate table select
//                 tableSelect.innerHTML = '<option value="">Select Table/Collection</option>';
//
//                 tables.forEach(table => {
//                     const option = document.createElement('option');
//                     option.value = table;
//                     option.textContent = table;
//                     tableSelect.appendChild(option);
//                 });
//
//                 // Populate last update table select if it exists
//                 if (lastUpdateTableSelect) {
//                     lastUpdateTableSelect.innerHTML = '<option value="">Select Last Update Table</option>';
//
//                     tables.forEach(table => {
//                         const option = document.createElement('option');
//                         option.value = table;
//                         option.textContent = table;
//                         lastUpdateTableSelect.appendChild(option);
//                     });
//                 }
//
//                 resolve(tables);
//             })
//             .catch(error => {
//                 //console.error('Error loading database tables:', error);
//
//                 // Reset selects on error
//                 tableSelect.innerHTML = '<option value="">Select Table/Collection</option>';
//                 if (lastUpdateTableSelect) {
//                     lastUpdateTableSelect.innerHTML = '<option value="">Select Last Update Table</option>';
//                 }
//
//                 reject(error);
//             });
//     });
// }
//
// /**
//  * Promise-based version of loadTableColumns for better control flow
//  */
// function loadTableColumnsPromise(tableName, responseFieldsId, orderFieldId) {
//     return new Promise((resolve, reject) => {
//         if (!tableName) {
//             reject(new Error("Table name is required"));
//             return;
//         }
//
//         // Get the database type and database name
//         const dbTypeSelect = document.getElementById('editDatabaseType');
//         const dbNameInput = document.getElementById('editDatabaseName');
//
//         if (!dbTypeSelect || !dbNameInput) {
//             reject(new Error("Database type or name elements not found"));
//             return;
//         }
//
//         const dbType = dbTypeSelect.value;
//         const dbName = dbNameInput.value;
//
//         if (!dbType || !dbName) {
//             reject(new Error("Database type or name not selected"));
//             return;
//         }
//
//         //console.log(`Loading columns for ${dbType} database ${dbName}, table ${tableName}`);
//
//         // Build the URL with all required parameters
//         const url = `/api/get_table_columns?db_type=${encodeURIComponent(dbType)}&database=${encodeURIComponent(dbName)}&table=${encodeURIComponent(tableName)}`;
//
//         fetch(url)
//             .then(response => {
//                 if (!response.ok) {
//                     throw new Error(`HTTP error! status: ${response.status}`);
//                 }
//                 return response.json();
//             })
//             .then(columns => {
//                 console.log(`Loaded ${columns.length} columns for table ${tableName}`);
//
//                 // Populate response fields select
//                 const responseFields = document.getElementById(responseFieldsId);
//                 if (responseFields) {
//                     // Save current values
//                     const currentValues = Array.from(responseFields.selectedOptions).map(option => option.value);
//
//                     // Clear options
//                     responseFields.innerHTML = '';
//
//                     // Add columns as options
//                     columns.forEach(column => {
//                         const option = document.createElement('option');
//                         option.value = column;
//                         option.textContent = column;
//                         option.selected = currentValues.includes(column);
//                         responseFields.appendChild(option);
//                     });
//                 }
//
//                 // Populate order field select
//                 const orderField = document.getElementById(orderFieldId);
//                 if (orderField) {
//                     // Save current value
//                     const currentValue = orderField.value;
//
//                     // Clear options
//                     orderField.innerHTML = '<option value="">Select Field</option>';
//
//                     // Add columns as options
//                     columns.forEach(column => {
//                         const option = document.createElement('option');
//                         option.value = column;
//                         option.textContent = column;
//                         orderField.appendChild(option);
//                     });
//
//                     // Restore value if possible
//                     if (columns.includes(currentValue)) {
//                         orderField.value = currentValue;
//                     }
//                 }
//
//                 resolve(columns);
//             })
//             .catch(error => {
//                 //console.error('Error loading table columns:', error);
//                 reject(error);
//             });
//     });
// }
//
// /**
//  * Populate other API settings (pagination, ordering, cache)
//  */
// function populateOtherApiSettings(apiDetails) {
//     // Pagination & ordering settings
//     if (apiDetails.pagination) {
//         const enablePagination = document.getElementById('enablePagination');
//         const defaultLimit = document.getElementById('defaultLimit');
//         const maxLimit = document.getElementById('maxLimit');
//
//         if (enablePagination) enablePagination.checked = apiDetails.pagination.enabled || false;
//         if (defaultLimit) defaultLimit.value = apiDetails.pagination.default_limit || 10;
//         if (maxLimit) maxLimit.value = apiDetails.pagination.max_limit || 100;
//     }
//
//     if (apiDetails.ordering) {
//         const defaultOrderField = document.getElementById('defaultOrderField');
//         const defaultOrderDirection = document.getElementById('defaultOrderDirection');
//
//         if (defaultOrderField && apiDetails.ordering.default_field) {
//             setTimeout(() => {
//                 defaultOrderField.value = apiDetails.ordering.default_field || '';
//             }, 100); // Small delay to ensure options are populated
//         }
//
//         if (defaultOrderDirection) defaultOrderDirection.value = apiDetails.ordering.default_direction || 'ASC';
//     }
//
//     // Cache settings
//     if (apiDetails.cache) {
//         const enableCache = document.getElementById('enableCache');
//         const cacheTTL = document.getElementById('cacheTTL');
//
//         if (enableCache) enableCache.checked = apiDetails.cache.enabled || false;
//         if (cacheTTL) cacheTTL.value = apiDetails.cache.ttl || 60;
//     }
//     // Set up conditions and transformations if available
//     if (apiDetails.conditions && Array.isArray(apiDetails.conditions)) {
//
//         static.currentConditions = apiDetails.conditions;
//         updateConditionsTable();
//     }
//
//     if (apiDetails.transformations && Array.isArray(apiDetails.transformations)) {
//         static.currentTransformations = apiDetails.transformations;
//         updateTransformationsContainer();
//     }
//
// }
//
// /**
//  * Delete an API by ID
//  * @param {string} apiId - The ID of the API to delete
//  */
// function deleteApi(apiId) {
//     showDeleteConfirmation(
//         'api',
//         apiId,
//         `Are you sure you want to delete the API "${apiId}"?`
//     );
// }
//
// /**
//  * Actually delete the API after confirmation
//  * @param {string} apiId - The ID of the API to delete
//  */
// function deleteApiConfirmed(apiId) {
//     fetch(`/api/delete_api/${apiId}`, {
//         method: 'DELETE'
//     })
//     .then(response => response.json())
//     .then(data => {
//         if (data.success) {
//             showAlert(`API "${apiId}" deleted successfully`);
//             // Refresh the page to update the table
//             setTimeout(() => window.location.reload(), 1500);
//         } else {
//             showAlert(`Error deleting API: ${data.error}`, 'danger');
//         }
//     })
//     .catch(error => {
//         //console.error('Error deleting API:', error);
//         showAlert('Error deleting API', 'danger');
//     });
// }
//
// /**
//  * Show an alert message to the user
//  * @param {string} message - The message to display
//  * @param {string} type - Alert type (success, danger, warning, info)
//  */
// function showAlert(message, type = 'success') {
//     const alertContainer = document.getElementById('alertContainer');
//     if (!alertContainer) return;
//
//     const alert = document.createElement('div');
//     alert.className = `alert alert-${type} alert-dismissible fade show`;
//     alert.innerHTML = `
//         ${message}
//         <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
//     `;
//     alertContainer.appendChild(alert);
//
//     // Auto-dismiss after 5 seconds
//     setTimeout(() => {
//         alert.classList.remove('show');
//         setTimeout(() => alert.remove(), 150);
//     }, 5000);
// }
//
// /**
//  * Edit a condition at specified index
//  * @param {number} index - Index of the condition to edit
//  */
// // function editCondition(index) {
// //     const condition = static.currentConditions[index];
// //
// //     document.getElementById('conditionIndex').value = index;
// //     document.getElementById('conditionParameter').value = condition.parameter;
// //     document.getElementById('conditionDisplayName').value = condition.display_name || '';
// //
// //     // Set loading placeholder and then populate dropdown
// //     document.getElementById('conditionColumn').innerHTML = '<option value="">Loading columns...</option>';
// //     populateColumnDropdown('conditionColumn', condition.column);
// //
// //     document.getElementById('conditionOperator').value = condition.operator;
// //     document.getElementById('conditionType').value = condition.type;
// //
// //     const conditionModal = new bootstrap.Modal(document.getElementById('addConditionModal'));
// //     conditionModal.show();
// // }
//
// /**
//  * Delete a condition at specified index
//  * @param {number} index - Index of the condition to delete
//  */
// function deleteCondition(index) {
//     showDeleteConfirmation(
//         'condition',
//         index,
//         'Are you sure you want to delete this condition?'
//     );
// }
//
// /**
//  * Actually delete the condition after confirmation
//  * @param {number} index - Index of the condition to delete
//  */
// function deleteConditionConfirmed(index) {
//     static.currentConditions.splice(index, 1);
//     updateConditionsTable();
// }
//
// /**
//  * Edit a transformation at specified index
//  * @param {number} index - Index of the transformation to edit
//  */
// // function editTransformation(index) {
// //     const transformation = static.currentTransformations[index];
// //
// //     document.getElementById('transformationIndex').value = index;
// //
// //     // Set loading placeholder and then populate dropdown with only selected response fields
// //     document.getElementById('transformationSource').innerHTML = '<option value="">Loading selected fields...</option>';
// //     populateTransformationSourceDropdown(transformation.source);
// //
// //     document.getElementById('transformationType').value = transformation.type;
// //     document.getElementById('transformationTarget').value = transformation.target;
// //     document.getElementById('transformationParams').value = transformation.params;
// //
// //     const transformationModal = new bootstrap.Modal(document.getElementById('addTransformationModal'));
// //     transformationModal.show();
// // }
//
// /**
//  * Delete a transformation at specified index
//  * @param {number} index - Index of the transformation to delete
//  */
// function deleteTransformation(index) {
//     showDeleteConfirmation(
//         'transformation',
//         index,
//         'Are you sure you want to delete this transformation?'
//     );
// }
//
// /**
//  * Actually delete the transformation after confirmation
//  * @param {number} index - Index of the transformation to delete
//  */
// function deleteTransformationConfirmed(index) {
//     static.currentTransformations.splice(index, 1);
//     updateTransformationsContainer();
// }
//
// /**
//  * Load tables for a specific database type
//  * @param {string} dbType - Type of database to load tables for
//  * @param {string} tableSelectId - ID of the table select element
//  * @param {string} lastUpdateTableSelectId - ID of the last update table select element
//  */
// function loadDatabaseTables(dbType, tableSelectId = 'editTable', lastUpdateTableSelectId = 'editLastUpdateTable') {
//     if (!dbType) return;
//
//     const tableSelect = document.getElementById(tableSelectId);
//     const lastUpdateTableSelect = document.getElementById(lastUpdateTableSelectId);
//
//     if (!tableSelect) return;
//
//     // Get the database name
//     const dbNameInput = document.getElementById('addDatabaseName') || document.getElementById('editDatabaseName');
//     if (!dbNameInput || !dbNameInput.value) {
//         showAlert('Please enter a database name first', 'warning');
//         return;
//     }
//
//     const databaseName = dbNameInput.value;
//     //console.log(`Loading tables for ${dbType} database ${databaseName}`);
//
//     // Show loading state
//     tableSelect.innerHTML = '<option value="">Loading tables...</option>';
//     if (lastUpdateTableSelect) {
//         lastUpdateTableSelect.innerHTML = '<option value="">Loading tables...</option>';
//     }
//
//     fetch(`/api/get_database_tables/${encodeURIComponent(dbType)}?database=${encodeURIComponent(databaseName)}`)
//         .then(response => {
//             if (!response.ok) {
//                 throw new Error(`HTTP error! status: ${response.status}`);
//             }
//             return response.json();
//         })
//         .then(tables => {
//             //console.log(`Loaded ${tables.length} tables for database ${databaseName}`);
//
//             // Populate table select
//             tableSelect.innerHTML = '<option value="">Select Table/Collection</option>';
//
//             tables.forEach(table => {
//                 const option = document.createElement('option');
//                 option.value = table;
//                 option.textContent = table;
//                 tableSelect.appendChild(option);
//             });
//
//             // Populate last update table select if it exists
//             if (lastUpdateTableSelect) {
//                 lastUpdateTableSelect.innerHTML = '<option value="">Select Last Update Table</option>';
//
//                 tables.forEach(table => {
//                     const option = document.createElement('option');
//                     option.value = table;
//                     option.textContent = table;
//                     lastUpdateTableSelect.appendChild(option);
//                 });
//             }
//
//             // If tables are found, show a success message
//             if (tables.length > 0) {
//                 showAlert(`Found ${tables.length} tables in ${databaseName}`, 'success');
//             } else {
//                 showAlert(`No tables found in database ${databaseName}`, 'warning');
//             }
//         })
//         .catch(error => {
//             //console.error('Error loading database tables:', error);
//             showAlert(`Error loading tables: ${error.message}`, 'danger');
//
//             // Reset selects on error
//             tableSelect.innerHTML = '<option value="">Select Table/Collection</option>';
//             if (lastUpdateTableSelect) {
//                 lastUpdateTableSelect.innerHTML = '<option value="">Select Last Update Table</option>';
//             }
//         });
// }
//
// function updateConditionsTable() {
//     const conditionsTableBody = document.getElementById('conditionsTableBody');
//     if (!conditionsTableBody) return;
//
//     conditionsTableBody.innerHTML = '';
//     static.currentConditions.forEach((condition, index) => {
//         const row = document.createElement('tr');
//         row.dataset.index = index;
//         condition = Object.values(condition)[0]
//         console.log(condition)
//         row.innerHTML = `
//             <td>${condition.parameter}</td>
//             <td>${condition.display_name || condition.parameter}</td>
//             <td>${condition.column}</td>
//             <td>${condition.operator}</td>
//             <td>${condition.data_type}</td>
//             <td>
//                 <div class="btn-group">
//                     <button type="button" class="btn btn-sm btn-primary me-1" onclick="editCondition(${index})">
//                         <i class="bi bi-pencil"></i>
//                     </button>
//                     <button type="button" class="btn btn-sm btn-danger" onclick="deleteCondition(${index})">
//                         <i class="bi bi-trash"></i>
//                     </button>
//                 </div>
//             </td>
//         `;
//
//         conditionsTableBody.appendChild(row);
//     });
// }
//
// function updateTransformationsContainer() {
//     const container = document.getElementById('transformationsContainer');
//     if (!container) return;
//
//     container.innerHTML = '';
//
//     static.currentTransformations.forEach((transformation, index) => {
//         const card = document.createElement('div');
//         card.className = 'card mb-2';
//         card.dataset.index = index;
//
//         card.innerHTML = `
//             <div class="card-body py-2 px-3">
//                 <div class="d-flex justify-content-between align-items-center">
//                     <div>
//                         <strong>${transformation.source}</strong> →
//                         <strong>${transformation.target}</strong>
//                         <span class="badge bg-secondary ms-2">${transformation.type}</span>
//                     </div>
//                     <div class="btn-group">
//                         <button type="button" class="btn btn-sm btn-outline-primary" onclick="editTransformation(${index})">
//                             <i class="bi bi-pencil"></i>
//                         </button>
//                         <button type="button" class="btn btn-sm btn-outline-danger" onclick="deleteTransformation(${index})">
//                             <i class="bi bi-trash"></i>
//                         </button>
//                     </div>
//                 </div>
//             </div>
//         `;
//
//         container.appendChild(card);
//     });
// }
//
// function saveCondition() {
//     const index = parseInt(document.getElementById('conditionIndex').value);
//     const condition = {
//         parameter: document.getElementById('conditionParameter').value,
//         display_name: document.getElementById('conditionDisplayName').value,
//         column: document.getElementById('conditionColumn').value,
//         operator: document.getElementById('conditionOperator').value,
//         type: document.getElementById('conditionType').value
//     };
//
//     // Get context - determine if we're in edit or add mode
//     const isEditMode = document.getElementById('EditApi') &&
//                       (document.getElementById('EditApi').classList.contains('show') ||
//                        window.getComputedStyle(document.getElementById('EditApi')).display !== 'none');
//
//     // Use the appropriate conditions array based on modal
//     if (isEditMode) {
//         // Edit API modal - use static.currentConditions
//         if (index === -1) {
//             // Add new condition
//             static.currentConditions.push(condition);
//         } else {
//             // Update existing condition
//             static.currentConditions[index] = condition;
//         }
//
//         // Update the conditions table
//         updateConditionsTable();
//     } else {
//         // Add API modal - use window.addConditions array if it exists, otherwise create it
//         if (!window.addConditions) {
//             window.addConditions = [];
//         }
//
//         if (index === -1) {
//             // Add new condition
//             window.addConditions.push(condition);
//         } else {
//             // Update existing condition
//             window.addConditions[index] = condition;
//         }
//
//         // Update the add conditions table
//         updateAddConditionsTable();
//     }
//
//     // Close modal
//     bootstrap.Modal.getInstance(document.getElementById('addConditionModal')).hide();
// }
//
// function saveTransformation() {
//     const index = parseInt(document.getElementById('transformationIndex').value);
//     const transformation = {
//         source: document.getElementById('transformationSource').value,
//         type: document.getElementById('transformationType').value,
//         target: document.getElementById('transformationTarget').value,
//         params: document.getElementById('transformationParams').value
//     };
//
//     if (index === -1) {
//         // Add new transformation
//         static.currentTransformations.push(transformation);
//     } else {
//         // Update existing transformation
//         static.currentTransformations[index] = transformation;
//     }
//
//     // Update the transformations container
//     updateTransformationsContainer();
//
//     // Close modal
//     bootstrap.Modal.getInstance(document.getElementById('addTransformationModal')).hide();
// }
//
// function saveApi() {
//     const formData = new FormData(document.getElementById('editApiForm'));
//     const apiData = {
//         id: document.getElementById('editApiId').value,
//         name: document.getElementById('editApiName').value,
//         version: document.getElementById('editApiVersion').value,
//         description: document.getElementById('editApiDescription').value,
//
//         database: {
//             type: document.getElementById('editDatabaseType').value,
//             name: document.getElementById('editDatabaseName').value,
//             table: document.getElementById('editTable').value,
//             last_update_table: document.getElementById('editLastUpdateTable').value || null
//         },
//
//         pagination: {
//             enabled: document.getElementById('enablePagination').checked,
//             default_limit: parseInt(document.getElementById('defaultLimit').value),
//             max_limit: parseInt(document.getElementById('maxLimit').value)
//         },
//
//         ordering: {
//             default_field: document.getElementById('defaultOrderField').value,
//             default_direction: document.getElementById('defaultOrderDirection').value
//         },
//
//         cache: {
//             enabled: document.getElementById('enableCache').checked,
//             ttl: parseInt(document.getElementById('cacheTTL').value)
//         },
//
//         // response_fields: ,
//         conditions: static.currentConditions,
//         response:{
//             fields:Array.from(document.getElementById('responseFields').selectedOptions).map(option => option.value),
//             transformations:static.currentTransformations
//         }
//         // transformations:
//     };
//
//     // Save API to server
//     fetch('/api/update_api', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify(apiData)
//     })
//     .then(response => response.json())
//     .then(data => {
//         if (data.success) {
//             showAlert('API saved successfully');
//             // Close modal and refresh page
//             bootstrap.Modal.getInstance(document.getElementById('EditApi')).hide();
//             setTimeout(() => window.location.reload(), 1500);
//         } else {
//             showAlert(`Error saving API: ${data.error}`, 'danger');
//         }
//     })
//     .catch(error => {
//         ////console.error('Error saving API:', error);
//         showAlert('Error saving API', 'danger');
//     });
// }
//
// function enhanceResponseFieldsUI() {
//     // Find the response fields section in both add and edit modals
//     const addResponseContainer = document.getElementById('add-response');
//     const editResponseContainer = document.getElementById('response'); // Edit modal has different ID
//
//     // Check if the containers already have checkbox UI to avoid duplication
//     if (addResponseContainer && !document.getElementById('addResponseFields_container')) {
//         console.log('Enhancing Add API response fields UI');
//         // Replace the multi-select in add modal
//         convertSelectToCheckboxes(addResponseContainer, 'addResponseFields');
//     }
//
//     if (editResponseContainer && !document.getElementById('responseFields_container')) {
//         console.log('Enhancing Edit API response fields UI');
//         // Replace the multi-select in edit modal
//         convertSelectToCheckboxes(editResponseContainer, 'responseFields');
//     }
// }
//
// function convertSelectToCheckboxes(container, originalSelectId) {
//     // Find the existing select element
//     const originalSelect = document.getElementById(originalSelectId);
//     if (!originalSelect) {
//         console.error(`Original select element with ID ${originalSelectId} not found`);
//         return;
//     }
//
//     // Check if we already created a checkbox container to avoid duplicates
//     if (document.getElementById(`${originalSelectId}_container`)) {
//         console.log(`Checkbox container for ${originalSelectId} already exists, skipping creation`);
//         return;
//     }
//
//     console.log(`Converting ${originalSelectId} to checkboxes`);
//
//     // Create a new container for checkboxes
//     const checkboxContainer = document.createElement('div');
//     checkboxContainer.className = 'response-fields-container mb-3';
//     checkboxContainer.style.maxHeight = '300px';
//     checkboxContainer.style.overflowY = 'auto';
//     checkboxContainer.style.border = '1px solid #dee2e6';
//     checkboxContainer.style.padding = '10px';
//     checkboxContainer.style.borderRadius = '4px';
//     checkboxContainer.id = `${originalSelectId}_container`; // Set ID immediately
//
//     // Add "Select All" checkbox at the top
//     const selectAllDiv = document.createElement('div');
//     selectAllDiv.className = 'mb-2 pb-2 border-bottom';
//
//     const selectAllCheckbox = document.createElement('input');
//     selectAllCheckbox.type = 'checkbox';
//     selectAllCheckbox.id = `${originalSelectId}_selectAll`;
//     selectAllCheckbox.className = 'form-check-input me-2';
//
//     const selectAllLabel = document.createElement('label');
//     selectAllLabel.htmlFor = `${originalSelectId}_selectAll`;
//     selectAllLabel.className = 'form-check-label fw-bold';
//     selectAllLabel.textContent = 'Select All Fields';
//
//     selectAllDiv.appendChild(selectAllCheckbox);
//     selectAllDiv.appendChild(selectAllLabel);
//     checkboxContainer.appendChild(selectAllDiv);
//
//     // Store checkbox references for select all functionality
//     const fieldCheckboxes = [];
//     checkboxContainer.fieldCheckboxes = fieldCheckboxes; // Store reference on the container itself
//
//     // Create a hidden container to store the original select for form submission
//     // (We'll keep the original select but hide it, updating its values via JS)
//     originalSelect.style.display = 'none';
//     originalSelect.multiple = true;
//
//     // Add event listener to the "Select All" checkbox
//     selectAllCheckbox.addEventListener('change', function() {
//         const isChecked = this.checked;
//         fieldCheckboxes.forEach(checkbox => {
//             checkbox.checked = isChecked;
//             updateSelectOption(originalSelect, checkbox.value, isChecked);
//         });
//
//         // Dispatch a change event to notify listeners
//         originalSelect.dispatchEvent(new Event('change', { bubbles: true }));
//     });
//
//     // Function to update the hidden select element when checkboxes change
//     function updateSelectOption(select, value, isSelected) {
//         Array.from(select.options).forEach(option => {
//             if (option.value === value) {
//                 option.selected = isSelected;
//             }
//         });
//     }
//
//     // Replace the select with our custom checkbox UI
//     originalSelect.parentNode.insertBefore(checkboxContainer, originalSelect.nextSibling);
//
//     // Create placeholder text when no fields are available
//     const placeholderDiv = document.createElement('div');
//     placeholderDiv.className = 'text-muted small text-center py-3';
//     placeholderDiv.textContent = 'Select a table in the Database tab to see available fields';
//     placeholderDiv.id = `${originalSelectId}_placeholder`;
//     checkboxContainer.appendChild(placeholderDiv);
//
//     // Define the populate function that will be called when table columns are loaded
//     window.populateResponseFieldCheckboxes = function(fields, selectedFields = []) {
//         console.log(`populateResponseFieldCheckboxes called for ${originalSelectId} with ${fields.length} fields`);
//
//         // Find the checkbox container by ID
//         const container = document.getElementById(`${originalSelectId}_container`);
//         if (!container) {
//             console.error(`Checkbox container for ${originalSelectId} not found`);
//             return;
//         }
//
//         // Get the field checkboxes array from the container
//         const fieldCheckboxes = container.fieldCheckboxes || [];
//
//         // Remove placeholder if it exists
//         const placeholder = document.getElementById(`${originalSelectId}_placeholder`);
//         if (placeholder) {
//             placeholder.remove();
//         }
//
//         // Clear existing checkboxes (except "Select All")
//         while (container.childElementCount > 1) {
//             container.removeChild(container.lastChild);
//         }
//
//         // Reset the field checkboxes array
//         fieldCheckboxes.length = 0;
//
//         // Clear the original select options
//         while (originalSelect.options.length > 0) {
//             originalSelect.remove(0);
//         }
//
//         console.log(`Populating ${fields.length} fields for ${originalSelectId}`);
//
//         // Add the field checkboxes
//         fields.forEach(field => {
//             // Create checkbox for the field
//             const checkboxDiv = document.createElement('div');
//             checkboxDiv.className = 'form-check';
//
//             const checkbox = document.createElement('input');
//             checkbox.type = 'checkbox';
//             checkbox.id = `${originalSelectId}_${field.replace(/[^a-zA-Z0-9]/g, '_')}`;
//             checkbox.className = 'form-check-input me-2';
//             checkbox.value = field;
//             checkbox.checked = selectedFields.includes(field);
//             fieldCheckboxes.push(checkbox);
//
//             // Create label for the checkbox
//             const label = document.createElement('label');
//             label.htmlFor = checkbox.id;
//             label.className = 'form-check-label';
//             label.textContent = field;
//
//             // Add event listener to update the hidden select when checkbox changes
//             checkbox.addEventListener('change', function() {
//                 updateSelectOption(originalSelect, field, this.checked);
//
//                 // Update "Select All" checkbox based on all individual checkboxes
//                 const selectAll = document.getElementById(`${originalSelectId}_selectAll`);
//                 if (selectAll) {
//                     selectAll.checked = fieldCheckboxes.every(cb => cb.checked);
//                 }
//
//                 // Dispatch a change event to notify listeners
//                 originalSelect.dispatchEvent(new Event('change', { bubbles: true }));
//             });
//
//             // Add checkbox and label to the container
//             checkboxDiv.appendChild(checkbox);
//             checkboxDiv.appendChild(label);
//             container.appendChild(checkboxDiv);
//
//             // Add this option to the hidden select element
//             const option = document.createElement('option');
//             option.value = field;
//             option.text = field;
//             option.selected = checkbox.checked;
//             originalSelect.add(option);
//         });
//
//         // If no fields were added, show the placeholder again
//         if (fields.length === 0) {
//             const placeholderDiv = document.createElement('div');
//             placeholderDiv.className = 'text-muted small text-center py-3';
//             placeholderDiv.textContent = 'No fields available. Please select a table first.';
//             placeholderDiv.id = `${originalSelectId}_placeholder`;
//             container.appendChild(placeholderDiv);
//         }
//
//         // Update "Select All" checkbox state
//         const selectAll = document.getElementById(`${originalSelectId}_selectAll`);
//         if (selectAll) {
//             selectAll.checked = fieldCheckboxes.length > 0 && fieldCheckboxes.every(cb => cb.checked);
//         }
//
//         // Dispatch a change event to notify any listeners that fields have been populated
//         originalSelect.dispatchEvent(new Event('change', { bubbles: true }));
//     };
// }
//
// // Modify the loadTableColumnsPromise function to use checkboxes
// function modifyLoadTableColumnsPromise() {
//     // Get the original function
//     const originalLoadTableColumns = loadTableColumns;
//
//     // Replace it with our enhanced version
//     window.loadTableColumns = function(tableName, responseFieldsId, orderFieldId) {
//         // Call the original function to get the promise
//         return originalLoadTableColumns(tableName, responseFieldsId, orderFieldId)
//             .then(columns => {
//                 // After columns are loaded, populate the checkboxes
//                 // Get the currently selected values from the original select
//                 const responseFieldsSelect = document.getElementById(responseFieldsId);
//                 if (responseFieldsSelect) {
//                     const selectedFields = Array.from(responseFieldsSelect.selectedOptions)
//                         .map(option => option.value);
//
//                     // Use our new function to populate checkboxes
//                     if (window.populateResponseFieldCheckboxes) {
//                         window.populateResponseFieldCheckboxes(columns, selectedFields);
//                     }
//                 }
//
//                 return columns;
//             });
//     };
// }
//
// // Initialize everything when the page loads
// function initializeCheckboxUIEnhancements() {
//     enhanceResponseFieldsUI();
//     modifyLoadTableColumnsPromise();
//
//     // Add event listeners to update transformations when response fields change
//     const addCheckboxContainer = document.getElementById('addResponseFields_container');
//     const editCheckboxContainer = document.getElementById('responseFields_container');
//
//     if (addCheckboxContainer) {
//         addCheckboxContainer.addEventListener('change', function(e) {
//             // If transformation modal is open, update the source dropdown
//             if (document.getElementById('addTransformationModal') &&
//                 document.getElementById('addTransformationModal').classList.contains('show')) {
//                 populateTransformationSourceDropdown(document.getElementById('transformationSource').value);
//             }
//         });
//     }
//
//     if (editCheckboxContainer) {
//         editCheckboxContainer.addEventListener('change', function(e) {
//             // If transformation modal is open, update the source dropdown
//             if (document.getElementById('addTransformationModal') &&
//                 document.getElementById('addTransformationModal').classList.contains('show')) {
//                 populateTransformationSourceDropdown(document.getElementById('transformationSource').value);
//             }
//         });
//     }
//
//     // Also handle the edit modal population
//     const originalPopulateOtherApiSettings = window.populateOtherApiSettings;
//     window.populateOtherApiSettings = function(apiDetails) {
//         // Call the original function
//         originalPopulateOtherApiSettings(apiDetails);
//
//         // Then enhance the response fields if needed
//         if (apiDetails.response_fields && window.populateResponseFieldCheckboxes) {
//             setTimeout(() => {
//                 const responseFields = document.getElementById('responseFields');
//                 if (responseFields) {
//                     // Get all available options
//                     const availableFields = Array.from(responseFields.options)
//                         .map(option => option.value);
//
//                     // Use our checkbox population function
//                     window.populateResponseFieldCheckboxes(
//                         availableFields,
//                         apiDetails.response_fields
//                     );
//                 }
//             }, 300); // Small delay to ensure DOM is updated
//         }
//     };
// }
//
// // Call once on page load
// document.addEventListener('DOMContentLoaded', initializeCheckboxUIEnhancements);
//
// // Also call when adding a new API (modal shown event)
// document.getElementById('addApiModal')?.addEventListener('shown.bs.modal', enhanceResponseFieldsUI);
//
// // Modified loadTableColumns to better handle response fields
// function loadTableColumns(tableName, responseFieldsId, orderFieldId) {
//     if (!tableName) return;
//
//     console.log(`loadTableColumns called for ${tableName}, target: ${responseFieldsId}`);
//
//     // Check if we're in edit or add mode
//     let isEditMode = false;
//     const editModal = document.getElementById('EditApi');
//     if (editModal) {
//         isEditMode = editModal.classList.contains('show') ||
//                     window.getComputedStyle(editModal).display !== 'none';
//     }
//
//     // Get the database type and database name based on mode
//     const dbTypeSelect = isEditMode ?
//                          document.getElementById('editDatabaseType') :
//                          document.getElementById('addDatabaseType');
//
//     const dbNameInput = isEditMode ?
//                         document.getElementById('editDatabaseName') :
//                         document.getElementById('addDatabaseName');
//
//     if (!dbTypeSelect || !dbNameInput) {
//         console.error('Database type or name elements not found');
//         return;
//     }
//
//     const dbType = dbTypeSelect.value;
//     const dbName = dbNameInput.value;
//
//     if (!dbType || !dbName) {
//         console.warn('Database type or name not selected');
//         return;
//     }
//
//     console.log(`Loading columns for table ${tableName} in ${dbType} database ${dbName}`);
//
//     // Build the URL with all required parameters
//     const url = `/api/get_table_columns?db_type=${encodeURIComponent(dbType)}&database=${encodeURIComponent(dbName)}&table=${encodeURIComponent(tableName)}`;
//
//     // Show loading states in affected selects
//     const responseFields = document.getElementById(responseFieldsId);
//     if (responseFields) {
//         // Save current selections if any
//         const currentSelections = Array.from(responseFields.selectedOptions || []).map(option => option.value);
//         console.log(`Current selections for ${responseFieldsId}:`, currentSelections);
//         responseFields.innerHTML = '<option value="">Loading columns...</option>';
//     } else {
//         console.warn(`Response fields element ${responseFieldsId} not found`);
//     }
//
//     const orderField = document.getElementById(orderFieldId);
//     if (orderField) {
//         orderField.innerHTML = '<option value="">Loading columns...</option>';
//     }
//
//     // Also update condition column dropdown if the modal is open
//     const conditionColumn = document.getElementById('conditionColumn');
//     if (conditionColumn && document.getElementById('addConditionModal') &&
//         (document.getElementById('addConditionModal').classList.contains('show') ||
//         window.getComputedStyle(document.getElementById('addConditionModal')).display !== 'none')) {
//         conditionColumn.innerHTML = '<option value="">Loading columns...</option>';
//     }
//
//     fetch(url)
//         .then(response => {
//             if (!response.ok) {
//                 throw new Error(`HTTP error! status: ${response.status}`);
//             }
//             return response.json();
//         })
//         .then(columns => {
//             console.log(`Loaded ${columns.length} columns for table ${tableName}:`, columns);
//
//             // Update response fields select if it exists
//             if (responseFields) {
//                 const currentValues = Array.from(responseFields.selectedOptions || []).map(option => option.value);
//
//                 responseFields.innerHTML = '';
//
//                 columns.forEach(column => {
//                     const option = document.createElement('option');
//                     option.value = column;
//                     option.textContent = column;
//                     option.selected = currentValues.includes(column);
//                     responseFields.appendChild(option);
//                 });
//
//                 // If we have checkbox UI, update it
//                 if (window.populateResponseFieldCheckboxes) {
//                     console.log(`Calling populateResponseFieldCheckboxes for ${responseFieldsId} with ${columns.length} columns`);
//                     // Use checkbox UI to display columns
//                     window.populateResponseFieldCheckboxes(columns, currentValues);
//                 } else {
//                     console.warn('populateResponseFieldCheckboxes function not found');
//                 }
//             }
//
//             // Update ordering field select if it exists
//             if (orderField) {
//                 const currentValue = orderField.value;
//
//                 orderField.innerHTML = '<option value="">Select Field</option>';
//
//                 columns.forEach(column => {
//                     const option = document.createElement('option');
//                     option.value = column;
//                     option.textContent = column;
//                     orderField.appendChild(option);
//                 });
//
//                 // Restore previous value if possible
//                 if (columns.includes(currentValue)) {
//                     orderField.value = currentValue;
//                 }
//             }
//
//             // Update condition column dropdown if it's open
//             if (conditionColumn && document.getElementById('addConditionModal') &&
//                 (document.getElementById('addConditionModal').classList.contains('show') ||
//                 window.getComputedStyle(document.getElementById('addConditionModal')).display !== 'none')) {
//
//                 const currentValue = conditionColumn.value;
//
//                 conditionColumn.innerHTML = '<option value="">Select Column</option>';
//
//                 columns.forEach(column => {
//                     const option = document.createElement('option');
//                     option.value = column;
//                     option.textContent = column;
//                     conditionColumn.appendChild(option);
//                 });
//
//                 // Restore previous value if possible
//                 if (columns.includes(currentValue)) {
//                     conditionColumn.value = currentValue;
//                 }
//             }
//
//             // Update transformations dropdown if the modal is open
//             if (document.getElementById('addTransformationModal') &&
//                 (document.getElementById('addTransformationModal').classList.contains('show') ||
//                 window.getComputedStyle(document.getElementById('addTransformationModal')).display !== 'none')) {
//                 populateTransformationSourceDropdown();
//             }
//
//             return columns;
//         })
//         .catch(error => {
//             console.error(`Error loading columns for table ${tableName}:`, error);
//
//             // Reset selects on error
//             if (responseFields) {
//                 responseFields.innerHTML = '<option value="">Error loading columns</option>';
//             }
//
//             if (orderField) {
//                 orderField.innerHTML = '<option value="">Error loading columns</option>';
//             }
//
//             if (conditionColumn) {
//                 conditionColumn.innerHTML = '<option value="">Error loading columns</option>';
//             }
//
//             showAlert(`Error loading columns: ${error.message}`, 'danger');
//         });
// }
//
// /**
//  * Initialize sidebar toggle functionality
//  * This allows the sidebar to expand when hovered and collapse when mouse leaves
//  */
// function initializeSidebarToggle() {
//     const sidebar = document.querySelector('.sidebar');
//     const mainContent = document.querySelector('.content-wrapper') || document.querySelector('main');
//
//     // If elements don't exist, exit
//     if (!sidebar) {
//         console.warn('Sidebar element not found');
//         return;
//     }
//
//     // Check if we have a stored preference
//     const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
//
//     // Apply initial state
//     if (sidebarCollapsed) {
//         sidebar.classList.add('collapsed');
//         if (mainContent) mainContent.classList.add('expanded');
//     }
//
//     // Add hover events for desktop only (not on mobile)
//     if (window.innerWidth > 768) {
//         // When mouse enters the sidebar
//         sidebar.addEventListener('mouseenter', function() {
//             if (sidebar.classList.contains('collapsed')) {
//                 sidebar.classList.add('hover-expanded');
//
//                 // Prevent table content from being squeezed
//                 if (mainContent && mainContent.classList.contains('expanded')) {
//                     mainContent.style.transition = 'none'; // Temporarily disable transition
//                 }
//             }
//         });
//
//         // When mouse leaves the sidebar
//         sidebar.addEventListener('mouseleave', function() {
//             sidebar.classList.remove('hover-expanded');
//
//             // Reset content wrapper styles
//             if (mainContent) {
//                 setTimeout(() => {
//                     mainContent.style.transition = '';
//                 }, 50);
//             }
//         });
//     }
//
//     // Add a small icon at the bottom of the sidebar to toggle collapse state
//     const toggleIcon = document.createElement('div');
//     toggleIcon.className = 'sidebar-collapse-icon';
//     toggleIcon.innerHTML = sidebarCollapsed ?
//         '<i class="bi bi-chevron-right"></i>' :
//         '<i class="bi bi-chevron-left"></i>';
//     sidebar.appendChild(toggleIcon);
//
//     // Add click event to the toggle icon
//     toggleIcon.addEventListener('click', function(e) {
//         e.stopPropagation();
//
//         // Toggle collapsed class on sidebar
//         sidebar.classList.toggle('collapsed');
//         sidebar.classList.remove('hover-expanded');
//
//         // Toggle expanded class on main content if it exists
//         if (mainContent) {
//             mainContent.classList.toggle('expanded');
//         }
//
//         // Determine if sidebar is now collapsed
//         const isNowCollapsed = sidebar.classList.contains('collapsed');
//
//         // Update the icon
//         this.innerHTML = isNowCollapsed ?
//             '<i class="bi bi-chevron-right"></i>' :
//             '<i class="bi bi-chevron-left"></i>';
//
//         // Store the state in localStorage
//         localStorage.setItem('sidebarCollapsed', isNowCollapsed);
//
//         // Trigger window resize to ensure any charts or tables reflow
//         window.dispatchEvent(new Event('resize'));
//     });
//
//     // Handle window resize
//     window.addEventListener('resize', function() {
//         if (window.innerWidth <= 768) {
//             // On mobile, remove hover behavior
//             sidebar.classList.remove('hover-expanded');
//         }
//     });
// }
//
// /**
//  * Update the Add API conditions table
//  */
// function updateAddConditionsTable() {
//     const conditionsTableBody = document.getElementById('addConditionsTableBody');
//     if (!conditionsTableBody) return;
//
//     conditionsTableBody.innerHTML = '';
//
//     if (!window.addConditions || !Array.isArray(window.addConditions)) {
//         window.addConditions = [];
//         return;
//     }
//
//     console.log("Updating Add API conditions table", window.addConditions);
//
//     window.addConditions.forEach((condition, index) => {
//         const row = document.createElement('tr');
//         row.dataset.index = index;
//
//         row.innerHTML = `
//             <td>${condition.parameter}</td>
//             <td>${condition.display_name || condition.parameter}</td>
//             <td>${condition.column}</td>
//             <td>${condition.operator}</td>
//             <td>${condition.type}</td>
//             <td>
//                 <div class="btn-group">
//                     <button type="button" class="btn btn-sm btn-primary me-1" onclick="editAddCondition(${index})">
//                         <i class="bi bi-pencil"></i>
//                     </button>
//                     <button type="button" class="btn btn-sm btn-danger" onclick="deleteAddCondition(${index})">
//                         <i class="bi bi-trash"></i>
//                     </button>
//                 </div>
//             </td>
//         `;
//
//         conditionsTableBody.appendChild(row);
//     });
// }
//
// /**
//  * Edit a condition in the Add API modal at specified index
//  * @param {number} index - Index of the condition to edit
//  */
// function editAddCondition(index) {
//     const condition = window.addConditions[index];
//
//     document.getElementById('conditionIndex').value = index;
//     document.getElementById('conditionParameter').value = condition.parameter;
//     document.getElementById('conditionDisplayName').value = condition.display_name || '';
//
//     // Set loading placeholder and then populate dropdown
//     document.getElementById('conditionColumn').innerHTML = '<option value="">Loading columns...</option>';
//     populateColumnDropdown('conditionColumn', condition.column);
//
//     document.getElementById('conditionOperator').value = condition.operator;
//     document.getElementById('conditionType').value = condition.type;
//
//     const conditionModal = new bootstrap.Modal(document.getElementById('addConditionModal'));
//     conditionModal.show();
// }
//
// /**
//  * Delete a condition from the Add API modal at specified index
//  * @param {number} index - Index of the condition to delete
//  */
// function deleteAddCondition(index) {
//     showDeleteConfirmation(
//         'addCondition',
//         index,
//         'Are you sure you want to delete this condition?'
//     );
// }
//
// /**
//  * Actually delete the condition from Add API modal after confirmation
//  * @param {number} index - Index of the condition to delete
//  */
// function deleteAddConditionConfirmed(index) {
//     window.addConditions.splice(index, 1);
//     updateAddConditionsTable();
// }
//
// /**
//  * Show delete confirmation modal with the appropriate message and context
//  * @param {string} type - Type of item to delete ('api', 'condition', or 'addCondition')
//  * @param {string|number} identifier - The ID (for API) or index (for condition) to delete
//  * @param {string} message - Custom message to show in the confirmation modal
//  */
// function showDeleteConfirmation(type, identifier, message) {
//     // Set the confirmation message
//     document.getElementById('deleteConfirmMessage').textContent = message;
//
//     // Store the context information in hidden fields
//     document.getElementById('deleteType').value = type;
//
//     if (type === 'api') {
//         document.getElementById('deleteApiId').value = identifier;
//     } else {
//         document.getElementById('deleteIndex').value = identifier;
//     }
//
//     // Show the modal
//     const confirmModal = new bootstrap.Modal(document.getElementById('deleteConfirmationModal'));
//     confirmModal.show();
// }
//
// /**
//  * Perform the actual deletion based on stored context in the confirmation modal
//  */
// function performDelete() {
//     const deleteType = document.getElementById('deleteType').value;
//
//     switch (deleteType) {
//         case 'api':
//             const apiId = document.getElementById('deleteApiId').value;
//             deleteApiConfirmed(apiId);
//             break;
//         case 'condition':
//             const conditionIndex = parseInt(document.getElementById('deleteIndex').value);
//             deleteConditionConfirmed(conditionIndex);
//             break;
//         case 'addCondition':
//             const addConditionIndex = parseInt(document.getElementById('deleteIndex').value);
//             deleteAddConditionConfirmed(addConditionIndex);
//             break;
//         case 'transformation':
//             const transformationIndex = parseInt(document.getElementById('deleteIndex').value);
//             deleteTransformationConfirmed(transformationIndex);
//             break;
//     }
//
//     // Hide the confirmation modal
//     bootstrap.Modal.getInstance(document.getElementById('deleteConfirmationModal')).hide();
// }
