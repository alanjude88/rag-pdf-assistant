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

const chatLog = document.getElementById('chat-log');
const questionInput = document.getElementById('question-input');
const askBtn = document.getElementById('ask-btn');

askBtn.addEventListener('click', async () => {
  const question = questionInput.value.trim();
  if (!question || !currentDocumentId) return;

  addMessage('user', question);
  questionInput.value = '';
  askBtn.disabled = true;

  const assistantMsgEl = addMessage('assistant', '');

  try {
    const res = await fetch(`/documents/${currentDocumentId}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;

        const parsed = JSON.parse(jsonStr);
        if (parsed.text) {
          assistantMsgEl.textContent += parsed.text;
          chatLog.scrollTop = chatLog.scrollHeight;
        }
      }
    }
  } catch (err) {
    assistantMsgEl.textContent = `Error: ${err.message}`;
  } finally {
    askBtn.disabled = false;
  }
});

function addMessage(role, text) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = text;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
  return div;
}