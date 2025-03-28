// // Constants
// const API_ENDPOINT = '/test_route';
// const CONDITION_CATEGORIES = ['Identification', 'Filter'];
// const MAX_COLUMNS_PER_ROW = 4;
//
// // State management
// let state = {
//     apiName: '',
//     apiConfig: {},
//     conditionArray: [],
//     form: null,
//     response: null,
//     sidebar: null,
//     toggleButton: null,
//     apiNameBadge: null
// };
//
// // Initialize the application
// function initializeApp() {
//     // Initialize state
//     state.apiName = window.apiName || '';
//     state.apiConfig = window.api_config || {};
//     state.conditionArray = initializeConditionArray(state.apiConfig.Conditions);
//
//     // Initialize DOM elements
//     state.form = document.getElementById('api-form');
//     state.response = document.getElementById('response');
//     state.sidebar = document.getElementById('sidebar');
//     state.toggleButton = document.querySelector('.toggle-sidebar-btn');
//     state.apiNameBadge = document.getElementById('apiNameBadge');
//
//     if (!state.form) {
//         console.error('Form element not found');
//         return;
//     }
//
//     // Initialize UI
//     generateFormFields();
//     setupEventListeners();
//     updateAPINameBadge();
// }
//
// function initializeConditionArray(conditions) {
//     if (!conditions) return [];
//
//     // Handle conditions array from API config
//     if (Array.isArray(conditions)) {
//         return conditions;
//     }
//
//     // Convert object to array if needed
//     if (typeof conditions === 'object' && conditions !== null) {
//         return [conditions];
//     }
//
//     return [];
// }
//
// function updateAPINameBadge() {
//     if (state.apiNameBadge && state.apiName) {
//         state.apiNameBadge.textContent = state.apiName;
//     }
// }
//
// function setupEventListeners() {
//     // Form submission
//     const submitButton = document.getElementById('submitForm');
//     if (submitButton) {
//         submitButton.addEventListener('click', handleFormSubmit);
//     }
//
//     // Collapsible sections
//     document.querySelectorAll('.collapsible').forEach(button => {
//         button.addEventListener('click', () => toggleCollapsible(button));
//     });
//
//     // Sidebar toggle
//     if (state.toggleButton) {
//         state.toggleButton.addEventListener('click', toggleSidebar);
//     }
//
//     // Response actions
//     const copyButton = document.getElementById('copyResponse');
//     const clearButton = document.getElementById('clearResponse');
//
//     if (copyButton) {
//         copyButton.addEventListener('click', copyResponse);
//     }
//     if (clearButton) {
//         clearButton.addEventListener('click', clearResponse);
//     }
// }
//
// function generateFormFields() {
//     if (!state.form) return;
//     state.form.innerHTML = '';
//
//     // Create category sections
//     CONDITION_CATEGORIES.forEach(category => {
//         const section = createCategorySection(category);
//         state.form.appendChild(section);
//     });
//
//     // Generate input fields for each condition
//     if (Array.isArray(state.conditionArray) && state.conditionArray.length > 0) {
//         state.conditionArray.forEach(condition => {
//             if (condition && typeof condition === 'object') {
//                 createConditionFields(condition);
//             }
//         });
//     } else {
//         // Show a message when no conditions are available
//         const noConditionsMessage = document.createElement('div');
//         noConditionsMessage.className = 'alert alert-info';
//         noConditionsMessage.innerHTML = '<i class="bi bi-info-circle me-2"></i>No parameters available for this API.';
//         state.form.appendChild(noConditionsMessage);
//     }
//
//     // Add submit button
//     const submitButton = createSubmitButton();
//     state.form.appendChild(submitButton);
// }
//
// function createCategorySection(category) {
//     const container = document.createElement('div');
//     container.className = 'category-section mb-4';
//
//     const button = document.createElement('button');
//     button.className = 'collapsible d-flex align-items-center justify-content-between w-100 p-3 mb-2';
//     button.type = 'button';
//
//     const titleSpan = document.createElement('span');
//     titleSpan.innerHTML = `<i class="bi bi-${category === 'Identification' ? 'fingerprint' : 'funnel'} me-2"></i>${category} Parameters`;
//
//     const icon = document.createElement('i');
//     icon.className = 'bi bi-chevron-down transition-transform';
//
//     button.appendChild(titleSpan);
//     button.appendChild(icon);
//
//     const content = document.createElement('div');
//     content.className = 'content';
//     content.id = category;
//
//     container.appendChild(button);
//     container.appendChild(content);
//
//     return container;
// }
//
// function createConditionFields(condition) {
//     if (!condition || typeof condition !== 'object') return;
//
//     Object.entries(condition).forEach(([key, field]) => {
//         if (field && typeof field === 'object' && field.category) {
//             const inputGroup = createInputGroup(key, field);
//             const categorySection = document.getElementById(field.category);
//
//             if (categorySection) {
//                 addInputToGrid(categorySection, inputGroup);
//             }
//         }
//     });
// }
//
// function createInputGroup(key, field) {
//     if (!field || typeof field !== 'object') return null;
//
//     const inputGroup = document.createElement('div');
//     inputGroup.className = 'input-group mb-3';
//
//     const label = document.createElement('label');
//     label.className = 'form-label';
//     label.textContent = field.Name || key;
//
//     const input = document.createElement('input');
//     input.className = 'form-control';
//     input.type = 'text';
//     input.name = key;
//     input.placeholder = `Enter ${field.Name || key}...`;
//     input.required = true;
//
//     if (field.lang === 'fa') {
//         input.dir = 'rtl';
//         input.lang = 'fa';
//     }
//
//     inputGroup.appendChild(label);
//     inputGroup.appendChild(input);
//
//     return inputGroup;
// }
//
// function addInputToGrid(section, inputGroup) {
//     if (!section || !inputGroup) return;
//
//     let row = section.querySelector('.row:last-child');
//     const columns = row?.querySelectorAll('.col') || [];
//
//     if (!row || columns.length >= MAX_COLUMNS_PER_ROW) {
//         row = document.createElement('div');
//         row.className = 'row g-3';
//         section.appendChild(row);
//     }
//
//     const col = document.createElement('div');
//     col.className = 'col-md-3';
//     col.appendChild(inputGroup);
//     row.appendChild(col);
// }
//
// function createSubmitButton() {
//     const button = document.createElement('button');
//     button.type = 'submit';
//     button.id = 'submitForm';
//     button.className = 'btn btn-primary d-flex align-items-center';
//     button.innerHTML = '<i class="bi bi-lightning-charge me-2"></i>Test API';
//     return button;
// }
//
// async function handleFormSubmit(event) {
//     event.preventDefault();
//
//     try {
//         const formData = new FormData(state.form);
//         const params = Object.fromEntries(formData.entries());
//
//         // Add API name to parameters
//         params.apiName = state.apiName;
//
//         setResponseLoading(true);
//
//         const response = await fetch('/api/test_route', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: JSON.stringify(params)
//         });
//
//         if (!response.ok) {
//             const errorData = await response.json();
//             throw new Error(errorData.error || 'API request failed');
//         }
//
//         const data = await response.json();
//         displayResponse(data);
//     } catch (error) {
//         displayError(error);
//     } finally {
//         setResponseLoading(false);
//     }
// }
//
// function setResponseLoading(isLoading) {
//     if (!state.response) return;
//
//     const responseSection = document.querySelector('.response-section');
//     if (isLoading) {
//         responseSection?.classList.add('loading');
//         state.response.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
//     } else {
//         responseSection?.classList.remove('loading');
//     }
// }
//
// function displayResponse(data) {
//     if (!state.response) return;
//
//     // Create a formatted response with sections
//     const formattedResponse = {
//         status: data.success ? 'Success' : 'Error',
//         database: data.database,
//         rowCount: data.RowCount,
//         lastUpdate: data.LastUpdateDate,
//         parameters: data.parameters,
//         query: data.query,
//         pagination: data.pagination,
//         results: data.Data
//     };
//
//     // Display formatted JSON with syntax highlighting
//     state.response.innerHTML = `
//         <div class="response-header mb-3">
//             <span class="badge ${data.success ? 'bg-success' : 'bg-danger'}">
//                 ${formattedResponse.status}
//             </span>
//             <span class="ms-2">Row Count: ${formattedResponse.rowCount}</span>
//         </div>
//         <pre class="json-response">${JSON.stringify(formattedResponse, null, 2)}</pre>
//     `;
// }
//
// function displayError(error) {
//     if (!state.response) return;
//     state.response.innerHTML = `<div class="text-danger"><i class="bi bi-exclamation-triangle me-2"></i>Error: ${error.message}</div>`;
// }
//
// function toggleCollapsible(button) {
//     if (!button) return;
//
//     button.classList.toggle('active');
//     const content = button.nextElementSibling;
//     const icon = button.querySelector('.bi-chevron-down');
//
//     if (!content || !icon) return;
//
//     if (content.style.maxHeight) {
//         content.style.maxHeight = null;
//         icon.style.transform = 'rotate(0deg)';
//     } else {
//         content.style.maxHeight = content.scrollHeight + "px";
//         icon.style.transform = 'rotate(180deg)';
//     }
// }
//
// function toggleSidebar() {
//     state.sidebar?.classList.toggle('show');
// }
//
// async function copyResponse() {
//     if (!state.response?.textContent) return;
//
//     try {
//         await navigator.clipboard.writeText(state.response.textContent);
//         showToast('Response copied to clipboard!');
//     } catch (err) {
//         showToast('Failed to copy response', 'danger');
//     }
// }
//
// function clearResponse() {
//     if (state.response) {
//         state.response.textContent = '';
//     }
// }
//
// function showToast(message, type = 'success') {
//     const toast = document.createElement('div');
//     toast.className = `toast align-items-center text-white bg-${type} border-0`;
//     toast.setAttribute('role', 'alert');
//     toast.setAttribute('aria-live', 'assertive');
//     toast.setAttribute('aria-atomic', 'true');
//
//     toast.innerHTML = `
//         <div class="d-flex">
//             <div class="toast-body">
//                 ${message}
//             </div>
//             <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
//         </div>
//     `;
//
//     document.body.appendChild(toast);
//     const bsToast = new bootstrap.Toast(toast);
//     bsToast.show();
//
//     toast.addEventListener('hidden.bs.toast', () => toast.remove());
// }
//
// // Initialize when DOM is loaded
// document.addEventListener('DOMContentLoaded', initializeApp);