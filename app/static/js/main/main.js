// main.js
import { initializeApiList } from './apiList.js';
import { initializeSidebarToggle, performDelete } from './ui.js';
// import { initializeCheckboxUIEnhancements } from './uiEnhancements.js';
// or if you integrated that logic into 'ui.js', just import from there
import { createOrSaveApi, openApiModal } from './apiEditor2.js';
import { editCondition, deleteCondition } from './conditions.js';
import { initializeConditionModal } from './conditionModal.js';

// If you have separate init for transformations or conditions, import them too

document.addEventListener('DOMContentLoaded', () => {
  // Initialize the sidebar, or any other high-level UI
  initializeSidebarToggle();

  // Initialize the API list table
  initializeApiList();


   initializeConditionModal();
  document.getElementById('openAddApiBtn').addEventListener('click', () => {
    openApiModal('add');
  });
  // If you need to call editCondition or something else,
  // you can do so directly or attach an event listener.
  // For example, if you have a table that uses event delegation:
  const conditionsTableBody = document.getElementById('conditionsTableBody');
  if (conditionsTableBody) {
    conditionsTableBody.addEventListener('click', e => {
      const editBtn = e.target.closest('.edit-condition');
      if (editBtn) {
        const row = editBtn.closest('tr');
        const index = Number(row.dataset.index);
        editCondition(index);
      }
    });
  }

  // Bind "Confirm Delete" button
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', performDelete);
  }

  // Add new API form submission
  const createApiBtn = document.getElementById('createApiBtn');
  if (createApiBtn) {
    createApiBtn.addEventListener('click', createNewApi);
  }

  // Save (edit) form submission
  const editApiSaveBtn = document.getElementById('editApiSaveBtn');
  if (editApiSaveBtn) {
    editApiSaveBtn.addEventListener('click', saveApi);
  }

  if (!conditionsTableBody) return;

  // Delegate clicks to the table body
  conditionsTableBody.addEventListener('click', e => {
    // Check if the click happened on or inside a button with class .edit-condition
    const editBtn = e.target.closest('.edit-condition');
    if (editBtn) {
      // Find the row and index
      const row = editBtn.closest('tr');
      const index = Number(row.dataset.index);
      editCondition(index); // call your function to edit
      return; // done
    }

    // Check if the click happened on or inside a button with class .delete-condition
    const deleteBtn = e.target.closest('.delete-condition');
    if (deleteBtn) {
      const row = deleteBtn.closest('tr');
      const index = Number(row.dataset.index);
      deleteCondition(index); // call your function to delete
    }
  });
  // Possibly other initializations:
  // e.g. initializeCheckboxUIEnhancements();

  // ... any other page-level setup ...
});
