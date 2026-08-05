document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('compatibility-form');
    const formSection = document.getElementById('form-section');
    const loadingSection = document.getElementById('loading-section');
    const resultsSection = document.getElementById('results-section');

    // Auto-fill person 1 if user device/profile exists in localStorage
    try {
        const storedProfile = localStorage.getItem('tuvi_user_profile');
        if (storedProfile) {
            const user = JSON.parse(storedProfile);
            if (user.full_name) document.getElementById('p1-name').value = user.full_name;
            if (user.birthday) document.getElementById('p1-birthday').value = user.birthday;
            if (user.birth_time) document.getElementById('p1-birthtime').value = user.birth_time;
            if (user.gender) {
                if (/female|nu|nữ/i.test(user.gender)) {
                    document.getElementById('p1-female').checked = true;
                } else {
                    document.getElementById('p1-male').checked = true;
                }
            }
        }
    } catch (e) {
        console.warn('Could not load stored user profile:', e);
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

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const p1Name = document.getElementById('p1-name').value.trim();
        const p1Birthday = document.getElementById('p1-birthday').value;
        const p1Birthtime = document.getElementById('p1-birthtime').value;
        const p1Gender = document.querySelector('input[name="p1-gender"]:checked').value;

        const p2Name = document.getElementById('p2-name').value.trim();
        const p2Birthday = document.getElementById('p2-birthday').value;
        const p2Birthtime = document.getElementById('p2-birthtime').value;
        const p2Gender = document.querySelector('input[name="p2-gender"]:checked').value;

        const payload = {
            person_1: {
                full_name: p1Name,
                birthday: p1Birthday,
                birth_time: p1Birthtime,
                gender: p1Gender,
            },
            person_2: {
                full_name: p2Name,
                birthday: p2Birthday,
                birth_time: p2Birthtime,
                gender: p2Gender,
            },
        };

        // Show loading spinner
        loadingSection.classList.remove('d-none');
        resultsSection.classList.add('d-none');

        try {
            const token = await getAuthToken();
            const headers = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch('/api/user/compatibility', {
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
                alert(json.message || 'Có lỗi xảy ra khi phân tích hợp tuổi.');
            }
        } catch (err) {
            console.error('Fetch compatibility error:', err);
            loadingSection.classList.add('d-none');
            alert('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng.');
        }
    });

    function renderResults(data) {
        const overall = data.overall || {};
        const p1 = data.person_1 || {};
        const p2 = data.person_2 || {};
        const breakdown = data.breakdown || {};
        const relInsights = data.relationship_insights || {};
        const remedies = data.remedies || [];

        // Overall Score
        document.getElementById('res-score').textContent = overall.score ?? '--';
        document.getElementById('res-rating-label').textContent = overall.rating_label || '';
        document.getElementById('res-summary').textContent = overall.summary || '';

        // Person overview details
        document.getElementById('res-p1-name').textContent = p1.full_name;
        document.getElementById('res-p1-details').textContent = `${p1.can_chi || ''} - Mệnh ${p1.nap_am?.name || ''} - Cung ${p1.cung_phi || ''}`;

        document.getElementById('res-p2-name').textContent = p2.full_name;
        document.getElementById('res-p2-details').textContent = `${p2.can_chi || ''} - Mệnh ${p2.nap_am?.name || ''} - Cung ${p2.cung_phi || ''}`;

        function setScoreTag(elemId, score) {
            const el = document.getElementById(elemId);
            if (!el) return;
            el.textContent = `${score} / 100`;
            el.className = 'metric-score-tag ' + (score >= 75 ? 'badge-good' : score >= 50 ? 'badge-neutral' : 'badge-bad');
        }

        // 1. Ngũ Hành
        const nh = breakdown.ngu_hanh || {};
        setScoreTag('tag-ngu-hanh', nh.score ?? 0);
        document.getElementById('rel-ngu-hanh').textContent = `Quan hệ: ${nh.relationship || 'Bình hòa'}`;
        document.getElementById('detail-ngu-hanh').textContent = nh.detail || '';

        // 2. Can Chi
        const cc = breakdown.can_chi || {};
        setScoreTag('tag-can-chi', cc.score ?? 0);
        document.getElementById('rel-can-chi').textContent = `Địa chi: ${cc.branch_eval?.status || ''} | Thiên can: ${cc.stem_eval?.status || ''}`;
        document.getElementById('detail-can-chi').textContent = cc.detail || '';

        // 3. Cung Phi
        const cp = breakdown.cung_phi || {};
        setScoreTag('tag-cung-phi', cp.score ?? 0);
        document.getElementById('rel-cung-phi').textContent = `Quẻ Du Niên: ${cp.du_nien || ''} (${cp.label || ''})`;
        document.getElementById('detail-cung-phi').textContent = cp.detail || '';

        // 4. Tử Vi
        const tv = breakdown.tu_vi_stars || {};
        setScoreTag('tag-tu-vi', tv.score ?? 0);
        document.getElementById('detail-tu-vi').textContent = tv.detail || '';

        // 5. Tứ Trụ
        const tt = breakdown.tu_tru_balance || {};
        setScoreTag('tag-tu-tru', tt.score ?? 0);
        document.getElementById('detail-tu-tru').textContent = tt.detail || '';

        // Render All 4 Relationship Insights Cards with specific dynamic scores & ratings
        const relContainer = document.getElementById('relationship-insights-container');
        relContainer.innerHTML = '';

        Object.keys(relInsights).forEach((key) => {
            const item = relInsights[key];
            if (!item) return;

            const col = document.createElement('div');
            col.className = 'col-md-6';

            let tipsHtml = '';
            if (item.tips && item.tips.length > 0) {
                tipsHtml = '<ul class="list-unstyled mb-0 mt-3 text-white opacity-90 small border-top border-secondary pt-2">';
                item.tips.forEach((tip) => {
                    tipsHtml += `<li class="mb-1"><i class="bi bi-check2-circle text-${item.color || 'warning'} me-1"></i> ${tip}</li>`;
                });
                tipsHtml += '</ul>';
            }

            const badgeClass = item.score >= 75 ? 'badge-good' : (item.score >= 50 ? 'badge-neutral' : 'badge-bad');

            col.innerHTML = `
                <div class="rel-card shadow-sm">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h4 class="text-${item.color || 'warning'} mb-0">
                            <i class="bi ${item.icon || 'bi-star'} me-2"></i> ${item.title}
                        </h4>
                        <span class="metric-score-tag ${badgeClass}">
                            ${item.score}/100 - ${item.rating_label}
                        </span>
                    </div>
                    <p class="text-white small mb-0"><strong>Đánh giá cụ thể:</strong> ${item.evaluation}</p>
                    ${tipsHtml}
                </div>
            `;
            relContainer.appendChild(col);
        });

        // Remedies
        const remediesContainer = document.getElementById('remedies-container');
        remediesContainer.innerHTML = '';

        if (remedies && remedies.length > 0) {
            remedies.forEach((r) => {
                const alertDiv = document.createElement('div');
                alertDiv.className = 'alert alert-warning border-warning d-flex align-items-start mb-2';
                alertDiv.innerHTML = `
                    <i class="bi bi-exclamation-triangle-fill fs-4 me-3 text-warning"></i>
                    <div>
                        <strong>[${r.aspect}] ${r.title}:</strong>
                        <p class="mb-0 mt-1 small">${r.content}</p>
                    </div>
                `;
                remediesContainer.appendChild(alertDiv);
            });
        } else {
            remediesContainer.innerHTML = `
                <div class="alert alert-success border-success d-flex align-items-center mb-2">
                    <i class="bi bi-check-circle-fill fs-4 me-3 text-success"></i>
                    <div>
                        <strong>Tuổi 2 người hòa hợp, không có xung khắc nặng cần giải hạn.</strong>
                    </div>
                </div>
            `;
        }
    }
});
