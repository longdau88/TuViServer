document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('auspicious-form');
    const loadingSection = document.getElementById('loading-section');
    const resultsSection = document.getElementById('results-section');

    const modeSelf = document.getElementById('mode-self');
    const modeOther = document.getElementById('mode-other');

    const selfProfileDisplay = document.getElementById('self-profile-display');
    const selfDisplayName = document.getElementById('self-display-name');
    const selfDisplayDetails = document.getElementById('self-display-details');
    const otherInputContainer = document.getElementById('other-input-container');

    const nameInput = document.getElementById('user-name');
    const birthdayInput = document.getElementById('user-birthday');
    const birthtimeInput = document.getElementById('user-birthtime');
    const maleRadio = document.getElementById('gender-male');
    const femaleRadio = document.getElementById('gender-female');

    const selectMonth = document.getElementById('select-month');
    const selectYear = document.getElementById('select-year');

    let deviceId = localStorage.getItem('deviceId');
    let selfProfile = null;

    // 1. Populate Month & Year Dropdowns
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    for (let m = 1; m <= 12; m++) {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = `Tháng ${m}`;
        if (m === currentMonth) opt.selected = true;
        selectMonth.appendChild(opt);
    }

    for (let y = currentYear - 1; y <= currentYear + 3; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = `Năm ${y}`;
        if (y === currentYear) opt.selected = true;
        selectYear.appendChild(opt);
    }

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

    // Try loading self profile
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
            selfDisplayName.innerHTML = `<i class="bi bi-person-check-fill text-warning me-1"></i> ${selfProfile.full_name}`;
            selfDisplayDetails.textContent = `Ngày sinh: ${selfProfile.birthday} | Giờ sinh: ${selfProfile.birth_time || '08:00'} | Giới tính: ${/female|nu/i.test(selfProfile.gender) ? 'Nữ' : 'Nam'}`;
        } else {
            selfDisplayName.innerHTML = `<i class="bi bi-person-fill text-warning me-1"></i> Chưa có thông tin bản thân`;
            selfDisplayDetails.textContent = `Vui lòng cập nhật thông tin cá nhân hoặc chọn "Nhập Thông Tin Người Khác".`;
        }
    }

    // Mode Toggle
    modeSelf.addEventListener('change', () => {
        if (modeSelf.checked) {
            selfProfileDisplay.classList.remove('d-none');
            otherInputContainer.classList.add('d-none');
            nameInput.removeAttribute('required');
            birthdayInput.removeAttribute('required');
        }
    });

    modeOther.addEventListener('change', () => {
        if (modeOther.checked) {
            selfProfileDisplay.classList.add('d-none');
            otherInputContainer.classList.remove('d-none');
            nameInput.setAttribute('required', 'true');
            birthdayInput.setAttribute('required', 'true');
            nameInput.focus();
        }
    });

    await loadSelfProfile();

    // Form Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const selectedPurpose = document.querySelector('input[name="purpose"]:checked').value;
        const year = parseInt(selectYear.value);
        const month = parseInt(selectMonth.value);

        let payload = {
            year,
            month,
            purpose: selectedPurpose,
        };

        if (modeSelf.checked) {
            if (selfProfile && selfProfile.birthday) {
                payload.full_name = selfProfile.full_name || 'Bản thân';
                payload.birthday = selfProfile.birthday;
                payload.birth_time = selfProfile.birth_time || '08:00';
                payload.gender = selfProfile.gender || 'nam';
            } else {
                payload.device_id = deviceId;
            }
        } else {
            payload.full_name = nameInput.value.trim() || 'Người khác';
            payload.birthday = birthdayInput.value;
            payload.birth_time = birthtimeInput.value;
            payload.gender = document.querySelector('input[name="user-gender"]:checked').value;
        }

        loadingSection.classList.remove('d-none');
        resultsSection.classList.add('d-none');

        try {
            const token = await getAuthToken();
            const headers = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch('/api/calendar/auspicious-days', {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });

            const json = await response.json();

            loadingSection.classList.add('d-none');

            if (json.status === 200 && json.data) {
                renderResults(json.data);
                resultsSection.classList.remove('d-none');
                resultsSection.scrollIntoView({ behavior: 'smooth' });
            } else {
                alert(json.message || 'Có lỗi xảy ra khi phân tích ngày tốt.');
            }
        } catch (err) {
            console.error('Fetch auspicious days error:', err);
            loadingSection.classList.add('d-none');
            alert('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng.');
        }
    });

    function renderResults(data) {
        const user = data.user || {};
        const days = data.days || [];
        const topDays = data.recommended_top_days || [];

        // Summary Header
        document.getElementById('res-purpose-title').textContent = `Ngày Tốt Cho Việc: ${data.purpose_name} (Tháng ${data.month}/${data.year})`;
        document.getElementById('res-user-info').textContent = `${user.full_name} (${user.can_chi || ''} - Mệnh ${user.nap_am?.name || ''})`;
        document.getElementById('res-stats-summary').textContent = `Tổng số ngày trong tháng: ${data.total_days} ngày | Đã tìm thấy ${data.recommended_days_count} Ngày Cát Tường phù hợp tuổi của bạn.`;

        // Render Top Days
        const topDaysContainer = document.getElementById('top-days-container');
        topDaysContainer.innerHTML = '';

        if (topDays && topDays.length > 0) {
            topDays.forEach((d) => {
                const col = document.createElement('div');
                col.className = 'col-md-6 col-lg-4';
                col.innerHTML = `
                    <div class="card bg-dark border-success shadow-sm h-100 p-3" style="cursor: pointer;" onclick="inspectDayDetails('${d.date}')">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="fs-5 fw-bold text-white">${d.date}</span>
                            <span class="badge bg-success text-white font-monospace fs-6"><i class="bi bi-star-fill text-warning me-1"></i> ${d.score} / 100 ĐIỂM</span>
                        </div>
                        <p class="text-success small mb-1">Âm lịch: ${d.lunar.day}/${d.lunar.month} (${d.can_chi.day})</p>
                        <p class="text-white small mb-2"><strong>${d.rating_label}</strong> - Trực ${d.truc}</p>
                        <button class="btn btn-outline-success btn-sm w-100 mt-auto">Xem Giờ Tốt Chi Tiết</button>
                    </div>
                `;
                topDaysContainer.appendChild(col);
            });
        } else {
            topDaysContainer.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-warning mb-0 text-center">Không tìm thấy ngày Đại Cát trong tháng này. Hãy tham khảo các ngày Bình Hòa trong bảng lịch bên dưới.</div>
                </div>
            `;
        }

        // Render Full Calendar Grid
        const gridContainer = document.getElementById('full-calendar-cells');
        gridContainer.innerHTML = '';

        // Store days in window for fast lookup
        window.auspiciousDaysMap = {};
        days.forEach((d) => {
            window.auspiciousDaysMap[d.date] = d;
        });

        // Determine offset for day of week of 1st day of solar month
        const firstDayObj = new Date(data.year, data.month - 1, 1);
        let firstDayOfWeek = firstDayObj.getDay() - 1; // 0 = Mon, 6 = Sun
        if (firstDayOfWeek < 0) firstDayOfWeek = 6;

        // Blank cells before month start
        for (let b = 0; b < firstDayOfWeek; b++) {
            const blankCell = document.createElement('div');
            blankCell.className = 'day-cell badge-neutral opacity-25';
            gridContainer.appendChild(blankCell);
        }

        // Days cells
        days.forEach((d) => {
            const dayCell = document.createElement('div');
            dayCell.className = `day-cell ${d.rating_badge}`;
            dayCell.onclick = () => inspectDayDetails(d.date);

            let tagClass = 'tag-neutral';
            if (d.rating_badge === 'badge-good') tagClass = 'tag-good';
            else if (d.rating_badge === 'badge-neutral') tagClass = 'tag-neutral';
            else if (d.rating_badge === 'badge-bad') tagClass = 'tag-bad';

            dayCell.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <span class="solar-day-num">${d.solar.day}</span>
                    <span class="day-score-tag ${tagClass}">${d.score}đ</span>
                </div>
                <div class="mt-2">
                    <span class="lunar-day-text d-block">Âm: ${d.lunar.day}/${d.lunar.month}</span>
                    <span class="text-white small d-block opacity-75">${d.can_chi.day.split(' ')[1] || ''} - ${d.truc}</span>
                </div>
            `;
            gridContainer.appendChild(dayCell);
        });
    }

    // Inspect Day Details Card
    window.inspectDayDetails = function (dateStr) {
        const d = window.auspiciousDaysMap ? window.auspiciousDaysMap[dateStr] : null;
        if (!d) return;

        const card = document.getElementById('day-detail-card');
        card.classList.remove('d-none');

        document.getElementById('detail-day-date').innerHTML = `<i class="bi bi-calendar-event me-2"></i> Ngày ${d.date} (${d.can_chi.day}) - ${d.score}/100 ĐIỂM`;
        document.getElementById('detail-day-lunar').textContent = `Âm lịch: ${d.lunar.day}/${d.lunar.month}/${d.lunar.year} (Mệnh ngày ${d.napAm} - Trực ${d.truc})`;

        // Reasons
        const reasonsList = document.getElementById('detail-reasons-list');
        reasonsList.innerHTML = '';
        if (d.reasons && d.reasons.length > 0) {
            d.reasons.forEach((r) => {
                const li = document.createElement('li');
                li.className = 'list-group-item bg-transparent text-white border-secondary px-0 py-1 small';
                li.innerHTML = `<i class="bi bi-check-circle-fill text-success me-2"></i> ${r}`;
                reasonsList.appendChild(li);
            });
        } else {
            reasonsList.innerHTML = '<li class="list-group-item bg-transparent text-white border-secondary px-0 py-1 small">Không có yếu tố xung hợp đặc biệt.</li>';
        }

        // Warnings
        const warningsList = document.getElementById('detail-warnings-list');
        warningsList.innerHTML = '';
        if (d.warnings && d.warnings.length > 0) {
            d.warnings.forEach((w) => {
                const li = document.createElement('li');
                li.className = 'list-group-item bg-transparent text-white border-secondary px-0 py-1 small';
                li.innerHTML = `<i class="bi bi-exclamation-triangle-fill text-danger me-2"></i> ${w}`;
                warningsList.appendChild(li);
            });
        } else {
            warningsList.innerHTML = '<li class="list-group-item bg-transparent text-white border-secondary px-0 py-1 small text-success">Không có yếu tố xung kỵ bản mệnh.</li>';
        }

        // Hours
        const hoursContainer = document.getElementById('detail-hours-container');
        hoursContainer.innerHTML = '';
        if (d.personalized_hours && d.personalized_hours.length > 0) {
            d.personalized_hours.forEach((h) => {
                const badge = document.createElement('span');
                badge.className = 'badge bg-success me-2 mb-2 p-2 fs-6';
                badge.innerHTML = `<i class="bi bi-clock-fill me-1"></i> ${h}`;
                hoursContainer.appendChild(badge);
            });
        }

        card.scrollIntoView({ behavior: 'smooth' });
    };
});
