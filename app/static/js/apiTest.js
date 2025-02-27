document.addEventListener("DOMContentLoaded",function (){

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
    const sidebar = document.getElementById('sidebar');
    const toggleButton = document.querySelector('.toggle-sidebar-btn');

    toggleButton.addEventListener('click', function () {
        sidebar.classList.toggle('show'); // Toggle the 'show' class to open/close the sidebar
        });

})