const pool = require('../config/db');
const solarlunar = require('solarlunar').default || require('solarlunar');
const { generateLaSo } = require('tuvi-neo');

const vietStemMap = {
    甲: 'Giáp',
    乙: 'Ất',
    丙: 'Bính',
    丁: 'Đinh',
    戊: 'Mậu',
    己: 'Kỷ',
    庚: 'Canh',
    辛: 'Tân',
    壬: 'Nhâm',
    癸: 'Quý',
};

const vietBranchMap = {
    子: 'Tý',
    丑: 'Sửu',
    寅: 'Dần',
    卯: 'Mão',
    辰: 'Thìn',
    巳: 'Tỵ',
    午: 'Ngọ',
    未: 'Mùi',
    申: 'Thân',
    酉: 'Dậu',
    戌: 'Tuất',
    亥: 'Hợi',
};

const elementGroups = {
    kim: new Set(['B', 'C', 'D', 'G', 'K', 'N', 'Q', 'S', 'X', 'Z']),
    moc: new Set(['M', 'L']),
    thuy: new Set(['H', 'P', 'V', 'Y', 'U', 'W']),
    hoa: new Set(['T', 'R', 'J', 'F']),
    tho: new Set(['A', 'E', 'I', 'O']),
};

const parseDateInput = (date) => {
    if (!date) return null;

    if (typeof date === 'string') {
        const trimmed = date.trim();
        const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
        if (dateOnlyMatch) {
            const year = Number(dateOnlyMatch[1]);
            const month = Number(dateOnlyMatch[2]);
            const day = Number(dateOnlyMatch[3]);
            return { date: new Date(year, month - 1, day), hasTime: false };
        }

        const parsed = new Date(trimmed);
        if (Number.isNaN(parsed.getTime())) return null;
        return { date: parsed, hasTime: /\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(trimmed) };
    }

    if (date instanceof Date) {
        if (Number.isNaN(date.getTime())) return null;
        return { date, hasTime: true };
    }

    return null;
};

const formatDateToYMD = (date) => {
    const parsed = parseDateInput(date);
    if (!parsed) return null;

    const { date: parsedDate } = parsed;
    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const parseBirthdayDate = (birthday) => {
    return parseDateInput(birthday);
};

const normalizeBirthTime = (birthTime) => {
    if (birthTime === null || birthTime === undefined) return null;

    const trimmed = String(birthTime).trim();
    if (!trimmed) return null;

    const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
    if (!match) return null;

    const hour = Number(match[1]);
    const minute = Number(match[2]);
    const second = Number(match[3] || '0');

    if (
        Number.isNaN(hour)
        || Number.isNaN(minute)
        || Number.isNaN(second)
        || hour < 0
        || hour > 23
        || minute < 0
        || minute > 59
        || second < 0
        || second > 59
    ) {
        return null;
    }

    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const normalizeBirthTimeForDb = (birthTime) => {
    const normalized = normalizeBirthTime(birthTime);
    return normalized ? `${normalized}:00` : null;
};

const resolveBirthDateTime = (birthday, birthTime) => {
    if (birthday instanceof Date) {
        if (Number.isNaN(birthday.getTime())) return null;

        return {
            date: birthday,
            normalizedBirthday: formatDateToYMD(birthday),
            normalizedBirthTime: `${String(birthday.getHours()).padStart(2, '0')}:${String(birthday.getMinutes()).padStart(2, '0')}`,
            year: birthday.getFullYear(),
            month: birthday.getMonth() + 1,
            day: birthday.getDate(),
            hour: birthday.getHours(),
            minute: birthday.getMinutes(),
            hasTime: true,
        };
    }

    const normalizedBirthday = normalizeBirthday(birthday);
    if (!normalizedBirthday) return null;

    const normalizedBirthTime = normalizeBirthTime(birthTime);
    const [year, month, day] = normalizedBirthday.split('-').map(Number);
    const [hour, minute] = normalizedBirthTime
        ? normalizedBirthTime.split(':').map(Number)
        : [0, 0];
    const date = new Date(year, month - 1, day, hour, minute, 0, 0);

    if (Number.isNaN(date.getTime())) return null;

    return {
        date,
        normalizedBirthday,
        normalizedBirthTime,
        year,
        month,
        day,
        hour,
        minute,
        hasTime: Boolean(normalizedBirthTime),
    };
};

const normalizeBirthday = (birthday) => {
    if (!birthday) return null;
    if (typeof birthday === 'string') {
        const match = birthday.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            return `${match[1]}-${match[2]}-${match[3]}`;
        }
    }
    return formatDateToYMD(birthday);
};

const removeVietnameseAccents = (str) => {
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
};

const reduceNumber = (num) => {
    let value = typeof num === 'string' ? num.replace(/\D/g, '').split('').reduce((sum, digit) => sum + Number(digit), 0) : num;
    while (value > 9 && value !== 11 && value !== 22) {
        value = String(value).split('').reduce((sum, digit) => sum + Number(digit), 0);
    }
    return value;
};

const letterValue = (char) => {
    if (!char) return 0;
    const code = char.toUpperCase().charCodeAt(0);
    if (code < 65 || code > 90) return 0;
    return ((code - 65) % 9) + 1;
};

const getHourBranch = (hour) => {
    if (hour === null || hour === undefined) return null;
    const ranges = [
        { min: 23, max: 24, branch: 'Tý' },
        { min: 0, max: 1, branch: 'Tý' },
        { min: 1, max: 3, branch: 'Sửu' },
        { min: 3, max: 5, branch: 'Dần' },
        { min: 5, max: 7, branch: 'Mão' },
        { min: 7, max: 9, branch: 'Thìn' },
        { min: 9, max: 11, branch: 'Tỵ' },
        { min: 11, max: 13, branch: 'Ngọ' },
        { min: 13, max: 15, branch: 'Mùi' },
        { min: 15, max: 17, branch: 'Thân' },
        { min: 17, max: 19, branch: 'Dậu' },
        { min: 19, max: 21, branch: 'Tuất' },
        { min: 21, max: 23, branch: 'Hợi' },
    ];
    const item = ranges.find((r) => hour >= r.min && hour < r.max);
    return item ? item.branch : null;
};

const toVietnameseCanChi = (gz) => {
    if (!gz || typeof gz !== 'string' || gz.length < 2) return null;
    const stem = vietStemMap[gz[0]] || gz[0];
    const branch = vietBranchMap[gz[1]] || gz[1];
    return `${stem} ${branch}`;
};

const buildCanChi = (birthday, birthTime) => {
    const parsed = resolveBirthDateTime(birthday, birthTime);
    if (!parsed) return null;

    const {
        date, hasTime, hour: inputHour,
    } = parsed;
    const lunar = solarlunar.solar2lunar(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const hour = hasTime ? getHourBranch(inputHour) : null;

    return {
        year: toVietnameseCanChi(lunar.gzYear),
        month: toVietnameseCanChi(lunar.gzMonth),
        day: toVietnameseCanChi(lunar.gzDay),
        hour,
        raw: {
            year: lunar.gzYear,
            month: lunar.gzMonth,
            day: lunar.gzDay,
            hour,
        },
    };
};

const buildCanChiString = (canChi) => {
    if (!canChi) return null;
    const parts = [];
    if (canChi.year) parts.push(`Năm: ${canChi.year}`);
    if (canChi.month) parts.push(`Tháng: ${canChi.month}`);
    if (canChi.day) parts.push(`Ngày: ${canChi.day}`);
    if (canChi.hour) parts.push(`Giờ: ${canChi.hour}`);
    return parts.join(' | ');
};

const calculateSoulNumber = (fullName) => {
    if (!fullName) return null;
    const cleaned = removeVietnameseAccents(fullName).replace(/[^A-Za-z]/g, '').toUpperCase();
    const vowels = new Set(['A', 'E', 'I', 'O', 'U', 'Y']);
    return reduceNumber(cleaned.split('').reduce((sum, char) => (vowels.has(char) ? sum + letterValue(char) : sum), 0));
};

const getCungPhi = (year, gender) => {
    if (!year) return null;
    const isFemale = gender && /^(female|f|nữ|nu)$/i.test(gender.trim());
    const reduced = reduceNumber(String(year));
    let value = isFemale ? reduced + 4 : 11 - reduced;
    while (value > 8) value -= 8;
    const mapping = {
        1: 'Khảm',
        2: 'Ly',
        3: 'Cấn',
        4: 'Đoài',
        5: isFemale ? 'Cấn' : 'Càn',
        6: 'Càn',
        7: 'Tốn',
        8: 'Chấn',
    };
    return mapping[value] || 'Khảm';
};

const getDirectionsForCungPhi = (cungPhi) => {
    const mapping = {
        Khảm: {
            good: ['Sinh Khí', 'Thiên Y', 'Diên Niên', 'Phục Vị'],
            bad: ['Tuyệt Mệnh', 'Ngũ Quỷ', 'Lục Sát', 'Họa Hại'],
        },
        Ly: {
            good: ['Sinh Khí', 'Thiên Y', 'Diên Niên', 'Phục Vị'],
            bad: ['Tuyệt Mệnh', 'Ngũ Quỷ', 'Lục Sát', 'Họa Hại'],
        },
        Cấn: {
            good: ['Sinh Khí', 'Thiên Y', 'Diên Niên', 'Phục Vị'],
            bad: ['Tuyệt Mệnh', 'Ngũ Quỷ', 'Lục Sát', 'Họa Hại'],
        },
        Đoài: {
            good: ['Sinh Khí', 'Thiên Y', 'Diên Niên', 'Phục Vị'],
            bad: ['Tuyệt Mệnh', 'Ngũ Quỷ', 'Lục Sát', 'Họa Hại'],
        },
        Càn: {
            good: ['Sinh Khí', 'Thiên Y', 'Diên Niên', 'Phục Vị'],
            bad: ['Tuyệt Mệnh', 'Ngũ Quỷ', 'Lục Sát', 'Họa Hại'],
        },
        Tốn: {
            good: ['Sinh Khí', 'Thiên Y', 'Diên Niên', 'Phục Vị'],
            bad: ['Tuyệt Mệnh', 'Ngũ Quỷ', 'Lục Sát', 'Họa Hại'],
        },
        Chấn: {
            good: ['Sinh Khí', 'Thiên Y', 'Diên Niên', 'Phục Vị'],
            bad: ['Tuyệt Mệnh', 'Ngũ Quỷ', 'Lục Sát', 'Họa Hại'],
        },
        Khôn: {
            good: ['Sinh Khí', 'Thiên Y', 'Diên Niên', 'Phục Vị'],
            bad: ['Tuyệt Mệnh', 'Ngũ Quỷ', 'Lục Sát', 'Họa Hại'],
        },
    };
    return mapping[cungPhi] || mapping.Khảm;
};

const getColorAndItems = (cungPhi) => {
    const mapping = {
        Khảm: { colors: ['Xanh dương', 'Đen', 'Trắng'], items: ['Đá Aquamarine', 'Đá Sapphire', 'Vật phẩm Thủy'] },
        Ly: { colors: ['Đỏ', 'Cam', 'Tím'], items: ['Đá Ruby', 'Đá Garnet', 'Vật phẩm Hỏa'] },
        Cấn: { colors: ['Vàng', 'Nâu', 'Be'], items: ['Đá Citrine', 'Đá Topaz', 'Vật phẩm Thổ'] },
        Đoài: { colors: ['Trắng', 'Bạc', 'Xám'], items: ['Đá Moonstone', 'Đá Selenite', 'Vật phẩm Kim'] },
        Càn: { colors: ['Trắng', 'Bạc', 'Vàng nhạt'], items: ['Đá Diamond', 'Đá Quartz', 'Vật phẩm Kim'] },
        Tốn: { colors: ['Xanh lá', 'Nâu', 'Đen'], items: ['Đá Emerald', 'Đá Jade', 'Vật phẩm Mộc'] },
        Chấn: { colors: ['Xanh lá', 'Xanh ngọc', 'Nâu'], items: ['Đá Peridot', 'Đá Jade', 'Vật phẩm Mộc'] },
        Khôn: { colors: ['Vàng', 'Nâu', 'Be'], items: ['Đá Amber', 'Đá Tiger Eye', 'Vật phẩm Thổ'] },
    };
    return mapping[cungPhi] || mapping.Khảm;
};

const calculateNameElement = (fullName) => {
    if (!fullName) return null;
    const letters = removeVietnameseAccents(fullName).replace(/[^A-Za-z]/g, '').toUpperCase().split('');
    const counts = {
        kim: 0,
        moc: 0,
        thuy: 0,
        hoa: 0,
        tho: 0,
    };
    letters.forEach((char) => {
        if (elementGroups.kim.has(char)) counts.kim += 1;
        if (elementGroups.moc.has(char)) counts.moc += 1;
        if (elementGroups.thuy.has(char)) counts.thuy += 1;
        if (elementGroups.hoa.has(char)) counts.hoa += 1;
        if (elementGroups.tho.has(char)) counts.tho += 1;
    });
    const dominant = Object.keys(counts).reduce((best, key) => (counts[key] > counts[best] ? key : best), 'kim');
    const missing = Object.keys(counts).filter((key) => counts[key] === 0);
    return {
        counts,
        dominant,
        missing,
    };
};

const stemElementMap = {
    甲: 'Mộc',
    乙: 'Mộc',
    丙: 'Hỏa',
    丁: 'Hỏa',
    戊: 'Thổ',
    己: 'Thổ',
    庚: 'Kim',
    辛: 'Kim',
    壬: 'Thủy',
    癸: 'Thủy',
};

const branchElementMap = {
    子: 'Thủy',
    丑: 'Thổ',
    寅: 'Mộc',
    卯: 'Mộc',
    辰: 'Thổ',
    巳: 'Hỏa',
    午: 'Hỏa',
    未: 'Thổ',
    申: 'Kim',
    酉: 'Kim',
    戌: 'Thổ',
    亥: 'Thủy',
};

const branchNameElementMap = {
    Tý: 'Thủy',
    Sửu: 'Thổ',
    Dần: 'Mộc',
    Mão: 'Mộc',
    Thìn: 'Thổ',
    Tỵ: 'Hỏa',
    Ngọ: 'Hỏa',
    Mùi: 'Thổ',
    Thân: 'Kim',
    Dậu: 'Kim',
    Tuất: 'Thổ',
    Hợi: 'Thủy',
};

const getElementFromCanChi = (gz) => {
    if (!gz || typeof gz !== 'string') return null;
    if (gz.length >= 2) {
        return stemElementMap[gz[0]] || branchElementMap[gz[1]] || null;
    }
    return branchNameElementMap[gz] || null;
};

const getTuTruInfo = (canChi) => {
    if (!canChi || !canChi.raw) return null;
    const parts = ['year', 'month', 'day'];
    const values = parts.map((key) => canChi.raw[key]).filter(Boolean);
    if (canChi.raw.hour) values.push(canChi.raw.hour);

    const elements = values.reduce((acc, gz) => {
        const element = getElementFromCanChi(gz);
        if (element) acc.push(element);
        return acc;
    }, []);

    const counts = { Kim: 0, Mộc: 0, Thủy: 0, Hỏa: 0, Thổ: 0 };
    elements.forEach((element) => { if (counts[element] !== undefined) counts[element] += 1; });

    const sorted = Object.entries(counts).sort((a, b) => a[1] - b[1]);
    const missing = sorted.filter(([, count]) => count === 0).map(([element]) => element);
    const minCount = sorted[0][1];
    const maxCount = sorted[sorted.length - 1][1];
    const neutralElements = sorted.filter(([, count]) => count === minCount).map(([element]) => element);
    const strongestElements = sorted.filter(([, count]) => count === maxCount).map(([element]) => element);

    const dungY = missing.length > 0 ? missing[0] : neutralElements[0];
    const kyThan = strongestElements[0];

    return {
        counts,
        missing,
        dung_y: dungY,
        ky_than: kyThan,
        summary: `Tứ trụ cho thấy cân bằng ngũ hành: Kim ${counts.Kim}, Mộc ${counts.Mộc}, Thủy ${counts.Thủy}, Hỏa ${counts.Hỏa}, Thổ ${counts.Thổ}. Dụng thần ưu tiên: ${dungY}. Kỵ thần: ${kyThan}.`,
    };
};

const rotateArray = (arr, offset) => {
    const normalized = ((offset % arr.length) + arr.length) % arr.length;
    return arr.slice(normalized).concat(arr.slice(0, normalized));
};

const palaceElementMap = {
    2: 'Thủy',
    3: 'Mộc',
    4: 'Kim',
    5: 'Thổ',
    6: 'Hỏa',
};

const normalizeGenderForTuVi = (gender) => (/^(female|f|nữ|nu)$/i.test(String(gender || '').trim()) ? 'female' : 'male');

const slugifyVietnamese = (value) => removeVietnameseAccents(String(value || ''))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const mapTuViStar = (star, loai) => ({
    ten: star?.Name || '',
    trang_thai: star?.Status || '',
    loai,
});

const buildTuViChart = (fullName, birthday, birthTime, gender) => {
    const birth = resolveBirthDateTime(birthday, birthTime);
    if (!birth) return null;

    const chart = generateLaSo({
        name: fullName || 'Người dùng',
        gender: normalizeGenderForTuVi(gender),
        birth: {
            isLunar: false,
            year: birth.year,
            month: birth.month,
            day: birth.day,
            hour: birth.hour,
            minute: birth.minute,
        },
    });

    const palaces = (chart.Cac_cung || []).map((palace, index) => {
        const key = `${index + 1}_${slugifyVietnamese(palace.Name)}`;

        return {
            key,
            ten_cung: String(palace.Name || '').toUpperCase(),
            cung_goc: palace.Name || null,
            dai_han: palace.SoCuc || null,
            tieu_han: palace.TieuHan || null,
            than: palace.Than === 1,
            chinh_tinh: (palace.ChinhTinh || []).map((star) => mapTuViStar(star, 'binh')),
            cat_tinh: (palace.Saotot || []).map((star) => mapTuViStar(star, 'tot')),
            hung_tinh: (palace.Saoxau || []).map((star) => mapTuViStar(star, 'xau')),
            an_ngu: [
                palace.Tuan ? 'Tuần' : null,
                palace.Triet ? 'Triệt' : null,
            ].filter(Boolean).join(', ') || null,
            vong_trang_sinh: palace.TrangSinh || null,
            ngu_hanh_cung: palaceElementMap[palace.NguHanhCung] || null,
        };
    });

    const positions = {};
    palaces.forEach((palace) => {
        positions[palace.key] = palace;
    });

    const menhPalace = palaces[(chart.Info?.VTMenh || 1) - 1] || null;
    const totalMainStars = palaces.reduce((sum, palace) => sum + palace.chinh_tinh.length, 0);
    const totalSupportStars = palaces.reduce((sum, palace) => sum + palace.cat_tinh.length + palace.hung_tinh.length, 0);
    const info = {
        am_duong: chart.Info?.AmDuong || null,
        gio_sinh_chi: chart.Info?.Gio || null,
        nam_am_lich: chart.Info?.Nam || null,
        thang_am_lich: chart.Info?.Thang || null,
        ngay_am_lich: chart.Info?.Ngay || null,
        cuc: chart.Info?.Cuc || null,
        cuc_so: chart.Info?.CucNH || null,
        chu_menh: chart.Info?.ChuMenh || null,
        chu_than: chart.Info?.ChuThan || null,
        than_cu: chart.Info?.ThanCu || null,
        vi_tri_menh: chart.Info?.VTMenh || null,
    };

    const summaryParts = [
        info.am_duong,
        info.cuc,
        info.than_cu,
        menhPalace ? `Mệnh an tại cung ${menhPalace.cung_goc}` : null,
    ].filter(Boolean);

    return {
        info,
        palaces,
        positions,
        total_main_stars: totalMainStars,
        total_support_stars: totalSupportStars,
        summary: summaryParts.join(' | '),
    };
};

const calculateLifePathNumber = (birthday) => {
    const normalized = normalizeBirthday(birthday);
    if (!normalized) return null;
    return reduceNumber(normalized.replace(/-/g, ''));
};

const calculateExpressionNumber = (fullName) => {
    if (!fullName) return null;
    const cleaned = removeVietnameseAccents(fullName).replace(/[^A-Za-z]/g, '').toUpperCase();
    return reduceNumber(cleaned.split('').reduce((sum, char) => sum + letterValue(char), 0));
};

const calculateStrokeNumbers = (fullName) => {
    if (!fullName) return null;
    const parts = fullName.trim().split(/\s+/);
    const surname = parts[0] || '';
    const lastName = parts[parts.length - 1] || '';
    const middleName = parts.slice(1, parts.length - 1).join(' ');
    return {
        thien: surname.length,
        dia: lastName.length,
        nhan: middleName.length || 0,
        total: fullName.replace(/\s+/g, '').length,
    };
};

const getBirthChartSummary = (lifePath, elementInfo) => {
    if (!lifePath || !elementInfo) return null;
    return `Số chủ đạo ${lifePath} kết hợp hành tên ${elementInfo.dominant} cho thấy một người có xu hướng cân bằng năng lượng và phát triển từ nội lực.`;
};

const parseJsonMaybe = (value) => {
    if (!value || typeof value !== 'string') return value || null;
    try {
        return JSON.parse(value);
    } catch (error) {
        return null;
    }
};

const extractAvatarUrl = (deviceInfo) => {
    const parsed = typeof deviceInfo === 'string' ? parseJsonMaybe(deviceInfo) : deviceInfo;
    if (!parsed || typeof parsed !== 'object') return null;

    const avatarCandidates = [
        parsed.avatar_url,
        parsed.avatarUrl,
        parsed.photo_url,
        parsed.photoUrl,
        parsed.photoURL,
        parsed.image_url,
        parsed.imageUrl,
        parsed.image,
        parsed.picture,
        parsed.picture_url,
        parsed.pictureUrl,
        parsed.url,
    ];

    return avatarCandidates.find((candidate) => typeof candidate === 'string' && candidate.trim())?.trim() || null;
};

const extractAvatarBase64 = (avatarBase64) => {
    if (!avatarBase64 || typeof avatarBase64 !== 'string') return null;
    const trimmed = avatarBase64.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const buildChiTietAmLich = (canChi) => {
    if (!canChi?.raw?.year) return null;
    const parts = [];
    if (canChi.raw.year) parts.push(`Năm ${toVietnameseCanChi(canChi.raw.year) || canChi.raw.year}`);
    if (canChi.raw.month) parts.push(`tháng ${toVietnameseCanChi(canChi.raw.month) || canChi.raw.month}`);
    if (canChi.raw.day) parts.push(`ngày ${toVietnameseCanChi(canChi.raw.day) || canChi.raw.day}`);
    if (canChi.raw.hour) parts.push(`giờ ${canChi.raw.hour}`);
    return parts.join(', ');
};

const getYearPolarity = (canChi) => {
    const stem = canChi?.raw?.year?.[0];
    if (!stem) return null;
    return ['甲', '丙', '戊', '庚', '壬'].includes(stem) ? 'Dương' : 'Âm';
};

const getGenderLabel = (gender) => {
    if (!gender) return 'Nam';
    return /^(female|f|nữ|nu)$/i.test(String(gender).trim()) ? 'Nữ' : 'Nam';
};

const getTuoiLabel = (gender, canChi) => {
    const genderLabel = getGenderLabel(gender);
    const polarity = getYearPolarity(canChi);
    if (!polarity) return genderLabel;

    const isFemale = genderLabel === 'Nữ';
    const isAligned = (isFemale && polarity === 'Âm') || (!isFemale && polarity === 'Dương');
    return `${genderLabel} (${isAligned ? 'Âm dương thuận lý' : 'Âm dương nghịch lý'})`;
};

const getCurrentYearLabel = () => {
    const now = new Date();
    const canChi = buildCanChi(now);
    return `${now.getFullYear()} (${(canChi?.year || '').toUpperCase()})`;
};

const getNapAmByCanChi = (canChi) => {
    if (!canChi?.raw?.year) return null;

    const key = canChi.raw.year;
    const mapping = {
        甲子: 'HẢI TRUNG KIM', 乙丑: 'HẢI TRUNG KIM',
        丙寅: 'LƯ TRUNG HỎA', 丁卯: 'LƯ TRUNG HỎA',
        戊辰: 'ĐẠI LÂM MỘC', 己巳: 'ĐẠI LÂM MỘC',
        庚午: 'LỘ BÀN THỔ', 辛未: 'LỘ BÀN THỔ',
        壬申: 'KIẾM PHONG KIM', 癸酉: 'KIẾM PHONG KIM',
        甲戌: 'SƠN ĐẦU HỎA', 乙亥: 'SƠN ĐẦU HỎA',
        丙子: 'GIẢN HẠ THỦY', 丁丑: 'GIẢN HẠ THỦY',
        戊寅: 'THÀNH ĐẦU THỔ', 己卯: 'THÀNH ĐẦU THỔ',
        庚辰: 'BẠCH LẠP KIM', 辛巳: 'BẠCH LẠP KIM',
        壬午: 'DƯƠNG LIỄU MỘC', 癸未: 'DƯƠNG LIỄU MỘC',
        甲申: 'TUYỀN TRUNG THỦY', 乙酉: 'TUYỀN TRUNG THỦY',
        丙戌: 'ỐC THƯỢNG THỔ', 丁亥: 'ỐC THƯỢNG THỔ',
        戊子: 'THÍCH LỊCH HỎA', 己丑: 'THÍCH LỊCH HỎA',
        庚寅: 'TÒNG BÁ MỘC', 辛卯: 'TÒNG BÁ MỘC',
        壬辰: 'TRƯỜNG LƯU THỦY', 癸巳: 'TRƯỜNG LƯU THỦY',
        甲午: 'SA TRUNG KIM', 乙未: 'SA TRUNG KIM',
        丙申: 'SƠN HẠ HỎA', 丁酉: 'SƠN HẠ HỎA',
        戊戌: 'BÌNH ĐỊA MỘC', 己亥: 'BÌNH ĐỊA MỘC',
        庚子: 'BÍCH THƯỢNG THỔ', 辛丑: 'BÍCH THƯỢNG THỔ',
        壬寅: 'KIM BẠCH KIM', 癸卯: 'KIM BẠCH KIM',
        甲辰: 'PHÚ ĐĂNG HỎA', 乙巳: 'PHÚ ĐĂNG HỎA',
        丙午: 'THIÊN HÀ THỦY', 丁未: 'THIÊN HÀ THỦY',
        戊申: 'ĐẠI DỊCH THỔ', 己酉: 'ĐẠI DỊCH THỔ',
        庚戌: 'THOA XUYẾN KIM', 辛亥: 'THOA XUYẾN KIM',
        壬子: 'TANG ĐỐ MỘC', 癸丑: 'TANG ĐỐ MỘC',
        甲寅: 'ĐẠI KHÊ THỦY', 乙卯: 'ĐẠI KHÊ THỦY',
        丙辰: 'SA TRUNG THỔ', 丁巳: 'SA TRUNG THỔ',
        戊午: 'THIÊN THƯỢNG HỎA', 己未: 'THIÊN THƯỢNG HỎA',
        庚申: 'THẠCH LỰU MỘC', 辛酉: 'THẠCH LỰU MỘC',
        壬戌: 'ĐẠI HẢI THỦY', 癸亥: 'ĐẠI HẢI THỦY',
    };

    return mapping[key] || null;
};

const getCucHoaBanMenh = (napAm, cuc) => {
    if (!napAm || !cuc) return null;
    const menhElement = napAm.split(' ').pop().toLowerCase();
    const cucElement = cuc.split(' ')[0].toLowerCase();

    const map = { 'kim': 'kim', 'mộc': 'moc', 'thủy': 'thuy', 'hỏa': 'hoa', 'thổ': 'tho' };
    const m = map[menhElement];
    const c = map[cucElement];

    if (!m || !c) return null;
    if (m === c) return 'Cục hòa Bản Mệnh';

    const sinh = { 'kim': 'thuy', 'thuy': 'moc', 'moc': 'hoa', 'hoa': 'tho', 'tho': 'kim' };
    const khac = { 'kim': 'moc', 'moc': 'tho', 'tho': 'thuy', 'thuy': 'hoa', 'hoa': 'kim' };

    if (sinh[c] === m) return 'Cục sinh Bản Mệnh';
    if (sinh[m] === c) return 'Bản Mệnh sinh Cục';
    if (khac[c] === m) return 'Cục khắc Bản Mệnh';
    if (khac[m] === c) return 'Bản Mệnh khắc Cục';

    return null;
};

const formatLunarBirthDisplay = (birthday) => {
    const normalized = normalizeBirthday(birthday);
    if (!normalized) return null;

    const [year, month, day] = normalized.split('-').map(Number);
    try {
        const lunar = solarlunar.solar2lunar(year, month, day);
        return `${lunar.lDay}/${lunar.lMonth}/${toVietnameseCanChi(lunar.gzYear) || lunar.gzYear}`;
    } catch (error) {
        return null;
    }
};

const getBanMenhAndCuc = (user, astro) => {
    const canChi = buildCanChi(user.birthday, user.birth_time);
    const napAm = getNapAmByCanChi(canChi);
    const cuc = astro?.tu_vi?.info?.cuc || null;
    return {
        ban_menh: napAm,
        cuc,
    };
};

const build12PalaceChart = (astro) => {
    return astro?.tu_vi?.chart?.positions || {};
};

const calculateAge = (birthday) => {
    const normalized = normalizeBirthday(birthday);
    if (!normalized) return null;

    const [year, month, day] = normalized.split('-').map(Number);
    const birthDate = new Date(year, month - 1, day);
    if (Number.isNaN(birthDate.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age -= 1;
    }

    return age;
};

const buildClientDisplayData = (user) => {
    if (!user) return null;

    const astro = buildAstroProfile(user.full_name, user.birthday, user.birth_time, user.gender) || user.astro_profile || {};
    const canChiBirth = buildCanChi(user.birthday, user.birth_time);
    const currentYearLabel = getCurrentYearLabel();
    const namXemYearCanChi = currentYearLabel.match(/\(([^)]+)\)/)?.[1] || null;
    const banMenhAndCuc = getBanMenhAndCuc(user, astro);
    const palaces = build12PalaceChart(astro);
    const canChiString = buildChiTietAmLich(canChiBirth);
    const lunarBirth = formatLunarBirthDisplay(user.birthday);
    const fullLunarBirth = convertToLunar(user.birthday);
    const tuViInfo = astro.tu_vi?.info || {};
    const chartSummary = astro.tu_vi?.chart?.summary || getBirthChartSummary(astro.so_chu_dao, astro.ngu_hanh_ten);
    const normalizedBirthTime = normalizeBirthTime(user.birth_time);

    return {
        thong_tin_trung_tam: {
            nam_xem: currentYearLabel,
            ngay_sinh_duong: user.birthday ? formatDateToYMD(user.birthday) : null,
            gio_sinh: normalizedBirthTime,
            ngay_sinh_am: lunarBirth,
            chi_tiet_am_lich: canChiString,
            tuoi: getTuoiLabel(user.gender, canChiBirth),
            ban_menh: banMenhAndCuc.ban_menh,
            cuc: banMenhAndCuc.cuc,
            menh_chu: tuViInfo.chu_menh || null,
            than_chu: tuViInfo.chu_than || null,
            than_cu: tuViInfo.than_cu || null,
            gio_sinh_can_chi: tuViInfo.gio_sinh_chi || canChiBirth?.hour || null,
            cuc_hoa_ban_menh: getCucHoaBanMenh(banMenhAndCuc.ban_menh, banMenhAndCuc.cuc),
            don_vi_cap: 'Thăng long đạo quán VN',
        },
        la_so_12_cung: palaces,
        meta: {
            user_id: user.id,
            full_name: user.full_name,
            // The web profile renders the avatar from this display payload.
            // Prefer the image stored in users.avatar_base64, then fall back to
            // an avatar URL that may have been supplied in device_info.
            avatar_base64: user.avatar_base64 || null,
            avatar_url: user.avatar_url || user.avatar_base64 || null,
            gender: user.gender || null,
            birthday: user.birthday ? formatDateToYMD(user.birthday) : null,
            birth_time: normalizedBirthTime,
            lunar_birth: fullLunarBirth,
            can_chi: astro.can_chi || buildCanChiString(canChiBirth),
            cung_phi: astro.cung_phi || null,
            life_path: astro.so_chu_dao || null,
            expression: astro.chi_so_su_menh || null,
            soul: astro.chi_so_linh_hon || null,
            summary: chartSummary,
            nam_xem_can_chi: namXemYearCanChi,
        },
    };
};

const formatUserRow = (row) => {
    if (!row) return null;
    const lunar_birth = convertToLunar(row.birthday);
    const deviceInfoParsed = parseJsonMaybe(row.device_info);
    const avatarBase64 = extractAvatarBase64(row.avatar_base64);
    let tu_tru = null;
    if (row.tu_tru) {
        tu_tru = parseJsonMaybe(row.tu_tru);
    }
    let tu_vi = null;
    if (row.tu_vi) {
        tu_vi = parseJsonMaybe(row.tu_vi);
    }
    let huong = null;
    if (row.huong) {
        huong = parseJsonMaybe(row.huong);
    }
    let mau_sac_vat_pham = null;
    if (row.mau_sac_vat_pham) {
        mau_sac_vat_pham = parseJsonMaybe(row.mau_sac_vat_pham);
    }
    let ngu_hanh_ten = null;
    if (row.ngu_hanh_ten) {
        ngu_hanh_ten = parseJsonMaybe(row.ngu_hanh_ten);
    }
    let so_net = null;
    if (row.so_net) {
        so_net = parseJsonMaybe(row.so_net);
    }
    const astro_profile = {
        lunar_birth,
        can_chi: row.can_chi || null,
        tu_tru,
        tu_vi,
        cung_phi: row.cung_phi || null,
        huong,
        mau_sac_vat_pham,
        so_chu_dao: row.life_path || null,
        chi_so_su_menh: row.expression || null,
        chi_so_linh_hon: row.soul || null,
        bieu_do_ngay_sinh: row.bieu_do_ngay_sinh || null,
        ngu_hanh_ten,
        so_net,
    };
    return {
        id: row.id,
        full_name: row.full_name,
        email: row.email,
        birthday: row.birthday ? formatDateToYMD(row.birthday) : null,
        lunar_birth,
        birth_time: normalizeBirthTime(row.birth_time) || "",
        gender: row.gender || null,
        device_id: row.device_id || null,
        device_info: row.device_info || null,
        device_info_parsed: deviceInfoParsed,
        avatar_base64: avatarBase64,
        avatar_url: avatarBase64 || extractAvatarUrl(deviceInfoParsed),
        firebase_token: row.firebase_token || null,
        user_code: row.user_code || null,
        created_at: row.created_at,
        updated_at: row.updated_at,
        can_chi: row.can_chi || null,
        cung_phi: row.cung_phi || null,
        life_path: row.life_path || null,
        expression: row.expression || null,
        soul: row.soul || null,
        dung_y: row.dung_y || null,
        ky_than: row.ky_than || null,
        astro_profile,
    };
};

const upsertAstroProfile = async (userId, astroData) => {
    const {
        can_chi,
        cung_phi,
        so_chu_dao,
        chi_so_su_menh,
        chi_so_linh_hon,
        dung_y,
        ky_than,
        tu_tru,
        tu_vi,
        huong,
        mau_sac_vat_pham,
        bieu_do_ngay_sinh,
        ngu_hanh_ten,
        so_net,
    } = astroData;
    const sql = `
        INSERT INTO user_astro_profiles (
            user_id,
            can_chi,
            cung_phi,
            life_path,
            expression,
            soul,
            dung_y,
            ky_than,
            tu_tru,
            tu_vi,
            huong,
            mau_sac_vat_pham,
            bieu_do_ngay_sinh,
            ngu_hanh_ten,
            so_net
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            can_chi = VALUES(can_chi),
            cung_phi = VALUES(cung_phi),
            life_path = VALUES(life_path),
            expression = VALUES(expression),
            soul = VALUES(soul),
            dung_y = VALUES(dung_y),
            ky_than = VALUES(ky_than),
            tu_tru = VALUES(tu_tru),
            tu_vi = VALUES(tu_vi),
            huong = VALUES(huong),
            mau_sac_vat_pham = VALUES(mau_sac_vat_pham),
            bieu_do_ngay_sinh = VALUES(bieu_do_ngay_sinh),
            ngu_hanh_ten = VALUES(ngu_hanh_ten),
            so_net = VALUES(so_net),
            updated_at = CURRENT_TIMESTAMP
    `;
    const values = [
        userId,
        can_chi,
        cung_phi,
        so_chu_dao,
        chi_so_su_menh,
        chi_so_linh_hon,
        dung_y,
        ky_than,
        JSON.stringify(tu_tru),
        JSON.stringify(tu_vi),
        JSON.stringify(huong),
        JSON.stringify(mau_sac_vat_pham),
        bieu_do_ngay_sinh,
        JSON.stringify(ngu_hanh_ten),
        JSON.stringify(so_net),
    ];
    await pool.query(sql, values);
};

const ensureIndex = async (tableName, indexName, sql) => {
    const [indexes] = await pool.query(
        'SHOW INDEX FROM ?? WHERE Key_name = ?',
        [tableName, indexName],
    );

    if (indexes.length === 0) {
        await pool.query(sql);
        console.log(`[DB] Added missing index: ${tableName}.${indexName}`);
    }
};

const createUsersTable = async () => {
    const sql = `
    CREATE TABLE IF NOT EXISTS users (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      birthday DATE NULL,
      birth_time TIME NULL,
      gender VARCHAR(50) NULL,
      device_id VARCHAR(255) NULL,
      device_info TEXT NULL,
    avatar_base64 LONGTEXT NULL,
      firebase_token TEXT NULL,
      user_code VARCHAR(100) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

    await pool.query(sql);

    await ensureIndex(
        'users',
        'idx_users_device_id',
        'CREATE INDEX idx_users_device_id ON users (device_id)',
    );

    const [avatarColumns] = await pool.query("SHOW COLUMNS FROM users LIKE 'avatar_base64'");
    if (avatarColumns.length === 0) {
        await pool.query('ALTER TABLE users ADD COLUMN avatar_base64 LONGTEXT NULL AFTER device_info');
        console.log('[DB] Added missing column: users.avatar_base64');
    }

    const [birthTimeColumns] = await pool.query("SHOW COLUMNS FROM users LIKE 'birth_time'");
    if (birthTimeColumns.length === 0) {
        await pool.query('ALTER TABLE users ADD COLUMN birth_time TIME NULL AFTER birthday');
        console.log('[DB] Added missing column: users.birth_time');
    }

    const sqlAstro = `
    CREATE TABLE IF NOT EXISTS user_astro_profiles (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id INT UNSIGNED NOT NULL,
      can_chi VARCHAR(255) NULL,
      cung_phi VARCHAR(50) NULL,
      life_path TINYINT UNSIGNED NULL,
      expression TINYINT UNSIGNED NULL,
      soul TINYINT UNSIGNED NULL,
      dung_y VARCHAR(50) NULL,
      ky_than VARCHAR(50) NULL,
      tu_tru TEXT NULL,
      tu_vi TEXT NULL,
      huong TEXT NULL,
      mau_sac_vat_pham TEXT NULL,
      bieu_do_ngay_sinh TEXT NULL,
      ngu_hanh_ten TEXT NULL,
      so_net TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_user_id (user_id),
      KEY idx_cung_phi (cung_phi),
      CONSTRAINT fk_user_astro_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

    await pool.query(sqlAstro);

    // Add missing columns if table already exists
    const newColumns = [
        { name: 'tu_tru', type: 'TEXT NULL' },
        { name: 'tu_vi', type: 'TEXT NULL' },
        { name: 'huong', type: 'TEXT NULL' },
        { name: 'mau_sac_vat_pham', type: 'TEXT NULL' },
        { name: 'bieu_do_ngay_sinh', type: 'TEXT NULL' },
        { name: 'ngu_hanh_ten', type: 'TEXT NULL' },
        { name: 'so_net', type: 'TEXT NULL' },
        { name: 'avatar_base64', type: 'LONGTEXT NULL' },
    ];

    for (const col of newColumns) {
        const [colExists] = await pool.query("SHOW COLUMNS FROM user_astro_profiles LIKE ?", [col.name]);
        if (colExists.length === 0) {
            await pool.query(`ALTER TABLE user_astro_profiles ADD COLUMN ${col.name} ${col.type}`);
            console.log(`[DB] Added missing column: ${col.name}`);
        }
    }

    // Remove deprecated astro_profile column if exists
    const [astroCol] = await pool.query("SHOW COLUMNS FROM user_astro_profiles LIKE 'astro_profile'");
    if (astroCol.length > 0) {
        await pool.query('ALTER TABLE user_astro_profiles DROP COLUMN astro_profile');
        console.log('[DB] Dropped deprecated astro_profile column');
    }
};

const findUserByDeviceId = async (deviceId) => {
    const sql = `
        SELECT u.id, u.full_name, u.email, u.birthday, u.gender, u.birth_time,
             u.device_id, u.device_info, u.avatar_base64, u.firebase_token, u.user_code, u.created_at, u.updated_at,
               p.can_chi, p.cung_phi, p.life_path, p.expression, p.soul, p.dung_y, p.ky_than,
               p.tu_tru, p.tu_vi, p.huong, p.mau_sac_vat_pham, p.bieu_do_ngay_sinh, p.ngu_hanh_ten, p.so_net
        FROM users u
        LEFT JOIN user_astro_profiles p ON u.id = p.user_id
        WHERE u.device_id = ?
        LIMIT 1
    `;
    const [rows] = await pool.query(sql, [deviceId]);
    return rows.length > 0 ? formatUserRow(rows[0]) : null;
};

const findUserById = async (userId) => {
    const sql = `
        SELECT u.id, u.full_name, u.email, u.birthday, u.gender, u.birth_time,
             u.device_id, u.device_info, u.avatar_base64, u.firebase_token, u.user_code, u.created_at, u.updated_at,
               p.can_chi, p.cung_phi, p.life_path, p.expression, p.soul, p.dung_y, p.ky_than,
               p.tu_tru, p.tu_vi, p.huong, p.mau_sac_vat_pham, p.bieu_do_ngay_sinh, p.ngu_hanh_ten, p.so_net
        FROM users u
        LEFT JOIN user_astro_profiles p ON u.id = p.user_id
        WHERE u.id = ?
        LIMIT 1
    `;
    const [rows] = await pool.query(sql, [userId]);
    return rows.length > 0 ? formatUserRow(rows[0]) : null;
};

const findUserByEmail = async (email) => {
    const sql = `
        SELECT u.id, u.full_name, u.email, u.birthday, u.gender, u.birth_time,  
             u.device_id, u.device_info, u.avatar_base64, u.firebase_token, u.user_code, u.created_at, u.updated_at,
               p.can_chi, p.cung_phi, p.life_path, p.expression, p.soul, p.dung_y, p.ky_than,
               p.tu_tru, p.tu_vi, p.huong, p.mau_sac_vat_pham, p.bieu_do_ngay_sinh, p.ngu_hanh_ten, p.so_net
        FROM users u
        LEFT JOIN user_astro_profiles p ON u.id = p.user_id
        WHERE u.email = ?
        LIMIT 1
    `;
    const [rows] = await pool.query(sql, [email]);
    return rows.length > 0 ? formatUserRow(rows[0]) : null;
};

const createDuplicateEmailError = (email) => {
    const error = new Error(`Email already exists: ${email}`);
    error.code = 'DUPLICATE_EMAIL';
    error.status = 409;
    return error;
};

const createInvalidBirthDataError = (message) => {
    const error = new Error(message);
    error.code = 'INVALID_BIRTH_DATA';
    error.status = 400;
    return error;
};

const isDuplicateEmailError = (error) => (
    error?.code === 'ER_DUP_ENTRY'
    && (error?.sqlMessage || '').toLowerCase().includes('email')
);

const generateUserCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

const convertToLunar = (birthday) => {
    if (!birthday) return null;
    const normalized = normalizeBirthday(birthday);
    if (!normalized) return null;

    const [year, month, day] = normalized.split('-').map(Number);
    try {
        const lunar = solarlunar.solar2lunar(year, month, day);
        return `${lunar.lYear}-${lunar.lMonth}-${lunar.lDay}`;
    } catch (error) {
        console.error('Error converting to lunar:', error);
        return null;
    }
};
const buildAstroProfile = (fullName, birthday, birthTime, gender) => {
    const lunarBirth = convertToLunar(birthday);
    const canChi = buildCanChi(birthday, birthTime);
    const lifePath = calculateLifePathNumber(birthday);
    const expression = calculateExpressionNumber(fullName);
    const soul = calculateSoulNumber(fullName);
    const normalizedBirthday = normalizeBirthday(birthday);
    const year = normalizedBirthday ? Number(normalizedBirthday.split('-')[0]) : null;
    const cungPhi = getCungPhi(year, gender);
    const directions = getDirectionsForCungPhi(cungPhi);
    const colorAndItems = getColorAndItems(cungPhi);
    const nameElement = calculateNameElement(fullName);
    const strokeNumbers = calculateStrokeNumbers(fullName);
    const tuTruInfo = getTuTruInfo(canChi);
    const tuViChart = buildTuViChart(fullName, birthday, birthTime, gender);

    return {
        can_chi: buildCanChiString(canChi),
        can_chi_raw: canChi,
        birth_time: normalizeBirthTime(birthTime),
        tu_tru: {
            description: 'Tứ trụ dựa vào Năm, Tháng, Ngày, Giờ theo Can Chi. Phân tích cân bằng Ngũ hành, dụng thần và kỵ thần.',
            detail: tuTruInfo,
            year: canChi?.raw?.year || null,
            month: canChi?.raw?.month || null,
            day: canChi?.raw?.day || null,
            hour: canChi?.raw?.hour || null,
        },
        tu_vi: {
            description: 'Lá số Tử Vi được tính động theo ngày sinh, giờ sinh và giới tính của user.',
            info: tuViChart?.info || null,
            chart: tuViChart,
        },
        cung_phi: cungPhi,
        huong: directions,
        mau_sac_vat_pham: colorAndItems,
        so_chu_dao: lifePath,
        chi_so_su_menh: expression,
        chi_so_linh_hon: soul,
        bieu_do_ngay_sinh: getBirthChartSummary(lifePath, nameElement),
        ngu_hanh_ten: nameElement,
        so_net: strokeNumbers,
    };
};

const createUser = async (userData) => {
    const { full_name, email, birthday, birth_time, gender, device_id, device_info, avatar_base64, firebase_token } = userData;
    const normalizedEmail = String(email).trim();
    const normalizedBirthdayTime = normalizeBirthTimeForDb(birth_time);
    const normalizedBirthday = normalizeBirthday(birthday);
    if (!normalizedBirthday || !normalizedBirthdayTime) {
        throw createInvalidBirthDataError('Invalid birthday or birth_time');
    }
    const astroProfile = buildAstroProfile(full_name, normalizedBirthday, normalizedBirthdayTime, gender);
    const canChiString = astroProfile.can_chi;
    const cung_phi = astroProfile.cung_phi;
    const normalizedAvatarBase64 = extractAvatarBase64(avatar_base64);

    const existingUser = await findUserByDeviceId(device_id);

    const normalized_user_code = generateUserCode();

    if (existingUser) {
        const existingEmailUser = await findUserByEmail(normalizedEmail);
        if (existingEmailUser && existingEmailUser.id !== existingUser.id) {
            throw createDuplicateEmailError(normalizedEmail);
        }

        const sql = `
            UPDATE users
            SET full_name = ?,
                email = ?,
                birthday = ?,
                birth_time = ?,
                gender = ?,
                device_info = ?,
                avatar_base64 = COALESCE(?, avatar_base64),
                firebase_token = ?
            WHERE device_id = ?
        `;
        const values = [
            full_name,
            normalizedEmail,
            normalizedBirthday,
            normalizedBirthdayTime,
            gender,
            device_info,
            normalizedAvatarBase64,
            firebase_token,
            device_id,
        ];
        try {
            await pool.query(sql, values);
        } catch (error) {
            if (isDuplicateEmailError(error)) {
                throw createDuplicateEmailError(normalizedEmail);
            }
            throw error;
        }

        await upsertAstroProfile(existingUser.id, {
            can_chi: canChiString,
            cung_phi,
            so_chu_dao: astroProfile.so_chu_dao,
            chi_so_su_menh: astroProfile.chi_so_su_menh,
            chi_so_linh_hon: astroProfile.chi_so_linh_hon,
            dung_y: astroProfile.tu_tru?.detail?.dung_y,
            ky_than: astroProfile.tu_tru?.detail?.ky_than,
            tu_tru: astroProfile.tu_tru,
            tu_vi: astroProfile.tu_vi,
            huong: astroProfile.huong,
            mau_sac_vat_pham: astroProfile.mau_sac_vat_pham,
            bieu_do_ngay_sinh: astroProfile.bieu_do_ngay_sinh,
            ngu_hanh_ten: astroProfile.ngu_hanh_ten,
            so_net: astroProfile.so_net,
        });

        return await findUserByDeviceId(device_id);
    }

    const existingEmailUser = await findUserByEmail(normalizedEmail);
    if (existingEmailUser) {
        throw createDuplicateEmailError(normalizedEmail);
    }

    const sql = `
        INSERT INTO users (full_name, email, birthday, birth_time, gender, device_id, device_info, avatar_base64, firebase_token, user_code)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
        full_name,
        normalizedEmail,
        normalizedBirthday,
        normalizedBirthdayTime,
        gender,
        device_id,
        device_info,
        normalizedAvatarBase64,
        firebase_token,
        normalized_user_code,
    ];

    let result;
    try {
        [result] = await pool.query(sql, values);
    } catch (error) {
        if (isDuplicateEmailError(error)) {
            throw createDuplicateEmailError(normalizedEmail);
        }
        throw error;
    }
    await upsertAstroProfile(result.insertId, {
        can_chi: canChiString,
        cung_phi,
        so_chu_dao: astroProfile.so_chu_dao,
        chi_so_su_menh: astroProfile.chi_so_su_menh,
        chi_so_linh_hon: astroProfile.chi_so_linh_hon,
        dung_y: astroProfile.tu_tru?.detail?.dung_y,
        ky_than: astroProfile.tu_tru?.detail?.ky_than,
        tu_tru: astroProfile.tu_tru,
        tu_vi: astroProfile.tu_vi,
        huong: astroProfile.huong,
        mau_sac_vat_pham: astroProfile.mau_sac_vat_pham,
        bieu_do_ngay_sinh: astroProfile.bieu_do_ngay_sinh,
        ngu_hanh_ten: astroProfile.ngu_hanh_ten,
        so_net: astroProfile.so_net,
    });

    return await findUserByDeviceId(device_id);
};

const updateUser = async (userData) => {
    const {
        user_id, full_name, email, birthday, birth_time, gender, device_info, avatar_base64, firebase_token,
    } = userData;
    const userId = Number(user_id);

    if (!userId || Number.isNaN(userId) || userId <= 0) {
        const error = new Error('Invalid user_id');
        error.code = 'INVALID_USER_ID';
        error.status = 400;
        throw error;
    }

    const existingUser = await findUserById(userId);
    if (!existingUser) {
        const error = new Error(`User not found: ${userId}`);
        error.code = 'USER_NOT_FOUND';
        error.status = 404;
        throw error;
    }

    const normalizedEmail = String(email).trim();
    const normalizedBirthday = normalizeBirthday(birthday);
    const normalizedBirthTime = normalizeBirthTimeForDb(birth_time);
    if (!normalizedBirthday || !normalizedBirthTime) {
        throw createInvalidBirthDataError('Invalid birthday or birth_time');
    }
    const normalizedAvatarBase64 = extractAvatarBase64(avatar_base64);
    const astroProfile = buildAstroProfile(full_name, normalizedBirthday, normalizedBirthTime, gender);
    const canChiString = astroProfile.can_chi;
    const cung_phi = astroProfile.cung_phi;

    const existingEmailUser = await findUserByEmail(normalizedEmail);
    if (existingEmailUser && existingEmailUser.id !== userId) {
        throw createDuplicateEmailError(normalizedEmail);
    }

    const sql = `
        UPDATE users
        SET full_name = ?,
            email = ?,
            birthday = ?,
            birth_time = ?,
            gender = ?,
            device_info = ?,
            avatar_base64 = COALESCE(?, avatar_base64),
            firebase_token = ?
        WHERE id = ?
    `;
    const values = [
        full_name,
        normalizedEmail,
        normalizedBirthday,
        normalizedBirthTime,
        gender,
        device_info,
        normalizedAvatarBase64,
        firebase_token,
        userId,
    ];

    try {
        await pool.query(sql, values);
    } catch (error) {
        if (isDuplicateEmailError(error)) {
            throw createDuplicateEmailError(normalizedEmail);
        }
        throw error;
    }

    await upsertAstroProfile(userId, {
        can_chi: canChiString,
        cung_phi,
        so_chu_dao: astroProfile.so_chu_dao,
        chi_so_su_menh: astroProfile.chi_so_su_menh,
        chi_so_linh_hon: astroProfile.chi_so_linh_hon,
        dung_y: astroProfile.tu_tru?.detail?.dung_y,
        ky_than: astroProfile.tu_tru?.detail?.ky_than,
        tu_tru: astroProfile.tu_tru,
        tu_vi: astroProfile.tu_vi,
        huong: astroProfile.huong,
        mau_sac_vat_pham: astroProfile.mau_sac_vat_pham,
        bieu_do_ngay_sinh: astroProfile.bieu_do_ngay_sinh,
        ngu_hanh_ten: astroProfile.ngu_hanh_ten,
        so_net: astroProfile.so_net,
    });

    return await findUserById(userId);
};

module.exports = {
    createUsersTable,
    findUserByDeviceId,
    findUserById,
    findUserByEmail,
    createUser,
    updateUser,
    buildAstroProfile,
    buildClientDisplayData,
};
