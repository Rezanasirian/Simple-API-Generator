// Constants
const CONFIG = {
    API_URL: 'http://127.0.0.1:5000/api',
    ROWS_PER_PAGE: 10,
    ALERT_TIMEOUT: 3000,
    API_NAME_PREFIX: 'api'
};

// State management
let state = {
    dataArray: [],
    currentPage: 1,
    rowsPerPage: CONFIG.ROWS_PER_PAGE,
    tableList: window.tableList || [],
    colName: window.colName || [],
    apiList: window.ApiList || [],
    modal: null
};

// Utility functions
function formatDate(date) {
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
}

function createButton(className, text, onClick) {
    const button = document.createElement('button');
    button.className = className;
    button.textContent = text;
    if (onClick) button.addEventListener('click', onClick);
    return button;
}

async function fetchWithTimeout(url, options = {}, timeout = 5000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

// Alert functions
function showAlert(message, type = 'success') {
    const alertContainer = document.getElementById('alertContainer');
    const alert = document.createElement('div');

    alert.className = `alert alert-${type} alert-dismissible fade show shadow`;
    alert.style.zIndex = 2000;
    alert.innerHTML = `
        <strong>${type === 'success' ? 'Success!' : 'Error!'}</strong> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    alertContainer.appendChild(alert);

    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 500);
    }, CONFIG.ALERT_TIMEOUT);
}

// Table functions
function updateTable() {
    const tbody = document.querySelector('.datatable-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    const start = (state.currentPage - 1) * state.rowsPerPage;
    const end = start + state.rowsPerPage;
    const pageData = state.dataArray.slice(start, end);

    pageData.forEach(item => {
        const row = createTableRow(item);
        tbody.appendChild(row);
    });

    updateTableInfo();
}

function createTableRow(item) {
    const row = document.createElement('tr');

    // Add data cells
    ['name', 'tableName', 'lastUpdate'].forEach(key => {
        const cell = document.createElement('td');
        cell.textContent = item[key];
        row.appendChild(cell);
    });

    // Add action buttons
    const actionCell = document.createElement('td');
    actionCell.appendChild(createButton('btn btn-edit', 'Edit',
        () => window.location.href = `/api/edit_api/${item.name}`));
    actionCell.appendChild(createButton('btn btn-delete', 'Delete'));
    actionCell.appendChild(createButton('btn btn-test', 'Test',
        () => window.location.href = `/api/test_api/${item.name}`));

    row.appendChild(actionCell);
    return row;
}

function updateTableInfo() {
    const info = document.querySelector('.datatable-info');
    if (!info) return;

    const start = (state.currentPage - 1) * state.rowsPerPage + 1;
    const end = Math.min(state.currentPage * state.rowsPerPage, state.dataArray.length);
    info.textContent = `Showing ${start} to ${end} of ${state.dataArray.length} entries`;
}

function setupPagination() {
    const pagination = document.querySelector('.datatable-pagination-list');
    if (!pagination) return;

    pagination.innerHTML = '';

    const pageCount = Math.ceil(state.dataArray.length / state.rowsPerPage);
    for (let i = 1; i <= pageCount; i++) {
        const li = document.createElement('li');
        li.className = `datatable-pagination-list-item${i === state.currentPage ? ' datatable-active' : ''}`;

        const button = createButton('datatable-pagination-list-item-link', String(i));
        button.dataset.page = i;
        li.appendChild(button);
        pagination.appendChild(li);
    }
}

// Modal functions
function initializeModal() {
    const modalElement = document.getElementById('addApiModal');
    if (!modalElement) return;

    // Initialize Bootstrap modal
    state.modal = new bootstrap.Modal(modalElement, {
        keyboard: true,
        backdrop: true,
        focus: true
    });

    // Setup modal triggers
    const addApiButton = document.querySelector('.btn-add-api');
    if (addApiButton) {
        addApiButton.addEventListener('click', () => {
            state.modal.show();
        });
    }

    // Setup modal form validation
    modalElement.addEventListener('submit', handleModalSubmit);

    // Handle modal events
    modalElement.addEventListener('hidden.bs.modal', () => {
        const form = modalElement.querySelector('form');
        if (form) form.reset();
    });
}

function handleModalSubmit(event) {
    const apiInput = document.getElementById('APIName');
    const apiName = apiInput?.value.trim();

    if (!apiName) {
        event.preventDefault();
        showAlert('API Name is required', 'danger');
        return;
    }

    if (state.apiList.includes(apiName)) {
        event.preventDefault();
        showAlert('API Name should not be in the existing API list', 'danger');
        return;
    }

    if (!apiName.startsWith(CONFIG.API_NAME_PREFIX)) {
        event.preventDefault();
        showAlert('API Name must start with \'api\'', 'danger');
        return;
    }
}

// Event handler functions
function setupPaginationEvents() {
    const paginationElement = document.querySelector('.datatable-pagination');
    if (!paginationElement) return;

    paginationElement.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const page = parseInt(e.target.dataset.page);
            if (page && page !== state.currentPage) {
                state.currentPage = page;
                updateTable();
                setupPagination();
            }
        }
    });
}

function setupRowsPerPageEvent() {
    const selector = document.querySelector('.datatable-selector');
    if (!selector) return;

    selector.addEventListener('change', (e) => {
        state.rowsPerPage = parseInt(e.target.value);
        state.currentPage = 1;
        updateTable();
        setupPagination();
    });
}

function setupSearchEvent() {
    const searchInput = document.querySelector('.datatable-input');
    if (!searchInput) return;

    // Store the original data array
    const originalData = [...state.dataArray];

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();

        if (searchTerm === '') {
            // If search input is empty, restore original data
            state.dataArray = [...originalData];
        } else {
            // Filter data based on search term
            state.dataArray = originalData.filter(item =>
                item.name.toLowerCase().includes(searchTerm)
            );
        }

        state.currentPage = 1;
        updateTable();
        setupPagination();
    });
}

function setupSidebarToggle() {
    const toggleButton = document.querySelector('.toggle-sidebar-btn');
    const sidebar = document.getElementById('sidebar');

    if (toggleButton && sidebar) {
        toggleButton.addEventListener('click', () => {
            sidebar.classList.toggle('show');
        });
    }
}

function setupAllEventHandlers() {
    setupPaginationEvents();
    setupRowsPerPageEvent();
    setupSearchEvent();
    setupSidebarToggle();
}

// Data functions
async function fetchData() {
    try {
        const apiConfig = await fetchWithTimeout(`${CONFIG.API_URL}/config`);
        const date = new Date();

        state.dataArray = Object.entries(apiConfig).map(([key, value]) => ({
            name: key,
            tableName: value.TableName,
            lastUpdate: formatDate(date)
        }));
    } catch (error) {
        console.error('Error fetching data:', error);
        showAlert('Failed to fetch API configuration', 'danger');
    }
}

function populateSelects() {
    ['TableName', 'OrderBy', 'LastUpdateTableName'].forEach(id => {
        const options = id === 'TableName' ? state.tableList : state.colName;
        const select = document.getElementById(id);

        if (select) {
            select.innerHTML = '';
            options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option;
                optionElement.textContent = option;
                select.appendChild(optionElement);
            });
        }
    });
}

// Initialize application
async function initializeApp() {
    try {
        // Initialize Bootstrap components
        initializeModal();

        // Initialize data
        await fetchData();
        populateSelects();

        // Initialize UI
        updateTable();
        setupPagination();

        // Setup event handlers
        setupAllEventHandlers();

    } catch (error) {
        console.error('Error initializing application:', error);
        showAlert('Failed to initialize application', 'danger');
    }
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);


