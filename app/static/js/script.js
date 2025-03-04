document.addEventListener("DOMContentLoaded", async function(){
    let tableList = window.tableList
    let colName = window.colName
    let ApiList = window.ApiList
    await fetchData();
    updateTable();
    setupPagination();
    setupEventListeners();
    populateSelect('TableName', tableList);
    populateSelect('OrderBy', colName);
    populateSelect('LastUpdateTableName', colName);

        const sidebar = document.getElementById('sidebar');
        const toggleButton = document.querySelector('.toggle-sidebar-btn');

        toggleButton.addEventListener('click', function () {
            sidebar.classList.toggle('show'); // Toggle the 'show' class to open/close the sidebar
        });

        const addApiButton = document.querySelector(".btn-add-api");
        const apiForm = document.getElementById("addApiModal");
        const addApiModal = new bootstrap.Modal(apiForm);

        const apiInput = document.getElementById("APIName");
        apiForm.addEventListener("submit", function (event) {
                const apiName = apiInput.value.trim();

                if ( ApiList.includes(apiName)) {
                    event.preventDefault();
                    showFloatingAlert("API Name should not be in the existing API list.", "danger");
                }
                if (!apiName.startsWith("api") ) {
                    event.preventDefault();
                    showFloatingAlert("API Name must start with 'API'", "danger");
                }
            });


        addApiButton.addEventListener("click", function() {
            addApiModal.show(); // Show the modal when button is clicked
        });


    });
    function showFloatingAlert(message, type) {
        const alertContainer = document.getElementById("alertContainer"); // Alert container

        const alert = document.createElement("div");
        alert.className = `alert alert-${type} alert-dismissible fade show shadow`;
        alert.style.zIndex = 2000; // Make sure it's above other elements
        alert.innerHTML = `
            <strong>${type === "success" ? "Success!" : "Error!"}</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        alertContainer.appendChild(alert);

        setTimeout(() => {
            alert.classList.remove("show");
            setTimeout(() => alert.remove(), 500);
        }, 3000);
    }
    function populateSelect(id, options) {
        const selectElement = document.getElementById(id);
        selectElement.innerHTML = '';
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            selectElement.appendChild(optionElement);
        });
    }

    let dataArray = [];
    let currentPage = 1;
    let rowsPerPage = 10;
    async function fetchData(){
        try {
            const response = await fetch("http://127.0.0.1:5000/api/config")
            if (!response.ok) throw new Error('Network response was not ok')
            const apiConfig = await response.json();
            const date = new Date(); // Fix: Define the date object here
            dataArray = Object.keys(apiConfig).map(key => {
                return {
                    name: key,
                    tableName: apiConfig[key].TableName,
                    lastUpdate: `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`
                }
            })
        } catch (error){
            console.error('Error fetching data:', error);
        }
    }



function updateTable() {
    const tbody = document.querySelector('.datatable-table tbody');
    tbody.innerHTML = '';

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = dataArray.slice(start, end);

    pageData.forEach(item => {
        const row = document.createElement('tr');

        const nameCell = document.createElement('td');
        nameCell.textContent = item.name;
        row.appendChild(nameCell);

        const tableNameCell = document.createElement('td');
        tableNameCell.textContent = item.tableName;
        row.appendChild(tableNameCell);

        const lastUpdateCell = document.createElement('td');
        lastUpdateCell.textContent = item.lastUpdate;
        row.appendChild(lastUpdateCell);

        const actionCell = document.createElement('td');
        const editButton = document.createElement('button');
        editButton.className = 'btn btn-edit';
        editButton.textContent = 'Edit';
        editButton.addEventListener('click', function() {
            window.location.href = '/api/edit_api/' + item.name;
        });
        actionCell.appendChild(editButton);


        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn btn-delete';
        deleteButton.textContent = 'Delete';
        actionCell.appendChild(deleteButton);

        const testButton = document.createElement('button');
        testButton.className = 'btn btn-test';
        testButton.textContent = 'Test';
        testButton.addEventListener('click', function() {
            window.location.href = '/api/test_api/' + item.name;
        });
        actionCell.appendChild(testButton);

        row.appendChild(actionCell);
        tbody.appendChild(row);
    });
    updateTableInfo();
}

function setupPagination() {
    const pagination = document.querySelector('.datatable-pagination-list');
    pagination.innerHTML = '';

    const pageCount = Math.ceil(dataArray.length / rowsPerPage);
    for (let i = 1; i <= pageCount; i++) {
        const li = document.createElement('li');
        li.className = 'datatable-pagination-list-item';
        if (i === currentPage) li.classList.add('datatable-active');

        const button = document.createElement('button');
        button.className = 'datatable-pagination-list-item-link';
        button.textContent = i;
        button.dataset.page = i;
        li.appendChild(button);

        pagination.appendChild(li);
    }
}

function updateTableInfo() {
    const info = document.querySelector('.datatable-info');
    const start = (currentPage - 1) * rowsPerPage + 1;
    const end = Math.min(currentPage * rowsPerPage, dataArray.length);
    info.textContent = `Showing ${start} to ${end} of ${dataArray.length} entries`;
}

function setupEventListeners() {
    document.querySelector('.datatable-pagination').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const page = parseInt(e.target.dataset.page);
            if (page && page !== currentPage) {
                currentPage = page;
                updateTable();
                setupPagination();
            }
        }
    });

    document.querySelector('.datatable-selector').addEventListener('change', (e) => {
        rowsPerPage = parseInt(e.target.value);
        currentPage = 1;
        updateTable();
        setupPagination();
    });

    document.querySelector('.datatable-input').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredData = dataArray.filter(item =>
            item.name.toLowerCase().includes(searchTerm)
        );

        currentPage = 1;
        dataArray = filteredData;
        updateTable();
        setupPagination();
    });

}


