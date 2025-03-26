import { showDeleteConfirmation } from './ui.js';

export let stateTransform = {
  currentTransformations : []
};

export function updateTransformationsContainer() {
  const container = document.getElementById('transformationsContainer');
  if (!container) return;

  container.innerHTML = '';

  stateTransform.currentTransformations.forEach((transformation, index) => {
    const card = document.createElement('div');
    card.className = 'card mb-2';
    card.dataset.index = index;

    card.innerHTML = `
      <div class="card-body py-2 px-3">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <strong>${transformation.source}</strong> → 
            <strong>${transformation.target}</strong>
            <span class="badge bg-secondary ms-2">${transformation.type}</span>
          </div>
          <div class="btn-group">
            <button type="button" class="btn btn-sm btn-outline-primary" onclick="editTransformation(${index})">
              <i class="bi bi-pencil"></i>
            </button>
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="deleteTransformation(${index})">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

export function editTransformation(index) {
  const transformation = stateTransform.currentTransformations[index];
  document.getElementById('transformationIndex').value = index;
  document.getElementById('transformationSource').value = transformation.source;
  document.getElementById('transformationType').value = transformation.type;
  document.getElementById('transformationTarget').value = transformation.target;
  document.getElementById('transformationParams').value = transformation.params;

  const transformationModal = new bootstrap.Modal(document.getElementById('addTransformationModal'));
  transformationModal.show();
}

export function deleteTransformation(index) {
  showDeleteConfirmation('transformation', index, 'Are you sure you want to delete this transformation?');
}

export function deleteTransformationConfirmed(index) {
  stateTransform.currentTransformations.splice(index, 1);
  updateTransformationsContainer();
}

export function saveTransformation() {
  const index = parseInt(document.getElementById('transformationIndex').value);
  const newTransformation = {
    source: document.getElementById('transformationSource').value,
    type: document.getElementById('transformationType').value,
    target: document.getElementById('transformationTarget').value,
    params: document.getElementById('transformationParams').value
  };

  if (index === -1) {
    stateTransform.currentTransformations.push(newTransformation);
  } else {
    stateTransform.currentTransformations[index] = newTransformation;
  }

  updateTransformationsContainer();
  bootstrap.Modal.getInstance(document.getElementById('addTransformationModal')).hide();
}
