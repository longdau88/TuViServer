const solarlunar = require('solarlunar').default || require('solarlunar');
const { buildAstroProfile, toVietnameseCanChi } = require('./astroService');
const { getNapAmByCanChi } = require('./displayService');

// ----------------------------------------------------
// 1. DATA MAPPINGS & ASTRO RULES
// ----------------------------------------------------

const PALACE_BRANCHES = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

const ELEMENT_VIETNAMESE = {
    Kim: 'Kim', Mộc: 'Mộc', Thủy: 'Thủy', Hỏa: 'Hỏa', Thổ: 'Thổ',
};

// Element generation (Tương sinh: Source generates Target)
const ELEMENT_GENERATES = {
    Thổ: 'Kim', Kim: 'Thủy', Thủy: 'Mộc', Mộc: 'Hỏa', Hỏa: 'Thổ',
};

// Element destruction (Tương khắc: Source destroys Target)
const ELEMENT_DESTROYS = {
    Kim: 'Mộc', Mộc: 'Thổ', Thổ: 'Thủy', Thủy: 'Hỏa', Hỏa: 'Kim',
};

// Branch Relationships
const TAM_HOP_GROUPS = [
    new Set(['Thân', 'Tý', 'Thìn']),
    new Set(['Tỵ', 'Dậu', 'Sửu']),
    new Set(['Dần', 'Ngọ', 'Tuất']),
    new Set(['Hợi', 'Mão', 'Mùi']),
];

const LUC_HOP_MAP = {
    Tý: 'Sửu', Sửu: 'Tý', Dần: 'Hợi', Hợi: 'Dần', Mão: 'Tuất', Tuất: 'Mão',
    Thìn: 'Dậu', Dậu: 'Thìn', Tỵ: 'Thân', Thân: 'Tỵ', Ngọ: 'Mùi', Mùi: 'Ngọ',
};

const LUC_XUNG_MAP = {
    Tý: 'Ngọ', Ngọ: 'Tý', Sửu: 'Mùi', Mùi: 'Sửu', Dần: 'Thân', Thân: 'Dần',
    Mão: 'Dậu', Dậu: 'Mão', Thìn: 'Tuất', Tuất: 'Thìn', Tỵ: 'Hợi', Hợi: 'Tỵ',
};

const LUC_HAI_MAP = {
    Tý: 'Mùi', Mùi: 'Tý', Sửu: 'Ngọ', Ngọ: 'Sửu', Dần: 'Tỵ', Tỵ: 'Dần',
    Mão: 'Thìn', Thìn: 'Mão', Thân: 'Hợi', Hợi: 'Thân', Dậu: 'Tuất', Tuất: 'Dậu',
};

// Purpose specific Trực preferences
const PURPOSE_TRUC_PREFERENCES = {
    khai_truong: { good: ['Thành', 'Mãn', 'Khai', 'Định'], bad: ['Phá', 'Bế'] },
    cuoi_hoi: { good: ['Định', 'Thành', 'Mãn', 'Khai'], bad: ['Phá', 'Nguy'] },
    dong_tho: { good: ['Kiến', 'Định', 'Thành', 'Mãn'], bad: ['Bế', 'Nguy', 'Phá'] },
    mua_xe: { good: ['Khai', 'Thành', 'Định', 'Bình'], bad: ['Phá'] },
    xuat_hanh: { good: ['Khai', 'Thành', 'Định'], bad: ['Phá'] },
    giao_dich: { good: ['Thành', 'Thâu', 'Mãn', 'Khai'], bad: ['Phá', 'Bế'] },
};

const PURPOSE_NAMES = {
    khai_truong: 'Khai Trương / Mở Hàng',
    cuoi_hoi: 'Cưới Hỏi / Dạm Ngõ',
    dong_tho: 'Động Thổ / Làm Nhà',
    mua_xe: 'Mua Xe / Nhận Xe',
    xuat_hanh: 'Xuất Hành / Đi Xa',
    giao_dich: 'Ký Hợp Đồng / Giao Dịch',
};

// Auspicious hours mapping per Branch
const HOANG_DAO_HOURS = {
    Tý: ['Tý (23h-1h)', 'Sửu (1h-3h)', 'Mão (5h-7h)', 'Ngọ (11h-13h)', 'Thân (15h-17h)', 'Dậu (17h-19h)'],
    Sửu: ['Dần (3h-5h)', 'Mão (5h-7h)', 'Tỵ (9h-11h)', 'Thân (15h-17h)', 'Tuất (19h-21h)', 'Hợi (21h-23h)'],
    Dần: ['Tý (23h-1h)', 'Sửu (1h-3h)', 'Thìn (7h-9h)', 'Tỵ (9h-11h)', 'Mùi (13h-15h)', 'Tuất (19h-21h)'],
    Mão: ['Tý (23h-1h)', 'Dần (3h-5h)', 'Mão (5h-7h)', 'Ngọ (11h-13h)', 'Mùi (13h-15h)', 'Dậu (17h-19h)'],
    Thìn: ['Dần (3h-5h)', 'Thìn (7h-9h)', 'Tỵ (9h-11h)', 'Thân (15h-17h)', 'Dậu (17h-19h)', 'Hợi (21h-23h)'],
    Tỵ: ['Sửu (1h-3h)', 'Thìn (7h-9h)', 'Ngọ (11h-13h)', 'Mùi (13h-15h)', 'Tuất (19h-21h)', 'Hợi (21h-23h)'],
    Ngọ: ['Tý (23h-1h)', 'Sửu (1h-3h)', 'Mão (5h-7h)', 'Ngọ (11h-13h)', 'Thân (15h-17h)', 'Dậu (17h-19h)'],
    Mùi: ['Dần (3h-5h)', 'Mão (5h-7h)', 'Tỵ (9h-11h)', 'Thân (15h-17h)', 'Tuất (19h-21h)', 'Hợi (21h-23h)'],
    Thân: ['Tý (23h-1h)', 'Sửu (1h-3h)', 'Thìn (7h-9h)', 'Tỵ (9h-11h)', 'Mùi (13h-15h)', 'Tuất (19h-21h)'],
    Dậu: ['Tý (23h-1h)', 'Dần (3h-5h)', 'Mão (5h-7h)', 'Ngọ (11h-13h)', 'Mùi (13h-15h)', 'Dậu (17h-19h)'],
    Tuất: ['Dần (3h-5h)', 'Thìn (7h-9h)', 'Tỵ (9h-11h)', 'Thân (15h-17h)', 'Dậu (17h-19h)', 'Hợi (21h-23h)'],
    Hợi: ['Sửu (1h-3h)', 'Thìn (7h-9h)', 'Ngọ (11h-13h)', 'Mùi (13h-15h)', 'Tuất (19h-21h)', 'Hợi (21h-23h)'],
};

// ----------------------------------------------------
// 2. CORE EVALUATION ENGINE
// ----------------------------------------------------

/**
 * Evaluate single day auspiciousness for a specific user and purpose
 */
const evaluatePersonalizedDay = (year, month, day, purpose, userProfile) => {
    const sl = solarlunar.solar2lunar(year, month, day);
    if (!sl || sl === -1) return null;

    const canChiYear = toVietnameseCanChi(sl.gzYear) || sl.gzYear;
    const canChiMonth = toVietnameseCanChi(sl.gzMonth) || sl.gzMonth;
    const canChiDay = toVietnameseCanChi(sl.gzDay) || sl.gzDay;

    const dayBranch = canChiDay.split(' ')[1] || 'Tý';
    const dayNapAmObj = getNapAmByCanChi(canChiDay) || {};
    const dayElement = dayNapAmObj.element || 'Thổ';

    // User Info
    const userNapAmObj = userProfile.nap_am || {};
    const userElement = userNapAmObj.element || 'Kim';
    const userCanChi = userProfile.can_chi || 'Canh Thìn';
    const userBranch = userCanChi.split(' ').pop() || 'Thìn';

    let score = 50; // Base score
    const scoreReasons = [];
    const warningReasons = [];

    // A. Element Relationship (Ngũ Hành Nạp Âm)
    if (ELEMENT_GENERATES[dayElement] === userElement) {
        score += 25;
        scoreReasons.push(`Ngũ hành ngày (${dayElement}) Tương Sinh với Mệnh của bạn (${userElement}) (+25đ).`);
    } else if (dayElement === userElement) {
        score += 20;
        scoreReasons.push(`Ngũ hành ngày (${dayElement}) Tương Hòa với Mệnh của bạn (${userElement}) (+20đ).`);
    } else if (ELEMENT_DESTROYS[dayElement] === userElement) {
        score -= 20;
        warningReasons.push(`Ngũ hành ngày (${dayElement}) Tương Khắc với Mệnh của bạn (${userElement}) (-20đ).`);
    }

    // B. Branch Relationship (Địa Chi Tuổi vs Địa Chi Ngày)
    const isTamHop = TAM_HOP_GROUPS.some((group) => group.has(userBranch) && group.has(dayBranch));
    const isLucHop = LUC_HOP_MAP[userBranch] === dayBranch;
    const isLucXung = LUC_XUNG_MAP[userBranch] === dayBranch;
    const isLucHai = LUC_HAI_MAP[userBranch] === dayBranch;

    if (isTamHop) {
        score += 30;
        scoreReasons.push(`Địa chi ngày (${dayBranch}) thuộc bộ Tam Hợp với tuổi (${userBranch}) (+30đ). Rất Cát Tường!`);
    } else if (isLucHop) {
        score += 25;
        scoreReasons.push(`Địa chi ngày (${dayBranch}) Lục Hợp với tuổi (${userBranch}) (+25đ). Quý nhân phù trợ!`);
    } else if (isLucXung) {
        score -= 40;
        warningReasons.push(`Địa chi ngày (${dayBranch}) LỤC XUNG với tuổi của bạn (${userBranch}) (-40đ). Rất Kỵ!`);
    } else if (isLucHai) {
        score -= 30;
        warningReasons.push(`Địa chi ngày (${dayBranch}) Lục Hại với tuổi của bạn (${userBranch}) (-30đ). Nơi thương tổn!`);
    }

    // C. Trực & Purpose suitability
    const trucs = ['Kiến', 'Trừ', 'Mãn', 'Bình', 'Định', 'Chấp', 'Phá', 'Nguy', 'Thành', 'Thâu', 'Khai', 'Bế'];
    const trucDay = trucs[(sl.cYear + sl.cMonth + sl.cDay) % 12];
    const purposePref = PURPOSE_TRUC_PREFERENCES[purpose] || PURPOSE_TRUC_PREFERENCES.khai_truong;

    if (purposePref.good.includes(trucDay)) {
        score += 15;
        scoreReasons.push(`Trực ngày (${trucDay}) rất tốt cho mục đích ${PURPOSE_NAMES[purpose] || purpose} (+15đ).`);
    } else if (purposePref.bad.includes(trucDay)) {
        score -= 20;
        warningReasons.push(`Trực ngày (${trucDay}) kỵ với mục đích ${PURPOSE_NAMES[purpose] || purpose} (-20đ).`);
    }

    // Final score capping
    const finalScore = Math.min(100, Math.max(10, score));

    // Rating Label
    let ratingLabel = 'Ngày Bình Hòa';
    let ratingBadge = 'badge-neutral';
    let isAuspicious = false;

    if (finalScore >= 80) {
        ratingLabel = 'Ngày Cát Tường (Ngày Tốt)';
        ratingBadge = 'badge-good';
        isAuspicious = true;
    } else if (finalScore >= 50) {
        ratingLabel = 'Ngày Bình Hòa';
        ratingBadge = 'badge-neutral';
        isAuspicious = false;
    } else {
        ratingLabel = 'Ngày Xung Kỵ (Tránh Dùng)';
        ratingBadge = 'badge-bad';
        isAuspicious = false;
    }

    // Filter Auspicious Hours (exclude hours that clash with user's birth branch)
    const rawHours = HOANG_DAO_HOURS[dayBranch] || HOANG_DAO_HOURS.Tý;
    const personalizedHours = rawHours.filter((h) => {
        const hourBranch = h.split(' ')[0];
        return LUC_XUNG_MAP[userBranch] !== hourBranch;
    });

    return {
        date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        solar: { year: sl.cYear, month: sl.cMonth, day: sl.cDay },
        lunar: { year: sl.lYear, month: sl.lMonth, day: sl.lDay, isLeap: sl.isLeap },
        can_chi: { year: canChiYear, month: canChiMonth, day: canChiDay },
        napAm: dayNapAmObj.name || 'Không rõ',
        element: dayElement,
        truc: trucDay,
        score: finalScore,
        rating_label: ratingLabel,
        rating_badge: ratingBadge,
        is_auspicious: isAuspicious,
        reasons: scoreReasons,
        warnings: warningReasons,
        personalized_hours: personalizedHours,
    };
};

/**
 * Find all Auspicious Days in a given Solar Month for a specific user and purpose
 */
const findPersonalizedAuspiciousDays = (year, month, purpose, personInput) => {
    // 1. Build Astro profile for user
    const userProfile = buildAstroProfile(
        personInput.full_name || 'Người dùng',
        personInput.birthday,
        personInput.birth_time,
        personInput.gender
    );

    const daysInMonth = new Date(year, month, 0).getDate();
    const daysResults = [];

    for (let d = 1; d <= daysInMonth; d++) {
        const result = evaluatePersonalizedDay(year, month, d, purpose, userProfile);
        if (result) daysResults.push(result);
    }

    // Sort days by score descending for top recommendations
    const recommendedDays = [...daysResults]
        .filter((d) => d.is_auspicious)
        .sort((a, b) => b.score - a.score);

    return {
        user: {
            full_name: personInput.full_name || 'Người dùng',
            can_chi: userProfile.can_chi,
            nap_am: userProfile.nap_am,
            cung_phi: userProfile.cung_phi,
        },
        year,
        month,
        purpose: purpose || 'khai_truong',
        purpose_name: PURPOSE_NAMES[purpose] || 'Khai Trương / Mở Hàng',
        total_days: daysInMonth,
        recommended_days_count: recommendedDays.length,
        recommended_top_days: recommendedDays.slice(0, 5),
        days: daysResults,
    };
};

module.exports = {
    evaluatePersonalizedDay,
    findPersonalizedAuspiciousDays,
};
