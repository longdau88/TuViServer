const solarlunar = require('solarlunar').default || require('solarlunar');
const {
    buildAstroProfile,
    toVietnameseCanChi,
    buildCanChi,
    getHourBranch,
} = require('./astroService');
const { resolveBirthDateTime, normalizeBirthday, normalizeBirthTime } = require('../utils/dateUtils');

// ----------------------------------------------------
// 1. DATA MAPPINGS & CONSTANTS
// ----------------------------------------------------

const STEM_VIETNAMESE = { 甲: 'Giáp', 乙: 'Ất', 丙: 'Bính', 丁: 'Đinh', 戊: 'Mậu', 己: 'Kỷ', 庚: 'Canh', 辛: 'Tân', 壬: 'Nhâm', 癸: 'Quý' };
const BRANCH_VIETNAMESE = { 子: 'Tý', 丑: 'Sửu', 寅: 'Dần', 卯: 'Mão', 辰: 'Thìn', 巳: 'Tỵ', 午: 'Ngọ', 未: 'Mùi', 申: 'Thân', 酉: 'Dậu', 戌: 'Tuất', 亥: 'Hợi' };

const PALACE_BRANCHES = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

// Lưu Lộc Tồn according to Year Stem
const LOC_TON_BRANCH = {
    Giáp: 'Dần', Ất: 'Mão', Bính: 'Tỵ', Đinh: 'Ngọ', Mậu: 'Tỵ',
    Kỷ: 'Ngọ', Canh: 'Thân', Tân: 'Dậu', Nhâm: 'Hợi', Quý: 'Tý',
};

// Lưu Thiên Khôi & Lưu Thiên Việt according to Year Stem
const KHOI_VIET_BRANCH = {
    Giáp: { khoi: 'Sửu', viet: 'Mùi' },
    Ất: { khoi: 'Tý', viet: 'Thân' },
    Bính: { khoi: 'Hợi', viet: 'Dậu' },
    Đinh: { khoi: 'Hợi', viet: 'Dậu' },
    Mậu: { khoi: 'Sửu', viet: 'Mùi' },
    Kỷ: { khoi: 'Tý', viet: 'Thân' },
    Canh: { khoi: 'Sửu', viet: 'Mùi' },
    Tân: { khoi: 'Ngọ', viet: 'Dần' },
    Nhâm: { khoi: 'Mão', viet: 'Tỵ' },
    Quý: { khoi: 'Mão', viet: 'Tỵ' },
};

// Lưu Thiên Mã according to Year Branch
const THIEN_MA_BRANCH = {
    Dần: 'Thân', Ngọ: 'Thân', Tuất: 'Thân',
    Thân: 'Dần', Tý: 'Dần', Thìn: 'Dần',
    Tỵ: 'Hợi', Dậu: 'Hợi', Sửu: 'Hợi',
    Hợi: 'Tỵ', Mão: 'Tỵ', Mùi: 'Tỵ',
};

// Tứ Hóa Lưu Niên according to Year Stem
const TU_HOA_MAPPING = {
    Giáp: { loc: 'Liêm Trinh', quyen: 'Phá Quân', khoa: 'Vũ Khúc', ky: 'Thái Dương' },
    Ất: { loc: 'Thiên Cơ', quyen: 'Thiên Lương', khoa: 'Tử Vi', ky: 'Thái Âm' },
    Bính: { loc: 'Thiên Đồng', quyen: 'Thiên Cơ', khoa: 'Thái Âm', ky: 'Liêm Trinh' },
    Đinh: { loc: 'Thái Âm', quyen: 'Thiên Đồng', khoa: 'Thiên Cơ', ky: 'Cự Môn' },
    Mậu: { loc: 'Tham Lang', quyen: 'Thái Âm', khoa: 'Hữu Bật', ky: 'Thiên Cơ' },
    Kỷ: { loc: 'Vũ Khúc', quyen: 'Tham Lang', khoa: 'Thiên Lương', ky: 'Văn Khúc' },
    Canh: { loc: 'Thái Dương', quyen: 'Vũ Khúc', khoa: 'Thiên Đồng', ky: 'Thái Âm' },
    Tân: { loc: 'Cự Môn', quyen: 'Thái Dương', khoa: 'Văn Khúc', ky: 'Văn Xương' },
    Nhâm: { loc: 'Thiên Lương', quyen: 'Tử Vi', khoa: 'Tả Phụ', ky: 'Vũ Khúc' },
    Quý: { loc: 'Phá Quân', quyen: 'Cự Môn', khoa: 'Thái Âm', ky: 'Tham Lang' },
};

// Auspicious hours mapping per Branch of target day
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

// Helper: Shift branch clockwise or counter-clockwise
const getShiftedBranch = (baseBranch, offset) => {
    const idx = PALACE_BRANCHES.indexOf(baseBranch);
    if (idx === -1) return baseBranch;
    const newIdx = (idx + offset + 1200) % 12;
    return PALACE_BRANCHES[newIdx];
};

// Helper: Get Triad & Opposition branches (Tam Hợp & Xung Chiếu)
const getTriadAndOpposite = (branch) => {
    return [
        branch,
        getShiftedBranch(branch, 4),  // Tam hợp 1
        getShiftedBranch(branch, 8),  // Tam hợp 2
        getShiftedBranch(branch, 6),  // Xung chiếu
    ];
};

// ----------------------------------------------------
// 2. REALTIME TRANSITS CALCULATION
// ----------------------------------------------------

/**
 * An Sao Lưu Niên & Transit Palaces for a target date
 */
const calculateTransitStars = (targetDateStr) => {
    const parsedDate = targetDateStr ? new Date(targetDateStr) : new Date();
    const year = parsedDate.getFullYear();
    const month = parsedDate.getMonth() + 1;
    const day = parsedDate.getDate();

    const lunar = solarlunar.solar2lunar(year, month, day);

    const stemCode = lunar.gzYear ? lunar.gzYear[0] : '甲';
    const branchCode = lunar.gzYear ? lunar.gzYear[1] : '子';

    const stemName = STEM_VIETNAMESE[stemCode] || stemCode;
    const branchName = BRANCH_VIETNAMESE[branchCode] || branchCode;

    const dayStemCode = lunar.gzDay ? lunar.gzDay[0] : '甲';
    const dayBranchCode = lunar.gzDay ? lunar.gzDay[1] : '子';

    const dayStemName = STEM_VIETNAMESE[dayStemCode] || dayStemCode;
    const dayBranchName = BRANCH_VIETNAMESE[dayBranchCode] || dayBranchCode;

    const monthStemCode = lunar.gzMonth ? lunar.gzMonth[0] : '甲';
    const monthBranchCode = lunar.gzMonth ? lunar.gzMonth[1] : '子';
    const monthBranchName = BRANCH_VIETNAMESE[monthBranchCode] || monthBranchCode;

    // 1. Vòng Lưu Thái Tuế (12 Sao Lưu)
    const thaiTueBranch = branchName;
    const thieuDuongBranch = getShiftedBranch(thaiTueBranch, 1);
    const tangMonBranch = getShiftedBranch(thaiTueBranch, 2);
    const thieuAmBranch = getShiftedBranch(thaiTueBranch, 3);
    const quanPhuBranch = getShiftedBranch(thaiTueBranch, 4);
    const tuPhuBranch = getShiftedBranch(thaiTueBranch, 5);
    const tuePhaBranch = getShiftedBranch(thaiTueBranch, 6);
    const longDucBranch = getShiftedBranch(thaiTueBranch, 7);
    const bachHoBranch = getShiftedBranch(thaiTueBranch, 8);
    const phucDucBranch = getShiftedBranch(thaiTueBranch, 9);
    const dieuKhachBranch = getShiftedBranch(thaiTueBranch, 10);
    const trucPhuBranch = getShiftedBranch(thaiTueBranch, 11);

    // 2. Lưu Lộc Tồn, Kình Dương, Đà La
    const locTonBranch = LOC_TON_BRANCH[stemName] || 'Dần';
    const kinhDuongBranch = getShiftedBranch(locTonBranch, 1);
    const daLaBranch = getShiftedBranch(locTonBranch, -1);

    // 3. Lưu Thiên Mã
    const thienMaBranch = THIEN_MA_BRANCH[branchName] || 'Thân';

    // 4. Lưu Khôi - Việt
    const khoiViet = KHOI_VIET_BRANCH[stemName] || { khoi: 'Sửu', viet: 'Mùi' };

    // 5. Tứ Hóa Lưu Niên
    const tuHoa = TU_HOA_MAPPING[stemName] || TU_HOA_MAPPING.Giáp;

    // 6. Cung Hạn: Lưu Niên (Năm), Lưu Nguyệt (Tháng), Lưu Nhật (Ngày)
    const luuNienPalace = branchName; // Cung Lưu Niên trùng Địa chi Năm
    const luuNguyetPalace = getShiftedBranch(luuNienPalace, (lunar.lMonth - 1)); // Cung Lưu Nguyệt
    const luuNhatPalace = getShiftedBranch(luuNguyetPalace, (lunar.lDay - 1)); // Cung Lưu Nhật

    return {
        target_date: targetDateStr,
        lunar_date: `${lunar.lDay}/${lunar.lMonth}/${lunar.lYear}`,
        can_chi_year: `${stemName} ${branchName}`,
        can_chi_month: `${STEM_VIETNAMESE[monthStemCode] || monthStemCode} ${monthBranchName}`,
        can_chi_day: `${dayStemName} ${dayBranchName}`,
        lunar_details: {
            day: lunar.lDay,
            month: lunar.lMonth,
            year: lunar.lYear,
            isLeap: lunar.isLeap,
        },
        palaces_transit: {
            luu_nien: luuNienPalace,
            luu_nguyet: luuNguyetPalace,
            luu_nhat: luuNhatPalace,
        },
        transit_stars: {
            luu_thai_tue: thaiTueBranch,
            luu_thieu_duong: thieuDuongBranch,
            luu_tang_mon: tangMonBranch,
            luu_thieu_am: thieuAmBranch,
            luu_quan_phu: quanPhuBranch,
            luu_tu_phu: tuPhuBranch,
            luu_tue_pha: tuePhaBranch,
            luu_long_duc: longDucBranch,
            luu_bach_ho: bachHoBranch,
            luu_phuc_duc: phucDucBranch,
            luu_dieu_khach: dieuKhachBranch,
            luu_truc_phu: trucPhuBranch,
            luu_loc_ton: locTonBranch,
            luu_kinh_duong: kinhDuongBranch,
            luu_da_la: daLaBranch,
            luu_thien_ma: thienMaBranch,
            luu_thien_khoi: khoiViet.khoi,
            luu_thien_viet: khoiViet.viet,
            luu_tu_hoa: tuHoa,
        },
        hoang_dao_hours: HOANG_DAO_HOURS[dayBranchName] || HOANG_DAO_HOURS.Tý,
    };
};

/**
 * Rigorous Horoscope Evaluation Engine
 */
const generateRealtimeForecast = (personInput, targetDateStr) => {
    // 1. Build Astro Profile of Person
    const profile = buildAstroProfile(
        personInput.full_name || 'Người dùng',
        personInput.birthday,
        personInput.birth_time,
        personInput.gender
    );

    // 2. Calculate Transits for Target Date
    const transits = calculateTransitStars(targetDateStr);

    const baseChart = profile.tu_vi?.chart;
    const basePalaces = baseChart?.palaces || [];

    // Locate user's Menh, Tai, Quan, Tat, Di, The palaces
    const menhPalace = basePalaces.find((p) => p.name?.includes('Mệnh') || p.isMenh) || {};
    const taiPalace = basePalaces.find((p) => p.name?.includes('Tài')) || {};
    const quanPalace = basePalaces.find((p) => p.name?.includes('Quan')) || {};
    const tatPalace = basePalaces.find((p) => p.name?.includes('Tật')) || {};
    const diPalace = basePalaces.find((p) => p.name?.includes('Di')) || {};
    const thePalace = basePalaces.find((p) => p.name?.includes('Thê') || p.name?.includes('Phu')) || {};

    const menhBranch = menhPalace.cung_goc || 'Tý';
    const taiBranch = taiPalace.cung_goc || getShiftedBranch(menhBranch, -4);
    const quanBranch = quanPalace.cung_goc || getShiftedBranch(menhBranch, 4);
    const tatBranch = tatPalace.cung_goc || getShiftedBranch(menhBranch, -6);
    const diBranch = diPalace.cung_goc || getShiftedBranch(menhBranch, 6);

    const stars = transits.transit_stars;

    // Active Triads for Menh, Tai, Quan, Day Palace
    const menhAspects = getTriadAndOpposite(menhBranch);
    const taiAspects = getTriadAndOpposite(taiBranch);
    const quanAspects = getTriadAndOpposite(quanBranch);
    const dayAspects = getTriadAndOpposite(transits.palaces_transit.luu_nhat);

    // 3. Precise Aspect Dynamic Evaluation
    let taiLocScore = 75;
    let congDanhScore = 75;
    let tinhCamScore = 75;
    let sucKhoeScore = 80;

    let taiLocDetail = '';
    let congDanhDetail = '';
    let tinhCamDetail = '';
    let sucKhoeDetail = '';

    const keyAlerts = [];
    const auspiciousTips = [];

    // --- A. TÀI LỘC ---
    const hasLocTonAspect = taiAspects.includes(stars.luu_loc_ton) || menhAspects.includes(stars.luu_loc_ton);
    const hasHoaLocAspect = stars.luu_tu_hoa.loc;

    if (hasLocTonAspect) {
        taiLocScore += 18;
        taiLocDetail = `Lưu Lộc Tồn chiếu bộ Mệnh/Tài (${stars.luu_loc_ton}). Vận khí tài chính vượng phát, có may mắn bất ngờ về tiền bạc, doanh thu gia tăng hoặc nhận lộc thưởng.`;
        keyAlerts.push({
            type: 'success',
            title: 'Lưu Lộc Tồn Nhập Hạn Tài Lộc',
            content: `Lưu Lộc Tồn tại cung ${stars.luu_loc_ton} chiếu Mệnh/Tài mang lại vận may tiền bạc, thuận lợi cho việc thu hồi nợ, giao dịch thương mại.`,
        });
    } else {
        taiLocDetail = `Vận trình tài chính trong ngày ở mức bình hòa (${taiLocScore}/100). Chi tiêu ổn định, thích hợp quản lý dòng tiền bài bản.`;
    }

    // --- B. CÔNG DANH & SỰ NGHIỆP ---
    const hasMaAspect = quanAspects.includes(stars.luu_thien_ma) || menhAspects.includes(stars.luu_thien_ma) || dayAspects.includes(stars.luu_thien_ma);
    const hasKhoiVietAspect = quanAspects.includes(stars.luu_thien_khoi) || quanAspects.includes(stars.luu_thien_viet);

    if (hasMaAspect || hasKhoiVietAspect) {
        congDanhScore += 15;
        congDanhDetail = `Lưu Thiên Mã (${stars.luu_thien_ma}) & Quý Nhân Lưu Khôi/Việt chiếu Quan Lộc. Công việc khởi sắc, có cơ hội đi lại công tác, mở rộng dự án hoặc gặp người giúp đỡ.`;
        keyAlerts.push({
            type: 'info',
            title: 'Lưu Thiên Mã / Quý Nhân Chiếu Quan',
            content: `Công danh gặp vận hội tốt, hành động năng nổ sẽ mang lại kết quả vượt kỳ vọng.`,
        });
    } else {
        congDanhDetail = `Công việc diễn ra theo đúng tiến độ kế hoạch (${congDanhScore}/100). Tập trung xử lý tốt các nhiệm vụ hiện tại.`;
    }

    // --- C. TÌNH CẢM & MỐI QUAN HỆ ---
    const hasTangMonAspect = menhAspects.includes(stars.luu_tang_mon) || dayAspects.includes(stars.luu_tang_mon);
    const hasQuanPhuAspect = menhAspects.includes(stars.luu_quan_phu);

    if (hasTangMonAspect || hasQuanPhuAspect) {
        tinhCamScore -= 12;
        tinhCamDetail = `Bộ sao Lưu Tang Môn (${stars.luu_tang_mon}) & Lưu Quan Phù tác động. Cần kiên nhẫn, tránh nóng giận hoặc bất đồng quan điểm trong quan hệ gia đạo/người yêu.`;
        keyAlerts.push({
            type: 'warning',
            title: 'Lưu Tang Môn / Quan Phù Tác Động',
            content: `Chú ý ứng xử khéo léo, lắng nghe người thân để duy trì không khí hòa thuận.`,
        });
    } else {
        tinhCamDetail = `Tình cảm gia đạo đầm ấm, mối quan hệ đôi lứa chan hòa (${tinhCamScore}/100).`;
    }

    // --- D. SỨC KHỎE & DI CHUYỂN ---
    const hasKinhDaAspect = menhAspects.includes(stars.luu_kinh_duong) || menhAspects.includes(stars.luu_da_la) || dayAspects.includes(stars.luu_bach_ho);

    if (hasKinhDaAspect) {
        sucKhoeScore -= 15;
        sucKhoeDetail = `Lưu Kình Dương (${stars.luu_kinh_duong}) / Lưu Bạch Hổ (${stars.luu_bach_ho}) hạn chiếu. Cẩn trọng di chuyển xe cộ, tránh vội vàng va chạm nhỏ và chú ý sức khỏe bản thân.`;
        keyAlerts.push({
            type: 'warning',
            title: 'Cảnh Báo Di Chuyển & Sức Khỏe',
            content: `Lưu Kình Dương/Bạch Hổ chiếu Cung Hạn. Hãy chú ý an toàn khi tham gia giao thông và nghỉ ngơi hợp lý.`,
        });
    } else {
        sucKhoeDetail = `Thể trạng và tinh thần dồi dào (${sucKhoeScore}/100). Năng lượng tích cực giúp hoàn thành tốt công việc trong ngày.`;
    }

    // Default safe alert if none triggered
    if (keyAlerts.length === 0) {
        keyAlerts.push({
            type: 'success',
            title: 'Vận Hạn Bình Hòa Cát Tường',
            content: `Ngày ${transits.can_chi_day} (Âm lịch ${transits.lunar_date}): Năng lượng hài hòa, không có sao sát chiếu nặng. Rất thích hợp để thực hiện công việc và nghỉ ngơi.`,
        });
    }

    // Daily Score Computation
    const dailyScore = Math.round((taiLocScore + congDanhScore + tinhCamScore + sucKhoeScore) / 4);

    let dailyRatingLabel = 'Ngày Cát Tường (Tốt)';
    if (dailyScore >= 85) dailyRatingLabel = 'Ngày Đại Cát (Rất Tốt)';
    else if (dailyScore >= 72) dailyRatingLabel = 'Ngày Cát Tường (Tốt)';
    else if (dailyScore >= 58) dailyRatingLabel = 'Ngày Bình Hòa';
    else dailyRatingLabel = 'Ngày Cần Thận Trọng';

    // Daily Auspicious Tips
    auspiciousTips.push(`Tận dụng các khung giờ Hoàng Đạo: ${transits.hoang_dao_hours.slice(0, 3).join(', ')} để triển khai các việc quan trọng.`);
    auspiciousTips.push(`Cung Lưu Nhật tại ${transits.palaces_transit.luu_nhat}: Giữ thái độ hòa nhã, giao tiếp tự tin để đón nhận vượng khí.`);

    // Monthly & Annual Forecasts
    const monthlyForecast = {
        title: `Tử Vi Tháng ${transits.lunar_details.month} Âm Lịch (${transits.can_chi_month})`,
        summary: `Tháng ${transits.can_chi_month} có Cung Lưu Nguyệt tại ${transits.palaces_transit.luu_nguyet}. Lưu Thái Tuế tại ${stars.luu_thai_tue} kết hợp Tứ Hóa Lưu Niên (${stars.luu_tu_hoa.loc} Hóa Lộc, ${stars.luu_tu_hoa.quyen} Hóa Quyền). Đây là khoảng thời gian tốt để củng cố nền tảng sự nghiệp và tài chính.`,
    };

    const annualForecast = {
        title: `Tử Vi Năm ${transits.lunar_details.year} (${transits.can_chi_year})`,
        summary: `Năm ${transits.can_chi_year} mang lại nhiều chuyển biến tích cực. Cung Lưu Niên tại ${transits.palaces_transit.luu_nien} cùng các sao Lưu Lộc Tồn (${stars.luu_loc_ton}), Lưu Thiên Mã (${stars.luu_thien_ma}) mở ra vận hội giao thương và phát triển bản thân.`,
    };

    return {
        person: {
            full_name: personInput.full_name || 'Người dùng',
            birthday: personInput.birthday,
            birth_time: personInput.birth_time,
            gender: personInput.gender,
            can_chi: profile.can_chi,
            cung_phi: profile.cung_phi,
            nap_am: profile.nap_am,
        },
        target_date: transits.target_date,
        lunar_date: transits.lunar_date,
        can_chi_day: transits.can_chi_day,
        can_chi_month: transits.can_chi_month,
        can_chi_year: transits.can_chi_year,
        palaces_transit: transits.palaces_transit,
        daily_forecast: {
            overall_score: Math.min(100, Math.max(30, dailyScore)),
            rating_label: dailyRatingLabel,
            scores_breakdown: {
                tai_loc: Math.min(100, Math.max(30, taiLocScore)),
                cong_danh: Math.min(100, Math.max(30, congDanhScore)),
                tinh_cam: Math.min(100, Math.max(30, tinhCamScore)),
                suc_khoe: Math.min(100, Math.max(30, sucKhoeScore)),
            },
            aspect_details: {
                tai_loc: taiLocDetail,
                cong_danh: congDanhDetail,
                tinh_cam: tinhCamDetail,
                suc_khoe: sucKhoeDetail,
            },
            key_alerts: keyAlerts,
            auspicious_tips: auspiciousTips,
            hoang_dao_hours: transits.hoang_dao_hours,
        },
        monthly_forecast: monthlyForecast,
        annual_forecast: annualForecast,
        transit_stars: transits.transit_stars,
    };
};

module.exports = {
    calculateTransitStars,
    generateRealtimeForecast,
};
