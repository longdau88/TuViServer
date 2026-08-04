document.addEventListener('DOMContentLoaded', async () => {
    const chatForm = document.getElementById('ai-chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatContainer = document.getElementById('chat-messages-container');
    const typingIndicator = document.getElementById('typing-indicator');
    const suggestedBox = document.getElementById('suggested-questions-box');
    const suggestedPills = document.getElementById('suggested-questions-pills');
    const presetPromptsContainer = document.getElementById('preset-prompts-container');

    const modeSelf = document.getElementById('mode-self');
    const modeOther = document.getElementById('mode-other');

    const selfProfileDisplay = document.getElementById('self-profile-display');
    const selfDisplayText = document.getElementById('self-display-text');
    const otherInputContainer = document.getElementById('other-input-container');

    const nameInput = document.getElementById('user-name');
    const birthdayInput = document.getElementById('user-birthday');
    const birthtimeInput = document.getElementById('user-birthtime');
    const maleRadio = document.getElementById('gender-male');
    const femaleRadio = document.getElementById('gender-female');

    let deviceId = localStorage.getItem('deviceId');
    let selfProfile = null;
    const conversationHistory = [];

    async function getAuthToken() {
        let token = localStorage.getItem('webToken') || localStorage.getItem('token');
        if (token && token !== 'undefined' && token !== 'null') {
            return token;
        }
        try {
            const res = await fetch('/oauth/web-token');
            const json = await res.json();
            if (json && json.data && json.data.access_token) {
                token = json.data.access_token;
                localStorage.setItem('webToken', token);
                localStorage.setItem('token', token);
                return token;
            }
        } catch (e) {
            console.warn('Could not retrieve web token:', e);
        }
        return null;
    }

    // Load self profile
    async function loadSelfProfile() {
        try {
            const stored = localStorage.getItem('tuvi_user_profile');
            if (stored) {
                selfProfile = JSON.parse(stored);
            }
        } catch (e) {}

        if (!deviceId) {
            deviceId = 'web-' + Date.now() + '-' + Math.random().toString(36).substring(2, 10);
            localStorage.setItem('deviceId', deviceId);
        }

        try {
            const token = await getAuthToken();
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const res = await fetch(`/api/user/check-device?device_id=${deviceId}`, { headers });
            const json = await res.json();
            if (json.status === 200 && json.data && json.data.birthday) {
                selfProfile = json.data;
                localStorage.setItem('tuvi_user_profile', JSON.stringify(selfProfile));
            }
        } catch (e) {
            console.warn('Check device error:', e);
        }

        updateSelfProfileUI();
    }

    function updateSelfProfileUI() {
        if (selfProfile && selfProfile.full_name && selfProfile.birthday) {
            selfDisplayText.innerHTML = `<i class="bi bi-person-check-fill me-1"></i> ${selfProfile.full_name} | Ngày sinh: ${selfProfile.birthday}`;
        } else {
            selfDisplayText.innerHTML = `<i class="bi bi-person-fill me-1"></i> Chưa chọn thông tin bản thân`;
        }
    }

    // Mode Toggle
    modeSelf.addEventListener('change', () => {
        if (modeSelf.checked) {
            selfProfileDisplay.classList.remove('d-none');
            otherInputContainer.classList.add('d-none');
        }
    });

    modeOther.addEventListener('change', () => {
        if (modeOther.checked) {
            selfProfileDisplay.classList.add('d-none');
            otherInputContainer.classList.remove('d-none');
        }
    });

    // Load Preset Prompts from API
    async function loadPresetPrompts() {
        try {
            const res = await fetch('/api/ai/preset-prompts');
            const json = await res.json();
            if (json.status === 200 && json.data) {
                presetPromptsContainer.innerHTML = '';
                json.data.forEach((p) => {
                    const badge = document.createElement('div');
                    badge.className = 'preset-prompt-badge';
                    badge.innerHTML = `<i class="bi ${p.icon}"></i> ${p.title}`;
                    badge.onclick = () => {
                        chatInput.value = p.prompt;
                        chatForm.dispatchEvent(new Event('submit'));
                    };
                    presetPromptsContainer.appendChild(badge);
                });
            }
        } catch (e) {
            console.warn('Error loading preset prompts:', e);
        }
    }

    await loadSelfProfile();
    await loadPresetPrompts();

    // Handle Form Submit
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const message = chatInput.value.trim();
        if (!message) return;

        // Render User Message Bubble
        appendUserMessage(message);
        chatInput.value = '';
        suggestedBox.classList.add('d-none');

        // Prepare Payload
        let person = null;
        if (modeSelf.checked) {
            if (selfProfile && selfProfile.birthday) {
                person = {
                    full_name: selfProfile.full_name || 'Bản thân',
                    birthday: selfProfile.birthday,
                    birth_time: selfProfile.birth_time || '08:30',
                    gender: selfProfile.gender || 'nam',
                };
            }
        } else {
            person = {
                full_name: nameInput.value.trim() || 'Người khác',
                birthday: birthdayInput.value || '2000-05-15',
                birth_time: birthtimeInput.value || '08:00',
                gender: document.querySelector('input[name="user-gender"]:checked').value,
            };
        }

        const payload = {
            message,
            history: conversationHistory,
            device_id: deviceId,
            person,
        };

        // Show typing indicator
        typingIndicator.classList.remove('d-none');
        chatContainer.scrollTop = chatContainer.scrollHeight;

        try {
            const token = await getAuthToken();
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            typingIndicator.classList.add('d-none');

            if (json.status === 200 && json.data) {
                const aiData = json.data;
                appendAiMessage(aiData.reply);

                // Record history
                conversationHistory.push({ role: 'user', content: message });
                conversationHistory.push({ role: 'assistant', content: aiData.reply });

                // Render suggested follow-up questions
                if (aiData.suggested_questions && aiData.suggested_questions.length > 0) {
                    renderSuggestedQuestions(aiData.suggested_questions);
                }
            } else if (json.code === 'VIP_REQUIRED' || json.status === 403) {
                appendVipUpsellMessage(json.message || 'Bạn đã dùng hết 3 lượt hỏi AI Free hôm nay. Hãy nâng cấp VIP để trò chuyện không giới hạn!');
            } else {
                appendAiMessage(json.message || 'Xin lỗi, có lỗi xảy ra khi xử lý câu hỏi của bạn.');
            }

        } catch (err) {
            console.error('Chat error:', err);
            typingIndicator.classList.add('d-none');
            appendAiMessage('Không thể kết nối đến máy chủ AI. Vui lòng kiểm tra lại kết nối.');
        }
    });

    function appendUserMessage(text) {
        const div = document.createElement('div');
        div.className = 'message-bubble user-message';
        div.textContent = text;
        chatContainer.appendChild(div);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function appendAiMessage(markdownText) {
        const wrapper = document.createElement('div');
        wrapper.className = 'd-flex align-items-start';

        // Format basic markdown (bold, list)
        let formatted = markdownText
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');

        wrapper.innerHTML = `
            <div class="ai-avatar-icon"><i class="bi bi-robot"></i></div>
            <div class="message-bubble ai-message">
                ${formatted}
            </div>
        `;
        chatContainer.appendChild(wrapper);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function appendVipUpsellMessage(messageText) {
        const wrapper = document.createElement('div');
        wrapper.className = 'd-flex align-items-start';
        wrapper.innerHTML = `
            <div class="ai-avatar-icon text-warning"><i class="bi bi-crown"></i></div>
            <div class="message-bubble ai-message border border-warning" style="background: rgba(253, 216, 53, 0.15);">
                <div class="fw-bold text-warning mb-1"><i class="bi bi-lock-fill me-1"></i> GIỚI HẠN TÀI KHOẢN MIỄN PHÍ</div>
                <p class="mb-2 text-white">${messageText}</p>
                <a href="goi-cuoc.html" class="btn btn-warning btn-sm text-dark fw-bold rounded-pill px-3 shadow">

                    <i class="bi bi-stars me-1"></i> NÂNG CẤP VIP NGAY
                </a>
            </div>
        `;
        chatContainer.appendChild(wrapper);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }


    function renderSuggestedQuestions(questions) {
        suggestedPills.innerHTML = '';
        questions.forEach((q) => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-outline-warning btn-sm rounded-pill text-start';
            btn.innerHTML = `<i class="bi bi-question-circle me-1"></i> ${q}`;
            btn.onclick = () => {
                chatInput.value = q;
                chatForm.dispatchEvent(new Event('submit'));
            };
            suggestedPills.appendChild(btn);
        });
        suggestedBox.classList.remove('d-none');
    }
});
