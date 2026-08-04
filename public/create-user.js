document.addEventListener('DOMContentLoaded', async function () {
    const userForm = document.getElementById('create-user-form');
    const formError = document.getElementById('form-error');
    const submitButton = document.getElementById('submit-button');
    const submitButtonText = document.getElementById('submit-button-text');
    const submitSpinner = document.getElementById('submit-spinner');

    // Avatar elements
    const avatarPreviewWrapper = document.getElementById('avatar-preview-wrapper');
    const avatarEditBtn = document.getElementById('avatar-edit-btn');
    const avatarRemoveBtn = document.getElementById('avatar-remove-btn');
    const avatarFileInput = document.getElementById('avatar-file-input');
    const avatarPreviewImg = document.getElementById('avatar-preview-img');
    const avatarPlaceholderIcon = document.getElementById('avatar-placeholder-icon');

    const API_URL = window.location.origin;
    let deviceId = localStorage.getItem('deviceId');
    let webToken = null;
    let selectedAvatarBase64 = null;

    if (!deviceId || deviceId === 'undefined' || deviceId === 'null') {
        deviceId = 'web-' + Date.now() + '-' + Math.random().toString(36).substring(2, 10);
        localStorage.setItem('deviceId', deviceId);
    }

    const apiFetch = async (endpoint, options = {}) => {
        const headers = { 'Content-Type': 'application/json', ...options.headers };
        if (webToken) {
            headers['Authorization'] = `Bearer ${webToken}`;
        }
        let response;
        try {
            response = await fetch(API_URL + endpoint, { ...options, headers });
        } catch (networkError) {
            throw new Error(`Lỗi kết nối máy chủ: ${networkError.message}`);
        }

        const rawText = await response.text().catch(() => '');
        let data;
        if (rawText && rawText.trim() !== '' && rawText.trim() !== 'undefined') {
            try {
                data = JSON.parse(rawText);
            } catch (parseErr) {
                data = { error: 1, message: `Lỗi định dạng JSON từ máy chủ (${response.status})` };
            }
        } else {
            data = { error: 1, message: `Máy chủ không trả về dữ liệu (${response.status})` };
        }

        if (!response.ok || data.error !== 0) {
            throw new Error(data.message || `Lỗi API ${endpoint}. Status: ${response.status}`);
        }
        return data.data;
    };

    // Check if user already exists
    try {
        const tokenData = await apiFetch('/oauth/web-token');
        webToken = tokenData.access_token;
        const existingUser = await apiFetch(`/api/user/check-device?device_id=${deviceId}`);
        if (existingUser && (existingUser.user_id || existingUser.id)) {
            // Already created, redirect to home
            window.location.href = '/';
            return;
        }
    } catch (e) {
        console.warn('Initialization note:', e.message);
    }

    // Avatar handlers
    const resetAvatarUI = () => {
        selectedAvatarBase64 = null;
        if (avatarFileInput) avatarFileInput.value = '';
        if (avatarPreviewImg) {
            avatarPreviewImg.src = '';
            avatarPreviewImg.classList.add('d-none');
        }
        if (avatarPlaceholderIcon) avatarPlaceholderIcon.classList.remove('d-none');
        if (avatarRemoveBtn) avatarRemoveBtn.classList.add('d-none');
    };

    const updateAvatarPreview = (src) => {
        if (!src) {
            resetAvatarUI();
            return;
        }
        if (avatarPreviewImg) {
            avatarPreviewImg.src = src;
            avatarPreviewImg.classList.remove('d-none');
        }
        if (avatarPlaceholderIcon) avatarPlaceholderIcon.classList.add('d-none');
        if (avatarRemoveBtn) avatarRemoveBtn.classList.remove('d-none');
    };

    avatarEditBtn?.addEventListener('click', () => avatarFileInput?.click());
    avatarPreviewWrapper?.addEventListener('click', () => avatarFileInput?.click());
    avatarRemoveBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        resetAvatarUI();
    });

    avatarFileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            alert('Vui lòng chọn ảnh nhỏ hơn 5MB.');
            avatarFileInput.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            selectedAvatarBase64 = event.target.result;
            updateAvatarPreview(selectedAvatarBase64);
        };
        reader.readAsDataURL(file);
    });

    // Hide error alert when user modifies form inputs
    userForm?.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => {
            if (formError) formError.classList.add('d-none');
            if (submitButton) submitButton.disabled = false;
        });
    });

    // Form submit
    userForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitButton.disabled = true;
        submitSpinner.classList.remove('d-none');
        submitButtonText.classList.add('d-none');
        formError.classList.add('d-none');

        const formData = new FormData(userForm);
        const userData = Object.fromEntries(formData.entries());
        userData.device_id = deviceId;
        if (!userData.password || !userData.password.trim()) {
            userData.password = '123456';
        }
        if (selectedAvatarBase64) {
            userData.avatar_base64 = selectedAvatarBase64;
        }

        try {
            await apiFetch('/api/user/create', {
                method: 'POST',
                body: JSON.stringify(userData)
            });
            window.location.href = '/';
        } catch (err) {
            formError.textContent = err.message;
            formError.classList.remove('d-none');
            submitButton.disabled = false;
            submitSpinner.classList.add('d-none');
            submitButtonText.classList.remove('d-none');
        }
    });

    // --- Mode Toggle: Create Profile vs Login ---
    const btnShowLogin = document.getElementById('btn-show-login');
    const btnShowCreate = document.getElementById('btn-show-create');
    const loginFormContainer = document.getElementById('login-form-container');
    const loginForm = document.getElementById('login-user-form');
    const loginError = document.getElementById('login-error');
    const formTitle = document.querySelector('.welcome-header h1');
    const formSubtitle = document.querySelector('.welcome-header p');

    btnShowLogin?.addEventListener('click', () => {
        userForm?.classList.add('d-none');
        loginFormContainer?.classList.remove('d-none');
        if (formTitle) formTitle.textContent = 'Đăng Nhập Tài Khoản';
        if (formSubtitle) formSubtitle.textContent = 'Nhập Email và Mật khẩu để đồng bộ hồ sơ trên thiết bị này.';
    });

    btnShowCreate?.addEventListener('click', () => {
        loginFormContainer?.classList.add('d-none');
        userForm?.classList.remove('d-none');
        if (formTitle) formTitle.textContent = 'Tạo Hồ Sơ Của Bạn';
        if (formSubtitle) formSubtitle.textContent = 'Nhập thông tin chính xác của bạn để bắt đầu hành trình khám phá vận mệnh.';
    });

    // Login submit
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const loginEmail = document.getElementById('login-email').value.trim();
        const loginPassword = document.getElementById('login-password').value;

        if (loginError) loginError.classList.add('d-none');

        try {
            const res = await fetch('/api/user/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: loginEmail,
                    password: loginPassword,
                    device_id: deviceId
                })
            });

            const json = await res.json();
            if (json.status === 200 && json.data) {
                const token = json.data.token || json.data.access_token;
                if (token) {
                    localStorage.setItem('webToken', token);
                    localStorage.setItem('token', token);
                }
                if (json.data.user) {
                    localStorage.setItem('tuvi_user_profile', JSON.stringify(json.data.user));
                }
                window.location.href = '/';
            } else {
                if (loginError) {
                    loginError.textContent = json.message || 'Email hoặc Mật khẩu không đúng.';
                    loginError.classList.remove('d-none');
                }
            }
        } catch (err) {
            console.error(err);
            if (loginError) {
                loginError.textContent = 'Có lỗi xảy ra khi kết nối máy chủ.';
                loginError.classList.remove('d-none');
            }
        }
    });
});

