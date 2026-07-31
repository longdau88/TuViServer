const solarlunar = require('solarlunar').default || require('solarlunar');
const { generateLaSo } = require('tuvi-neo');
const { resolveBirthDateTime, normalizeBirthday, normalizeBirthTime } = require('../utils/dateUtils');

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

const CAN_ARRAY = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const CHI_ARRAY = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

const calculatePalaceCanChi = (namAmLich, index) => {
    if (!namAmLich) return CHI_ARRAY[index]; // Fallback
    const canIndex = CAN_ARRAY.findIndex(c => namAmLich.toUpperCase().includes(c.toUpperCase()));
    if (canIndex === -1) return CHI_ARRAY[index];
    const canDan = ((canIndex % 5) * 2 + 2) % 10;
    const canCung = (canDan + (index - 2) + 12) % 10;
    return CAN_ARRAY[canCung] + ' ' + CHI_ARRAY[index];
};

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
        const namAmLich = chart.Info?.Nam || '';
        const canChiCung = calculatePalaceCanChi(namAmLich, index);

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
            can_chi: canChiCung,
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


module.exports = {
  removeVietnameseAccents,
  reduceNumber,
  letterValue,
  getHourBranch,
  toVietnameseCanChi,
  buildCanChi,
  buildCanChiString,
  calculateSoulNumber,
  getCungPhi,
  getDirectionsForCungPhi,
  getColorAndItems,
  calculateNameElement,
  getElementFromCanChi,
  getTuTruInfo,
  rotateArray,
  normalizeGenderForTuVi,
  slugifyVietnamese,
  mapTuViStar,
  calculatePalaceCanChi,
  buildTuViChart,
  calculateLifePathNumber,
  calculateExpressionNumber,
  calculateStrokeNumbers,
  getBirthChartSummary,
  buildAstroProfile,
  convertToLunar,
  parseJsonMaybe
};
