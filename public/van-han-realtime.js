document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('realtime-form');
    const loadingSection = document.getElementById('loading-section');
    const resultsSection = document.getElementById('results-section');

    const btnToday = document.getElementById('btn-today');
    const btnMonth = document.getElementById('btn-month');
    const btnYear = document.getElementById('btn-year');
    const datePicker = document.getElementById('target-date-picker');

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

    let deviceId = localStorage.getItem('deviceId');
    let selfProfile = null;
    let selectedTargetDate = formatDateToYMD(new Date());
    datePicker.value = selectedTargetDate;

    function formatDateToYMD(d) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
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

    // Try loading self profile from DB via device_id or localStorage
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
            const dateParts = selfProfile.birthday.split('-');
            const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : selfProfile.birthday;
            selfDisplayName.innerHTML = `<i class="bi bi-person-check-fill text-warning me-1"></i> ${selfProfile.full_name}`;
            selfDisplayDetails.textContent = `Ngày sinh: ${formattedDate} | Giờ sinh: ${selfProfile.birth_time || '08:00'} | Giới tính: ${/female|nu|nữ/i.test(selfProfile.gender) ? 'Nữ' : 'Nam'}`;
        } else {
            selfDisplayName.innerHTML = `<i class="bi bi-person-fill text-warning me-1"></i> Chưa có thông tin bản thân`;
            selfDisplayDetails.textContent = `Vui lòng cập nhật thông tin cá nhân hoặc chuyển sang chế độ "Nhập Thông Tin Người Khác".`;
        }
    }

    // Handle Mode Switch
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

    // Quick Date Tab clicks
    btnToday.addEventListener('click', () => {
        setActiveTab(btnToday);
        selectedTargetDate = formatDateToYMD(new Date());
        datePicker.value = selectedTargetDate;
    });

    btnMonth.addEventListener('click', () => {
        setActiveTab(btnMonth);
        selectedTargetDate = formatDateToYMD(new Date());
        datePicker.value = selectedTargetDate;
    });

    btnYear.addEventListener('click', () => {
        setActiveTab(btnYear);
        selectedTargetDate = formatDateToYMD(new Date());
        datePicker.value = selectedTargetDate;
    });

    datePicker.addEventListener('change', (e) => {
        if (e.target.value) {
            selectedTargetDate = e.target.value;
            deactivateAllTabs();
        }
    });

    function setActiveTab(activeBtn) {
        deactivateAllTabs();
        activeBtn.classList.add('active');
    }

    function deactivateAllTabs() {
        btnToday.classList.remove('active');
        btnMonth.classList.remove('active');
        btnYear.classList.remove('active');
    }

    // Init profile
    await loadSelfProfile();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        let payload = {
            target_date: selectedTargetDate || formatDateToYMD(new Date()),
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

        // Show loading spinner
        loadingSection.classList.remove('d-none');
        resultsSection.classList.add('d-none');

        try {
            const token = await getAuthToken();
            const headers = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch('/api/user/realtime-horoscope', {
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
                alert(json.message || 'Có lỗi xảy ra khi tính toán vận hạn.');
            }
        } catch (err) {
            console.error('Fetch realtime horoscope error:', err);
            loadingSection.classList.add('d-none');
            alert('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng.');
        }
    });

    function renderResults(data) {
        const person = data.person || {};
        const daily = data.daily_forecast || {};
        const monthly = data.monthly_forecast || {};
        const annual = data.annual_forecast || {};
        const stars = data.transit_stars || {};

        // Date Display
        document.getElementById('res-target-date-display').textContent = `Dương lịch: ${data.target_date} (${data.can_chi_day})`;
        document.getElementById('res-lunar-display').textContent = `Âm lịch: ${data.lunar_date} (${data.can_chi_month} - Năm ${data.can_chi_year})`;

        // Score Badge
        document.getElementById('res-score').textContent = daily.overall_score ?? '--';
        document.getElementById('res-rating-label').textContent = daily.rating_label || '';
        document.getElementById('res-user-summary').textContent = `${person.full_name} (${person.can_chi || ''} - Mệnh ${person.nap_am?.name || ''} - Cung ${person.cung_phi || ''})`;

        // 4 Fortune Cards
        const bd = daily.scores_breakdown || {};
        setMetricScore('score-tai-loc', bd.tai_loc, 'Tài lộc hanh thông, vượng khí đầu tư.');
        setMetricScore('score-cong-danh', bd.cong_danh, 'Công việc tiến triển, uy tín tăng cao.');
        setMetricScore('score-tinh-cam', bd.tinh_cam, 'Gia đạo ôn hòa, mối quan hệ gắn kết.');
        setMetricScore('score-suc-khoe', bd.suc_khoe || bd.suc_khoe, 'Sức khỏe dồi dào, chú ý nghỉ ngơi.');

        function setMetricScore(elemId, score, defaultText) {
            const el = document.getElementById(elemId);
            if (!el) return;
            el.textContent = `${score ?? 75} / 100`;
            el.className = 'metric-score-tag ' + (score >= 75 ? 'badge-good' : (score >= 50 ? 'badge-neutral' : 'badge-bad'));
        }

        const ad = daily.aspect_details || {};
        document.getElementById('text-tai-loc').textContent = ad.tai_loc || (bd.tai_loc >= 80 ? 'Vận may tiền bạc cao, thích hợp ký kết hợp đồng.' : 'Tài chính ổn định, chi tiêu hợp lý.');
        document.getElementById('text-cong-danh').textContent = ad.cong_danh || (bd.cong_danh >= 80 ? 'Nhiều cơ hội mở rộng công việc, gặp quý nhân trợ giúp.' : 'Công việc diễn ra đều đặn, hoàn thành kế hoạch.');
        document.getElementById('text-tinh-cam').textContent = ad.tinh_cam || (bd.tinh_cam >= 75 ? 'Gia đạo ấm cúng, tình cảm thuận hòa.' : 'Tình cảm bình thường, cần lắng nghe đối phương.');
        document.getElementById('text-suc-khoe').textContent = ad.suc_khoe || (bd.suc_khoe >= 75 ? 'Thể trạng tốt, tinh thần minh mẫn.' : 'Tránh thức khuya, cẩn trọng khi đi lại.');

        // Alerts
        const alertsContainer = document.getElementById('alerts-container');
        alertsContainer.innerHTML = '';
        if (daily.key_alerts && daily.key_alerts.length > 0) {
            daily.key_alerts.forEach((alert) => {
                const div = document.createElement('div');
                div.className = `alert alert-${alert.type === 'warning' ? 'warning' : 'success'} border-${alert.type === 'warning' ? 'warning' : 'success'} d-flex align-items-start mb-2`;
                div.innerHTML = `
                    <i class="bi bi-${alert.type === 'warning' ? 'exclamation-triangle-fill text-warning' : 'check-circle-fill text-success'} fs-4 me-3"></i>
                    <div>
                        <strong>${alert.title}:</strong>
                        <p class="mb-0 mt-1 small">${alert.content}</p>
                    </div>
                `;
                alertsContainer.appendChild(div);
            });
        }

        // Transit Stars Mapping
        const starsContainer = document.getElementById('stars-container');
        starsContainer.innerHTML = `
            <div class="mb-2"><span class="fw-bold text-info">Cung Lưu Niên (Năm):</span> <span class="star-tag">${stars.luu_thai_tue || ''} (Thái Tuế)</span> <span class="star-tag">${stars.luu_loc_ton || ''} (Lộc Tồn)</span></div>
            <div class="mb-2"><span class="fw-bold text-info">Sao Cát Chiếu:</span> <span class="star-tag">Lưu Thiên Mã (${stars.luu_thien_ma || ''})</span> <span class="star-tag">Lưu Khôi (${stars.luu_thien_khoi || ''})</span> <span class="star-tag">Lưu Việt (${stars.luu_thien_viet || ''})</span></div>
            <div class="mb-2"><span class="fw-bold text-info">Tứ Hóa Lưu Niên:</span> <span class="star-tag">Hóa Lộc (${stars.luu_tu_hoa?.loc || ''})</span> <span class="star-tag">Hóa Quyền (${stars.luu_tu_hoa?.quyen || ''})</span> <span class="star-tag">Hóa Khoa (${stars.luu_tu_hoa?.khoa || ''})</span></div>
            <div><span class="fw-bold text-warning">Sao Sát Chiếu:</span> <span class="star-tag">Lưu Kình Dương (${stars.luu_kinh_duong || ''})</span> <span class="star-tag">Lưu Đà La (${stars.luu_da_la || ''})</span></div>
        `;

        // Monthly & Annual Outlook
        document.getElementById('monthly-title').innerHTML = `<i class="bi bi-calendar-month me-2"></i> ${monthly.title || 'Tử Vi Tháng Này'}`;
        document.getElementById('monthly-text').textContent = monthly.summary || '';

        document.getElementById('annual-title').innerHTML = `<i class="bi bi-calendar-star me-2"></i> ${annual.title || 'Tử Vi Năm Nay'}`;
        document.getElementById('annual-text').textContent = annual.summary || '';

        // Auspicious Hours
        const hoangDaoContainer = document.getElementById('hoang-dao-container');
        hoangDaoContainer.innerHTML = '<strong class="text-white d-block mb-2">Giờ Hoàng Đạo tốt trong ngày:</strong>';
        if (daily.hoang_dao_hours && daily.hoang_dao_hours.length > 0) {
            daily.hoang_dao_hours.forEach((h) => {
                const badge = document.createElement('span');
                badge.className = 'badge bg-success me-2 mb-2 p-2 fs-6';
                badge.innerHTML = `<i class="bi bi-clock me-1"></i> ${h}`;
                hoangDaoContainer.appendChild(badge);
            });
        }

        // Actionable Tips
        const tipsContainer = document.getElementById('tips-container');
        tipsContainer.innerHTML = '<strong class="text-white d-block mb-2">Lời khuyên ngày hôm nay:</strong>';
        if (daily.auspicious_tips && daily.auspicious_tips.length > 0) {
            const ul = document.createElement('ul');
            ul.className = 'list-group list-group-flush';
            daily.auspicious_tips.forEach((tip) => {
                const li = document.createElement('li');
                li.className = 'list-group-item bg-transparent text-white border-secondary px-0 py-1 small';
                li.innerHTML = `<i class="bi bi-lightbulb-fill text-warning me-2"></i> ${tip}`;
                ul.appendChild(li);
            });
            tipsContainer.appendChild(ul);
        }
    }
});
