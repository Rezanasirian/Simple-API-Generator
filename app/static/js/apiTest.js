document.addEventListener("DOMContentLoaded",async function (){
    apiName = window.apiName ||''
    console.log(apiName)
    let conditionArray = [];
    let currentPage = 1;
    let rowsPerPage = 10;
    let conditionCategory = ["Identification","Filter"]
    await fetchApiData(apiName)
    async function fetchApiData(apiName){
        try {
            const response = await fetch("http://127.0.0.1:5000/api/configPerApi/"+apiName)
            if (!response.ok) {
                throw new Error('Network response was not ok')
            }
            const apiConfig = await response.json();
            conditionArray = apiConfig.conditions

        } catch (error){

            console.error('Error fetching data:', error);
        }
    }
    function generateFormFields() {
        const form = document.getElementById('api-form');
        form.innerHTML = '';

        // Create collapsible sections for each category
        conditionCategory.forEach(category => {
            const collapseButton = document.createElement("button");
            collapseButton.classList.add("collapsible");
            collapseButton.type = "button";
            collapseButton.textContent = `${category} Parameters`;

            const inputGroupDiv = document.createElement("div");
            inputGroupDiv.classList.add("content");
            inputGroupDiv.id = category;

            form.appendChild(collapseButton);
            form.appendChild(inputGroupDiv);
        });

        // Iterate through conditions and create input fields
        conditionArray.forEach(condition => {
            Object.keys(condition).forEach(key => {
                const field = condition[key];
                const label = field.Name || key;

                const input = document.createElement("input");
                input.type = "text";
                input.name = key;
                input.placeholder = label;
                input.required = true;

                const inputGroup = document.createElement("div");

                const inputLabel = document.createElement("label");
                inputLabel.textContent = label;

                inputGroup.appendChild(inputLabel);
                inputGroup.appendChild(input);

                const categorySection = document.getElementById(field.category);
                let categorySectionRows = categorySection.querySelectorAll("div.row");

                // If no rows exist, create a new row with a column
                if (categorySectionRows.length === 0) {
                    const categorySectionRow = document.createElement("div");
                    categorySectionRow.classList.add("row");

                    const categorySectionCol = document.createElement("div");
                    categorySectionCol.classList.add("col");
                    categorySectionCol.appendChild(inputGroup);

                    categorySectionRow.appendChild(categorySectionCol);
                    categorySection.appendChild(categorySectionRow);
                } else {
                    // Get the last row
                    const lastRow = categorySectionRows[categorySectionRows.length - 1];
                    const categorySectionCols = lastRow.querySelectorAll("div.col");

                    // If the last row has less than 4 columns, append to it
                    if (categorySectionCols.length < 4) {
                        const categorySectionCol = document.createElement("div");
                        categorySectionCol.classList.add("col");
                        categorySectionCol.appendChild(inputGroup);
                        lastRow.appendChild(categorySectionCol);
                    } else {
                        // Create a new row and append input into a new column
                        const newRow = document.createElement("div");
                        newRow.classList.add("row");

                        const newCol = document.createElement("div");
                        newCol.classList.add("col");
                        newCol.appendChild(inputGroup);

                        newRow.appendChild(newCol);
                        categorySection.appendChild(newRow);
                    }
                }
            });
        });

        // Add submit button
        const submitButton = document.createElement("button");
        submitButton.type = "submit";
        submitButton.id = "submitForm";
        submitButton.textContent = "Submit";
        form.appendChild(submitButton);
    }
    generateFormFields();
    function submitForm(event) {
      event.preventDefault();

      const formData = new FormData(document.getElementById('api-form'));
      const params = {};

      formData.forEach((value, key) => {
        params[key] = value;
      });

      fetch('http://127.0.0.1:5000/api/testRout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
      })
      .then(response => response.json())
      .then(data => {
        document.getElementById('response').textContent = JSON.stringify(data, null, 2);
      })
      .catch(error => {
        document.getElementById('response').textContent = `Error: ${error.message}`;
      });
    }
    document.getElementById("submitForm").addEventListener('click',function (){
        submitForm(event)
    })

    document.querySelectorAll('.collapsible').forEach((button) => {
          button.addEventListener('click', function() {
            this.classList.toggle('active');
            const content = this.nextElementSibling;
            console.log("s")
            if (content.style.display === "block") {
              content.style.display = "none";
            } else {
              content.style.display = "block";
            }
          });
    });


    const sidebar = document.getElementById('sidebar');
    const toggleButton = document.querySelector('.toggle-sidebar-btn');

    toggleButton.addEventListener('click', function () {
        sidebar.classList.toggle('show'); // Toggle the 'show' class to open/close the sidebar
        });


})