// Initialize chart data
var apiUsageData, topApisData, statusCodesData, responseTimeData;

// Parse data from server with error handling
function initializeChartData(serverData) {
    try {
        apiUsageData = JSON.parse(serverData.apiUsageData);
        topApisData = JSON.parse(serverData.topApisData);
        statusCodesData = JSON.parse(serverData.statusCodesData);
        responseTimeData = JSON.parse(serverData.responseTimeData);
    } catch (e) {
        console.error("Error parsing JSON data:", e);
        // Default empty data structures if parsing fails
        apiUsageData = { successful: [], failed: [] };
        topApisData = { labels: [], values: [] };
        statusCodesData = { labels: [], values: [] };
        responseTimeData = { labels: [], values: [] };
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Check if there's data available
    const hasApiUsageData = apiUsageData &&
                           apiUsageData.successful &&
                           apiUsageData.successful.length > 0;
    const hasTopApisData = topApisData &&
                          topApisData.labels &&
                          topApisData.labels.length > 0;
    const hasStatusCodesData = statusCodesData &&
                              statusCodesData.labels &&
                              statusCodesData.labels.length > 0;
    const hasResponseTimeData = responseTimeData &&
                               responseTimeData.labels &&
                               responseTimeData.labels.length > 0;

    // Initialize and render charts if we have data
    if (hasApiUsageData) {
        renderApiUsageChart();
    } else {
        document.getElementById('api-usage-chart').innerHTML = '<div class="text-center p-3">No API usage data available</div>';
    }

    if (hasTopApisData) {
        renderTopApisChart();
    } else {
        document.getElementById('top-apis-chart').innerHTML = '<div class="text-center p-3">No API endpoints data available</div>';
    }

    if (hasStatusCodesData) {
        renderStatusCodesChart();
    } else {
        document.getElementById('status-codes-chart').innerHTML = '<div class="text-center p-3">No status codes data available</div>';
    }

    if (hasResponseTimeData) {
        renderResponseTimeChart();
    } else {
        document.getElementById('response-time-chart').innerHTML = '<div class="text-center p-3">No response time data available</div>';
    }

    // Setup period selector buttons
    setupPeriodSelector();
});

function renderApiUsageChart() {
    const ctx = document.getElementById('api-usage-chart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: apiUsageData.successful.map(d => d.date),
            datasets: [
                {
                    label: 'Successful API Calls',
                    data: apiUsageData.successful.map(d => d.count),
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Failed API Calls',
                    data: apiUsageData.failed.map(d => d.count),
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'API Usage Over Time'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of API Calls'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            }
        }
    });
}

function renderTopApisChart() {
    const ctx = document.getElementById('top-apis-chart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topApisData.labels,
            datasets: [{
                label: 'Number of Calls',
                data: topApisData.values,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            indexAxis: 'y',
            plugins: {
                title: {
                    display: true,
                    text: 'Top API Endpoints'
                },
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Calls'
                    }
                }
            }
        }
    });
}

function renderStatusCodesChart() {
    const ctx = document.getElementById('status-codes-chart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: statusCodesData.labels,
            datasets: [{
                data: statusCodesData.values,
                backgroundColor: [
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(153, 102, 255, 0.7)'
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Status Code Distribution'
                }
            }
        }
    });
}

function renderResponseTimeChart() {
    const ctx = document.getElementById('response-time-chart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: responseTimeData.labels,
            datasets: [{
                label: 'Average Response Time (ms)',
                data: responseTimeData.values,
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'API Response Time Trend'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Response Time (ms)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            }
        }
    });
}

function setupPeriodSelector() {
    const periodButtons = document.querySelectorAll('.period-selector .btn');
    periodButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Update active state
            periodButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            // Get selected period
            const period = this.dataset.period;

            // Send to backend to refresh data
            window.location.href = `/dashboard?period=${period}`;
        });
    });
} 