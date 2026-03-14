const chatWindow = document.getElementById('chat-window');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

const API_URL = 'https://wine-doc-api-307756948431.us-central1.run.app/chat/';

// Basic Markdown Parser for API responses
function parseMarkdown(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>')             // Italics
        .replace(/\n/g, '<br>');                           // New lines
}

function appendMessage(text, type, sources = []) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type}-msg`;
    
    const avatarChar = type === 'bot' ? 'W' : 'U';
    
    // Parse markdown if it's from the bot
    const formattedText = type === 'bot' ? parseMarkdown(text) : text;

    let sourceHtml = '';
    if (sources && sources.length > 0) {
        sourceHtml = `<div class="source-tag"><strong>Sources:</strong> ${sources.join(', ')}</div>`;
    }

    msgDiv.innerHTML = `
        <div class="avatar">${avatarChar}</div>
        <div class="bubble">
            ${formattedText}
            ${sourceHtml}
        </div>
    `;

    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
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
        appendMessage("WineBot is having trouble reaching the cellar. Please check the backend service.", "bot");
    } finally {
        sendBtn.disabled = false;
        userInput.focus();
    }
}

sendBtn.addEventListener('click', handleChat);
userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleChat(); });