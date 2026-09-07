const fileInput = document.getElementById('file-input');
const uploadBtn = document.getElementById('upload-btn');
const uploadStatus = document.getElementById('upload-status');
const chatSection = document.getElementById('chat-section');

let currentDocumentId = null;

uploadBtn.addEventListener('click', async () => {
  const file = fileInput.files[0];
  if (!file) {
    uploadStatus.textContent = 'Please choose a PDF first.';
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  uploadStatus.textContent = 'Uploading...';
  uploadBtn.disabled = true;

  try {
    const res = await fetch('/documents', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();

    if (!res.ok) {
      uploadStatus.textContent = `Error: ${data.error}`;
      uploadBtn.disabled = false;
      return;
    }

    currentDocumentId = data.documentId;
    uploadStatus.textContent = 'Processing...';
    pollStatus();
  } catch (err) {
    uploadStatus.textContent = `Error: ${err.message}`;
    uploadBtn.disabled = false;
  }
});

async function pollStatus() {
  const res = await fetch(`/documents/${currentDocumentId}/status`);
  const data = await res.json();

  if (data.status === 'complete') {
    uploadStatus.textContent = `Ready! (${data.chunkCount} chunks indexed)`;
    uploadBtn.disabled = false;
    chatSection.style.display = 'block';
    return;
  }

  if (data.status === 'failed') {
    uploadStatus.textContent = `Processing failed: ${data.error}`;
    uploadBtn.disabled = false;
    return;
  }

  uploadStatus.textContent = `Status: ${data.status}...`;
  setTimeout(pollStatus, 2000);
}