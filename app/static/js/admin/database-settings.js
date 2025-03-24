/**
 * Database Settings Page JavaScript
 * Handles database configuration UI interactions
 */

document.addEventListener('DOMContentLoaded', function() {
    // Database type selection
    const dbTypeCards = document.querySelectorAll('.db-type-card');
    const dbTypeInput = document.getElementById('db_type');
    const dbSettingsSections = document.querySelectorAll('.db-settings-section');
    
    // Initialize the active database type
    const activateDbType = (type) => {
        // Update hidden input
        if (dbTypeInput) {
            dbTypeInput.value = type;
        }
        
        // Update UI
        dbTypeCards.forEach(card => {
            if (card.dataset.dbType === type) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });
        
        // Show/hide appropriate form sections
        dbSettingsSections.forEach(section => {
            if (section.id === `${type}-settings`) {
                section.style.display = 'block';
            } else {
                section.style.display = 'none';
            }
        });
    };
    
    // Set initial active type
    if (dbTypeInput && dbTypeInput.value) {
        activateDbType(dbTypeInput.value);
    }
    
    // Handle card clicks
    dbTypeCards.forEach(card => {
        card.addEventListener('click', function() {
            activateDbType(this.dataset.dbType);
        });
    });
    
    // Connection testing
    const testConnectionBtn = document.getElementById('test-connection-btn');
    const connectionResult = document.getElementById('connection-test-result');
    const connectionMessage = document.getElementById('connection-test-message');
    
    if (testConnectionBtn) {
        testConnectionBtn.addEventListener('click', function() {
            // Show loading state
            this.disabled = true;
            this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Testing...';
            
            // Get form data
            const formData = new FormData(document.getElementById('db-settings-form'));
            
            // Send AJAX request
            fetch('/admin/database/test', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                // Show result
                connectionResult.classList.remove('d-none');
                
                if (data.success) {
                    connectionResult.classList.remove('alert-danger');
                    connectionResult.classList.add('alert-success');
                    connectionMessage.textContent = 'Connection successful!';
                } else {
                    connectionResult.classList.remove('alert-success');
                    connectionResult.classList.add('alert-danger');
                    connectionMessage.textContent = 'Connection failed: ' + data.error;
                }
            })
            .catch(error => {
                connectionResult.classList.remove('d-none');
                connectionResult.classList.remove('alert-success');
                connectionResult.classList.add('alert-danger');
                connectionMessage.textContent = 'Error testing connection: ' + error;
            })
            .finally(() => {
                // Reset button state
                this.disabled = false;
                this.innerHTML = '<i class="bi bi-check-circle me-1"></i> Test Connection';
            });
        });
    }
    
    // MongoDB URI toggle
    const mongoUriToggle = document.getElementById('mongo_uri_toggle');
    const mongoUriFields = document.getElementById('mongo_uri_fields');
    const mongoParamFields = document.getElementById('mongo_param_fields');
    
    if (mongoUriToggle) {
        mongoUriToggle.addEventListener('change', function() {
            if (this.checked) {
                mongoUriFields.classList.remove('d-none');
                mongoParamFields.classList.add('d-none');
            } else {
                mongoUriFields.classList.add('d-none');
                mongoParamFields.classList.remove('d-none');
            }
        });
    }
}); 