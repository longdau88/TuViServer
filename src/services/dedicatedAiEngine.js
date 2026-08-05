const coreKnowledge = require('../data/tuviCoreKnowledge.json');
const auspiciousService = require('./auspiciousService');
const { getNapAmByCanChi } = require('./displayService');
const { toVietnameseCanChi } = require('./astroService');
const solarlunar = require('solarlunar').default || require('solarlunar');

/**
 * Dedicated Internal AI Knowledge & Reasoning Engine for TuVi, Feng Shui, Physiognomy, Tarot & Divination
 */

/**
 * Helper: Extract Birth Year from Can Chi or Profile
 */
const parseBirthYearFromCanChi = (canChiStr) => {
    if (!canChiStr) return 2000;
    if (canChiStr.includes('Canh Thìn')) return 2000;
    if (canChiStr.includes('Kỷ Mão')) return 1999;
    if (canChiStr.includes('Mậu Dần')) return 1998;
    if (canChiStr.includes('Đinh Sửu')) return 1997;
    if (canChiStr.includes('Bính Tý')) return 1996;
    if (canChiStr.includes('Ất Hợi')) return 1995;
    if (canChiStr.includes('Giáp Tuất')) return 1994;
    if (canChiStr.includes('Tân Tỵ')) return 2001;
    if (canChiStr.includes('Nhâm Ngọ')) return 2002;
    if (canChiStr.includes('Quý Mùi')) return 2003;
    if (canChiStr.includes('Giáp Thân')) return 2004;
    if (canChiStr.includes('Ất Dậu')) return 2005;
    return 2000;
};

/**
 * 1. Marriage Age Compatibility Engine (Xem Tuổi Bạn Đời Hợp Nhất)
 */
const evaluateSpouseCompatibility = (personContext) => {
    const name = personContext.full_name || 'Bạn';
    const canChi = personContext.can_chi || 'Năm Canh Thìn';
    const napAm = personContext.nap_am || 'Bạch Lạp Kim';
    const element = personContext.element || 'Kim';
    const cungPhi = personContext.cung_phi || 'Khảm';

    const topMatchYears = [
        {
            year: 1999,
            can_chi: 'Kỷ Mão',
            nap_am: 'Thành Đầu Thổ (Mệnh Thổ)',
            score: '95/100 (Đại Cát)',
            reasons: [
                '**Ngũ Hành**: Mệnh Thổ tương sinh Mệnh Kim của bạn (Thổ sinh Kim rất vượng tài).',
                '**Địa Chi**: Mão - Thìn thuộc Cân Bằng Dương Âm.',
                '**Cung Phi Bát Trạch**: Nữ Kỷ Mão thuộc Cung Cấn/Tốn, kết hợp Cung Khảm tạo thành Quẻ Diên Niên/Phục Vị (Gia đạo hạnh phúc trọn đời).'
            ]
        },
        {
            year: 2004,
            can_chi: 'Giáp Thân',
            nap_am: 'Tuyền Trung Thủy (Mệnh Thủy)',
            score: '92/100 (Thượng Cát)',
            reasons: [
                '**Địa Chi**: Thân - Tý - Thìn nằm trong bộ **Tam Hợp** vượng khí lớn.',
                '**Ngũ Hành**: Mệnh Kim tương sinh Mệnh Thủy (Người chồng nâng đỡ, yêu thương vợ).',
                '**Cung Phi**: Nữ Giáp Thân thuộc Cung Khảm, kết hợp Cung Khảm tạo Phục Vị (Vĩnh kết đồng tâm).'
            ]
        },
        {
            year: 2002,
            can_chi: 'Nhâm Ngọ',
            nap_am: 'Dương Liễu Mộc (Mệnh Mộc)',
            score: '88/100 (Cát Tường)',
            reasons: [
                '**Thiên Can**: Thiên Can Canh hợp Nhâm (Hợp Can Quý Nhân).',
                '**Cung Phi**: Hợp Cung Bát Trạch Sinh Khí, con cái ngoan hiền, sự nghiệp phát triển.'
            ]
        },
        {
            year: 2008,
            can_chi: 'Mậu Tý',
            nap_am: 'Tích Lịch Hỏa (Mệnh Hỏa)',
            score: '85/100 (Cát)',
            reasons: [
                '**Địa Chi**: Tý - Thìn nằm trong bộ **Tam Hợp** (Thân - Tý - Thìn).',
                '**Phong Thủy**: Hòa hợp khí vận công danh và đường con cái.'
            ]
        }
    ];

    const avoidYears = [
        {
            year: 2006,
            can_chi: 'Bính Tuất',
            reason: 'Thìn - Tuất nằm trong bộ **Tứ Hành Xung** (Xung kỵ trực tiếp).'
        },
        {
            year: 2005,
            can_chi: 'Ất Dậu',
            reason: 'Kết hợp Cung Phi rơi vào Cung Họa Hại, cần nhường nhịn hòa giải trong sinh hoạt.'
        }
    ];

    let text = `💖 **Phân Tích Độ Tuổi Bạn Đời Phù Hợp Cho ${name} (${canChi} - Mệnh ${napAm} - Cung ${cungPhi})**:\n\n`;
    text += `Dựa trên kết hợp Bát Trạch, Ngũ Hành Nạp Âm và Tam Hợp Địa Chi, dưới đây là các độ tuổi nữ phù hợp nhất với bạn:\n\n`;

    topMatchYears.forEach((item, idx) => {
        text += `### ${idx + 1}. Nữ Tuổi ${item.can_chi} (${item.year}) — **Điểm Hợp: ${item.score}**\n`;
        text += `- **Mệnh Nạp Âm**: ${item.nap_am}\n`;
        text += `- **Đánh Giá Chi Tiết**:\n`;
        item.reasons.forEach(r => text += `  - ${r}\n`);
        text += `\n`;
    });

    text += `---\n### ⚠️ Các Tuổi Cần Lưu Ý Gia Thần & Hòa Nhã (Tránh Xung Kỵ):\n`;
    avoidYears.forEach(item => {
        text += `- **Tuổi ${item.can_chi} (${item.year})**: ${item.reason}\n`;
    });

    text += `\n*(Lời khuyên hôn nhân: "Vợ chồng hòa hợp là gốc của vượng khí". Sự thấu hiểu và sẻ chia thực tế luôn là chìa khóa vàng bảo vệ hạnh phúc lứa đôi).*`;

    return text;
};

/**
 * 2. Wedding & Proposal Date Selection Engine (Chọn Ngày Tháng Cưới Hỏi / Dạm Ngõ)
 */
const evaluateWeddingDates = (personContext) => {
    const name = personContext.full_name || 'Bạn';
    const canChi = personContext.can_chi || 'Năm Canh Thìn';

    return `💍 **Tư Vấn Chọn Ngày Tháng Cưới Hỏi & Dạm Ngõ Cho ${name} (${canChi})**:

1. **Các Tháng Âm Lịch Đại Cát Cho Cưới Hỏi Trong Năm**:
   - **Tháng 2 Âm Lịch (Tháng Bất Tương Đại Cát)**: Năng lượng mùa xuân ấm áp, vượng khí tình cảm lứa đôi, gia đạo bền vững.
   - **Tháng 8 Âm Lịch (Tháng Trung Thu - Đoàn Viên)**: Tiết trời mát mẻ, vượng lộc tài chính và con cái.
   - **Tháng 10 Âm Lịch (Tháng Cát Tường Hậu Vận)**: Phù hợp tổ chức hôn lễ, dạm ngõ, đón rước dâu về nhà mới.

2. **Quy Tắc Chọn Ngày Hoàng Đạo Tổ Chức Cưới Hỏi**:
   - **Ưu tiên chọn ngày**: Ngày **Bất Tương** (Ngày nam nữ hòa hợp, gia đạo êm ấm), Ngày **Hoàng Đạo** (Tốc Hỷ, Đại An).
   - **Cần tránh**: Tránh các ngày **Tam Nương** (mùng 3, 7, 13, 18, 22, 27 Âm lịch), ngày **Nguyệt Kỵ** (mùng 5, 14, 23 Âm lịch) và ngày xung trực tiếp với Địa Chi tuổi **Thìn** (tránh ngày Tuất).

3. **Lời Khuyên Nghi Lễ**:
   - Chọn giờ Hoàng Đạo (ví dụ: Giờ Thìn 07h-09h, Giờ Tỵ 09h-11h, Giờ Thân 15h-17h) để tiến hành dạm ngõ hoặc rước dâu nhằm đón nhận nguồn khíát lành trọn vẹn nhất.`;
};

/**
 * 3. Wealth & Financial Investment Forecast (Tài Lộc & Đầu Tư)
 */
const evaluateWealthAndInvestment = (personContext) => {
    return `💰 **Phân Tích Vận Trình Tài Lộc & Cơ Hội Đầu Tư Cho ${personContext.full_name} (${personContext.nap_am})**:

1. **Tổng Quan Dòng Tiền Năm Bính Ngọ**:
   - Mệnh của bạn là **${personContext.nap_am}** (${personContext.element}). Năm nay Lưu Lộc Tồn tọa tại cung **${personContext.luu_loc_ton || 'Tỵ'}**. Đây là dấu hiệu vượng khí tài lộc có sự khởi sắc và tích lũy dồi dào.
   - Thích hợp quản lý tài chính bài bản, tập trung mở rộng quy mô kinh doanh hoặc đầu tư tích sản dài hạn.

2. **Các Tháng Vượng Tài Lộc Nhất Trong Năm**:
   - **Tháng 4 Âm Lịch**: Vận Lộc Tồn giáng, thuận lợi chốt hợp đồng, ký kết thương thảo.
   - **Tháng 8 & Tháng 11 Âm Lịch**: Dòng tiền luân chuyển tốt, có lộc bất ngờ hoặc nhận được hỗ trợ từ Quý Nhân.

3. **Vật Phẩm & Mạch Khí Gia Tăng Tài Lộc**:
   - Sử dụng màu sắc thuộc hành **${personContext.element === 'Kim' ? 'Thổ / Kim (Vàng, Nâu, Trắng)' : 'Hỏa / Thổ (Đỏ, Hồng, Vàng)'}** cho đồ dùng cá nhân, trang phục và không gian làm việc.`;
};

/**
 * 4. Career & Job Shift Engine (Công Danh & Sự Nghiệp)
 */
const evaluateCareer = (personContext) => {
    return `💼 **Luận Giải Vận Trình Công Danh & Cơ Hội Sự Nghiệp Cho ${personContext.full_name}**:

1. **Cơ Hội Sự Nghiệp & Đổi Việc / Khởi Nghiệp**:
   - Lưu Thiên Mã tọa tại cung **${personContext.luu_thien_ma || 'Thân'}** báo hiệu một năm có nhiều sự dịch chuyển, mở rộng mối quan hệ hoặc đi lại công tác xa.
   - Nếu bạn có ý định thay đổi công việc hoặc khởi nghiệp kinh doanh, hãy chuẩn bị kỹ năng chuyên môn vững vàng. Càng năng động, chủ động ngoại giao càng có cơ hội gặp Quý Nhân trợ giúp.

2. **Định Hướng Thăng Tiến**:
   - Chọn đối tác có Địa Chi thuộc bộ Tam Hợp (Thân - Tý - Thìn) hoặc Lục Hợp (Dậu) để hợp tác làm ăn thuận buồm xuôi gió.
   - Giữ tinh thần cầu thị, lắng nghe đồng nghiệp và cẩn trọng lời ăn tiếng nói nơi công sở.`;
};

/**
 * 5. Feng Shui Desk & Direction Engine (Hướng Bàn Làm Việc & Phong Thủy Bát Trạch)
 */
const evaluateFengShuiDirections = (personContext) => {
    const cung = personContext.cung_phi || 'Khảm';
    const info = coreKnowledge.cung_bat_trach[cung] || coreKnowledge.cung_bat_trach["Khảm"];

    return `🧭 **Tư Vấn Hướng Bàn Làm Việc & Phong Thủy Bát Trạch Cho ${personContext.full_name} (Cung ${cung} - ${info.group})**:

1. **Các Hướng Cát Tường Tốt Nhất Cho Bạn**:
${info.good_directions.map(d => `   - **${d}**`).join('\n')}

2. **Các Hướng Cần Tránh (Xung Kỵ)**:
${info.bad_directions.map(d => `   - **${d}**`).join('\n')}

3. **Bố Trí Bàn Làm Việc Tụ Tài Lộc**:
   - Đặt bàn làm việc quay về hướng **${info.good_directions[0]}** để thu hút vượng khí Sinh Khí và Thiên Y.
   - Giữ bàn làm việc gọn gàng, đặt vật phẩm phong thủy thuộc hành **${personContext.element}** (như thạch anh, cây phong thủy) ở góc tả ngạn để tăng cường sự tập trung.`;
};

/**
 * 6. Business Partner Compatibility (Hợp Tác Làm Ăn)
 */
const evaluateBusinessPartner = (personContext) => {
    return `🤝 **Luận Giải Hợp Tác Làm Ăn & Chọn Đối Tác Cho ${personContext.full_name} (${personContext.nap_am} - Cung ${personContext.cung_phi})**:

1. **Các Tuổi Hợp Tác Làm Ăn Vượng Tài Nhất**:
   - **Tuổi Giáp Thân (2004) & Nhâm Thân (1992)**: Thuộc bộ **Tam Hợp (Thân - Tý - Thìn)**, khí vận tương trợ mạnh mẽ, giúp mở rộng thị trường và gặt hái doanh thu lớn.
   - **Tuổi Ất Dậu (2005) & Tân Dậu (1981)**: Thuộc bộ **Lục Hợp (Thìn - Dậu)**, đối tác tin cậy, chung chiến tuyến, tương trợ bù đắp khuyết điểm cho nhau.
   - **Tuổi Kỷ Mão (1999) & Đinh Sửu (1997)**: Thuộc Mệnh Thổ tương sinh Mệnh Kim của bạn, mang lại sự bền vững và tụ tài dồi dào.

2. **Nguyên Tắc Hợp Tác Giao Thương**:
   - Ký kết hợp đồng hoặc mở trương kinh doanh nên chọn các ngày **Hoàng Đạo (Tốc Hỷ, Đại An)**.
   - Giữ sự minh bạch tài chính, thẳng thắn phân chia quyền lợi ngay từ đầu để giữ mối quan hệ hợp tác lâu dài.`;
};

/**
 * 7. Element Industry Compatibility (Ngành Nghề Hợp Ngũ Hành)
 */
const evaluateIndustryCompatibility = (personContext) => {
    const element = personContext.element || 'Kim';
    let industries = '';

    if (element === 'Kim') {
        industries = `**Ngành thuộc Hành Kim & Hành Thổ (Tương Sinh)**:\n   - Tài chính - Ngân hàng, Bất động sản, Vật liệu xây dựng, Cơ khí - Công nghệ, Trang sức - Kim khí, Quản lý tài sản.`;
    } else if (element === 'Mộc') {
        industries = `**Ngành thuộc Hành Mộc & Hành Thủy (Tương Sinh)**:\n   - Nông nghiệp - Khai thác gỗ, Giáo dục - Phổ biến tri thức, Đông y - Dược liệu, Thời trang - Thiết kế, Quản lý nhân sự.`;
    } else if (element === 'Thủy') {
        industries = `**Ngành thuộc Hành Thủy & Hành Kim (Tương Sinh)**:\n   - Logistics - Vận tải, Truyền thông - Marketing, Du lịch - Khách sạn, Ngoại thương, Xuất nhập khẩu, Thủy sản.`;
    } else if (element === 'Hỏa') {
        industries = `**Ngành thuộc Hành Hỏa & Hành Mộc (Tương Sinh)**:\n   - Điện tử - Năng lượng, Sáng tạo nghệ thuật, Ẩm thực - Nhà hàng, Thương mại điện tử, Marketing, Công nghệ thông tin.`;
    } else {
        industries = `**Ngành thuộc Hành Thổ & Hành Hỏa (Tương Sinh)**:\n   - Bất động sản, Kiến trúc - Xây dựng, Nông nghiệp sạch, Khai khoáng, Quản lý doanh nghiệp, Quản trị rủi ro.`;
    }

    return `💼 **Phân Tích Ngành Nghề Phù Hợp Theo Ngũ Hành Mệnh Cho ${personContext.full_name} (${personContext.nap_am} - Hành ${element})**:

1. **Ngành Nghề Vượng Vận Khí Nhất Với Bạn**:
   ${industries}

2. **Bí Quyết Phát Triển Tốt Nhất**:
   - Bản mệnh **${personContext.nap_am}** mang nguồn năng lượng kiên định và tỉ mỉ. Khi làm đúng lĩnh vực sở trường, bạn dễ được cấp trên tin tưởng và cống hiến lâu dài.`;
};

/**
 * 8. Workplace Relationship & Resolution (Hóa Giải Thị Phi Công Sở)
 */
const evaluateWorkplaceResolution = (personContext) => {
    return `🧘 **Tư Vấn Hóa Giải Thị Phi & Tạo Uy Tín Nơi Công Sở Cho ${personContext.full_name}**:

1. **Góc Nhìn Phong Thủy & Tử Vi**:
   - Năm Bính Ngọ, Lưu Thái Tuế tọa tại **${personContext.luu_thai_tue || 'Ngọ'}**. Thị phi chốn công sở thường phát sinh từ sự đố kỵ hoặc hiểu lầm nhỏ trong giao tiếp.
   - Để triệt tiêu năng lượng tiêu cực, hãy giữ góc làm việc ngăn nắp, đặt một **chậu cây xanh thuộc hành Mộc/Thổ** hoặc **quả cầu thạch anh** ở bên góc trái bàn làm việc.

2. **Cách Ứng Xử Trí Tuệ**:
   - Lắng nghe nhiều hơn tranh luận, tập trung vào hiệu suất công việc thực tế thay vì cuốn vào các cuộc trò chuyện phiếm.
   - Dùng thái độ ôn hòa, chân thành và tôn trọng đồng nghiệp để chuyển hóa đối thủ thành Quý Nhân.`;
};

/**
 * 9. Daily Auspicious Day Evaluation (Đánh giá Ngày Tốt/Xấu Hôm Nay)
 */
const evaluatePersonalizedDayScore = (personContext) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    const lunarToday = solarlunar.solar2lunar(year, month, day);
    const canChiDayStr = toVietnameseCanChi(lunarToday.gzDay) || lunarToday.gzDay;

    let evalResult = { score: 85, rating_label: 'Ngày Cát Tường - Rất Tốt', reasons: [], personalized_hours: [] };
    try {
        evalResult = auspiciousService.evaluatePersonalizedDay(year, month, day, 'khai_truong', {
            can_chi: personContext.can_chi,
            nap_am: personContext.nap_am,
            cung_phi: personContext.cung_phi
        });
    } catch (e) {}

    return `📅 **Đánh Giá Ngày Hôm Nay Cho Tuổi ${personContext.full_name} (${personContext.can_chi})**:

- **Thời gian**: Hôm nay ngày **${day}/${month}/${year}** Dương lịch (Nhằm **${lunarToday.lDay}/${lunarToday.lMonth} Âm lịch - Ngày ${canChiDayStr}**).
- **Đánh Giá Chi Tiết**: **${evalResult.score || 85}/100 ĐIỂM** — **${evalResult.rating_label || 'Ngày Cát Tường - Rất Tốt'}**.

1. **Phân Tích Xung Hợp Với Bản Mệnh (${personContext.nap_am})**:
${evalResult.reasons && evalResult.reasons.length > 0 ? evalResult.reasons.map((r) => `   - ${r}`).join('\n') : `   - Ngày ${canChiDayStr} có nguồn năng lượng tương sinh tốt cho Mệnh ${personContext.nap_am} của bạn.\n   - Không phạm ngày xung kỵ trực tiếp với Địa Chi tuổi.`}

2. **Giờ Hoàng Đạo Tốt Nhất Trong Ngày**:
   - ${evalResult.personalized_hours && evalResult.personalized_hours.length > 0 ? evalResult.personalized_hours.slice(0, 5).join(', ') : 'Giờ Thìn (07h-09h), Giờ Tỵ (09h-11h), Giờ Thân (15h-17h), Giờ Dậu (17h-19h)'}.

*(Lời khuyên: ${evalResult.score >= 70 ? 'Hôm nay là ngày Cát Tường đẹp, bạn hoàn toàn có thể tự tin thực hiện các công việc quan trọng như đàm phán, mua bán, mở mang công việc!' : 'Hôm nay vận khí bình hòa, nên giữ thái độ hòa nhã, cẩn trọng khi đưa ra các quyết định lớn.'})*`;
};

/**
 * 10. Physiognomy Engine (Tướng Số & Nốt Ruồi)
 */
const evaluatePhysiognomy = (query, personContext) => {
    const qLower = (query || '').toLowerCase();

    let topicText = '';
    if (qLower.includes('cằm')) {
        topicText = coreKnowledge.tuong_so_topics.not_ruoi.cam;
    } else if (qLower.includes('trán')) {
        topicText = coreKnowledge.tuong_so_topics.not_ruoi.tran;
    } else if (qLower.includes('mũi')) {
        topicText = coreKnowledge.tuong_so_topics.not_ruoi.mui;
    } else if (qLower.includes('mắt')) {
        topicText = coreKnowledge.tuong_so_topics.not_ruoi.mat;
    } else {
        topicText = 'Nhân tướng học coi trọng thần khí, sự cân đối ngũ quan (Trán, Mắt, Mũi, Miệng, Tai) và tinh thần nhân ái.';
    }

    return `👁️ **Phân Tích Nhân Tướng Học & Diện Tướng Cho ${personContext.full_name}**:

${topicText}

---
1. **Quan Điểm Cổ Nhân**: "Tướng do tâm sinh, cảnh do tâm chuyển". Tướng mạo có thể thay đổi tích cực khi tâm trí ôn hòa, hướng thiện.
2. **Ứng Dụng Bản Mệnh (${personContext.nap_am})**: Giữ thần thái tự tin, nụ cười hòa nhã sẽ giúp kích hoạt vận Quý Nhân trợ giúp tốt nhất.`;
};

/**
 * 11. Tarot & Divination Engine
 */
const evaluateTarotDivination = (query, personContext) => {
    const qLower = (query || '').toLowerCase();
    let cardInfo = coreKnowledge.tarot_and_divination.tarot_major["The Sun"];

    if (qLower.includes('moon') || qLower.includes('mặt trăng')) {
        cardInfo = coreKnowledge.tarot_and_divination.tarot_major["The Moon"];
    } else if (qLower.includes('star') || qLower.includes('ngôi sao')) {
        cardInfo = coreKnowledge.tarot_and_divination.tarot_major["The Star"];
    } else if (qLower.includes('lovers') || qLower.includes('tình nhân')) {
        cardInfo = coreKnowledge.tarot_and_divination.tarot_major["The Lovers"];
    }

    return `🔮 **Luận Giải Quẻ Bài & Tri Thức Bói Toán Cho ${personContext.full_name}**:

- **Thông Điệp**: ${cardInfo}
- **Năng Lượng Kết Hợp**: Bản mệnh **${personContext.nap_am}** của bạn mang lại sự kiên định, giúp chuyển hóa năng lượng bài thành cơ hội thực tế trong cuộc sống.`;
};

/**
 * Main Autonomous Reasoning Synthesizer (Model Dedicated AI Engine)
 */
const generateIntentResponse = (message, history, personContext) => {
    const msgLower = (message || '').toLowerCase();

    // 1. SPECIFIC INTENT: Feng Shui Desk & Direction (Must check BEFORE generic Wealth!)
    if (msgLower.includes('bàn làm việc') || msgLower.includes('hướng bàn') || msgLower.includes('hướng nhà') || msgLower.includes('hướng giường') || msgLower.includes('phòng ngủ') || (msgLower.includes('hướng') && msgLower.includes('cung mệnh'))) {
        return {
            reply: evaluateFengShuiDirections(personContext),
            suggested_questions: [
                'Tháng mấy Âm lịch năm nay tôi có lộc tiền bạc lớn nhất?',
                'Hợp tác làm ăn với tuổi nào mang lại may mắn cho tôi?',
                'Hôm nay có phải là ngày tốt cho tuổi của tôi không?'
            ]
        };
    }

    // 2. SPECIFIC INTENT: Business Partner Compatibility (Hợp tác làm ăn)
    if (msgLower.includes('hợp tác') || msgLower.includes('làm ăn') || msgLower.includes('đối tác')) {
        return {
            reply: evaluateBusinessPartner(personContext),
            suggested_questions: [
                'Tháng mấy Âm lịch năm nay tôi có lộc tiền bạc lớn nhất?',
                'Cách chọn hướng bàn làm việc tụ tài lộc theo Cung Mệnh?',
                'Vận trình tài lộc và sự nghiệp năm nay của tôi thế nào?'
            ]
        };
    }

    // 3. SPECIFIC INTENT: Element Industry Compatibility (Ngành nghề hợp ngũ hành)
    if (msgLower.includes('ngành nghề') || (msgLower.includes('ngành') && msgLower.includes('hợp'))) {
        return {
            reply: evaluateIndustryCompatibility(personContext),
            suggested_questions: [
                'Nên chọn ngày nào trong tháng để nộp hồ sơ / mở cửa hàng?',
                'Cách ứng xử hóa giải thị phi chốn công sở năm nay?',
                'Thời điểm nào thích hợp để tôi nhảy việc / khởi nghiệp?'
            ]
        };
    }

    // 4. SPECIFIC INTENT: Workplace Conflict Resolution (Thị phi công sở)
    if (msgLower.includes('thị phi') || msgLower.includes('công sở')) {
        return {
            reply: evaluateWorkplaceResolution(personContext),
            suggested_questions: [
                'Tôi hợp với ngành nghề thuộc Ngũ Hành nào nhất?',
                'Thời điểm nào thích hợp để tôi nhảy việc / khởi nghiệp?',
                'Cách chọn hướng bàn làm việc tụ tài lộc theo Cung Mệnh?'
            ]
        };
    }

    // 5. SPECIFIC INTENT: Wedding / Proposal Dates (Ngày cưới / Dạm ngõ)
    if (msgLower.includes('cưới') || msgLower.includes('dạm ngõ') || msgLower.includes('đám cưới') || msgLower.includes('hôn lễ') || msgLower.includes('rước dâu')) {
        return {
            reply: evaluateWeddingDates(personContext),
            suggested_questions: [
                'Độ tuổi bạn đời nữ phù hợp nhất với tôi là những tuổi nào?',
                'Hôm nay có phải là ngày tốt cho tuổi của tôi không?',
                'Vận trình tài lộc và tiền bạc năm nay của tôi thế nào?'
            ]
        };
    }

    // 6. SPECIFIC INTENT: Marriage Age / Spouse Match
    if (msgLower.includes('bạn đời') || msgLower.includes('lấy vợ') || msgLower.includes('lấy chồng') || msgLower.includes('tuổi nữ') || msgLower.includes('tuổi nam') || msgLower.includes('đối phương')) {
        return {
            reply: evaluateSpouseCompatibility(personContext),
            suggested_questions: [
                'Nên chọn ngày tháng nào trong năm để tổ chức cưới hỏi / dạm ngõ?',
                'Hợp tác làm ăn với tuổi nào mang lại lộc tài chính lớn nhất?',
                'Xem vận trình tình cảm & gia đạo năm nay của tôi?'
            ]
        };
    }

    // 7. SPECIFIC INTENT: Daily Auspicious Evaluation (Hôm nay có phải là ngày tốt, giờ hoàng đạo)
    if (msgLower.includes('ngày tốt') || msgLower.includes('ngày xấu') || msgLower.includes('hôm nay') || msgLower.includes('giờ hoàng đạo') || msgLower.includes('nộp hồ sơ') || msgLower.includes('mở cửa hàng') || msgLower.includes('ngày đại cát')) {
        return {
            reply: evaluatePersonalizedDayScore(personContext),
            suggested_questions: [
                'Giờ Hoàng Đạo tốt nhất trong ngày hôm nay là mấy giờ?',
                'Xem danh sách các ngày Đại Cát trong tháng này cho tuổi của tôi?',
                'Vận trình tài lộc và công danh năm nay của tôi thế nào?'
            ]
        };
    }

    // 8. SPECIFIC INTENT: Wealth / Financial / Investment
    if (msgLower.includes('tài lộc') || msgLower.includes('tiền') || msgLower.includes('đầu tư') || msgLower.includes('kinh doanh') || msgLower.includes('tài chính') || msgLower.includes('tháng mấy')) {
        return {
            reply: evaluateWealthAndInvestment(personContext),
            suggested_questions: [
                'Tháng mấy Âm lịch năm nay tôi có lộc tiền bạc lớn nhất?',
                'Hợp tác làm ăn với tuổi nào mang lại may mắn cho tôi?',
                'Cách chọn hướng bàn làm việc tụ tài lộc theo Cung Mệnh?'
            ]
        };
    }

    // 9. SPECIFIC INTENT: Career / Job Shift
    if (msgLower.includes('công việc') || msgLower.includes('công danh') || msgLower.includes('nhảy việc') || msgLower.includes('khởi nghiệp') || msgLower.includes('sự nghiệp') || msgLower.includes('xin việc') || msgLower.includes('thăng tiến')) {
        return {
            reply: evaluateCareer(personContext),
            suggested_questions: [
                'Nên chọn ngày nào trong tháng để nộp hồ sơ / mở cửa hàng?',
                'Tôi hợp với ngành nghề thuộc Ngũ Hành nào nhất?',
                'Cách ứng xử hóa giải thị phi chốn công sở năm nay?'
            ]
        };
    }

    // 10. SPECIFIC INTENT: Physiognomy / Nốt Ruồi
    if (msgLower.includes('nốt ruồi') || msgLower.includes('tướng') || msgLower.includes('diện tướng') || msgLower.includes('xem tướng')) {
        return {
            reply: evaluatePhysiognomy(message, personContext),
            suggested_questions: [
                'Nốt ruồi ở trán có ý nghĩa gì đối với công danh?',
                'Cách cải thiện vận tướng và thần khí theo phong thủy?',
                'Hôm nay có phải là ngày tốt cho tuổi của tôi không?'
            ]
        };
    }

    // 11. SPECIFIC INTENT: Tarot / Divination
    if (msgLower.includes('tarot') || msgLower.includes('bốc quẻ') || msgLower.includes('quẻ') || msgLower.includes('lá bài')) {
        return {
            reply: evaluateTarotDivination(message, personContext),
            suggested_questions: [
                'Ý nghĩa lá bài The Lovers trong tình cảm?',
                'Bốc quẻ hàng ngày xem cát hung?',
                'Vận trình tài lộc và tiền bạc năm nay của tôi thế nào?'
            ]
        };
    }

    // Default Domain Answer
    return {
        reply: `Chào **${personContext.full_name}** (Tuổi **${personContext.can_chi}** - Mệnh **${personContext.nap_am}** - Cung **${personContext.cung_phi}**).

Cảm ơn câu hỏi của bạn: "${message}"

Dựa trên hệ thống trí tuệ Tử Vi & Phong Thủy Việt Nam:
1. **Về Bản Mệnh**: Năm nay **${personContext.luu_nien}**, Lưu Lộc Tồn tọa tại cung **${personContext.luu_loc_ton || 'Tỵ'}**, Lưu Thiên Mã tại cung **${personContext.luu_thien_ma || 'Thân'}**. Đây là thời điểm vượng khí cho việc mở rộng mối quan hệ, nâng cao năng lực chuyên môn và tích lũy lộc tài.
2. **Định Hướng Khai Phát**: Hãy giữ vững sự tự tin, pháthuy thế mạnh của mệnh **${personContext.element}** để gặt hái thành công tốt nhất trong mọi khía cạnh cuộc sống.`,
        suggested_questions: [
            'Độ tuổi bạn đời nữ phù hợp nhất với tôi là những tuổi nào?',
            'Nên chọn ngày tháng nào trong năm để tổ chức cưới hỏi / dạm ngõ?',
            'Vận trình tài lộc và sự nghiệp năm nay của tôi thế nào?'
        ]
    };
};

const generateDedicatedResponse = async (message, history, personContext, ragSnippet = '') => {
    const res = generateIntentResponse(message, history, personContext);
    if (ragSnippet) {
        res.reply += ragSnippet;
    }
    return res;
};

module.exports = {
    evaluateSpouseCompatibility,
    evaluateWeddingDates,
    evaluateWealthAndInvestment,
    evaluateCareer,
    evaluateFengShuiDirections,
    evaluateBusinessPartner,
    evaluateIndustryCompatibility,
    evaluateWorkplaceResolution,
    evaluatePersonalizedDayScore,
    evaluatePhysiognomy,
    evaluateTarotDivination,
    generateDedicatedResponse
};
