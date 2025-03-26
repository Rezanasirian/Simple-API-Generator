
export function showAlert(message, type = 'success') {
  const alertContainer = document.getElementById('alertContainer');
  if (!alertContainer) return;

  const alert = document.createElement('div');
  alert.className = `alert alert-${type} alert-dismissible fade show`;
  alert.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  alertContainer.appendChild(alert);

  // Auto-dismiss after 5 seconds (configurable)
  setTimeout(() => {
    alert.classList.remove('show');
    setTimeout(() => alert.remove(), 150);
  }, 5000);
}

// 2) Delete confirmation modal
export function showDeleteConfirmation(type, identifier, message) {
  document.getElementById('deleteConfirmMessage').textContent = message;
  document.getElementById('deleteType').value = type;

  if (type === 'api') {
    document.getElementById('deleteApiId').value = identifier;
  } else {
    document.getElementById('deleteIndex').value = identifier;
  }

  const confirmModal = new bootstrap.Modal(document.getElementById('deleteConfirmationModal'));
  confirmModal.show();
}

// Called when user clicks "Confirm" in the delete modal
export function performDelete() {
  const deleteType = document.getElementById('deleteType').value;

  // We won't import everything here; we can call a global or dispatch events.
  // If you prefer, you can pass a callback or a dispatch event.
  // We'll rely on global method references for brevity:
  switch (deleteType) {
    case 'api':
      const apiId = document.getElementById('deleteApiId').value;
      window.deleteApiConfirmed(apiId);
      break;
    case 'condition':
      const conditionIndex = parseInt(document.getElementById('deleteIndex').value);
      window.deleteConditionConfirmed(conditionIndex);
      break;
    case 'addCondition':
      const addConditionIndex = parseInt(document.getElementById('deleteIndex').value);
      window.deleteAddConditionConfirmed(addConditionIndex);
      break;
    case 'transformation':
      const transformationIndex = parseInt(document.getElementById('deleteIndex').value);
      window.deleteTransformationConfirmed(transformationIndex);
      break;
  }

  bootstrap.Modal.getInstance(document.getElementById('deleteConfirmationModal')).hide();
}

// 3) Sidebar toggle
export function initializeSidebarToggle() {
  const sidebar = document.querySelector('.sidebar');
  const mainContent = document.querySelector('.content-wrapper') || document.querySelector('main');
  if (!sidebar) return;

  const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
  if (sidebarCollapsed) {
    sidebar.classList.add('collapsed');
    if (mainContent) mainContent.classList.add('expanded');
  }

  // Hover logic for desktop
  if (window.innerWidth > 768) {
    sidebar.addEventListener('mouseenter', () => {
      if (sidebar.classList.contains('collapsed')) {
        sidebar.classList.add('hover-expanded');
        if (mainContent && mainContent.classList.contains('expanded')) {
          mainContent.style.transition = 'none';
        }
      }
    });
    sidebar.addEventListener('mouseleave', () => {
      sidebar.classList.remove('hover-expanded');
      if (mainContent) {
        setTimeout(() => {
          mainContent.style.transition = '';
        }, 50);
      }
    });
  }

  // Toggle icon
  const toggleIcon = document.createElement('div');
  toggleIcon.className = 'sidebar-collapse-icon';
  toggleIcon.innerHTML = sidebarCollapsed
    ? '<i class="bi bi-chevron-right"></i>'
    : '<i class="bi bi-chevron-left"></i>';
  sidebar.appendChild(toggleIcon);

  toggleIcon.addEventListener('click', function(e) {
    e.stopPropagation();
    sidebar.classList.toggle('collapsed');
    sidebar.classList.remove('hover-expanded');
    if (mainContent) {
      mainContent.classList.toggle('expanded');
    }
    const isNowCollapsed = sidebar.classList.contains('collapsed');
    this.innerHTML = isNowCollapsed
      ? '<i class="bi bi-chevron-right"></i>'
      : '<i class="bi bi-chevron-left"></i>';
    localStorage.setItem('sidebarCollapsed', isNowCollapsed);
    window.dispatchEvent(new Event('resize'));
  });

  // On mobile resize
  window.addEventListener('resize', () => {
    if (window.innerWidth <= 768) {
      sidebar.classList.remove('hover-expanded');
    }
  });
}
