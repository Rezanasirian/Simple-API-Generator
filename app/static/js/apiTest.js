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
        let conditionFrom = document.getElementById("api-form")
        conditionCategory.forEach(category=>{
            let collapseButton = document.createElement("button")
            collapseButton.classList.add("collapsible")
            collapseButton.type= "button"
            collapseButton.textContent = category + " Parameters"
            conditionFrom.appendChild(collapseButton)
            let inputGroupDiv = document.createElement("div")
            inputGroupDiv.classList.add("content")
            inputGroupDiv.id = category
            conditionFrom.appendChild(inputGroupDiv)


        })
        console.log(conditionArray)
      conditionArray.forEach((condition) => {
        Object.keys(condition).forEach((key) => {
            console.log(condition[key]['category'])
          const field = condition[key];
          const label = field.Name || key;
          const input = document.createElement('input');
          input.type = 'text';
          input.name = key;
          input.placeholder = label;
          input.required = true;

          const inputGroup = document.createElement('div');
          inputGroup.classList.add('input-group');

          const inputLabel = document.createElement('label');
          inputLabel.textContent = label;

          inputGroup.appendChild(inputLabel);
          inputGroup.appendChild(input);
          let categorySection = document.querySelector(`div#${condition[key]['category']}`);
            console.log(categorySection)
          categorySection.appendChild(inputGroup);
        });
      });
    }

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

    generateFormFields();
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