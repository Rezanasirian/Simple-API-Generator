document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const editApiForm = document.getElementById('editApiForm');
    const saveButton = document.getElementById('saveApiProperties');
    const tableNameSelect = document.getElementById('tableName');
    const orderBySelect = document.getElementById('orderBy');
    const orderTypeSelect = document.getElementById('orderType');
    const lastUpdateTableSelect = document.getElementById('lastUpdateTable');
    const descriptionTextarea = document.getElementById('description');

    // Initialize form with current values
    function initializeForm() {
        // Populate table name select
        populateSelect(tableNameSelect, window.tableList);
        populateSelect(orderBySelect, window.colName);
        populateSelect(lastUpdateTableSelect, window.tableList);
        // Set current values
        if (window.apiProp) {
            tableNameSelect.value = window.apiProp.TableName || '';
            orderBySelect.value = window.apiProp.OrderBy || '';
            orderTypeSelect.value = window.apiProp.OrderType || '';
            lastUpdateTableSelect.value = window.apiProp.LastUpdateTableName || '';
            descriptionTextarea.value = window.apiProp.description || '';
        }
    }

    // Populate select elements
    function populateSelect(selectElement, options) {
        if (!selectElement || !Array.isArray(options)) return;

        // Keep the first option (placeholder)
        const firstOption = selectElement.firstChild;
        selectElement.innerHTML = '';
        selectElement.appendChild(firstOption);

        // Add new options
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            selectElement.appendChild(optionElement);
        });
    }

    // Validate form data
    function validateForm(formData) {
        const errors = [];

        if (!formData.TableName) {
            errors.push('Table Name is required');
        }
        if (!formData.OrderBy) {
            errors.push('Order By is required');
        }
        if (!formData.OrderType) {
            errors.push('Order Type is required');
        }
        if (!formData.LastUpdateTableName) {
            errors.push('Last Update Table is required');
        }

        return errors;
    }

    // Show alert message
    // function showAlert(message, type = 'success') {
    //     const alertDiv = document.createElement('div');
    //     alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    //     alertDiv.innerHTML = `
    //         ${message}
    //         <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    //     `;
    //
    //     const container = document.querySelector('.container') || document.body;
    //     container.insertBefore(alertDiv, container.firstChild);
    //
    //     // Auto dismiss after 5 seconds
    //     setTimeout(() => {
    //         alertDiv.remove();
    //     }, 5000);
    // }

    // Handle form submission
    async function handleSubmit() {
        try {
            // Get form data
            const formData = {
                TableName: tableNameSelect.value,
                OrderBy: orderBySelect.value,
                OrderType: orderTypeSelect.value,
                LastUpdateTableName: lastUpdateTableSelect.value,
                Description: descriptionTextarea.value,
                Conditions:window.apiProp.Conditions
            };

            // Validate form data
            const errors = validateForm(formData);
            if (errors.length > 0) {
                showAlert(errors.join('<br>'), 'danger');
                return;
            }

            // Send request to server
            const response = await fetch(`/api/apiProperties/${window.Page_name}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Failed to update API properties');
            }

            const result = await response.json();

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('EditApi'));
            modal.hide();

            // Show success message
            showAlert('API properties updated successfully');

            // Reload page to show updated data
            setTimeout(() => {
                window.location.reload();
            }, 1000);

        } catch (error) {
            console.error('Error updating API properties:', error);
            showAlert(error.message || 'Failed to update API properties', 'danger');
        }
    }

    // Event listeners
    saveButton.addEventListener('click', handleSubmit);

    // Handle form submission (prevent default)
    editApiForm.addEventListener('submit', (e) => {
        e.preventDefault();
    });

    // Handle table name change - update order by options
    tableNameSelect.addEventListener('change', function() {
        // Here you could fetch columns for the selected table
        // For now, we'll use the existing colName list
        populateSelect(orderBySelect, window.colName);
    });

    // Initialize form when modal is shown
    document.getElementById('EditApi').addEventListener('show.bs.modal', function() {
        initializeForm();
    });

    // Reset form when modal is hidden
    document.getElementById('EditApi').addEventListener('hidden.bs.modal', function() {
        editApiForm.reset();
    });

    // Initialize form on page load
    initializeForm();
});