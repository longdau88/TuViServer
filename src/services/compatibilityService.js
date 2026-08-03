const solarlunar = require('solarlunar').default || require('solarlunar');
const {
    buildAstroProfile,
    toVietnameseCanChi,
    buildCanChi,
    getCungPhi,
    getElementFromCanChi,
} = require('./astroService');

// ----------------------------------------------------
// 1. DATA MAPPINGS & CONSTANTS
// ----------------------------------------------------

const NAP_AM_MAPPING = {
    甲子: { name: 'HẢI TRUNG KIM', element: 'Kim' }, 乙丑: { name: 'HẢI TRUNG KIM', element: 'Kim' },
    丙寅: { name: 'LƯ TRUNG HỎA', element: 'Hỏa' }, 丁卯: { name: 'LƯ TRUNG HỎA', element: 'Hỏa' },
    戊辰: { name: 'ĐẠI LÂM MỘC', element: 'Mộc' }, 己巳: { name: 'ĐẠI LÂM MỘC', element: 'Mộc' },
    庚午: { name: 'LỘ BÀN THỔ', element: 'Thổ' }, 辛未: { name: 'LỘ BÀN THỔ', element: 'Thổ' },
    壬申: { name: 'KIẾM PHONG KIM', element: 'Kim' }, 癸酉: { name: 'KIẾM PHONG KIM', element: 'Kim' },
    甲戌: { name: 'SƠN ĐẦU HỎA', element: 'Hỏa' }, 乙亥: { name: 'SƠN ĐẦU HỎA', element: 'Hỏa' },
    丙子: { name: 'GIẢN HẠ THỦY', element: 'Thủy' }, 丁丑: { name: 'GIẢN HẠ THỦY', element: 'Thủy' },
    戊寅: { name: 'THÀNH ĐẦU THỔ', element: 'Thổ' }, 己卯: { name: 'THÀNH ĐẦU THỔ', element: 'Thổ' },
    庚辰: { name: 'BẠCH LẠP KIM', element: 'Kim' }, 辛巳: { name: 'BẠCH LẠP KIM', element: 'Kim' },
    壬午: { name: 'DƯƠNG LIỄU MỘC', element: 'Mộc' }, 癸未: { name: 'DƯƠNG LIỄU MỘC', element: 'Mộc' },
    甲申: { name: 'TUYỀN TRUNG THỦY', element: 'Thủy' }, 乙酉: { name: 'TUYỀN TRUNG THỦY', element: 'Thủy' },
    丙戌: { name: 'ỐC THƯỢNG THỔ', element: 'Thổ' }, 丁亥: { name: 'ỐC THƯỢNG THỔ', element: 'Thổ' },
    戊子: { name: 'THÍCH LỊCH HỎA', element: 'Hỏa' }, 己丑: { name: 'THÍCH LỊCH HỎA', element: 'Hỏa' },
    庚寅: { name: 'TÒNG BÁ MỘC', element: 'Mộc' }, 辛卯: { name: 'TÒNG BÁ MỘC', element: 'Mộc' },
    壬辰: { name: 'TRƯỜNG LƯU THỦY', element: 'Thủy' }, 癸巳: { name: 'TRƯỜNG LƯU THỦY', element: 'Thủy' },
    甲午: { name: 'SA TRUNG KIM', element: 'Kim' }, 乙未: { name: 'SA TRUNG KIM', element: 'Kim' },
    丙申: { name: 'SƠN HẠ HỎA', element: 'Hỏa' }, 丁酉: { name: 'SƠN HẠ HỎA', element: 'Hỏa' },
    戊戌: { name: 'BÌNH ĐỊA MỘC', element: 'Mộc' }, 己亥: { name: 'BÌNH ĐỊA MỘC', element: 'Mộc' },
    庚子: { name: 'BÍCH THƯỢNG THỔ', element: 'Thổ' }, 辛丑: { name: 'BÍCH THƯỢNG THỔ', element: 'Thổ' },
    壬寅: { name: 'KIM BẠCH KIM', element: 'Kim' }, 癸卯: { name: 'KIM BẠCH KIM', element: 'Kim' },
    甲辰: { name: 'PHÚ ĐĂNG HỎA', element: 'Hỏa' }, 乙巳: { name: 'PHÚ ĐĂNG HỎA', element: 'Hỏa' },
    丙午: { name: 'THIÊN HÀ THỦY', element: 'Thủy' }, 丁未: { name: 'THIÊN HÀ THỦY', element: 'Thủy' },
    戊申: { name: 'ĐẠI DỊCH THỔ', element: 'Thổ' }, 己酉: { name: 'ĐẠI DỊCH THỔ', element: 'Thổ' },
    庚戌: { name: 'THOA XUYẾN KIM', element: 'Kim' }, 辛亥: { name: 'THOA XUYẾN KIM', element: 'Kim' },
    壬子: { name: 'TANG ĐỐ MỘC', element: 'Mộc' }, 癸丑: { name: 'TANG ĐỐ MỘC', element: 'Mộc' },
    甲寅: { name: 'ĐẠI KHÊ THỦY', element: 'Thủy' }, 乙卯: { name: 'ĐẠI KHÊ THỦY', element: 'Thủy' },
    丙辰: { name: 'SA TRUNG THỔ', element: 'Thổ' }, 丁巳: { name: 'SA TRUNG THỔ', element: 'Thổ' },
    戊午: { name: 'THIÊN THƯỢNG HỎA', element: 'Hỏa' }, 己未: { name: 'THIÊN THƯỢNG HỎA', element: 'Hỏa' },
    庚申: { name: 'THẠCH LỰU MỘC', element: 'Mộc' }, 辛酉: { name: 'THẠCH LỰU MỘC', element: 'Mộc' },
    壬戌: { name: 'ĐẠI HẢI THỦY', element: 'Thủy' }, 癸亥: { name: 'ĐẠI HẢI THỦY', element: 'Thủy' },
};

const ELEMENT_SINH = { Kim: 'Thủy', Thủy: 'Mộc', Mộc: 'Hỏa', Hỏa: 'Thổ', Thổ: 'Kim' };
const ELEMENT_KHAC = { Kim: 'Mộc', Mộc: 'Thổ', Thổ: 'Thủy', Thủy: 'Hỏa', Hỏa: 'Kim' };

const STEM_VIETNAMESE = { 甲: 'Giáp', 乙: 'Ất', 丙: 'Bính', 丁: 'Đinh', 戊: 'Mậu', 己: 'Kỷ', 庚: 'Canh', 辛: 'Tân', 壬: 'Nhâm', 癸: 'Quý' };
const BRANCH_VIETNAMESE = { 子: 'Tý', 丑: 'Sửu', 寅: 'Dần', 卯: 'Mão', 辰: 'Thìn', 巳: 'Tỵ', 午: 'Ngọ', 未: 'Mùi', 申: 'Thân', 酉: 'Dậu', 戌: 'Tuất', 亥: 'Hợi' };

const TAM_HOP = [
    new Set(['Tý', 'Thân', 'Thìn']),
    new Set(['Sửu', 'Tỵ', 'Dậu']),
    new Set(['Dần', 'Ngọ', 'Tuất']),
    new Set(['Mão', 'Hợi', 'Mùi']),
];

const LUC_HOP = {
    Tý: 'Sửu', Sửu: 'Tý',
    Dần: 'Hợi', Hợi: 'Dần',
    Mão: 'Tuất', Tuất: 'Mão',
    Thìn: 'Dậu', Dậu: 'Thìn',
    Tỵ: 'Thân', Thân: 'Tỵ',
    Ngọ: 'Mùi', Mùi: 'Ngọ',
};

const LUC_XUNG = {
    Tý: 'Ngọ', Ngọ: 'Tý',
    Sửu: 'Mùi', Mùi: 'Sửu',
    Dần: 'Thân', Thân: 'Dần',
    Mão: 'Dậu', Dậu: 'Mão',
    Thìn: 'Tuất', Tuất: 'Thìn',
    Tỵ: 'Hợi', Hợi: 'Tỵ',
};

const LUC_HAI = {
    Tý: 'Mùi', Mùi: 'Tý',
    Sửu: 'Ngọ', Ngọ: 'Sửu',
    Dần: 'Tỵ', Tỵ: 'Dần',
    Mão: 'Thìn', Thìn: 'Mão',
    Thân: 'Hợi', Hợi: 'Thân',
    Dậu: 'Tuất', Tuất: 'Dậu',
};

const CAN_HOP = {
    Giáp: 'Kỷ', Kỷ: 'Giáp',
    Ất: 'Canh', Canh: 'Ất',
    Bính: 'Tân', Tân: 'Bính',
    Đinh: 'Nhâm', Nhâm: 'Đinh',
    Mậu: 'Quý', Quý: 'Mậu',
};

const CAN_XUNG = {
    Giáp: 'Canh', Canh: 'Giáp',
    Ất: 'Tân', Tân: 'Ất',
    Bính: 'Nhâm', Nhâm: 'Bính',
    Đinh: 'Quý', Quý: 'Đinh',
};

const BAT_TRACH_MATRIX = {
    Càn: { Càn: 'Phục Vị', Khảm: 'Lục Sát', Cấn: 'Thiên Y', Chấn: 'Ngũ Quỷ', Tốn: 'Họa Hại', Ly: 'Tuyệt Mệnh', Khôn: 'Diên Niên', Đoài: 'Sinh Khí' },
    Khảm: { Càn: 'Lục Sát', Khảm: 'Phục Vị', Cấn: 'Ngũ Quỷ', Chấn: 'Thiên Y', Tốn: 'Sinh Khí', Ly: 'Diên Niên', Khôn: 'Tuyệt Mệnh', Đoài: 'Họa Hại' },
    Cấn: { Càn: 'Thiên Y', Khảm: 'Ngũ Quỷ', Cấn: 'Phục Vị', Chấn: 'Lục Sát', Tốn: 'Tuyệt Mệnh', Ly: 'Họa Hại', Khôn: 'Sinh Khí', Đoài: 'Diên Niên' },
    Chấn: { Càn: 'Ngũ Quỷ', Khảm: 'Thiên Y', Cấn: 'Lục Sát', Chấn: 'Phục Vị', Tốn: 'Diên Niên', Ly: 'Sinh Khí', Khôn: 'Họa Hại', Đoài: 'Tuyệt Mệnh' },
    Tốn: { Càn: 'Họa Hại', Khảm: 'Sinh Khí', Cấn: 'Tuyệt Mệnh', Chấn: 'Diên Niên', Tốn: 'Phục Vị', Ly: 'Thiên Y', Khôn: 'Lục Sát', Đoài: 'Ngũ Quỷ' },
    Ly: { Càn: 'Tuyệt Mệnh', Khảm: 'Diên Niên', Cấn: 'Họa Hại', Chấn: 'Sinh Khí', Tốn: 'Thiên Y', Ly: 'Phục Vị', Khôn: 'Lục Sát', Đoài: 'Ngũ Quỷ' },
    Khôn: { Càn: 'Diên Niên', Khảm: 'Tuyệt Mệnh', Cấn: 'Sinh Khí', Chấn: 'Họa Hại', Tốn: 'Lục Sát', Ly: 'Lục Sát', Khôn: 'Phục Vị', Đoài: 'Thiên Y' },
    Đoài: { Càn: 'Sinh Khí', Khảm: 'Họa Hại', Cấn: 'Diên Niên', Chấn: 'Tuyệt Mệnh', Tốn: 'Ngũ Quỷ', Ly: 'Ngũ Quỷ', Khôn: 'Thiên Y', Đoài: 'Phục Vị' },
};

const DU_NIEN_SCORES = {
    'Sinh Khí': { score: 100, label: 'Rất Tốt', type: 'good', description: 'Cung Sinh Khí mang lại vượng khí, tài lộc dồi dào, đường công danh phát triển và gia đạo êm ấm.' },
    'Diên Niên': { score: 90, label: 'Rất Tốt', type: 'good', description: 'Cung Diên Niên (Phúc Đức) chủ về sự gắn kết bền vững, tình cảm hòa thuận, vượt qua khó khăn.' },
    'Thiên Y': { score: 85, label: 'Tốt', type: 'good', description: 'Cung Thiên Y mang lại sức khỏe dồi dào, gia đạo bình an, gặp may mắn trong cuộc sống.' },
    'Phục Vị': { score: 75, label: 'Khá Tốt', type: 'good', description: 'Cung Phục Vị củng cố sức mạnh tinh thần, gia đạo yên ổn, cuộc sống bình yên vững chắc.' },
    'Họa Hại': { score: 40, label: 'Xấu Nhẹ', type: 'bad', description: 'Cung Họa Hại chủ về thị phi, bất đồng ý kiến nhỏ, hao tốn tiền bạc nhẹ.' },
    'Lục Sát': { score: 30, label: 'Xấu', type: 'bad', description: 'Cung Lục Sát chủ về mâu thuẫn, tranh chấp, dễ tạo trục trặc tình cảm hoặc đối ngoại.' },
    'Ngũ Quỷ': { score: 15, label: 'Rất Xấu', type: 'bad', description: 'Cung Ngũ Quỷ chủ về xáo trộn gia đạo, tai tiếng, hao hụt tài lộc.' },
    'Tuyệt Mệnh': { score: 0, label: 'Đại Xấu', type: 'bad', description: 'Cung Tuyệt Mệnh là cung xung khắc nặng nhất, cần sử dụng các biện pháp phong thủy hóa giải.' },
};

// ----------------------------------------------------
// 2. HELPER EVALUATION FUNCTIONS
// ----------------------------------------------------

const evaluateNguHanh = (canChi1, canChi2) => {
    const rawYear1 = canChi1?.raw?.year;
    const rawYear2 = canChi2?.raw?.year;

    const napAm1 = NAP_AM_MAPPING[rawYear1] || { name: 'Không xác định', element: 'Thổ' };
    const napAm2 = NAP_AM_MAPPING[rawYear2] || { name: 'Không xác định', element: 'Thổ' };

    const e1 = napAm1.element;
    const e2 = napAm2.element;

    let score = 60;
    let relationship = 'Bình hòa';
    let detail = '';

    if (e1 === e2) {
        score = 80;
        relationship = 'Tương hòa';
        detail = `Mệnh ${napAm1.name} (${e1}) và Mệnh ${napAm2.name} (${e2}) cùng hành ${e1}, tạo sự đồng điệu, hòa thuận trong cuộc sống.`;
    } else if (ELEMENT_SINH[e1] === e2) {
        score = 100;
        relationship = 'Tương sinh';
        detail = `Mệnh ${napAm1.name} (${e1}) tương sinh cho Mệnh ${napAm2.name} (${e2}), hỗ trợ mang lại may mắn và phát triển.`;
    } else if (ELEMENT_SINH[e2] === e1) {
        score = 100;
        relationship = 'Tương sinh';
        detail = `Mệnh ${napAm2.name} (${e2}) tương sinh cho Mệnh ${napAm1.name} (${e1}), tạo hậu phương vững chắc và bồi đắp năng lượng tích cực.`;
    } else if (ELEMENT_KHAC[e1] === e2) {
        score = 25;
        relationship = 'Tương khắc';
        detail = `Mệnh ${napAm1.name} (${e1}) tương khắc Mệnh ${napAm2.name} (${e2}). Cần nhường nhịn và sử dụng yếu tố Ngũ hành trung gian để hóa giải.`;
    } else if (ELEMENT_KHAC[e2] === e1) {
        score = 25;
        relationship = 'Tương khắc';
        detail = `Mệnh ${napAm2.name} (${e2}) tương khắc Mệnh ${napAm1.name} (${e1}). Cần lắng nghe, thấu hiểu để tránh xung đột không đáng có.`;
    } else {
        detail = `Mệnh ${napAm1.name} (${e1}) và Mệnh ${napAm2.name} (${e2}) bình hòa, không tương sinh cũng không tương khắc.`;
    }

    return {
        score,
        relationship,
        person1_nap_am: napAm1,
        person2_nap_am: napAm2,
        detail,
    };
};

const evaluateCanChi = (canChi1, canChi2) => {
    const rawYear1 = canChi1?.raw?.year;
    const rawYear2 = canChi2?.raw?.year;

    if (!rawYear1 || !rawYear2) {
        return { score: 60, detail: 'Không đủ thông tin Can Chi năm sinh.' };
    }

    const stem1 = STEM_VIETNAMESE[rawYear1[0]] || rawYear1[0];
    const branch1 = BRANCH_VIETNAMESE[rawYear1[1]] || rawYear1[1];

    const stem2 = STEM_VIETNAMESE[rawYear2[0]] || rawYear2[0];
    const branch2 = BRANCH_VIETNAMESE[rawYear2[1]] || rawYear2[1];

    let branchScore = 60;
    let branchStatus = 'Bình hòa';

    const isTamHop = TAM_HOP.some((set) => set.has(branch1) && set.has(branch2));
    if (isTamHop) {
        branchScore = 100;
        branchStatus = 'Tam Hợp';
    } else if (LUC_HOP[branch1] === branch2) {
        branchScore = 90;
        branchStatus = 'Lục Hợp';
    } else if (LUC_XUNG[branch1] === branch2) {
        branchScore = 20;
        branchStatus = 'Lục Xung';
    } else if (LUC_HAI[branch1] === branch2) {
        branchScore = 30;
        branchStatus = 'Lục Hại';
    }

    let stemScore = 60;
    let stemStatus = 'Bình hòa';

    if (CAN_HOP[stem1] === stem2) {
        stemScore = 100;
        stemStatus = 'Tương Hợp';
    } else if (CAN_XUNG[stem1] === stem2) {
        stemScore = 20;
        stemStatus = 'Tương Xung';
    }

    const finalScore = Math.round(branchScore * 0.6 + stemScore * 0.4);

    let detail = `Địa chi: ${branch1} và ${branch2} (${branchStatus}). Thiên can: ${stem1} và ${stem2} (${stemStatus}).`;
    if (isTamHop) {
        detail += ` Hai tuổi thuộc bộ Tam Hợp, vô cùng hợp tính cách và lý tưởng sống.`;
    } else if (LUC_XUNG[branch1] === branch2) {
        detail += ` Hai tuổi thuộc bộ Lục Xung, dễ có những lúc va chạm tính tình nhưng hoàn toàn có thể lắng nghe để tháo gỡ.`;
    }

    return {
        score: finalScore,
        stem_eval: { stem1, stem2, status: stemStatus, score: stemScore },
        branch_eval: { branch1, branch2, status: branchStatus, score: branchScore },
        detail,
    };
};

const evaluateCungPhi = (cungPhi1, cungPhi2) => {
    if (!cungPhi1 || !cungPhi2) {
        return { score: 60, du_nien: 'Phục Vị', detail: 'Không thể tính quẻ Cung Phi.' };
    }

    const duNien = BAT_TRACH_MATRIX[cungPhi1]?.[cungPhi2] || 'Phục Vị';
    const info = DU_NIEN_SCORES[duNien] || DU_NIEN_SCORES['Phục Vị'];

    return {
        score: info.score,
        du_nien: duNien,
        cung_phi_1: cungPhi1,
        cung_phi_2: cungPhi2,
        label: info.label,
        type: info.type,
        detail: `Cung Phi ${cungPhi1} kết hợp với Cung Phi ${cungPhi2} tạo thành quẻ ${duNien} (${info.label}). ${info.description}`,
    };
};

const evaluateTuViStars = (tuVi1, tuVi2) => {
    const chart1 = tuVi1?.chart;
    const chart2 = tuVi2?.chart;

    if (!chart1 || !chart2) {
        return { score: 70, detail: 'Thông tin lá số Tử Vi bình hòa.' };
    }

    const menhPalace1 = chart1.palaces?.find((p) => p.name?.includes('Mệnh') || p.isMenh);
    const menhPalace2 = chart2.palaces?.find((p) => p.name?.includes('Mệnh') || p.isMenh);

    const stars1 = menhPalace1?.chinhTinh || [];
    const stars2 = menhPalace2?.chinhTinh || [];

    const starNames1 = stars1.map((s) => s.name || s);
    const starNames2 = stars2.map((s) => s.name || s);

    let score = 75;
    let detail = `Mệnh người thứ nhất tọa thủ các sao (${starNames1.join(', ') || 'Vô chính diệu'}), người thứ hai tọa thủ các sao (${starNames2.join(', ') || 'Vô chính diệu'}).`;

    const tuVuLiemPhuTuong = ['Tử Vi', 'Vũ Khúc', 'Liêm Trinh', 'Thiên Phủ', 'Thiên Tướng'];
    const satPhaTham = ['Thất Sát', 'Phá Quân', 'Tham Lang'];
    const coNguyetDongLuong = ['Thiên Cơ', 'Thái Âm', 'Thiên Đồng', 'Thiên Lương'];

    const isGroup1_1 = starNames1.some((s) => tuVuLiemPhuTuong.includes(s));
    const isGroup1_2 = starNames2.some((s) => tuVuLiemPhuTuong.includes(s));

    const isGroup2_1 = starNames1.some((s) => satPhaTham.includes(s));
    const isGroup2_2 = starNames2.some((s) => satPhaTham.includes(s));

    const isGroup3_1 = starNames1.some((s) => coNguyetDongLuong.includes(s));
    const isGroup3_2 = starNames2.some((s) => coNguyetDongLuong.includes(s));

    if ((isGroup1_1 && isGroup1_2) || (isGroup2_1 && isGroup2_2) || (isGroup3_1 && isGroup3_2)) {
        score = 90;
        detail += ` Hai lá số có bộ Chính tinh chủ đạo cùng thuộc một cách cục, tư duy và phong cách sống đồng điệu.`;
    } else if ((isGroup1_1 && isGroup3_2) || (isGroup3_1 && isGroup1_2)) {
        score = 85;
        detail += ` Một bên quyết đoán lãnh đạo, một bên ôn hòa hậu thuẫn, tạo nên sự phối hợp nhịp nhàng.`;
    } else if ((isGroup2_1 && isGroup3_2) || (isGroup3_1 && isGroup2_2)) {
        score = 70;
        detail += ` Một bên năng động xông xáo, một bên cẩn trọng nhã nhặn. Cần dung hòa để bổ trợ lẫn nhau.`;
    }

    return {
        score,
        starNames1,
        starNames2,
        detail,
    };
};

const evaluateTuTruBalance = (tuTru1, tuTru2) => {
    const detail1 = tuTru1?.detail;
    const detail2 = tuTru2?.detail;

    if (!detail1 || !detail2) {
        return { score: 70, detail: 'Ngũ hành Tứ trụ cân bằng ở mức trung bình.' };
    }

    const missing1 = detail1.missing || [];
    const missing2 = detail2.missing || [];

    const dominant1 = detail1.dominant || [];
    const dominant2 = detail2.dominant || [];

    let complementCount = 0;
    missing1.forEach((elem) => {
        if (dominant2.includes(elem)) complementCount += 1;
    });
    missing2.forEach((elem) => {
        if (dominant1.includes(elem)) complementCount += 1;
    });

    let score = 70;
    let detail = 'Tứ trụ hai bên ở mức bình hòa.';

    if (complementCount >= 2) {
        score = 95;
        detail = 'Tứ trụ hai người có sự bù trừ Ngũ hành tuyệt vời. Ngũ hành khuyết của người này được năng lượng của người kia bổ trợ dồi dào.';
    } else if (complementCount === 1) {
        score = 85;
        detail = 'Tứ trụ hai bên có điểm bù trừ Ngũ hành tốt, giúp hỗ trợ cân bằng vận khí cho nhau.';
    }

    return {
        score,
        complementCount,
        detail,
    };
};

/**
 * Compute specific score and detailed evaluation for each relationship type
 */
const calculateRelationshipDetail = (type, scores, p1, p2) => {
    const { nguHanh, canChi, cungPhi, tuViStars, tuTruBalance } = scores;

    let score = 60;
    let title = '';
    let icon = '';
    let color = '';

    if (type === 'vo_chong') {
        title = 'Hôn nhân & Tình cảm';
        icon = 'bi-heart-fill';
        color = 'danger';
        // Marriage emphasizes Nạp Âm (30%), Cung Phi (30%), Can Chi (20%), Tử Vi (10%), Tứ Trụ (10%)
        score = Math.round(
            nguHanh.score * 0.30 +
            cungPhi.score * 0.30 +
            canChi.score * 0.20 +
            tuViStars.score * 0.10 +
            tuTruBalance.score * 0.10
        );
    } else if (type === 'doi_tac') {
        title = 'Hợp tác & Làm ăn';
        icon = 'bi-briefcase-fill';
        color = 'primary';
        // Business emphasizes Can Chi (35%), Tứ Trụ (25%), Tử Vi (20%), Nạp Âm (10%), Cung Phi (10%)
        score = Math.round(
            canChi.score * 0.35 +
            tuTruBalance.score * 0.25 +
            tuViStars.score * 0.20 +
            nguHanh.score * 0.10 +
            cungPhi.score * 0.10
        );
    } else if (type === 'cha_me_con') {
        title = 'Gia đình (Cha mẹ - Con cái)';
        icon = 'bi-people-fill';
        color = 'warning';
        // Family emphasizes Nạp Âm (35%), Tứ Trụ (25%), Can Chi (20%), Cung Phi (10%), Tử Vi (10%)
        score = Math.round(
            nguHanh.score * 0.35 +
            tuTruBalance.score * 0.25 +
            canChi.score * 0.20 +
            cungPhi.score * 0.10 +
            tuViStars.score * 0.10
        );
    } else {
        title = 'Bạn bè & Tri kỷ';
        icon = 'bi-hand-thumbsup-fill';
        color = 'info';
        // Friendship emphasizes Can Chi (30%), Tử Vi Stars (30%), Nạp Âm (20%), Cung Phi (10%), Tứ Trụ (10%)
        score = Math.round(
            canChi.score * 0.30 +
            tuViStars.score * 0.30 +
            nguHanh.score * 0.20 +
            cungPhi.score * 0.10 +
            tuTruBalance.score * 0.10
        );
    }

    let ratingLabel = 'Tương Hòa';
    if (score >= 85) ratingLabel = 'Rất Hợp (Tuyệt Hảo)';
    else if (score >= 70) ratingLabel = 'Hợp Tuổi (Tốt)';
    else if (score >= 55) ratingLabel = 'Bình Hòa';
    else if (score >= 40) ratingLabel = 'Cần Thận Trọng';
    else ratingLabel = 'Xung Khắc Nặng';

    let evaluation = '';
    const tips = [];

    if (type === 'vo_chong') {
        if (cungPhi.type === 'bad') {
            evaluation = `Cung Phi kết hợp tạo quẻ ${cungPhi.du_nien} (${cungPhi.label}) cần chú ý hòa giải hướng phòng ngủ/bếp. Mệnh ${nguHanh.relationship.toLowerCase()} giúp cân bằng không khí gia đình.`;
        } else {
            evaluation = `Cung Phi ${cungPhi.du_nien} (${cungPhi.label}) kết hợp Ngũ hành ${nguHanh.relationship.toLowerCase()} mang lại gia đạo êm ấm, tình cảm gắn kết lâu dài.`;
        }
        tips.push('Lắng nghe và tôn trọng ý kiến đối phương trong việc thu vén gia đình.');
        tips.push('Chọn hướng phòng ngủ và màu sắc nội thất tương sinh Ngũ hành để gia tăng vượng khí.');
        if (cungPhi.type === 'bad') {
            tips.push(`Hóa giải quẻ ${cungPhi.du_nien} bằng cách chọn hướng bếp hoặc sinh con năm hợp tuổi cả bố lẫn mẹ.`);
        }
    } else if (type === 'doi_tac') {
        if (canChi.branch_eval.score >= 80) {
            evaluation = `Địa chi ${canChi.branch_eval.branch1} - ${canChi.branch_eval.branch2} (${canChi.branch_eval.status}) rất thuận lợi cho việc ký kết hợp tác, mở rộng công việc kinh doanh.`;
        } else if (canChi.branch_eval.score <= 30) {
            evaluation = `Địa chi thuộc bộ ${canChi.branch_eval.status}. Khi hợp tác cần minh bạch tài chính và quy định rõ trách nhiệm để tránh bất đồng.`;
        } else {
            evaluation = `Mức độ hợp tác kinh doanh bình hòa (${score}/100). Thành công phụ thuộc vào sự phân công công việc rõ ràng.`;
        }
        tips.push('Phân định rõ vai trò: một người chủ trì chiến lược/đối ngoại, một người quản trị tài chính/nội bộ.');
        tips.push('Lập hợp đồng và điều khoản hợp tác rõ ràng từ đầu.');
    } else if (type === 'cha_me_con') {
        evaluation = `Ngũ hành ${nguHanh.relationship.toLowerCase()}, Can chi ${canChi.branch_eval.status}. Tình cảm gia đình cần sự thấu hiểu thế hệ và chia sẻ chân thành.`;
        tips.push('Lắng nghe tâm tư nguyện vọng thay vì áp đặt định hướng cá nhân.');
        tips.push('Tạo dựng môi trường gia đình đầm ấm, khuyến khích sự phát triển tự nhiên.');
    } else {
        evaluation = `Mức độ hòa hợp bạn bè đạt ${score}/100 (${ratingLabel.toLowerCase()}). Dễ dàng chia sẻ góc nhìn cuộc sống và tương trợ khi gặp khó khăn.`;
        tips.push('Chân thành, tin tưởng và giữ lời hứa trong mối quan hệ bạn bè.');
        tips.push('Thẳng thắn góp ý trên tinh thần xây dựng và tôn trọng lẫn nhau.');
    }

    return {
        title,
        icon,
        color,
        score,
        rating_label: ratingLabel,
        evaluation,
        tips,
    };
};

/**
 * Generate Dynamic Relationship Insights for All 4 Types
 */
const generateAllRelationshipInsights = (scores, p1, p2) => {
    return {
        vo_chong: calculateRelationshipDetail('vo_chong', scores, p1, p2),
        doi_tac: calculateRelationshipDetail('doi_tac', scores, p1, p2),
        cha_me_con: calculateRelationshipDetail('cha_me_con', scores, p1, p2),
        ban_be: calculateRelationshipDetail('ban_be', scores, p1, p2),
    };
};

/**
 * Generate Remedies for any conflicts
 */
const generateRemedies = (scores) => {
    const remedies = [];

    if (scores.nguHanh?.score < 50) {
        remedies.push({
            aspect: 'Ngũ Hành Tương Khắc',
            title: 'Hóa giải Ngũ hành bằng yếu tố Trung Gian',
            content: 'Ngũ hành hai người tương khắc. Để hóa giải, hãy ứng dụng hành trung gian trong trang trí nhà cửa, màu sắc hoặc hướng phòng làm việc (Ví dụ: Kim khắc Mộc dùng Thủy; Mộc khắc Thổ dùng Hỏa; Thổ khắc Thủy dùng Kim; Thủy khắc Hỏa dùng Mộc; Hỏa khắc Kim dùng Thổ).',
        });
    }

    if (scores.canChi?.score < 50) {
        remedies.push({
            aspect: 'Địa Chi Xung Khắc',
            title: 'Sử dụng Linh vật Tam Hợp / Lục Hợp',
            content: 'Tuổi hai người rơi vào bộ Lục Xung hoặc Lục Hại. Nên đeo vật phẩm phong thủy thuộc tuổi Tam Hợp hoặc Lục Hợp với một trong hai người để giảm lực xung sát.',
        });
    }

    if (scores.cungPhi?.score < 50) {
        const duNien = scores.cungPhi.du_nien;
        remedies.push({
            aspect: `Quẻ Du Niên (${duNien})`,
            title: 'Hóa giải Bát Trạch Cung Phi',
            content: `Quẻ ${duNien} có thể được hóa giải bằng cách chọn hướng bếp, hướng bàn làm việc, hoặc chọn năm sinh con có Ngũ hành và Cung Phi tương sinh với cả hai người.`,
        });
    }

    return remedies;
};

// ----------------------------------------------------
// 3. MAIN COMPATIBILITY ENGINE ENTRY POINT
// ----------------------------------------------------

const calculateCompatibility = (person1Input, person2Input) => {
    const profile1 = buildAstroProfile(
        person1Input.full_name || 'Người 1',
        person1Input.birthday,
        person1Input.birth_time,
        person1Input.gender
    );

    const profile2 = buildAstroProfile(
        person2Input.full_name || 'Người 2',
        person2Input.birthday,
        person2Input.birth_time,
        person2Input.gender
    );

    const nguHanhEval = evaluateNguHanh(profile1.can_chi_raw, profile2.can_chi_raw);
    const canChiEval = evaluateCanChi(profile1.can_chi_raw, profile2.can_chi_raw);
    const cungPhiEval = evaluateCungPhi(profile1.cung_phi, profile2.cung_phi);
    const tuViEval = evaluateTuViStars(profile1.tu_vi, profile2.tu_vi);
    const tuTruEval = evaluateTuTruBalance(profile1.tu_tru, profile2.tu_tru);

    const totalScore = Math.round(
        nguHanhEval.score * 0.25 +
        canChiEval.score * 0.25 +
        cungPhiEval.score * 0.20 +
        tuViEval.score * 0.20 +
        tuTruEval.score * 0.10
    );

    let ratingLabel = 'Tương Hòa Bình Thường';
    let summaryText = '';

    if (totalScore >= 85) {
        ratingLabel = 'Rất Hợp (Tuyệt Hảo)';
        summaryText = `Hai tuổi có độ xung hợp rất cao (${totalScore}/100). Thiên thời, địa lợi, nhân hòa hội tụ giúp cả hai gặp nhiều may mắn, gia đạo/hợp tác bền vững.`;
    } else if (totalScore >= 70) {
        ratingLabel = 'Hợp Tuổi (Tốt)';
        summaryText = `Hai tuổi hợp nhau khá tốt (${totalScore}/100). Đa số các chỉ số đều tương sinh hoặc hòa hợp, cuộc sống tương trợ lẫn nhau thuận lợi.`;
    } else if (totalScore >= 55) {
        ratingLabel = 'Bình Hòa (Trung Bình)';
        summaryText = `Hai tuổi ở mức bình hòa (${totalScore}/100). Có điểm hợp và cũng có điểm khác biệt, cần thấu hiểu và nhường nhịn để gắn kết dài lâu.`;
    } else if (totalScore >= 40) {
        ratingLabel = 'Cần Thận Trọng (Xung Khắc Nhẹ)';
        summaryText = `Hai tuổi có một số tiêu chí xung khắc (${totalScore}/100). Cần áp dụng các giải pháp phong thủy hóa giải và điều chỉnh cách ứng xử để giữ gìn mối quan hệ.`;
    } else {
        ratingLabel = 'Xung Khắc Nặng';
        summaryText = `Hai tuổi có độ xung khắc cao (${totalScore}/100). Nên chú trọng giải hạn phong thủy (hướng nhà, vật phẩm, sinh con hợp tuổi) và nhường nhịn nhau tối đa.`;
    }

    const scores = { nguHanh: nguHanhEval, canChi: canChiEval, cungPhi: cungPhiEval, tuViStars: tuViEval, tuTruBalance: tuTruEval };
    const relationshipInsights = generateAllRelationshipInsights(scores, person1Input, person2Input);
    const remedies = generateRemedies(scores);

    return {
        overall: {
            score: totalScore,
            rating_label: ratingLabel,
            summary: summaryText,
        },
        person_1: {
            full_name: person1Input.full_name || 'Người 1',
            birthday: person1Input.birthday,
            birth_time: person1Input.birth_time,
            gender: person1Input.gender,
            can_chi: profile1.can_chi,
            cung_phi: profile1.cung_phi,
            nap_am: nguHanhEval.person1_nap_am,
        },
        person_2: {
            full_name: person2Input.full_name || 'Người 2',
            birthday: person2Input.birthday,
            birth_time: person2Input.birth_time,
            gender: person2Input.gender,
            can_chi: profile2.can_chi,
            cung_phi: profile2.cung_phi,
            nap_am: nguHanhEval.person2_nap_am,
        },
        breakdown: {
            ngu_hanh: nguHanhEval,
            can_chi: canChiEval,
            cung_phi: cungPhiEval,
            tu_vi_stars: tuViEval,
            tu_tru_balance: tuTruEval,
        },
        relationship_insights: relationshipInsights,
        remedies,
    };
};

module.exports = {
    evaluateNguHanh,
    evaluateCanChi,
    evaluateCungPhi,
    evaluateTuViStars,
    evaluateTuTruBalance,
    calculateRelationshipDetail,
    generateAllRelationshipInsights,
    generateRemedies,
    calculateCompatibility,
};
