document.addEventListener("DOMContentLoaded",function (){
    let tableList = window.tableList || []
    let colName = window.colName || []
    let apiProp = window.apiProp || []

    //table select
    let selectedTable = document.getElementById("TableName")
    tableList.forEach(function (table) {
        let option = document.createElement("option");
        option.value = table;
        option.textContent = table;
        if (table ===apiProp.TableName){
            option.selected = true;

        }
        selectedTable.appendChild(option)
    })

    //oreder select
    let selectOrder = document.getElementById("OrderBy")
    colName.forEach(function (column){
        let option = document.createElement("option")
        option.value = column;
        option.textContent = column
        if (column===colName){
            option.selected = true

        }
        selectOrder.appendChild(option)
    })
    //ordre type
    let orderByTypeSelect = document.getElementById("OrderType")
    orderByTypeSelect.value = apiProp.OrderType;

    let lastUpdateTableNameSelect = document.getElementById("LastUpdateTableName");
    tableList.forEach(function(table) {
        let option = document.createElement("option");
        option.value = table;
        option.textContent = table;
            if (table === apiProp.LastUpdateTableName) {
            option.selected = true;
        }
        lastUpdateTableNameSelect.appendChild(option);
    });
})