/**
 * Metrics Dashboard JavaScript
 * Handles charts and metrics visualization
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get chart data from the page
    const dates = JSON.parse(document.getElementById('chart-dates').textContent || '[]');
    const apiCalls = JSON.parse(document.getElementById('chart-api-calls').textContent || '[]');
    const successCalls = JSON.parse(document.getElementById('chart-success-calls').textContent || '[]');
    const errorCalls = JSON.parse(document.getElementById('chart-error-calls').textContent || '[]');
    
    // Initialize API calls chart
    const apiCallsCtx = document.getElementById('apiCallsChart');
    if (apiCallsCtx) {
        new Chart(apiCallsCtx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Total API Calls',
                        data: apiCalls,
                        borderColor: '#4154f1',
                        backgroundColor: 'rgba(65, 84, 241, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });
    }
    
    // Initialize success/error chart
    const successErrorCtx = document.getElementById('successErrorChart');
    if (successErrorCtx) {
        new Chart(successErrorCtx, {
            type: 'bar',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Successful Calls',
                        data: successCalls,
                        backgroundColor: 'rgba(46, 202, 106, 0.7)',
                        borderColor: '#2eca6a',
                        borderWidth: 1
                    },
                    {
                        label: 'Failed Calls',
                        data: errorCalls,
                        backgroundColor: 'rgba(224, 62, 62, 0.7)',
                        borderColor: '#e03e3e',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });
    }
    
    // Initialize API performance chart (if available)
    const apiPerformanceCtx = document.getElementById('apiPerformanceChart');
    if (apiPerformanceCtx) {
        const apiIds = JSON.parse(document.getElementById('api-ids').textContent || '[]');
        const apiResponseTimes = JSON.parse(document.getElementById('api-response-times').textContent || '[]');
        const apiErrorRates = JSON.parse(document.getElementById('api-error-rates').textContent || '[]');
        
        new Chart(apiPerformanceCtx, {
            type: 'bar',
            data: {
                labels: apiIds,
                datasets: [
                    {
                        label: 'Avg Response Time (s)',
                        data: apiResponseTimes,
                        backgroundColor: 'rgba(33, 150, 243, 0.7)',
                        borderColor: '#2196f3',
                        borderWidth: 1,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Error Rate (%)',
                        data: apiErrorRates.map(rate => rate * 100), // Convert to percentage
                        backgroundColor: 'rgba(255, 191, 0, 0.7)',
                        borderColor: '#ffbf00',
                        borderWidth: 1,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Response Time (s)'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Error Rate (%)'
                        },
                        grid: {
                            display: false
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });
    }
}); 