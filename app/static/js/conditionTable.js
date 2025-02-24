document.addEventListener("DOMContentLoaded", function () {
    let conditionList = window.apiProp["conditions"] || [];
    let Page_name = window.Page_name;
    let conditionTable = document.querySelector("tbody"); // Targets the first tbody element
    let conditionTableHead = document.querySelector("thead")
    const operators = ['=', '!=', '>', '<', '>=', '<='];
    const columnsList = window.columsList
    const ignoreIfOptions = ['-3', 'All'];
    const castOptions = ['int','varchar']


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
            let conditionValues = Object.values(condition)
            document.getElementById("ModalTitle").textContent = "Edit Condition: " + Object.keys(condition);
            document.getElementById("Modal").action = '/api/apiEditCondition/'+Page_name
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





            // Show the modal
            let modal = new bootstrap.Modal(document.getElementById('ConditionModal'));
            modal.show();
        })
    })
    // let dynamicSubstring = document.getElementById("dynamicSubstring")
    // dynamicSubstring.addEventListener("click" ,function (){
    //     addSubstringOption1(key)
    // })
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

let editor = ace.edit("editor", {
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
let sqlCommand = "{{ value.sqlCommand | default('', true) }}";
if (sqlCommand) {
    document.getElementById('EditorCheck').checked = true;
    document.getElementById('editor').style.display = 'block';
    editor.setValue(sqlCommand, 1); // Moves cursor to the end
    editor.resize();
}
document.getElementById('EditorCheck').addEventListener('change', function() {
    let editorContainer = document.getElementById('editor');
    if (this.checked) {
        editorContainer.style.display = 'block';
        editor.resize();
    } else {
        editorContainer.style.display = 'none';
    }
});



});
