const state = {
    token: '',
    deviceId: '',
    user: null,
    formMode: 'create',
};

const loadingView = document.getElementById('loadingView');
const mainView = document.getElementById('mainView');
const createView = document.getElementById('createView');
const statusBox = document.getElementById('statusBox');
const loadingText = document.getElementById('loadingText');
const deviceIdText = document.getElementById('deviceIdText');
const avatarImage = document.getElementById('avatarImage');
const avatarFallback = document.getElementById('avatarFallback');
const fullName = document.getElementById('fullName');
const subtitle = document.getElementById('subtitle');
const solarBirth = document.getElementById('solarBirth');
const birthTimeLabel = document.getElementById('birthTimeLabel');
const lunarBirth = document.getElementById('lunarBirth');
const ageLabel = document.getElementById('ageLabel');
const canChiLabel = document.getElementById('canChiLabel');
const centerChips = document.getElementById('centerChips');
const chartSummary = document.getElementById('chartSummary');
const palaceGrid = document.getElementById('palaceGrid');
const palaceTemplate = document.getElementById('palaceTemplate');
const createForm = document.getElementById('createUserForm');
const createStatus = document.getElementById('createStatus');
const createButton = document.getElementById('createButton');
const createTitle = document.querySelector('#createView .section-title h2');
const createSubtitle = document.querySelector('#createView .section-title span');
const editProfileButton = document.getElementById('editProfileButton');
const cancelEditButton = document.getElementById('cancelEditButton');
const createAvatarFile = document.getElementById('createAvatarFile');
const createAvatarPreview = document.getElementById('createAvatarPreview');

const createFullName = document.getElementById('createFullName');
const createEmail = document.getElementById('createEmail');
const createBirthday = document.getElementById('createBirthday');
const createBirthTime = document.getElementById('createBirthTime');
const createGender = document.getElementById('createGender');

let createAvatarBase64 = null;

const palaceOrder = [
    'Ty',
    'Ngo',
    'Mui',
    'Than',
    'Dau',
    'Tuat',
    'Hoi',
    'Than_At_Ach',
    'Mui_Tai_Bach',
    'Ngo_Tu_Tuc',
    'Ty_Phu_The',
    'Thin',
];

const setVisible = (element, visible) => {
    element.style.display = visible ? '' : 'none';
};

const setStatus = (message, isError = false) => {
    statusBox.textContent = message;
    statusBox.style.color = isError ? '#c62828' : '#5b7090';
};

const setCreateStatus = (message, isError = false) => {
    createStatus.textContent = message;
    createStatus.style.color = isError ? '#c62828' : '#5b7090';
};

const defaultAvatar = (name) => {
    const initials = (name || '?')
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('') || '?';
    avatarFallback.textContent = initials;
    avatarFallback.style.display = 'grid';
    avatarImage.style.display = 'none';
};

const renderAvatar = (name, avatarUrl) => {
    const normalizedAvatar = normalizeAvatarSource(avatarUrl);

    if (normalizedAvatar) {
        avatarImage.src = normalizedAvatar;
        avatarImage.style.display = 'block';
        avatarFallback.style.display = 'none';
        avatarImage.onerror = () => defaultAvatar(name);
        return;
    }

    defaultAvatar(name);
};

const readJsonResponse = async (response) => {
    const rawText = await response.text();

    try {
        return rawText ? JSON.parse(rawText) : {};
    } catch (error) {
        throw new Error(rawText.slice(0, 160) || 'Invalid JSON response');
    }
};

const renderChips = (data) => {
    const chips = [
        ['Năm xem', data.thong_tin_trung_tam?.nam_xem],
        ['Bản mệnh', data.thong_tin_trung_tam?.ban_menh],
        ['Cung', data.thong_tin_trung_tam?.cuc],
        ['Mệnh chủ', data.thong_tin_trung_tam?.menh_chu],
        ['Thân chủ', data.thong_tin_trung_tam?.than_chu],
        ['Thân cư', data.thong_tin_trung_tam?.than_cu],
        ['Giờ sinh âm', data.thong_tin_trung_tam?.gio_sinh_can_chi],
        ['Cục hòa Bản Mệnh', data.thong_tin_trung_tam?.cuc_hoa_ban_menh],
        ['Đơn vị cấp', data.thong_tin_trung_tam?.don_vi_cap],
    ].filter(([, value]) => value);

    centerChips.innerHTML = chips
        .map(([label, value]) => `<div class="chip"><b>${label}:</b>${value}</div>`)
        .join('');
};

const renderStars = (container, items) => {
    container.innerHTML = (items || [])
        .map((item) => {
            const label = typeof item === 'string' ? item : `${item.ten}${item.trang_thai ? ` (${item.trang_thai})` : ''}`;
            const tone = typeof item === 'object' && item.loai === 'xau' ? ' star--bad' : typeof item === 'object' && item.loai === 'tot' ? ' star--good' : '';
            return `<span class="star${tone}">${label}</span>`;
        })
        .join('');
};

const renderPalaces = (palaces) => {
    palaceGrid.innerHTML = '';

    Object.values(palaces || {}).forEach((palace) => {
        if (!palace) return;

        const node = palaceTemplate.content.cloneNode(true);
        node.querySelector('.palace-name').textContent = palace.ten_cung || palace.cung_goc || '-';
        node.querySelector('.palace-age').textContent = palace.dai_han ? `Đại hạn ${palace.dai_han}` : '';
        node.querySelector('.palace-vong').textContent = palace.vong_trang_sinh ? `Vòng ${palace.vong_trang_sinh}` : '';
        node.querySelector('.palace-element').textContent = palace.ngu_hanh_cung ? `Ngũ hành ${palace.ngu_hanh_cung}` : '';

        renderStars(node.querySelector('.palace-main-stars'), palace.chinh_tinh);
        renderStars(node.querySelector('.palace-cat-stars'), palace.cat_tinh);
        renderStars(node.querySelector('.palace-hung-stars'), palace.hung_tinh);

        palaceGrid.appendChild(node);
    });
};

const renderData = (payload) => {
    const center = payload.thong_tin_trung_tam || {};
    const meta = payload.meta || {};
    const subtitleParts = [
        center.ngay_sinh_duong || '-',
        center.gio_sinh || null,
        center.ngay_sinh_am || '-',
    ].filter(Boolean);

    fullName.textContent = meta.full_name || '-';
    subtitle.textContent = subtitleParts.join(' · ');
    solarBirth.textContent = center.ngay_sinh_duong || '-';
    birthTimeLabel.textContent = center.gio_sinh || '-';
    lunarBirth.textContent = center.ngay_sinh_am || '-';
    ageLabel.textContent = center.tuoi || '-';
    canChiLabel.textContent = center.chi_tiet_am_lich || '-';
    chartSummary.textContent = meta.summary || '';

    renderChips(payload);
    renderPalaces(payload.la_so_12_cung);
    renderAvatar(meta.full_name || 'User', meta.avatar_url || null);
};

const normalizeAvatarSource = (avatarValue) => {
    if (!avatarValue || typeof avatarValue !== 'string') return null;

    const trimmed = avatarValue.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
        return trimmed;
    }

    const looksLikeBase64 = /^[A-Za-z0-9+/=\s]+$/.test(trimmed) && trimmed.length > 100;
    return looksLikeBase64 ? `data:image/jpeg;base64,${trimmed.replace(/\s+/g, '')}` : trimmed;
};

const getOrCreateDeviceId = () => {
    const storageKey = 'tuvi-device-id';
    const existing = localStorage.getItem(storageKey);
    if (existing) return existing;

    const randomPart = window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const deviceId = `web-${randomPart}`;
    localStorage.setItem(storageKey, deviceId);
    return deviceId;
};

const bootstrapToken = async () => {
    const response = await fetch('/oauth/web-token');
    const payload = await readJsonResponse(response);

    if (!response.ok || payload.error || !payload.access_token) {
        throw new Error(payload.message || 'Không thể lấy Bearer token');
    }

    return payload.access_token;
};

const checkExistingUser = async () => {
    const response = await fetch(`/api/user/check-device_id?device_id=${encodeURIComponent(state.deviceId)}`, {
        headers: {
            Authorization: `Bearer ${state.token}`,
        },
    });

    const payload = await readJsonResponse(response);

    if (!response.ok || payload.error) {
        throw new Error(payload.message || 'Không thể kiểm tra user');
    }

    return payload.data && payload.data.id ? payload.data : null;
};

const loadUserChart = async () => {
    const response = await fetch(`/api/user/la-so-tu-vi?user_id=${encodeURIComponent(state.user.id)}`, {
        headers: {
            Authorization: `Bearer ${state.token}`,
        },
    });

    const payload = await readJsonResponse(response);

    if (!response.ok || payload.error) {
        const error = new Error(payload.message || 'Không thể tải lá số');
        error.status = response.status;
        error.payload = payload;
        throw error;
    }

    renderData(payload.data);
};

const showLoading = (message) => {
    loadingText.textContent = message;
    setVisible(loadingView, true);
    setVisible(mainView, false);
    setVisible(createView, false);
};

const showMain = () => {
    setVisible(loadingView, false);
    setVisible(mainView, true);
    setVisible(createView, false);
};

const showCreate = () => {
    setVisible(loadingView, false);
    setVisible(mainView, false);
    setVisible(createView, true);
};

const setFormMode = (mode) => {
    state.formMode = mode;
    createButton.textContent = mode === 'edit' ? 'Lưu thay đổi' : 'Tạo user';
    cancelEditButton.style.display = mode === 'edit' ? '' : 'none';
    createTitle.textContent = mode === 'edit' ? 'Thay đổi thông tin' : 'Thiết bị chưa có user';
    createSubtitle.textContent = mode === 'edit' ? 'Cập nhật hồ sơ hiện tại và lưu ảnh mới nếu có' : 'Hãy tạo hồ sơ để xem lá số';
};

const resetCreateForm = () => {
    createForm.reset();
    createAvatarBase64 = null;
    updateAvatarPreview(null);
    setFormMode('create');
};

const fillCreateFormFromUser = (user) => {
    if (!user) return;

    createFullName.value = user.full_name || '';
    createEmail.value = user.email || '';
    createBirthday.value = user.birthday || '';
    createBirthTime.value = user.birth_time || '';
    createGender.value = /^(female|f|nữ|nu)$/i.test(String(user.gender || '').trim()) ? 'female' : 'male';
    createAvatarFile.value = '';
    createAvatarBase64 = null;

    const existingAvatar = normalizeAvatarSource(user.avatar_base64 || user.avatar_url || null);
    updateAvatarPreview(existingAvatar, existingAvatar ? 'Ảnh hiện tại' : null);
    setFormMode('edit');
}

const createDeviceInfo = () => {
    return JSON.stringify({
        user_agent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        created_from: 'web-ui',
    });
};

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Không thể đọc file ảnh'));
    reader.readAsDataURL(file);
});

const dataUrlToImage = (dataUrl) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Không thể xử lý ảnh'));
    image.src = dataUrl;
});

const compressImageFile = async (file) => {
    const sourceDataUrl = await readFileAsDataUrl(file);
    const image = await dataUrlToImage(sourceDataUrl);

    const maxDimension = 1024;
    let { width, height } = image;
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('Không thể nén ảnh');
    }

    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.78);
};

const updateAvatarPreview = (dataUrl, fileName) => {
    if (!dataUrl) {
        createAvatarPreview.innerHTML = '<span>Chưa chọn ảnh</span>';
        return;
    }

    createAvatarPreview.innerHTML = `
        <img src="${dataUrl}" alt="Xem trước avatar" />
        <strong>${fileName || 'Ảnh đã chọn'}</strong>
    `;
};

createAvatarFile.addEventListener('change', async () => {
    const file = createAvatarFile.files && createAvatarFile.files[0];
    if (!file) {
        createAvatarBase64 = null;
        updateAvatarPreview(null);
        return;
    }

    try {
        createAvatarBase64 = await compressImageFile(file);
        updateAvatarPreview(createAvatarBase64, file.name);
        setCreateStatus('Ảnh đã sẵn sàng để lưu cùng user.');
    } catch (error) {
        createAvatarBase64 = null;
        updateAvatarPreview(null);
        setCreateStatus(error.message || 'Không thể đọc ảnh.', true);
    }
});

const saveUser = async (payloadBody) => {
    const response = await fetch('/api/user/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${state.token}`,
        },
        body: JSON.stringify(payloadBody),
    });

    const payload = await readJsonResponse(response);

    return { response, payload };
};

const submitCreateUser = async (event) => {
    event.preventDefault();

    const full_name = createFullName.value.trim();
    const email = createEmail.value.trim();
    const birthday = createBirthday.value.trim();
    const birth_time = createBirthTime.value.trim();
    const gender = createGender.value;

    if (!full_name || !email || !birthday || !birth_time || !gender) {
        setCreateStatus('Vui lòng nhập đầy đủ thông tin.', true);
        return;
    }

    createButton.disabled = true;
    setCreateStatus(state.formMode === 'edit' ? 'Đang lưu thay đổi...' : 'Đang tạo user...');

    try {
        const { response, payload } = await saveUser({
            user_id: state.formMode === 'edit' ? state.user.id : undefined,
            full_name,
            email,
            birthday,
            birth_time,
            gender,
            device_id: state.deviceId,
            device_info: createDeviceInfo(),
            avatar_base64: createAvatarBase64,
            firebase_token: null,
        });

        if (!response.ok || payload.error) {
            throw new Error(payload.message || (state.formMode === 'edit' ? 'Không thể cập nhật user' : 'Không thể tạo user'));
        }

        setCreateStatus(state.formMode === 'edit' ? 'Đã lưu thay đổi. Đang tải lại lá số...' : 'Tạo user thành công. Đang tải lá số...');
        state.user = payload.data;
        await loadUserChart();
        showMain();
        setFormMode('create');
        createAvatarBase64 = null;
    } catch (error) {
        setCreateStatus(error.message || 'Có lỗi xảy ra.', true);
    } finally {
        createButton.disabled = false;
    }
};

const bootstrapApp = async () => {
    state.deviceId = getOrCreateDeviceId();
    deviceIdText.textContent = state.deviceId;
    showLoading('Đang khởi tạo phiên làm việc...');

    try {
        state.token = await bootstrapToken();
        showLoading('Đang kiểm tra user trên thiết bị này...');

        state.user = await checkExistingUser();

        if (state.user) {
            if (!state.user.birth_time) {
                fillCreateFormFromUser(state.user);
                setCreateStatus('User hiện tại chưa có giờ sinh. Vui lòng bổ sung để hệ thống tính lá số tử vi.');
                showCreate();
                return;
            }

            try {
                await loadUserChart();
                showMain();
            } catch (error) {
                if (error.status === 422) {
                    fillCreateFormFromUser(state.user);
                    setCreateStatus('User hiện tại thiếu giờ sinh hoặc dữ liệu tử vi chưa đủ. Vui lòng cập nhật lại thông tin.');
                    showCreate();
                    return;
                }

                throw error;
            }

            return;
        }

        showCreate();
        resetCreateForm();
        setCreateStatus('Thiết bị chưa có user. Vui lòng nhập thông tin để tạo user.');
    } catch (error) {
        showLoading(error.message || 'Có lỗi xảy ra khi khởi tạo.');
    }
};

createForm.addEventListener('submit', submitCreateUser);
editProfileButton.addEventListener('click', () => {
    if (!state.user) return;
    fillCreateFormFromUser(state.user);
    setCreateStatus('Chỉnh sửa thông tin hiện tại.');
    showCreate();
});

cancelEditButton.addEventListener('click', () => {
    resetCreateForm();
    showMain();
});
bootstrapApp();
