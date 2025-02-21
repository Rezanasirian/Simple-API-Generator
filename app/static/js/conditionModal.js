document.addEventListener('DOMContentLoaded', function() {

    const operators = ['=', '!=', '>', '<', '>=', '<='];
    const columnsList = window.columsList
    const ignoreIfOptions = ['-3', 'All'];
    
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
    populateSelect('newOperator', operators);
    populateSelect('newColumn', columnsList);
    populateSelect('newIgnoreIf', ignoreIfOptions);
});
