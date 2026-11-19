const chatWindow = document.getElementById('chat-window');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

const API_URL = 'https://wine-doc-api-307756948431.us-central1.run.app/chat/';

// Escape HTML so message text can't inject markup
function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Basic Markdown Parser for API responses
function parseMarkdown(text) {
    return escapeHtml(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>')             // Italics
        .replace(/\n/g, '<br>');                           // New lines
}

// Plain-text version of the answer for copying (strips markdown markers)
function toPlainText(text) {
    return String(text)
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1');
}

async function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
    }
    // Fallback for non-secure contexts (e.g. plain http)
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (!ok) throw new Error('Copy command failed');
}

function addCopyButton(bubble, text) {
    const actions = document.createElement('div');
    actions.className = 'msg-actions';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn';
    btn.textContent = '⧉ Copy answer';
    btn.setAttribute('aria-label', 'Copy answer to clipboard');

    btn.addEventListener('click', async () => {
        try {
            await copyToClipboard(text);
            btn.textContent = '✓ Copied';
            btn.classList.add('copied');
        } catch (err) {
            console.error('Copy failed:', err);
            btn.textContent = 'Copy failed';
        }
        setTimeout(() => {
            btn.textContent = '⧉ Copy answer';
            btn.classList.remove('copied');
        }, 2000);
    });

    actions.appendChild(btn);
    bubble.appendChild(actions);
}

function appendMessage(text, type, sources = [], { copyable = type === 'bot' } = {}) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type}-msg`;

    const avatarChar = type === 'bot' ? 'W' : 'U';

    // Parse markdown if it's from the bot; escape user text
    const formattedText = type === 'bot' ? parseMarkdown(text) : escapeHtml(text);

    let sourceHtml = '';
    if (sources && sources.length > 0) {
        sourceHtml = `<div class="source-tag"><strong>Sources:</strong> ${sources.map(escapeHtml).join(', ')}</div>`;
    }

    msgDiv.innerHTML = `
        <div class="avatar">${avatarChar}</div>
        <div class="bubble">
            ${formattedText}
            ${sourceHtml}
        </div>
    `;

    if (copyable) {
        let copyText = toPlainText(text);
        if (sources && sources.length > 0) copyText += `\n\nSources: ${sources.join(', ')}`;
        addCopyButton(msgDiv.querySelector('.bubble'), copyText);
    }

    chatWindow.appendChild(msgDiv);

    if (type === 'bot') {
        // Show the start of the answer so long responses can be read top-down
        chatWindow.scrollTop += msgDiv.getBoundingClientRect().top - chatWindow.getBoundingClientRect().top - 20;
    } else {
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }
}

async function handleChat() {
    const question = userInput.value.trim();
    if (!question) return;

    appendMessage(question, 'user');
    userInput.value = '';
    sendBtn.disabled = true;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: question, thread_id: "default" })
        });

        if (!response.ok) throw new Error(`Status: ${response.status}`);

        const data = await response.json();
        // Backend returns 'answer' and 'sources' [cite: 90, 104]
        appendMessage(data.answer, 'bot', data.sources);

    } catch (error) {
        console.error("Connection Error:", error);
        appendMessage("WineBot is having trouble reaching the cellar. Please check the backend service.", "bot", [], { copyable: false });
    } finally {
        sendBtn.disabled = false;
        userInput.focus();
    }
}

sendBtn.addEventListener('click', handleChat);
userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleChat(); });