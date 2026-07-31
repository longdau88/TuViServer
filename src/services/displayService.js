const { resolveBirthDateTime, normalizeBirthday, normalizeBirthTime, formatDateToYMD } = require('../utils/dateUtils');
const luanGiaiService = require('./luanGiaiService');
const { parseJsonMaybe, toVietnameseCanChi, buildCanChi, buildCanChiString, convertToLunar, getBirthChartSummary, buildAstroProfile } = require('./astroService');

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

const normalizeStoredAvatarUrl = (avatarUrl) => {
    if (!avatarUrl || typeof avatarUrl !== 'string') return null;
    const trimmed = avatarUrl.trim();
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

const hasStoredTuViChart = (user) => {
    const tuVi = user?.astro_profile?.tu_vi;
    return Boolean(tuVi?.chart || tuVi?.info);
};

const resolveAstroForDisplay = (user) => {
    if (hasStoredTuViChart(user)) {
        return user.astro_profile;
    }
    if (!user?.birth_time) {
        return user?.astro_profile || {};
    }
    return buildAstroProfile(user.full_name, user.birthday, user.birth_time, user.gender);
};

const buildClientDisplayData = (user) => {
    if (!user) return null;

    const astro = resolveAstroForDisplay(user) || {};
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

    const currentYear = new Date().getFullYear();
    const birthYear = user.birthday ? new Date(user.birthday).getFullYear() : currentYear;
    const currentAge = currentYear - birthYear + 1;
    const currentLunarBranch = namXemYearCanChi ? namXemYearCanChi.split(' ')[1] : null;

    const chi_tiet_luan_giai = luanGiaiService.generateAll(
        {
            ban_menh: banMenhAndCuc.ban_menh,
            cuc: banMenhAndCuc.cuc,
            am_duong: tuViInfo.AmDuong || null,
            chu_menh: tuViInfo.chu_menh || tuViInfo.ChuMenh || null,
            chu_than: tuViInfo.chu_than || tuViInfo.ChuThan || null,
            than_cu: tuViInfo.than_cu || tuViInfo.ThanCu || null,
        },
        Object.values(palaces),
        currentAge,
        currentLunarBranch
    );

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
            menh_chu: tuViInfo.chu_menh || tuViInfo.ChuMenh || null,
            than_chu: tuViInfo.chu_than || tuViInfo.ChuThan || null,
            than_cu: tuViInfo.than_cu || tuViInfo.ThanCu || null,
            gio_sinh_can_chi: tuViInfo.gio_sinh_chi || tuViInfo.Gio || canChiBirth?.hour || null,
            cuc_hoa_ban_menh: getCucHoaBanMenh(banMenhAndCuc.ban_menh, banMenhAndCuc.cuc),
            don_vi_cap: 'Thăng long đạo quán VN',
        },
        la_so_12_cung: palaces,
        meta: {
            user_id: user.id,
            full_name: user.full_name,
            avatar_url: user.avatar_url || extractAvatarUrl(user.device_info_parsed) || null,
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
        astro_details: {
            ...astro,
            chi_tiet_luan_giai
        },
    };
};


module.exports = {
  extractAvatarUrl,
  normalizeStoredAvatarUrl,
  buildChiTietAmLich,
  getYearPolarity,
  getGenderLabel,
  getTuoiLabel,
  getCurrentYearLabel,
  getNapAmByCanChi,
  getCucHoaBanMenh,
  formatLunarBirthDisplay,
  getBanMenhAndCuc,
  build12PalaceChart,
  calculateAge,
  hasStoredTuViChart,
  resolveAstroForDisplay,
  buildClientDisplayData
};
