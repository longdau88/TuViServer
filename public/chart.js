document.addEventListener('DOMContentLoaded', function () {
    const screens = {
        chartLoading: document.getElementById('chart-loading-screen'),
        results: document.getElementById('results-screen'),
    };
    const resultsContent = document.getElementById('results-content');
    const resultsBackButton = document.getElementById('results-back-button');

    let deviceId = localStorage.getItem('deviceId');
    let currentUser = null;
    let webToken = null;

    const showScreen = (screenName) => {
        Object.values(screens).forEach(screen => {
            if (screen) screen.classList.add('d-none');
        });
        if (screens[screenName]) screens[screenName].classList.remove('d-none');
    };

    const apiFetch = async (endpoint, options = {}) => {
        const headers = { 'Content-Type': 'application/json', ...options.headers };
        if (webToken) {
            headers['Authorization'] = `Bearer ${webToken}`;
        }
        let response;
        try {
            response = await fetch(endpoint, { ...options, headers });
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
    const getChart = (userId) => apiFetch(`/api/user/la-so-tu-vi?user_id=${userId}`);

    if (resultsBackButton) {
        resultsBackButton.addEventListener('click', () => {
            window.location.href = '/';
        });
    }

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
        const avatarUrlCacheBusted = meta.avatar_url ? (meta.avatar_url + (meta.avatar_url.includes('?') ? '&' : '?') + 't=' + new Date().getTime()) : '';

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
                             ${meta.avatar_url ? `<img src="${avatarUrlCacheBusted}" alt="Avatar" class="rounded-circle mb-2" style="width: 60px; height: 60px; object-fit: cover; border: 2px solid var(--primary-color);">` : ''}
                             <p class="mb-1"><strong>Tuổi:</strong> ${thongTin.tuoi || ''}</p>
                             <p class="mb-1"><strong>Mệnh:</strong> ${thongTin.ban_menh || ''}</p>
                             <p class="mb-0"><strong>Cục:</strong> ${thongTin.cuc || ''}</p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="tuvi-grid-wrapper" style="position: relative;">
                <svg id="tam-hop-lines" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1;"></svg>
                <div class="tuvi-grid">
                    ${cungs.map((cung, idx) => `
                        <div class="cung-cell" style="cursor: pointer; transition: opacity 0.3s ease;" data-vi-tri="${cung.vi_tri}" data-menh="${cung.isMenh}" data-than="${cung.isThan}" onmouseenter="if(window.handleCungEnter) window.handleCungEnter(${idx})" onmouseleave="if(window.handleCungLeave) window.handleCungLeave()" onclick="if(window.handleCungClick) window.handleCungClick(${idx}, event)">
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
    };

    const loadChart = async () => {
        showScreen('chartLoading');
        try {
            if (!deviceId) throw new Error('Không tìm thấy thiết bị');
            
            // Acquire web token for API authentication
            const tokenData = await getWebToken();
            webToken = tokenData.access_token;

            const existingUser = await checkDevice(deviceId);
            if (!existingUser || (!existingUser.user_id && !existingUser.id)) {
                window.location.href = '/';
                return;
            }
            currentUser = existingUser;
            const userId = currentUser.user_id || currentUser.id;
            const chartData = await getChart(userId);
            renderResults(chartData);
            showScreen('results');
        } catch (error) {
            alert(`Lỗi khi lấy lá số: ${error.message}`);
            window.location.href = '/';
        }
    };

    loadChart();
});

window.drawTamHopLines = (selectedIndex) => {
    const cells = document.querySelectorAll('.cung-cell');
    if (cells.length < 12) return;
    
    const clickedCell = cells[selectedIndex];
    if (!clickedCell) return;
    
    const viTri = parseInt(clickedCell.getAttribute('data-vi-tri'), 10);
    
    const getViTri = (v, offset) => {
        let result = (v + offset) % 12;
        if (result === 0) result = 12;
        return result;
    };

    const tamHop1ViTri = getViTri(viTri, 4);
    const tamHop2ViTri = getViTri(viTri, 8);
    const xungChieuViTri = getViTri(viTri, 6);
    
    const relatedViTris = [viTri, tamHop1ViTri, tamHop2ViTri, xungChieuViTri].map(String);
    
    const svgOverlay = document.getElementById('tam-hop-lines');
    if (!svgOverlay) return;
    svgOverlay.innerHTML = '';

    const getCenterPos = (el) => {
        if (!el) return {x: 0, y: 0};
        const rect = el.getBoundingClientRect();
        const gridRect = svgOverlay.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2 - gridRect.left,
            y: rect.top + rect.height / 2 - gridRect.top
        };
    };

    const originCell = document.querySelector(`.cung-cell[data-vi-tri="${viTri}"]`);
    const p1Cell = document.querySelector(`.cung-cell[data-vi-tri="${tamHop1ViTri}"]`);
    const p2Cell = document.querySelector(`.cung-cell[data-vi-tri="${tamHop2ViTri}"]`);
    const pXungChieuCell = document.querySelector(`.cung-cell[data-vi-tri="${xungChieuViTri}"]`);

    const originPos = getCenterPos(originCell);
    const p1 = getCenterPos(p1Cell);
    const p2 = getCenterPos(p2Cell);
    const pXungChieu = getCenterPos(pXungChieuCell);

    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygon.setAttribute("points", `${originPos.x},${originPos.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`);
    polygon.setAttribute("fill", "rgba(76, 175, 80, 0.05)");
    polygon.setAttribute("stroke", "rgba(76, 175, 80, 0.8)");
    polygon.setAttribute("stroke-width", "2");
    polygon.setAttribute("stroke-dasharray", "5,5");
    svgOverlay.appendChild(polygon);

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", originPos.x);
    line.setAttribute("y1", originPos.y);
    line.setAttribute("x2", pXungChieu.x);
    line.setAttribute("y2", pXungChieu.y);
    line.setAttribute("stroke", "rgba(255, 152, 0, 0.8)");
    line.setAttribute("stroke-width", "2");
    line.setAttribute("stroke-dasharray", "5,5");
    svgOverlay.appendChild(line);

    cells.forEach((cell) => {
        const cellViTri = cell.getAttribute('data-vi-tri');
        if (relatedViTris.includes(cellViTri)) {
            cell.style.boxShadow = '0 0 15px 2px rgba(255, 193, 7, 0.8), inset 0 0 10px 1px rgba(255, 193, 7, 0.5)';
            cell.style.zIndex = '1';
            cell.style.position = 'relative';
        } else {
            cell.style.boxShadow = 'none';
            cell.style.zIndex = '0';
        }
    });
};

window.activeLockedIndex = null;

window.handleCungEnter = (idx) => {
    if (window.activeLockedIndex === null) {
        if (window.drawTamHopLines) window.drawTamHopLines(idx);
    }
};

window.handleCungLeave = () => {
    if (window.activeLockedIndex === null) {
        const svgOverlay = document.getElementById('tam-hop-lines');
        if (svgOverlay) svgOverlay.innerHTML = '';
        document.querySelectorAll('.cung-cell').forEach(cell => {
            cell.style.boxShadow = 'none';
            cell.style.zIndex = '0';
        });
    }
};

window.handleCungClick = (idx, e) => {
    if (e) e.stopPropagation();
    if (window.activeLockedIndex === idx) {
        window.activeLockedIndex = null;
        window.handleCungLeave();
    } else {
        window.activeLockedIndex = idx;
        if (window.drawTamHopLines) window.drawTamHopLines(idx);
    }
};

document.addEventListener('click', (e) => {
    if (!e.target.closest('.cung-cell')) {
        window.activeLockedIndex = null;
        const svgOverlay = document.getElementById('tam-hop-lines');
        if (svgOverlay) svgOverlay.innerHTML = '';
        document.querySelectorAll('.cung-cell').forEach(cell => {
            cell.style.boxShadow = 'none';
            cell.style.zIndex = '0';
        });
    }
});
