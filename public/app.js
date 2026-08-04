document.addEventListener('DOMContentLoaded', function () {
    // --- DOM Elements ---
    const screens = {
        initialLoading: document.getElementById('initial-loading-screen'),
        userForm: document.getElementById('user-form-screen'),
        dashboard: document.getElementById('dashboard-screen'),
        chartLoading: document.getElementById('chart-loading-screen'),
        results: document.getElementById('results-screen'),
    };

    // Form elements
    const userForm = document.getElementById('create-user-form');
    const userFormTitle = document.getElementById('user-form-title');
    const userFormSubtitle = document.getElementById('user-form-subtitle');
    const formError = document.getElementById('form-error');
    const submitButton = document.getElementById('submit-button');
    const submitButtonText = document.getElementById('submit-button-text');
    const submitSpinner = document.getElementById('submit-spinner');
    const dashboardBackButton = document.getElementById('dashboard-back-button');

    // Avatar elements
    const avatarPreviewWrapper = document.getElementById('avatar-preview-wrapper');
    const avatarEditBtn = document.getElementById('avatar-edit-btn');
    const avatarRemoveBtn = document.getElementById('avatar-remove-btn');
    const avatarFileInput = document.getElementById('avatar-file-input');
    const avatarPreviewImg = document.getElementById('avatar-preview-img');
    const avatarPlaceholderIcon = document.getElementById('avatar-placeholder-icon');

    // Nav Avatar elements
    const navUserProfile = document.getElementById('nav-user-profile');
    const navAvatarBtn = document.getElementById('nav-avatar-btn');
    const navAvatarImg = document.getElementById('nav-avatar-img');
    const navAvatarPlaceholder = document.getElementById('nav-avatar-placeholder');

    // Dashboard elements
    const dashboardWelcomeTitle = document.getElementById('dashboard-welcome-title');
    const naviViewChart = document.getElementById('navi-view-chart');
    const naviUpdateInfo = document.getElementById('navi-update-info');

    // Results elements
    const resultsContent = document.getElementById('results-content');
    const resultsBackButton = document.getElementById('results-back-button');

    // --- State ---
    const API_URL = window.location.origin;
    let deviceId = localStorage.getItem('deviceId');
    let webToken = null;
    let currentUser = null;
    let selectedAvatarBase64 = null;

    // --- Helper: Update Top Right Nav Avatar & VIP Package Status ---
    const updateNavAvatarUI = () => {
        if (!currentUser) {
            navUserProfile?.classList.add('d-none');
            return;
        }
        navUserProfile?.classList.remove('d-none');
        if (currentUser.avatar_url) {
            navAvatarImg.src = currentUser.avatar_url;
            navAvatarImg.classList.remove('d-none');
            navAvatarPlaceholder.classList.add('d-none');
        } else {
            navAvatarImg.src = '';
            navAvatarImg.classList.add('d-none');
            navAvatarPlaceholder.classList.remove('d-none');
        }

        // Update User VIP Package Status Bar
        const pkgNameEl = document.getElementById('user-pkg-name');
        const pkgBadgeEl = document.getElementById('user-pkg-badge');

        if (pkgNameEl && pkgBadgeEl) {
            const isVip = currentUser.vip_status && currentUser.vip_status !== 'free';
            const isExpired = isVip && currentUser.vip_expires_at && new Date(currentUser.vip_expires_at) < new Date();

            if (isVip && !isExpired) {
                const expiresDateStr = currentUser.vip_expires_at ? new Date(currentUser.vip_expires_at).toLocaleDateString('vi-VN') : 'Vĩnh viễn';
                pkgNameEl.innerText = `VIP (Hạn dùng: ${expiresDateStr})`;
                pkgNameEl.className = 'text-warning font-bold';
                pkgBadgeEl.innerText = 'VIP ACTIVE';
                pkgBadgeEl.className = 'badge bg-warning text-dark ms-1';
            } else if (isExpired) {
                pkgNameEl.innerText = 'Gói VIP Đã Hết Hạn';
                pkgNameEl.className = 'text-danger font-bold';
                pkgBadgeEl.innerText = 'Hết Hạn';
                pkgBadgeEl.className = 'badge bg-danger text-white ms-1';
            } else {
                pkgNameEl.innerText = 'Miễn Phí (Free)';
                pkgNameEl.className = 'text-light';
                pkgBadgeEl.innerText = 'Free';
                pkgBadgeEl.className = 'badge bg-secondary text-white ms-1';
            }
        }
    };


    // --- Screen Management ---
    const showScreen = (screenName) => {
        Object.values(screens).forEach(screen => {
            if (screen) screen.classList.add('d-none');
        });
        if (screens[screenName]) {
            screens[screenName].classList.remove('d-none');
        }
        window.scrollTo(0, 0);
    };

    // --- API Helpers ---
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

    const getWebToken = () => apiFetch('/oauth/web-token');
    const checkDevice = (id) => apiFetch(`/api/user/check-device?device_id=${id}`);
    const createUser = (userData) => apiFetch('/api/user/create', { method: 'POST', body: JSON.stringify(userData) });
    const getChart = (userId) => apiFetch(`/api/user/la-so-tu-vi?user_id=${userId}`);

    // --- Navigation and Flow Control ---
    const goToDashboard = () => {
        dashboardWelcomeTitle.textContent = `Chào mừng, ${currentUser.full_name}!`;
        updateNavAvatarUI();
        showScreen('dashboard');
    };

    const goToCreateUserScreen = () => {
        window.location.href = '/create-user.html';
    };
    
    const goToUpdateUserScreen = () => {
        window.location.href = '/update-user.html';
    };

    const goToViewChart = async () => {
        showScreen('chartLoading');
        try {
            const userId = currentUser.user_id || currentUser.id;
            const chartData = await getChart(userId);
            renderResults(chartData);
            showScreen('results');
        } catch (error) {
            alert(`Lỗi khi lấy lá số: ${error.message}`);
            goToDashboard();
        }
    };

    window.toggleLuanGiai = function() {
        const section = document.getElementById('luan-giai-section');
        if (section) {
            section.classList.toggle('d-none');
            if (!section.classList.contains('d-none')) {
                section.scrollIntoView({behavior: 'smooth', block: 'start'});
            }
        }
    };

    const formatLuanGiaiText = (text) => {
        if (!text) return '';
        return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    };

    const buildLuanGiaiHTML = (luanGiai) => {
        if (!luanGiai) return '<div class="text-center text-white mt-4">Chưa có dữ liệu luận giải chi tiết.</div>';

        let html = '';

        if (luanGiai.tong_quan) {
            html += `
            <div class="luan-giai-block">
                <div class="lg-header"><span>Bình giải tổng quan</span></div>
                <div class="lg-content">
                    <div class="lg-section">
                        <div class="lg-title">Thông tin cơ bản</div>
                        <div class="lg-text">${formatLuanGiaiText(luanGiai.tong_quan)}</div>
                    </div>
                </div>
            </div>`;
        }

        if (luanGiai.cung_12 && luanGiai.cung_12.length > 0) {
            html += `
            <div class="luan-giai-block">
                <div class="lg-header"><span>Bình giải 12 cung</span></div>
                <div class="lg-content p-0">
                    <div class="accordion" id="accordion12Cung">`;
            
            luanGiai.cung_12.forEach((cung, index) => {
                html += `
                        <div class="accordion-item lg-accordion-item">
                            <h2 class="accordion-header" id="headingCung${index}">
                                <button class="accordion-button ${index !== 0 ? 'collapsed' : ''}" type="button" data-bs-toggle="collapse" data-bs-target="#collapseCung${index}" aria-expanded="${index === 0 ? 'true' : 'false'}" aria-controls="collapseCung${index}">
                                    <span class="fw-bold" style="color: #153c6b;">🔸 Cung ${cung.cung} (Luận về ${cung.cung_goc})</span>
                                </button>
                            </h2>
                            <div id="collapseCung${index}" class="accordion-collapse collapse ${index === 0 ? 'show' : ''}" aria-labelledby="headingCung${index}" data-bs-parent="#accordion12Cung">
                                <div class="accordion-body">
                                    <div class="lg-section">
                                        <div class="lg-text">${formatLuanGiaiText(cung.luan_giai)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>`;
            });
            html += `
                    </div>
                </div>
            </div>`;
        }

        if (luanGiai.dai_van && luanGiai.dai_van.length > 0) {
            html += `
            <div class="luan-giai-block">
                <div class="lg-header"><span>Bình giải Đại vận</span></div>
                <div class="lg-content p-0">
                    <div class="daivan-grid">
                        ${luanGiai.dai_van.map(dv => `
                            <div class="daivan-cell ${dv.is_current ? 'active' : ''}">Đại vận ${dv.do_tuoi} tuổi</div>
                        `).join('')}
                    </div>
                    <div class="p-3">
                        ${luanGiai.dai_van.filter(dv => dv.is_current).map(dv => `
                            <div class="lg-section border-0 p-0">
                                <div class="lg-title">Đại vận ở cung ${dv.cung}</div>
                                <div class="lg-text">${formatLuanGiaiText(dv.luan_giai)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>`;
        }

        if (luanGiai.tieu_van) {
             html += `
            <div class="luan-giai-block">
                <div class="lg-header"><span>Bình giải Tiểu vận</span></div>
                <div class="lg-content p-3">
                    <div class="lg-section border-0 p-0">
                        <div class="lg-title">Năm ${luanGiai.tieu_van.nam} (Cung ${luanGiai.tieu_van.cung})</div>
                        <div class="lg-text">${formatLuanGiaiText(luanGiai.tieu_van.luan_giai)}</div>
                    </div>
                </div>
            </div>`;
        }

        return html;
    };

    const renderResults = (data) => {
        const meta = data.meta || {};
        const thongTin = data.thong_tin_trung_tam || {};
        const palacesObj = data.la_so_12_cung || {};
        
        // Map lại mảng 12 cung từ object
        const cungs = Object.values(palacesObj).map(p => {
            return {
                vi_tri: p.key ? p.key.split('_')[0] : '1',
                ten: p.ten_cung || '',
                isMenh: p.ten_cung && p.ten_cung.includes('MỆNH'),
                isThan: p.than,
                can_chi: p.can_chi || '',
                dai_han: p.dai_han || '',
                chinh_tinh: (p.chinh_tinh || []).map(s => s.ten),
                cat_tinh: (p.cat_tinh || []).map(s => s.ten),
                hung_tinh: (p.hung_tinh || []).map(s => s.ten),
                an_ngu: p.an_ngu || ''
            };
        });

        const genderLabel = meta.gender === 'female' || meta.gender === 'Nữ' ? 'Nữ' : 'Nam';

        let html = `
            <div class="card profile-header-card shadow-sm mb-4">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-8">
                            <h4 class="mb-1 text-white">${meta.full_name || 'Người Dùng'}</h4>
                            <p class="mb-1 text-white-50">Giới tính: ${genderLabel}</p>
                            <p class="mb-0 text-white-50">Ngày sinh: ${meta.birthday || ''} (Dương) - Giờ sinh ${meta.birth_time || ''}</p>
                        </div>
                        <div class="col-md-4 text-md-end mt-3 mt-md-0 d-flex flex-column align-items-md-end text-white">
                             ${meta.avatar_url ? `<img src="${meta.avatar_url}" alt="Avatar" class="rounded-circle mb-2" style="width: 60px; height: 60px; object-fit: cover; border: 2px solid var(--primary-color);">` : ''}
                             <p class="mb-1"><strong>Tuổi:</strong> ${thongTin.tuoi || ''}</p>
                             <p class="mb-1"><strong>Mệnh:</strong> ${thongTin.ban_menh || ''}</p>
                             <p class="mb-0"><strong>Cục:</strong> ${thongTin.cuc || ''}</p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="tuvi-grid-wrapper" style="position: relative;">
                <div class="tuvi-grid">
                    ${cungs.map(cung => `
                        <div class="cung-cell" data-vi-tri="${cung.vi_tri}" data-menh="${cung.isMenh}" data-than="${cung.isThan}">
                            <div class="cung-header">
                                <span class="cung-can-chi text-muted">${cung.can_chi}</span>
                                <span class="cung-name fw-bold" style="color: ${cung.isMenh ? 'var(--secondary-color)' : 'var(--text-color)'}">${cung.ten}${cung.isThan ? '<br><small style="color: var(--secondary-color)">(Thân)</small>' : ''}</span>
                                <span class="cung-dai-han text-muted">${cung.dai_han || ''}</span>
                            </div>
                            <div class="cung-content mt-2">
                                <div class="chinh-tinh text-center mb-1 fw-bold text-danger" style="font-size: 0.9em;">
                                    ${cung.chinh_tinh.join('<br>')}
                                </div>
                                <div class="phu-tinh d-flex justify-content-between" style="font-size: 0.8em; line-height: 1.2;">
                                    <div class="cat-tinh text-start" style="color: #4caf50;">
                                        ${cung.cat_tinh ? cung.cat_tinh.join('<br>') : ''}
                                    </div>
                                    <div class="hung-tinh text-end" style="color: #bdbdbd;">
                                        ${cung.hung_tinh ? cung.hung_tinh.join('<br>') : ''}
                                    </div>
                                </div>
                            </div>
                            ${cung.an_ngu ? `<div class="tuan-triet bg-dark text-white p-1 rounded position-absolute top-50 start-50 translate-middle opacity-75" style="font-size: 0.7em; white-space: nowrap; z-index: 10;">${cung.an_ngu}</div>` : ''}
                        </div>
                    `).join('')}
                    <div class="center-box d-flex flex-column justify-content-center align-items-center">
                        <h4 class="mb-2" style="color: var(--secondary-color)">TRANG TỬ VI CỔ HỌC</h4>
                        <h5 class="mb-3 text-white">${meta.full_name || ''}</h5>
                        
                        <div class="d-flex flex-column text-white mb-3 w-100 px-4" style="font-size: 0.9em; max-width: 300px;">
                            <div class="d-flex justify-content-between mb-1">
                                <strong>Ngày sinh:</strong> <span>${meta.birthday || ''} (Dương)</span>
                            </div>
                            <div class="d-flex justify-content-between mb-1">
                                <strong>Âm lịch:</strong> <span>${thongTin.ngay_sinh_am || ''}</span>
                            </div>
                            <div class="d-flex justify-content-between mb-1">
                                <strong>Giờ sinh:</strong> <span>${thongTin.gio_sinh_can_chi || ''}</span>
                            </div>
                            <div class="d-flex justify-content-between mb-1">
                                <strong>Năm xem:</strong> <span>${thongTin.nam_xem || ''}</span>
                            </div>
                        </div>

                        <div class="text-center text-white" style="font-size: 0.9em;">
                            <p class="mb-1"><strong>Âm dương:</strong> ${thongTin.tuoi || ''}</p>
                            <p class="mb-1"><strong>Bản mệnh:</strong> ${thongTin.ban_menh || ''} - ${thongTin.cuc || ''}</p>
                            <p class="mb-1"><strong>Chủ mệnh:</strong> ${thongTin.menh_chu || ''}</p>
                            <p class="mb-0"><strong>Chủ thân:</strong> ${thongTin.than_chu || ''}</p>
                        </div>
                    </div>
                </div>
                <svg id="tam-hop-lines" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 5;"></svg>
            </div>
            <div class="text-center mt-4 mb-4">
                <button class="btn btn-warning btn-lg px-4 fw-bold shadow-sm" onclick="toggleLuanGiai()">
                    <i class="bi bi-journal-text me-2"></i>Xem Luận Giải Lá Số
                </button>
            </div>
            <div id="luan-giai-section" class="luan-giai-container mt-4 d-none">
                ${buildLuanGiaiHTML(data.astro_details?.chi_tiet_luan_giai)}
            </div>`;
        resultsContent.innerHTML = html;
        drawTamHopLines(cungs);
    };

    const drawTamHopLines = (cungs) => {
        const svg = document.getElementById('tam-hop-lines');
        if (!svg) return;

        const coords = {
            1: {x: 37.5, y: 87.5}, 2: {x: 62.5, y: 87.5}, 3: {x: 87.5, y: 87.5},
            4: {x: 87.5, y: 62.5}, 5: {x: 87.5, y: 37.5}, 6: {x: 87.5, y: 12.5},
            7: {x: 62.5, y: 12.5}, 8: {x: 37.5, y: 12.5}, 9: {x: 12.5, y: 12.5},
            10: {x: 12.5, y: 37.5}, 11: {x: 12.5, y: 62.5}, 12: {x: 12.5, y: 87.5}
        };

        const menhCung = cungs.find(c => c.isMenh);
        if (!menhCung) return;

        const v = parseInt(menhCung.vi_tri);
        const tai = (v + 4) > 12 ? (v + 4 - 12) : (v + 4);
        const quan = (v + 8) > 12 ? (v + 8 - 12) : (v + 8);
        const di = (v + 6) > 12 ? (v + 6 - 12) : (v + 6);

        const drawLine = (from, to, dashed) => {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', coords[from].x + '%');
            line.setAttribute('y1', coords[from].y + '%');
            line.setAttribute('x2', coords[to].x + '%');
            line.setAttribute('y2', coords[to].y + '%');
            line.setAttribute('stroke', dashed ? 'rgba(253, 216, 53, 0.4)' : 'rgba(94, 53, 177, 0.4)');
            line.setAttribute('stroke-width', '1.5');
            if (dashed) line.setAttribute('stroke-dasharray', '5,5');
            svg.appendChild(line);
        };

        drawLine(v, tai, false);
        drawLine(tai, quan, false);
        drawLine(quan, v, false);
        drawLine(v, di, true);
    };

    // --- Event Handlers ---
    const handleFormSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        showFormError(null);

        const formData = new FormData(userForm);
        const userData = Object.fromEntries(formData.entries());
        userData.device_id = deviceId;
        if (selectedAvatarBase64) {
            userData.avatar_base64 = selectedAvatarBase64;
        }
        
        try {
            const createdOrUpdatedUser = await createUser(userData);
            currentUser = createdOrUpdatedUser;
            goToDashboard();
        } catch (error) {
            showFormError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // --- UI Helpers ---
    const setLoading = (isLoading) => {
        submitButton.disabled = isLoading;
        submitSpinner.classList.toggle('d-none', !isLoading);
        submitButtonText.classList.toggle('d-none', isLoading);
    };

    const showFormError = (message) => {
        formError.textContent = message || '';
        formError.classList.toggle('d-none', !message);
    };

    const populateForm = (user) => {
        userForm.reset();
        document.getElementById('user_id').value = user.user_id || user.id;
        document.getElementById('full_name').value = user.full_name;
        document.getElementById('email').value = user.email;
        document.getElementById('birthday').value = user.birthday;
        document.getElementById('birth_time').value = user.birth_time;
        document.querySelector(`input[name="gender"][value="${user.gender}"]`).checked = true;
        
        if (user.avatar_url) {
            updateAvatarPreview(user.avatar_url);
            // Không gán vào selectedAvatarBase64 vì ta không muốn gửi lại base64 nếu user không đổi ảnh mới
            selectedAvatarBase64 = null; 
        } else {
            resetAvatarUI();
        }
    };

    const resetAvatarUI = () => {
        selectedAvatarBase64 = null;
        avatarFileInput.value = '';
        avatarPreviewImg.src = '';
        avatarPreviewImg.classList.add('d-none');
        avatarPlaceholderIcon.classList.remove('d-none');
        avatarRemoveBtn.classList.add('d-none');
    };

    const updateAvatarPreview = (src) => {
        if (!src) {
            resetAvatarUI();
            return;
        }
        avatarPreviewImg.src = src;
        avatarPreviewImg.classList.remove('d-none');
        avatarPlaceholderIcon.classList.add('d-none');
        avatarRemoveBtn.classList.remove('d-none');
    };

    // --- App Initialization ---
    const initializeApp = async () => {
        showScreen('initialLoading');
        if (!deviceId || deviceId === 'undefined' || deviceId === 'null') {
            deviceId = 'web-' + Date.now() + '-' + Math.random().toString(36).substring(2, 10);
            localStorage.setItem('deviceId', deviceId);
        }

        try {
            const tokenData = await getWebToken();
            webToken = tokenData.access_token;
            if (webToken) {
                localStorage.setItem('webToken', webToken);
                localStorage.setItem('token', webToken);
            }
        } catch (error) {
            console.error("Lỗi nghiêm trọng khi khởi tạo ứng dụng:", error);
            const spinner = document.querySelector('#initial-loading-screen .spinner-border');
            const loadingText = document.querySelector('#initial-loading-screen h3');
            const errorContainer = document.getElementById('initial-error');

            if(spinner) spinner.classList.add('d-none');
            if(loadingText) loadingText.textContent = 'Không Thể Tải Ứng Dụng';
            if(errorContainer) {
                errorContainer.textContent = `Lỗi: ${error.message}. Vui lòng kiểm tra console (F12) để xem chi tiết và đảm bảo máy chủ backend đang chạy.`;
                errorContainer.classList.remove('d-none');
            }
            return;
        }

        userForm?.addEventListener('submit', handleFormSubmit);
        naviUpdateInfo?.addEventListener('click', goToUpdateUserScreen);
        navAvatarBtn?.addEventListener('click', goToUpdateUserScreen);
        resultsBackButton?.addEventListener('click', goToDashboard);
        dashboardBackButton?.addEventListener('click', goToDashboard);
        document.getElementById('navbar-brand')?.addEventListener('click', (e) => {
             e.preventDefault();
             if(currentUser) goToDashboard();
        });

        // Avatar events
        avatarEditBtn?.addEventListener('click', () => avatarFileInput?.click());
        avatarPreviewWrapper?.addEventListener('click', () => avatarFileInput?.click());
        
        avatarRemoveBtn?.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering wrapper click
            resetAvatarUI();
        });

        avatarFileInput?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Check size (e.g., max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('Vui lòng chọn ảnh nhỏ hơn 5MB.');
                avatarFileInput.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                const base64String = event.target.result;
                selectedAvatarBase64 = base64String;
                updateAvatarPreview(base64String);
            };
            reader.readAsDataURL(file);
        });

        try {
            const existingUser = await checkDevice(deviceId);
            if (existingUser && (existingUser.user_id || existingUser.id)) {
                currentUser = existingUser;
                goToDashboard();
            } else {
                goToCreateUserScreen();
            }
        } catch (error) {
            console.error('Lỗi khi kiểm tra thông tin thiết bị:', error.message);
            const spinner = document.querySelector('#initial-loading-screen .spinner-border');
            const loadingText = document.querySelector('#initial-loading-screen h3');
            const errorContainer = document.getElementById('initial-error');

            if(spinner) spinner.classList.add('d-none');
            if(loadingText) loadingText.textContent = 'Lỗi Kết Nối Máy Chủ';
            if(errorContainer) {
                errorContainer.textContent = `Lỗi kết nối máy chủ: ${error.message}. Vui lòng kiểm tra lại kết nối hoặc thử lại sau.`;
                errorContainer.classList.remove('d-none');
            }
        }
    };

    initializeApp();
});
