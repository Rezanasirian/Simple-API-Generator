document.addEventListener("DOMContentLoaded", function () {
    let conditionList = window.apiProp["conditions"] || [];
    console.log(conditionList)
    let Page_name = window.Page_name;
    let conditionTable = document.querySelector("tbody"); // Targets the first tbody element
    let conditionTableHead = document.querySelector("thead")
    const operators = ['=', '!=', '>', '<', '>=', '<='];
    const columnsList = window.colName
    console.log(columnsList)
    const ignoreIfOptions = ['-3', 'All'];
    const castOptions = ['int','varchar']

    // // Constants
    // const OPERATORS = ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN'];
    // const IGNORE_IF_OPTIONS = ['NULL', 'EMPTY', 'BOTH'];
    // const CAST_OPTIONS = ['INTEGER', 'FLOAT', 'DATE', 'DATETIME'];

    // State management
    let editor = null;
    let currentCondition = null;

    // DOM Elements
    const conditionModal = document.getElementById('ConditionModal');
    const conditionForm = document.getElementById('conditionForm');

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
    populateSelect('Operator', operators);
    populateSelect('Column', columnsList);
    populateSelect('IgnoreIf', ignoreIfOptions);

    conditionList.forEach(function (condition) {
        let row = document.createElement("tr");
        for (const [key, value] of Object.entries(condition)) {
            let cell = document.createElement("td");
            cell.innerHTML = key
            row.appendChild(cell)
            for (const [i, item] of Object.entries(value)) {
                let cell = document.createElement("td");
                cell.innerHTML = item;
                row.appendChild(cell);
            }
            let buttonCell = document.createElement("td");
            let button = document.createElement("button");
            button.type = "button";
            button.textContent = "Edit";
            button.className = "btn btn-sm btn-primary";
            button.id = "btn-condition-" + key;
            button.setAttribute("data-condition" ,JSON.stringify(condition))
            buttonCell.appendChild(button);
            row.appendChild(buttonCell);
        }
        conditionTable.appendChild(row);
    });

    function populateSelectValue(id, options, selectedValue) {
        const selectElements = document.getElementById(id);
        selectElements.innerHTML = '';
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            selectElements.appendChild(optionElement);
        });
        selectElements.selected =selectedValue
    }

    document.querySelectorAll("button[id^='btn-condition']").forEach(function (button){
        button.addEventListener('click',function (){
            let condition = JSON.parse(button.getAttribute("data-condition"))
            console.log(condition)
            let conditionValues = Object.values(condition)
            console.log(conditionValues)
            document.getElementById("conditionModalLabel").textContent = "Edit Condition: " + Object.keys(condition);
            document.getElementById("ConditionModal").action = '/api/apiCondition/'+Page_name
            document.getElementById("Parameter").value = Object.keys(condition) || '';
            document.getElementById("Name").value =conditionValues[0].Name || '';
            document.getElementById("Operator").innerHTML = '';
            document.getElementById("Column").innerHTML = '';
            document.getElementById("IgnoreIf").innerHTML = '';

            // You can populate options for Operator, Column, and IgnoreIf if necessary
            // Example: Add options dynamically
            populateSelectValue('Operator', operators,conditionValues[0].operator);
            populateSelectValue('Column', columnsList, conditionValues[0].Column)
            populateSelectValue('IgnoreIf', ignoreIfOptions, conditionValues[0].ignoreIf)
            let transformations = conditionValues[0].transformations
            let sqlCommand = transformations["sqlCommand"]
            let castItem = transformations["cast"]
            let replaceItem = transformations["replace"]
            let substringItem = transformations["substring"]
            let trimItem = transformations["trim"]
            if(castItem){
                populateSelectValue('cast-Options',castOptions,castItem)
                    let castCheck = document.querySelector("#castCheck")
                    castCheck.checked = true

            }
            if(trimItem){
                document.getElementById("trimCheck").checked = true
            }
            if (replaceItem){
                document.getElementById("replaceCheck").checked = true
                let replaceSection = document.querySelector('div[id = "div-replaceCheck"]')
                replaceSection.style.display = 'block'
                document.getElementById("replaceOld").value = replaceItem[0]
                document.getElementById("replaceNew").value = replaceItem[1]
            }
            if(substringItem){
                document.getElementById("substringCheck").checked = true
                let substringSection = document.querySelector('div[id = "div-substringCheck"]')
                substringSection.style.display = 'block'
                document.getElementById("substringStart").value = substringItem[0]
                document.getElementById("substringLength").value = substringItem[1]
            }


                let editor = ace.edit("div-sqlCheck", {
                    theme: "ace/theme/monokai",
                    mode: "ace/mode/sql",
                    autoScrollEditorIntoView: true,
                    maxLines: 10,
                    minLines: 5
                });
                editor.setOptions({
                    enableBasicAutocompletion: true,
                    enableSnippets: true,
                    enableLiveAutocompletion: false
                });
                if (sqlCommand) {
                    document.getElementById('sqlCheck').checked = true;
                    document.getElementById('div-sqlCheck').style.display = 'block';
                    editor.setValue(sqlCommand, 1); // Moves cursor to the end
                    editor.resize();
                }
                document.getElementById('sqlCheck').addEventListener('change', function() {
                    let editorContainer = document.getElementById('div-sqlCheck');
                    if (this.checked) {
                        editorContainer.style.display = 'block';
                        editor.resize();
                    } else {
                        editorContainer.style.display = 'none';
                    }
                });

            // Show the modal
            let modal = new bootstrap.Modal(document.getElementById('ConditionModal'));
            modal.show();
        })
    })

    function addSubstringOption(key) {
        const container = document.getElementById('dynamicSubstringContainer-' + key);
        const newIndex = container.children.length + 1;  // Unique index for the new entry

        // Create the elements dynamically instead of using template literals
        const div = document.createElement('div');
        div.classList.add('substring-option');
        div.id = `substring-${key}-${newIndex}`;

        const lengthInput = document.createElement('input');
        lengthInput.type = "text";
        lengthInput.classList.add('form-control', 'mb-2');
        lengthInput.placeholder = "Value Length";
        lengthInput.name = `dynamicSubstringLength-${key}-${newIndex}`;

        const startIndexInput = document.createElement('input');
        startIndexInput.type = "number";
        startIndexInput.classList.add('form-control', 'mb-2');
        startIndexInput.placeholder = "Start Index";
        startIndexInput.name = `substringStartDynamic-${key}-${newIndex}`;

        const substringLengthInput = document.createElement('input');
        substringLengthInput.type = "number";
        substringLengthInput.classList.add('form-control', 'mb-2');
        substringLengthInput.placeholder = "Substring Length";
        substringLengthInput.name = `substringLengthDynamic-${key}-${newIndex}`;

        const removeButton = document.createElement('button');
        removeButton.type = "button";
        removeButton.classList.add('btn', 'btn-danger');
        removeButton.textContent = "Remove";
        removeButton.addEventListener("click", function() {
            removeSubstringOption1(key, newIndex);
        });

        div.appendChild(lengthInput);
        div.appendChild(startIndexInput);
        div.appendChild(substringLengthInput);
        div.appendChild(removeButton);

        // Insert the new element into the container
        container.appendChild(div);
    }

    function removeSubstringOption1(key, index) {
        const element = document.getElementById(`substring-${key}-${index}`);
        if (element) element.remove();
    }

    // if (document.querySelector('.toggle-sidebar-btn')) {
    //     on('click', '.toggle-sidebar-btn', function(e) {
    //         document.querySelector('body').classList.toggle('toggle-sidebar')
    //     })
    // }

    // Initialize the table
    function initializeTable() {
        const conditions = window.apiProp?.conditions || [];
        console.log(conditions);
        conditionTable.innerHTML = ''; // Clear existing rows

        conditions.forEach((conditionObj, index) => {
            const [parameter, condition] = Object.entries(conditionObj)[0];
            const row = createConditionRow(index, parameter, condition);
            conditionTable.appendChild(row);
        });
    }

    // Create a row for the condition table
    function createConditionRow(id, parameter, condition) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${parameter || ''}</td>
            <td>${condition.Column || ''}</td>
            <td>${condition.Name || ''}</td>
            <td>${condition.IgnoreIf || ''}</td>
            <td>${condition.Operator || ''}</td>
            <td>${formatTransformations(condition.transformations || {})}</td>
            <td>
                <div class="btn-group">
                    <button type="button" class="btn btn-sm btn-primary edit-condition" data-id="${id}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-danger delete-condition" data-id="${id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;
        return row;
    }

    // Format transformations for display
    function formatTransformations(transformations) {
        const parts = [];

        if (transformations.cast) {
            parts.push(`Cast: ${transformations.cast}`);
        }
        if (transformations.trim) {
            parts.push('Trim');
        }
        if (transformations.replace && transformations.replace[0] !== null) {
            parts.push(`Replace: ${transformations.replace[0]} → ${transformations.replace[1]}`);
        }
        if (transformations.substring) {
            parts.push(`Substring: ${transformations.substring[0]}-${transformations.substring[1]}`);
        }
        if (transformations.sqlCommand) {
            parts.push('SQL Command');
        }

        return parts.join(', ') || 'None';
    }

    // Initialize the condition modal
    function initializeModal() {
        // Initialize Ace editor
        editor = ace.edit("div-sqlCheck");
        editor.setTheme("ace/theme/monokai");
        editor.session.setMode("ace/mode/sql");
        editor.setOptions({
            enableBasicAutocompletion: true,
            enableSnippets: true,
            enableLiveAutocompletion: false,
            maxLines: 10,
            minLines: 5
        });
        console.log("a")
        // Setup transformation toggles
        setupTransformationToggles();
    }

    // Setup transformation toggle handlers
    function setupTransformationToggles() {
        const toggles = {
            'castCheck': 'div-castCheck',
            'replaceCheck': 'div-replaceCheck',
            'substringCheck': 'div-substringCheck',
            'sqlCheck': 'div-sqlCheck'
        };

        Object.entries(toggles).forEach(([checkboxId, optionsId]) => {
            const checkbox = document.getElementById(checkboxId);
            const options = document.getElementById(optionsId);
            if (checkbox && options) {
                checkbox.addEventListener('change', () => {
                    options.style.display = checkbox.checked ? 'block' : 'none';
                    if (checkboxId === 'sqlCheck') {
                        document.getElementById('div-sqlCheck').style.display = checkbox.checked ? 'block' : 'none';
                        editor.resize();
                    }
                });
            }
        });
    }

    // Populate select elements
    function populateSelectWithValue(id, options, selectedValue = '') {
        const select = document.getElementById(id);
        if (!select) return;

        select.innerHTML = '<option value="">Select Option</option>';
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            if (option === selectedValue) {
                optionElement.selected = true;
            }
            select.appendChild(optionElement);
        });
    }

    // Show alert message
    function showAlert(message, type = 'success') {
        const alertContainer = document.getElementById('alertContainer');
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        alertContainer.appendChild(alert);
        setTimeout(() => alert.remove(), 5000);
    }

    // Handle condition edit
    function handleEditCondition(id, parameter, condition) {
        currentCondition = { id, parameter, ...condition };

        // Populate form fields
        document.getElementById('Parameter').value = parameter || '';
        document.getElementById('Name').value = condition.Name || '';
        populateSelectWithValue('Column', window.colName, condition.Column);
        populateSelectWithValue('Operator', operators, condition.Operator);
        populateSelectWithValue('IgnoreIf', ignoreIfOptions, condition.IgnoreIf);

        // Handle transformations
        const transformations = condition.transformations || {};
        document.getElementById('castCheck').checked = !!transformations.cast;
        document.getElementById('trimCheck').checked = !!transformations.trim;
        document.getElementById('replaceCheck').checked = !!transformations.replace;
        document.getElementById('substringCheck').checked = !!transformations.substring;
        document.getElementById('sqlCheck').checked = !!transformations.sqlCommand;

        if (transformations.cast) {
            populateSelectWithValue('castType', castOptions, transformations.cast);
        }
        if (transformations.replace) {
            document.getElementById('replaceOld').value = transformations.replace[0] || '';
            document.getElementById('replaceNew').value = transformations.replace[1] || '';
        }
        if (transformations.substring) {
            document.getElementById('substringStart').value = transformations.substring[0] || '';
            document.getElementById('substringLength').value = transformations.substring[1] || '';
        }
        if (transformations.sqlCommand) {
            editor.setValue(transformations.sqlCommand);
        }

        // Show modal
        const modal = new bootstrap.Modal(conditionModal);
        modal.show();
    }

    // Handle condition save
    document.getElementById('conditionForm').addEventListener('submit', function(event) {
    event.preventDefault();  // Prevent default GET submission
    event.stopPropagation();

        const formData = new FormData(this);
        const apiName = window.Page_name;

        // Build condition details
    const conditionDetails = {
        action:"update_condition",
        Parameter: document.getElementById("Parameter").value,
        Name: document.getElementById("Name").value,
        Column: document.getElementById("Column").value,
        Operator: document.getElementById("Operator").value,
        IgnoreIf: document.getElementById("IgnoreIf").value,
        transformations: {}
    };

    // Handle transformations correctly
    if (document.getElementById("castCheck").checked) {
        conditionDetails.transformations.cast = document.getElementById("cast-Options").value;
    }
    if (document.getElementById("trimCheck").checked) {
        conditionDetails.transformations.trim = true;
    }
    if (document.getElementById("replaceCheck").checked) {
        conditionDetails.transformations.replace = [
            document.getElementById("replaceOld").value,
            document.getElementById("replaceNew").value
        ];
    }
    if (document.getElementById("substringCheck").checked) {
        conditionDetails.transformations.substring = [
            parseInt(document.getElementById("substringStart").value),
            parseInt(document.getElementById("substringLength").value)
        ];
    }
    if (document.getElementById("sqlCheck").checked) {
        conditionDetails.transformations.sqlCommand = editor.getValue();
    }

    // Now send the request with JSON
    fetch(`/api/apiCondition/${window.Page_name}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(conditionDetails)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        // Close the modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('ConditionModal'));
        modal.hide();
        // Reload the page to show the new condition
        window.location.reload();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error saving condition: ' + error.message);
    });

    });

    // Handle condition delete
    async function handleDeleteCondition(condition) {
        if (!confirm('Are you sure you want to delete this condition?')) return;

        try {
            const response = await fetch(`/api/apiCondition/${window.Page_name}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'delete_condition',
                    Parameter: condition
                })
            });

            if (!response.ok) throw new Error('Failed to delete condition');

            const result = await response.json();
            showAlert(result.message || 'Condition deleted successfully');
            window.location.reload();

        } catch (error) {
            console.error('Error deleting condition:', error);
            showAlert(error.message || 'Failed to delete condition', 'danger');
        }
    }

    // Event Listeners
    initializeTable();
    initializeModal();

    // Add condition button
    document.querySelector('[data-bs-target="#ConditionModal"]').addEventListener('click', () => {
        currentCondition = null;
        conditionForm.reset();
        document.querySelectorAll('[id$="Options"]').forEach(el => el.style.display = 'none');
        document.getElementById('editor').style.display = 'none';
    });

    // Edit condition buttons
    conditionTable.addEventListener('click', function(e) {
        const editBtn = e.target.closest('.edit-condition');
        const deleteBtn = e.target.closest('.delete-condition');

        if (editBtn) {
            const id = parseInt(editBtn.dataset.id);
            const conditions = window.apiProp.conditions;
            const conditionObj = conditions[id];
            const [parameter, condition] = Object.entries(conditionObj)[0];
            handleEditCondition(id, parameter, condition);
        }

        if (deleteBtn) {
             const id = parseInt(deleteBtn.dataset.id);
            const conditions = window.apiProp.conditions;
            const conditionObj = conditions[id];
            const [parameter, condition] = Object.entries(conditionObj)[0];
            handleDeleteCondition(parameter);
        }
    });
});
