document.addEventListener('DOMContentLoaded', async function () {
    const userForm = document.getElementById('update-user-form');
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

    // Nav Avatar
    const navUserProfile = document.getElementById('nav-user-profile');
    const navAvatarImg = document.getElementById('nav-avatar-img');
    const navAvatarPlaceholder = document.getElementById('nav-avatar-placeholder');

    const API_URL = window.location.origin;
    let deviceId = localStorage.getItem('deviceId');
    let webToken = null;
    let currentUser = null;
    let selectedAvatarBase64 = null;

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

    const populateForm = (user) => {
        document.getElementById('user_id').value = user.user_id || user.id;
        document.getElementById('full_name').value = user.full_name || '';
        document.getElementById('email').value = user.email || '';
        document.getElementById('birthday').value = user.birthday || '';
        document.getElementById('birth_time').value = user.birth_time || '';
        const genderRadio = document.querySelector(`input[name="gender"][value="${user.gender}"]`);
        if (genderRadio) genderRadio.checked = true;

        if (user.avatar_url) {
            updateAvatarPreview(user.avatar_url);
            updateNavAvatar(user.avatar_url);
        } else {
            resetAvatarUI();
        }
    };

    const updateNavAvatar = (url) => {
        if (!navUserProfile) return;
        navUserProfile.classList.remove('d-none');
        if (url) {
            if (navAvatarImg) { navAvatarImg.src = url; navAvatarImg.classList.remove('d-none'); }
            if (navAvatarPlaceholder) navAvatarPlaceholder.classList.add('d-none');
        } else {
            if (navAvatarImg) { navAvatarImg.src = ''; navAvatarImg.classList.add('d-none'); }
            if (navAvatarPlaceholder) navAvatarPlaceholder.classList.remove('d-none');
        }
    };

    // Load existing user
    try {
        const tokenData = await apiFetch('/oauth/web-token');
        webToken = tokenData.access_token;
        if (!deviceId || deviceId === 'undefined' || deviceId === 'null') {
            window.location.href = '/create-user.html';
            return;
        }
        const existingUser = await apiFetch(`/api/user/check-device?device_id=${deviceId}`);
        if (!existingUser || (!existingUser.user_id && !existingUser.id)) {
            window.location.href = '/create-user.html';
            return;
        }
        currentUser = existingUser;
        populateForm(currentUser);
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
        if (selectedAvatarBase64) {
            userData.avatar_base64 = selectedAvatarBase64;
        }

        try {
            await apiFetch('/api/user/update-user', {
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
});
