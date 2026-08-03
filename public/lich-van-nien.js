document.addEventListener('DOMContentLoaded', () => {
    // API Call helper
    async function fetchAPI(url) {
        try {
            const token = localStorage.getItem('token');
            const headers = {};
            if (token && token !== 'undefined' && token !== 'null') headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(url, { headers });
            const rawText = await res.text().catch(() => '');
            let data = {};
            if (rawText && rawText.trim() !== '' && rawText.trim() !== 'undefined') {
                try {
                    data = JSON.parse(rawText);
                } catch (parseErr) {
                    data = { error: 1, message: `Lỗi định dạng JSON từ máy chủ (${res.status})` };
                }
            } else {
                data = { error: 1, message: `Máy chủ không trả về dữ liệu (${res.status})` };
            }

            if (data.error) throw new Error(data.message);
            return data.data;
        } catch (err) {
            console.error(err);
            alert('Lỗi: ' + err.message);
            return null;
        }
    }

    const todayContent = document.getElementById('today-content');
    const todayLoading = document.getElementById('today-loading');

    const monthContent = document.getElementById('month-content');
    const monthLoading = document.getElementById('month-loading');
    const monthTitle = document.getElementById('month-title');

    const yearContent = document.getElementById('year-content');
    const yearLoading = document.getElementById('year-loading');
    const yearTitle = document.getElementById('year-title');

    const convertForm = document.getElementById('convert-form');
    const convertType = document.getElementById('convert-type');
    const convertIsLeapContainer = document.getElementById('leap-month-check-container');
    const convertResult = document.getElementById('convert-result');

    // State for Month view
    let currentMonthDate = new Date();
    // State for Year view
    let currentYearDate = new Date();

    const dayNamesGrid = ['T.Hai', 'T.Ba', 'T.Tư', 'T.Năm', 'T.Sáu', 'T.Bảy', 'C.Nhật'];

    function renderDayDetail(data) {
        if (!data) return '';
        const dayOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][data.nWeek];
        const lunarMonthStr = data.lunar.month === 1 ? 'GIÊNG' : (data.lunar.month === 11 ? 'MƯỜI MỘT' : (data.lunar.month === 12 ? 'CHẠP' : data.lunar.month.toString()));
        const isLeap = data.lunar.isLeap ? ' (Nhuận)' : '';
        const isLarge = data.lunar.isLarge ? 'Đ' : 'T';

        return `
            <div class="calendar-block-container mx-auto">
                <div class="calendar-block-top-binding"></div>
                <div class="calendar-block-body">
                    <div class="cb-header">
                        <span class="cb-year">${data.solar.year}</span>
                        <span class="cb-month">THÁNG ${data.solar.month}</span>
                    </div>
                    
                    <div class="cb-solar-day">${data.solar.day}</div>
                    
                    <div class="cb-quote">${data.quote || 'Chúc bạn một ngày tốt lành!'}</div>
                    
                    <div class="cb-weekday">${dayOfWeek}</div>
                    
                    <div class="cb-lunar-section">
                        <div class="cb-lunar-left">
                            <div class="cb-can-chi-highlight">NGÀY ${data.canChi.day.toUpperCase()}</div>
                            <div class="cb-can-chi">Tháng ${data.canChi.month}</div>
                            <div class="cb-can-chi">Năm ${data.canChi.year}</div>
                        </div>
                        
                        <div class="cb-lunar-center">
                            <div class="cb-lunar-day">${data.lunar.day}</div>
                            <div class="cb-lunar-month-label">THÁNG ${lunarMonthStr} ÂL (${isLarge})</div>
                        </div>
                        
                        <div class="cb-lunar-right">
                            <div class="cb-astro">Sao: ${data.sao}</div>
                            <div class="cb-astro">Trực: ${data.truc}</div>
                            <div class="cb-astro-highlight">Tiết Khí</div>
                            <div class="cb-astro">${data.term || 'Không có'}</div>
                        </div>
                    </div>
                    
                    <div class="cb-footer">
                        <div><strong>Giờ Hoàng Đạo:</strong> ${data.gioHoangDao}</div>
                    </div>
                </div>
            </div>
        `;
    }

    // --- Tab: Hôm Nay ---
    async function loadToday() {
        todayLoading.classList.remove('d-none');
        todayContent.classList.add('d-none');
        
        const data = await fetchAPI('/api/calendar/today');
        
        todayLoading.classList.add('d-none');
        if (data) {
            todayContent.innerHTML = renderDayDetail(data);
            todayContent.classList.remove('d-none');
        }
    }

    // --- Tab: Lịch (Grid) ---
    async function loadCalendarGrid(year, month) {
        monthLoading.classList.remove('d-none');
        monthContent.innerHTML = '';
        monthTitle.innerText = `Tháng ${month} Năm ${year}`;

        const data = await fetchAPI(`/api/calendar/grid?year=${year}&month=${month}`);
        monthLoading.classList.add('d-none');
        
        if (data) {
            let html = '<div class="calendar-grid">';
            // Headers
            dayNamesGrid.forEach((d, i) => {
                const isSunday = (i === 6) ? 'text-danger' : 'text-primary';
                html += `<div class="calendar-header fw-bold ${isSunday}">${d}</div>`;
            });

            // Days
            data.forEach(d => {
                const isCurrentMonth = d.isCurrentMonth;
                if (!isCurrentMonth) {
                    html += `<div class="calendar-day empty border-0" style="background:transparent;"></div>`;
                    return;
                }

                const isTodayClass = d.solar.isToday ? 'today' : '';
                const bgClass = 'calendar-day-current';
                
                // Dot logic (Hoàng Đạo vs Hắc Đạo or arbitrary red/gray based on day logic)
                const isHoangDao = d.gioHoangDao && d.gioHoangDao.length > 20; // heuristic for good day
                const dotColor = isHoangDao ? '#e3342f' : '#6c757d'; 
                
                const lunarText = (d.lunar.day === 1 ? `${d.lunar.day}/${d.lunar.month}` : d.lunar.day) + (d.lunar.isLeap ? 'N' : '');
                
                html += `
                    <div class="calendar-day ${bgClass} ${isTodayClass}" data-date="${d.solar.year}-${d.solar.month}-${d.solar.day}" title="Ngày ${d.canChi.day}, Tháng ${d.canChi.month}, Năm ${d.canChi.year}">
                        <div class="d-flex justify-content-between align-items-start w-100">
                            <span class="solar-day-grid fw-bold ${d.nWeek === 7 ? 'text-danger' : 'text-dark'}">${d.solar.day}</span>
                            <span class="calendar-dot" style="background-color: ${dotColor};"></span>
                        </div>
                        <span class="lunar-day-grid ${d.lunar.day === 1 || d.lunar.day === 15 ? 'text-danger' : 'text-secondary'}">${lunarText}</span>
                    </div>
                `;
            });

            html += '</div>';
            monthContent.innerHTML = html;
        }
    }

    // --- Events ---
    
    // Tab switching
    document.getElementById('tab-today').addEventListener('shown.bs.tab', () => loadToday());
    document.getElementById('tab-calendar').addEventListener('shown.bs.tab', () => {
        if (!monthContent.querySelector('.calendar-grid')) loadCalendarGrid(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1);
    });

    // Month Navigation
    document.getElementById('btn-prev-month').addEventListener('click', () => {
        currentMonthDate.setMonth(currentMonthDate.getMonth() - 1);
        loadCalendarGrid(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1);
    });
    document.getElementById('btn-next-month').addEventListener('click', () => {
        currentMonthDate.setMonth(currentMonthDate.getMonth() + 1);
        loadCalendarGrid(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1);
    });

    // Grid Cell Click Event (Show Modal)
    const dayDetailModal = new bootstrap.Modal(document.getElementById('dayDetailModal'));
    const dayDetailModalBody = document.getElementById('dayDetailModalBody');

    monthContent.addEventListener('click', async (e) => {
        const cell = e.target.closest('.calendar-day');
        if (!cell || cell.classList.contains('empty')) return;
        
        const dateStr = cell.getAttribute('data-date');
        if (!dateStr) return;

        dayDetailModalBody.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary" role="status"></div></div>';
        dayDetailModal.show();

        const data = await fetchAPI(`/api/calendar/convert?date=${dateStr}&type=solar2lunar&isLeap=false`);
        if (data) {
            dayDetailModalBody.innerHTML = renderDayDetail(data);
        } else {
            dayDetailModalBody.innerHTML = '<div class="alert alert-danger m-3 text-center">Lỗi tải dữ liệu.</div>';
        }
    });

    // Convert Date
    convertType.addEventListener('change', (e) => {
        if (e.target.value === 'lunar2solar') {
            convertIsLeapContainer.classList.remove('d-none');
        } else {
            convertIsLeapContainer.classList.add('d-none');
        }
    });

    convertForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const date = document.getElementById('convert-date').value;
        const type = convertType.value;
        const isLeap = document.getElementById('convert-is-leap').checked;

        convertResult.classList.add('d-none');
        convertResult.innerHTML = '<div class="spinner-border text-primary" role="status"></div>';
        convertResult.classList.remove('d-none');

        const data = await fetchAPI(`/api/calendar/convert?date=${date}&type=${type}&isLeap=${isLeap}`);
        if (data) {
            convertResult.innerHTML = renderDayDetail(data);
        } else {
            convertResult.innerHTML = '<div class="alert alert-danger">Lỗi chuyển đổi.</div>';
        }
    });

    // Load initial tab
    loadToday();
});
