const solarlunar = require('solarlunar').default || require('solarlunar');
const { buildAstroProfile, toVietnameseCanChi } = require('./astroService');
const { calculateTransitStars, generateRealtimeForecast } = require('./realtimeHoroscopeService');
const { getNapAmByCanChi } = require('./displayService');
const auspiciousService = require('./auspiciousService');
const aiKnowledgeService = require('./aiKnowledgeService');

// Preset Prompt Suggestions
const PRESET_PROMPTS = [
    {
        category: 'tai_loc',
        icon: 'bi-cash-stack',
        title: 'Tài Lộc & Đầu Tư',
        prompt: 'Vận trình tài chính và cơ hội đầu tư kinh doanh năm nay của tôi thế nào?',
    },
    {
        category: 'cong_danh',
        icon: 'bi-award-fill',
        title: 'Công Danh & Sự Nghiệp',
        prompt: 'Thời điểm nào trong năm thích hợp nhất để tôi nhảy việc hoặc khởi nghiệp?',
    },
    {
        category: 'tinh_cam',
        icon: 'bi-heart-fill',
        title: 'Tình Cảm & Gia Đạo',
        prompt: 'Chuyện tình cảm đôi lứa và gia đạo của tôi năm nay có gì cần lưu ý?',
    },
    {
        category: 'phong_thuy',
        icon: 'bi-compass-fill',
        title: 'Phong Thủy Hóa Giải',
        prompt: 'Hướng làm việc, vật phẩm phong thủy và màu sắc nào hợp nhất với bản mệnh của tôi?',
    },
];

const WEEKDAY_NAMES = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const LUNAR_MONTH_BRANCHES = ['Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi', 'Tý', 'Sửu'];
const LUNAR_MONTH_ELEMENT_MAP = {
    Dần: 'Mộc',
    Mão: 'Mộc',
    Thìn: 'Thổ',
    Tỵ: 'Hỏa',
    Tị: 'Hỏa',
    Ngọ: 'Hỏa',
    Mùi: 'Thổ',
    Thân: 'Kim',
    Dậu: 'Kim',
    Tuất: 'Thổ',
    Hợi: 'Thủy',
    Tý: 'Thủy',
    Sửu: 'Thổ',
};
const ELEMENT_GENERATES = {
    Mộc: 'Hỏa',
    Hỏa: 'Thổ',
    Thổ: 'Kim',
    Kim: 'Thủy',
    Thủy: 'Mộc',
};

const formatSolarDate = (solarDate) => {
    if (!solarDate || !solarDate.cYear || !solarDate.cMonth || !solarDate.cDay) return null;
    return `${solarDate.cYear}-${String(solarDate.cMonth).padStart(2, '0')}-${String(solarDate.cDay).padStart(2, '0')}`;
};

const getBestWealthMonthForecast = (personInput, lunarYear, personContext) => {
    const results = [];
    const userElement = personContext?.element || 'Thổ';

    for (let lunarMonth = 1; lunarMonth <= 12; lunarMonth += 1) {
        const solarDate = solarlunar.lunar2solar(lunarYear, lunarMonth, 15, false);
        const targetDateStr = formatSolarDate(solarDate);
        if (!targetDateStr) continue;

        const forecast = generateRealtimeForecast(personInput, targetDateStr);
        const taiLocScore = forecast?.daily_forecast?.scores_breakdown?.tai_loc ?? 0;
        const monthBranch = LUNAR_MONTH_BRANCHES[lunarMonth - 1];
        const monthElement = LUNAR_MONTH_ELEMENT_MAP[monthBranch] || 'Thổ';
        const monthlyBonus = (() => {
            if (monthElement === userElement) return 10;
            if (ELEMENT_GENERATES[monthElement] === userElement) return 16;
            if (ELEMENT_GENERATES[userElement] === monthElement) return 4;
            return 0;
        })();
        const annualBonus = [personContext?.luu_loc_ton, personContext?.luu_thien_ma].includes(monthBranch) ? 6 : 0;

        results.push({
            lunar_month: lunarMonth,
            month_branch: monthBranch,
            month_element: monthElement,
            month_can_chi: forecast?.can_chi_month || monthBranch,
            target_date: targetDateStr,
            tai_loc_score: taiLocScore,
            total_score: taiLocScore + monthlyBonus + annualBonus,
            monthly_bonus: monthlyBonus,
            annual_bonus: annualBonus,
            monthly_title: forecast?.monthly_forecast?.title || `Tử Vi Tháng ${lunarMonth} Âm Lịch`,
            monthly_summary: forecast?.monthly_forecast?.summary || '',
        });
    }

    results.sort((a, b) => (b.total_score - a.total_score) || (b.tai_loc_score - a.tai_loc_score) || (a.lunar_month - b.lunar_month));

    return {
        best: results[0] || null,
        top3: results.slice(0, 3),
    };
};

/**
 * Generate AI Horoscope Response (Context-Aware & RAG Knowledge Engine)
 */
const generateAiHoroscopeResponse = async (message, history = [], personInput = {}) => {
    // 1. Build Astro Profile of User
    const profile = buildAstroProfile(
        personInput.full_name || 'Người dùng',
        personInput.birthday || '2000-05-15',
        personInput.birth_time || '08:30',
        personInput.gender || 'nam'
    );

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    const lunarToday = solarlunar.solar2lunar(year, month, day);
    const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const transits = calculateTransitStars(todayStr);

    const rawYearCanChi = profile.can_chi ? (profile.can_chi.split('|')[0] || '').replace('Năm:', '').trim() : '';
    const napAmResolved = getNapAmByCanChi(rawYearCanChi) || getNapAmByCanChi(profile.can_chi) || profile.nap_am?.name || 'Bạch Lạp Kim';

    const personContext = {
        full_name: personInput.full_name || 'Người dùng',
        can_chi: profile.can_chi,
        nap_am: typeof napAmResolved === 'string' ? napAmResolved : (napAmResolved.name || 'Bạch Lạp Kim'),
        element: typeof napAmResolved === 'object' && napAmResolved.element ? napAmResolved.element : (napAmResolved.includes('KIM') ? 'Kim' : (napAmResolved.includes('HỎA') ? 'Hỏa' : (napAmResolved.includes('THỦY') ? 'Thủy' : (napAmResolved.includes('MỘC') ? 'Mộc' : 'Thổ')))),
        cung_phi: profile.cung_phi || 'Khảm',
        luu_nien: transits.can_chi_year,
        luu_loc_ton: transits.transit_stars.luu_loc_ton,
        luu_thien_ma: transits.transit_stars.luu_thien_ma,
        luu_thai_tue: transits.transit_stars.luu_thai_tue,
    };

    const msgLower = (message || '').trim().toLowerCase();

    let replyContent = '';
    let suggestedQuestions = [];

    // --- RAG SEARCH: Check if query matches custom trained Knowledge Base (Tarot, Tướng Số, Phong Thủy, Tử Vi) ---
    const matchedKnowledge = aiKnowledgeService.searchKnowledge(message);

    if (matchedKnowledge && matchedKnowledge.length > 0) {
        const topItem = matchedKnowledge[0];
        replyContent = `🔮 **Trợ Lý AI Tri Thức: ${topItem.title}**

- **Tóm Tắt**: ${topItem.summary}

${topItem.details}

---
*(Chào **${personContext.full_name}**, bạn thuộc mệnh **${personContext.nap_am}** - Cung **${personContext.cung_phi}**. Ứng dụng tri thức này kết hợp năng lượng mệnh **${personContext.element}** của bạn để gặt hái cát lành lớn nhất).*`;

        suggestedQuestions = [
            'Xem thêm chi tiết ứng dụng phong thủy cho tuổi của tôi?',
            'Hôm nay có phải là ngày tốt cho tuổi của tôi không?',
            'Vận trình tài lộc và sự nghiệp năm nay của tôi thế nào?',
        ];
    }
    // --- 0. INTENT: ĐÁNH GIÁ NGÀY TỐT/XẤU HÔM NAY CHO TUỔI BẢN THÂN ---
    else if (msgLower.includes('ngày tốt') || msgLower.includes('tốt cho tuổi') || msgLower.includes('hợp tuổi') || msgLower.includes('ngày xấu') || msgLower.includes('có tốt không')) {
        const evalResult = auspiciousService.evaluatePersonalizedDay(year, month, day, 'khai_truong', profile);

        const canChiDayStr = toVietnameseCanChi(lunarToday.gzDay) || lunarToday.gzDay;

        replyContent = `📅 **Đánh Giá Ngày Hôm Nay Đối Với Tuổi ${personContext.full_name} (${personContext.can_chi})**:

- **Thời gian**: Hôm nay ngày **${day}/${month}/${year}** Dương lịch (Nhằm **${lunarToday.lDay}/${lunarToday.lMonth} Âm lịch - Ngày ${canChiDayStr}**).
- **Đánh Giá Ngày Chi Tiết**: **${evalResult.score}/100 ĐIỂM** — **${evalResult.rating_label}**.

1. **Phân Tích Xung Hợp Với Bản Mệnh**:
${evalResult.reasons.map((r) => `   - ${r}`).join('\n')}

2. **Giờ Hoàng Đạo Tốt Nhất Cho Tuổi Của Bạn**:
   - ${evalResult.personalized_hours.slice(0, 5).join(', ')}.

*(Lời khuyên: ${evalResult.score >= 70 ? 'Hôm nay là ngày Cát Tường rất đẹp, bạn hoàn toàn có thể tự tin thực hiện các công việc quan trọng!' : 'Hôm nay vận khí bình hòa, nên giữ thái độ hòa nhã, cẩn trọng khi đưa ra quyết định mua bán / ký kết lớn.'})*`;

        suggestedQuestions = [
            'Giờ Hoàng Đạo tốt nhất trong ngày hôm nay là mấy giờ?',
            'Xem danh sách các ngày Đại Cát trong tháng này cho tuổi của tôi?',
            'Vận trình tài lộc và công danh năm nay của tôi thế nào?',
        ];
    }
    // --- A. INTENT: TÀI LỘC & ĐẦU TƯ ---
    else if (msgLower.includes('tài lộc') || msgLower.includes('tiền') || msgLower.includes('đầu tư') || msgLower.includes('kinh doanh') || msgLower.includes('tài chính') || msgLower.includes('bán') || msgLower.includes('mua')) {
        const asksBestMonth = /tháng\s*(mấy|nào)/.test(msgLower) || msgLower.includes('bao giờ') || msgLower.includes('lúc nào');

        if (asksBestMonth) {
            const wealthForecast = getBestWealthMonthForecast(personInput, lunarToday.lYear || year, personContext);
            const bestMonth = wealthForecast.best;

            if (bestMonth) {
                replyContent = `Chào **${personContext.full_name}** (Tuổi **${personContext.can_chi}** - Mệnh **${personContext.nap_am}** - Cung **${personContext.cung_phi}**).

Dựa trên chấm điểm vận tài lộc theo từng tháng âm lịch trong năm **${lunarToday.lYear || year}**, tháng thuận lợi nhất của bạn là:

1. **Tháng Âm Lịch Vượng Tài Nhất**: **Tháng ${bestMonth.lunar_month}**
    - **Can Chi Tháng**: **${bestMonth.month_can_chi}**
    - **Ngũ Hành Tháng**: **${bestMonth.month_element}**
    - **Điểm tài lộc ước tính**: **${bestMonth.tai_loc_score}/100**
    - **Điểm ưu tiên sau hiệu chỉnh**: **${bestMonth.total_score}/100**
   - **Mốc tham chiếu**: ${bestMonth.target_date}
   - **Nhận xét**: Đây là tháng có nền khí tài chính thuận hơn các tháng còn lại, phù hợp để chốt việc tiền bạc, đàm phán, hoặc mở rộng nguồn thu.

2. **Các tháng đứng sau**:
${wealthForecast.top3.slice(1).map((item) => `   - Tháng ${item.lunar_month} (${item.month_branch} - ${item.month_element}): ${item.total_score}/100`).join('\n')}

3. **Lưu ý thực tế**:
   - Tháng này tốt hơn về xu hướng, nhưng vẫn nên chọn đúng ngày hoàng đạo và tránh quyết định quá rủi ro.
   - Nếu bạn muốn, tôi có thể chấm tiếp **ngày tốt nhất trong tháng ${bestMonth.lunar_month}** cho việc tiền bạc.`;

                suggestedQuestions = [
                    `Xem ngày tốt nhất trong tháng ${bestMonth.lunar_month} cho việc tiền bạc?`,
                    'Hợp tác làm ăn với tuổi nào mang lại may mắn cho tôi?',
                    'Cách chọn hướng bàn làm việc tụ tài lộc theo Cung Mệnh?',
                ];

                return {
                    reply: replyContent,
                    suggested_questions: suggestedQuestions,
                    person_context: personContext,
                    timestamp: new Date().toISOString(),
                };
            }
        }

        replyContent = `Chào **${personContext.full_name}** (Tuổi **${personContext.can_chi}** - Mệnh **${personContext.nap_am}** - Cung **${personContext.cung_phi}**).

Dựa trên lá số Tử Vi và vận hạn năm **${personContext.luu_nien}**:

1. **Về Tài Chính & Dòng Tiền**:
   - Mệnh của bạn là **${personContext.nap_am}** (${personContext.element}). Năm nay Lưu Lộc Tồn giáng tại cung **${personContext.luu_loc_ton}**. Đây là dấu hiệu vượng khí tài lộc có sự khởi sắc.
   - Thích hợp quản lý dòng tiền bài bản, tích lũy kiến thức trước khi mở rộng quy mô đầu tư.

2. **Lời Khuyên Phong Thủy Tài Lộc**:
   - Sử dụng trang phục hoặc vật phẩm thuộc hành **${personContext.element === 'Kim' ? 'Thổ / Kim (Vàng, Nâu, Trắng)' : (personContext.element === 'Mộc' ? 'Thủy / Mộc (Xanh Lá, Xanh Dương)' : 'Hỏa / Thổ (Đỏ, Hồng, Vàng)')}** để gia tăng vận khí tích lộc.
   - Tránh đầu tư mạo hiểm vào các tháng có sao kỵ chiếu.`;

        suggestedQuestions = [
            'Tháng mấy Âm lịch năm nay tôi có lộc tiền bạc lớn nhất?',
            'Hợp tác làm ăn với tuổi nào mang lại may mắn cho tôi?',
            'Cách chọn hướng bàn làm việc tụ tài lộc theo Cung Mệnh?',
        ];
    }
    // --- B. INTENT: LỊCH ÂM DƯƠNG / NGÀY ÂM HÔM NAY / NGÀY MAI ---
    else if ((msgLower.includes('âm') || msgLower.includes('lịch âm') || msgLower.includes('ngày bao nhiêu') || msgLower.includes('ngày mấy') || msgLower.includes('hôm nay') || msgLower.includes('ngày mai')) && !msgLower.includes('tiền') && !msgLower.includes('tài lộc') && !msgLower.includes('tài chính') && !msgLower.includes('đầu tư') && !msgLower.includes('kinh doanh')) {
        let targetLunar = lunarToday;
        let dayTitle = 'Hôm nay';
        let solDateStr = `${day}/${month}/${year}`;

        if (msgLower.includes('ngày mai')) {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            targetLunar = solarlunar.solar2lunar(tomorrow.getFullYear(), tomorrow.getMonth() + 1, tomorrow.getDate());
            dayTitle = 'Ngày mai';
            solDateStr = `${tomorrow.getDate()}/${tomorrow.getMonth() + 1}/${tomorrow.getFullYear()}`;
        }

        const canChiDayStr = toVietnameseCanChi(targetLunar.gzDay) || targetLunar.gzDay;
        const canChiMonthStr = toVietnameseCanChi(targetLunar.gzMonth) || targetLunar.gzMonth;
        const canChiYearStr = toVietnameseCanChi(targetLunar.gzYear) || targetLunar.gzYear;

        const dayNapAm = getNapAmByCanChi(canChiDayStr) || {};

        replyContent = `📅 **Thông Tin Lịch Âm Dương (${dayTitle})**:

- **Lịch Âm**: Ngày **${targetLunar.lDay}** tháng **${targetLunar.lMonth}** năm **${canChiYearStr}** ${targetLunar.isLeap ? '(Tháng Nhuận)' : ''}.
- **Lịch Dương**: **${solDateStr}** (${WEEKDAY_NAMES[targetLunar.nWeek || 0]}).
- **Can Chi Ngày**: **${canChiDayStr}** | **Tháng**: **${canChiMonthStr}** | **Năm**: **${canChiYearStr}**.
- **Ngũ Hành Ngày**: Mệnh **${typeof dayNapAm === 'string' ? dayNapAm : (dayNapAm.name || 'Thổ')}**.
- **Giờ Hoàng Đạo Trong Ngày**: ${transits.hoang_dao_hours.slice(0, 4).join(', ')}.

*(Chào **${personContext.full_name}**, bạn thuộc mệnh **${personContext.nap_am}**. Ngày ${canChiDayStr} hôm nay mang nguồn năng lượng ổn định cho bản mệnh của bạn).*`;

        suggestedQuestions = [
            'Hôm nay có phải là ngày tốt cho tuổi của tôi không?',
            'Giờ Hoàng Đạo tốt nhất trong ngày hôm nay là mấy giờ?',
            'Xem ngày tốt trong tháng này cho công việc của tôi?',
        ];
    }
    // --- C. INTENT: CÔNG DANH & SỰ NGHIỆP ---
    else if (msgLower.includes('công việc') || msgLower.includes('công danh') || msgLower.includes('nhảy việc') || msgLower.includes('khởi nghiệp') || msgLower.includes('sự nghiệp') || msgLower.includes('xin việc') || msgLower.includes('thăng tiến')) {
        replyContent = `Chào **${personContext.full_name}** (Tuổi **${personContext.can_chi}** - Mệnh **${personContext.nap_am}**).

Xét theo lá số Tử Vi và vận trình công danh năm **${personContext.luu_nien}**:

1. **Về Cơ Hội Sự Nghiệp**:
   - Lưu Thiên Mã tại cung **${personContext.luu_thien_ma}** báo hiệu một năm có nhiều sự dịch chuyển, mở rộng mối quan hệ hoặc đi lại công tác.
   - Nếu bạn có ý định thay đổi công việc hoặc khởi nghiệp, hãy chuẩn bị kỹ năng chuyên môn vững vàng. Càng năng động càng có cơ hội gặp Quý Nhân trợ giúp.

2. **Định Hướng Khai Phát**:
   - Giữ tinh thần cầu thị, chủ động nắm bắt cơ hội trong công việc.
   - Chọn đối tác có Địa Chi thuộc bộ Tam Hợp hoặc Lục Hợp với tuổi **${personContext.can_chi.split(' ').pop()}** để công việc thuận buồm xuôi gió.`;

        suggestedQuestions = [
            'Nên chọn ngày nào trong tháng để nộp hồ sơ / mở cửa hàng?',
            'Tôi hợp với ngành nghề thuộc Ngũ Hành nào nhất?',
            'Cách ứng xử hóa giải thị phi chốn công sở năm nay?',
        ];
    }
    // --- D. INTENT: TÌNH CẢM & GIA ĐẠO ---
    else if (msgLower.includes('tình cảm') || msgLower.includes('gia đạo') || msgLower.includes('kết hôn') || msgLower.includes('người yêu') || msgLower.includes('vợ') || msgLower.includes('chồng') || msgLower.includes('yêu') || msgLower.includes('ly hôn')) {
        replyContent = `Chào **${personContext.full_name}** (Cung **${personContext.cung_phi}** - Mệnh **${personContext.nap_am}**).

Về phương diện Tình cảm & Gia đạo trong năm **${personContext.luu_nien}**:

1. **Vận Trình Đôi Lứa & Gia Đạo**:
   - Năm nay Lưu Thái Tuế tọa tại cung **${personContext.luu_thai_tue}**. Đường tình duyên cần sự lắng nghe, chân thành và bao dung.
   - Với người đã có gia đình: Cần chú ý giữ hòa khí, tránh bất đồng ý kiến vì những chuyện nhỏ nhặt.
   - Với người độc thân: Có cơ hội gặp gỡ đối phương thông qua bạn bè hoặc các chuyến đi xa.

2. **Bí Quyết Gắn Kết**:
   - Luôn thẳng thắn chia sẻ tâm tư trên tinh thần xây dựng.
   - Chọn ngày Cát Tường để dạm ngõ, cưới hỏi hoặc tổ chức kỷ niệm gia đình.`;

        suggestedQuestions = [
            'Độ hợp tuổi giữa tôi và đối phương thế nào?',
            'Năm nay có thích hợp để lập gia đình / sinh con hay không?',
            'Cách bố trí phòng ngủ phong thủy gia tăng tình cảm vợ chồng?',
        ];
    }
    // --- E. DEFAULT FALLBACK RESPONDER ---
    else {
        replyContent = `Chào **${personContext.full_name}** (Tuổi **${personContext.can_chi}** - Mệnh **${personContext.nap_am}** - Cung **${personContext.cung_phi}**).

Trợ Lý AI Tử Vi xin trả lời câu hỏi: "*${message}*" của bạn:

1. **Xét Theo Bản Mệnh**:
   - Bạn mang mệnh **${personContext.nap_am}** (${personContext.element}). Trong năm **${personContext.luu_nien}**, Cung Lưu Niên tại **${personContext.luu_thai_tue}** cùng Lưu Lộc Tồn tại **${personContext.luu_loc_ton}** mang lại nền tảng năng lượng ổn định.

2. **Lời Khuyên Định Hướng**:
   - Mọi sự hanh thông đều xuất phát từ sự chuẩn bị kỹ lưỡng và thái độ tích cực. Bạn có thể sử dụng các chức năng **Vận Hạn Realtime**, **Xem Hợp Tuổi** hoặc **Chọn Ngày Tốt Cá Nhân Hóa** trên hệ thống để có dữ liệu chi tiết nhất.`;

        suggestedQuestions = [
            'Hôm nay có phải là ngày tốt cho tuổi của tôi không?',
            'Vận trình tài lộc và tiền bạc năm nay của tôi thế nào?',
            'Thời điểm nào thích hợp để tôi nhảy việc / khởi nghiệp?',
        ];
    }

    return {
        reply: replyContent,
        suggested_questions: suggestedQuestions,
        person_context: personContext,
        timestamp: new Date().toISOString(),
    };
};

module.exports = {
    PRESET_PROMPTS,
    generateAiHoroscopeResponse,
};
