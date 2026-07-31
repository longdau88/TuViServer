const STAR_MEANINGS = {
    'Tử Vi': 'Mang ý nghĩa về sự lãnh đạo, uy quyền, danh vọng. Khi đắc địa thể hiện năng lực quản lý xuất chúng, phúc thọ song toàn. Khi hãm địa dễ trở nên bảo thủ, độc đoán.',
    'Thiên Cơ': 'Chủ về trí tuệ, mưu lược, tư duy nhạy bén và khéo léo. Hợp với các ngành kỹ thuật, nghiên cứu, tham mưu.',
    'Thái Dương': 'Tượng trưng cho mặt trời, sự quang minh chính đại, nhiệt huyết và quyền lực. Rất tốt cho nam giới, chủ về công danh sự nghiệp.',
    'Vũ Khúc': 'Là sao tài tinh, chủ về tiền bạc, kinh doanh, sự quyết đoán và uy quyền. Người có Vũ Khúc thường có năng lực quản lý tài chính tốt.',
    'Thiên Đồng': 'Phúc tinh, chủ về sự an nhàn, hưởng thụ, vui vẻ, hòa đồng nhưng đôi khi thiếu tính chiến đấu, cả thèm chóng chán.',
    'Liêm Trinh': 'Đào hoa tinh và tù tinh. Chủ về sự nghiêm minh, nóng nảy nhưng cũng rất nghệ sĩ, khéo léo và có sức hút.',
    'Thiên Phủ': 'Tài tinh và quyền tinh, ví như kho lộc của trời. Chủ về sự giàu có, ổn định, tính cách cẩn trọng, bao dung.',
    'Thái Âm': 'Tượng trưng cho mặt trăng, mẹ, vợ, điền trạch và tài lộc. Rất tốt cho nữ giới, chủ về sự giàu sang, êm ấm.',
    'Tham Lang': 'Chủ về dục vọng, sự đa tài, ngoại giao khéo léo, thích hưởng thụ. Có khả năng về võ thuật, nghệ thuật hoặc tâm linh.',
    'Cự Môn': 'Ám tinh, chủ về ngôn ngữ, tài ăn nói, biện luận nhưng cũng dễ mắc thị phi, rắc rối từ lời nói.',
    'Thiên Tướng': 'Ấn tinh, chủ về sự trung thành, công bằng, thích giúp đỡ người khác. Phù hợp với các công việc phò tá, trợ lý cấp cao.',
    'Thiên Lương': 'Ấm tinh, chủ về tuổi thọ, sự nhân từ, che chở, giáo dục. Thích hợp làm thầy giáo, bác sĩ hoặc các công việc từ thiện.',
    'Thất Sát': 'Quyền tinh, chủ về sự dũng mãnh, quyết liệt, uy phong nhưng cũng nhiều gian truân, thử thách. Rất hợp với võ nghiệp.',
    'Phá Quân': 'Hao tinh, chủ về sự phá tán, thay đổi đột ngột, táo bạo, dám nghĩ dám làm. Thường tiên phong trong các lĩnh vực mới.',
};

const getStarMeaning = (starName) => {
    if (!starName) return null;
    const lowerStarName = starName.toLowerCase();
    for (const key in STAR_MEANINGS) {
        if (lowerStarName.includes(key.toLowerCase())) return STAR_MEANINGS[key];
    }
    return null;
};

const analyzePalace = (palace) => {
    let result = '';
    const chinhTinhs = (palace.chinh_tinh || []).map(s => typeof s === 'object' ? s.ten : s).filter(Boolean);
    
    if (chinhTinhs.length === 0) {
        result += `Cung này là cung **Vô Chính Diệu** (không có sao chính). Tính chất của cung này chịu ảnh hưởng lớn từ các cung đối chiếu và tam hợp. Đây là biểu hiện của sự mềm dẻo, linh hoạt nhưng đôi khi thiếu định hướng rõ ràng và dễ bị tác động bởi môi trường bên ngoài. `;
    } else {
        result += `Tại cung này có sự hội tụ của các chính tinh: **${chinhTinhs.join(', ')}**. `;
        result += `\n\n**Ý nghĩa các Chính Tinh:**`;
        chinhTinhs.forEach(star => {
            const meaning = getStarMeaning(star);
            if (meaning) {
                result += `\n- **${star}**: ${meaning}`;
            }
        });
    }

    if (palace.an_ngu) {
        result += `\n\n**Lưu ý:** Cung này bị ảnh hưởng bởi **${palace.an_ngu}**. Điều này tạo ra sự cản trở, chậm trễ hoặc biến đổi mạnh mẽ tính chất của các sao trong cung. Giai đoạn đầu có thể gặp trắc trở, đòi hỏi sự kiên nhẫn và nỗ lực hơn để đạt được thành tựu ở hậu vận.`;
    }

    return result;
};

const generateTongQuan = (info) => {
    let text = `Lá số của bạn mang mệnh **${info.ban_menh || 'Chưa rõ'}**, thuộc **${info.cuc || 'Chưa rõ'}**. `;
    if (info.am_duong) {
        text += `Âm Dương: **${info.am_duong}**. `;
    }
    
    text += `\n\n**Ý nghĩa Mệnh và Thân:**\n`;
    text += `- **Chủ Mệnh (${info.chu_menh || 'Chưa rõ'})**: Đây là sao cai quản bản mệnh, định hình phần lớn tính cách gốc, tư duy và nền tảng cốt lõi của con người bạn.\n`;
    text += `- **Chủ Thân (${info.chu_than || 'Chưa rõ'})**: Thể hiện xu hướng hành động, sự nghiệp và quá trình phát triển ở nửa đời sau (thường từ 30 tuổi trở đi).\n`;
    if (info.than_cu) {
        text += `- Thân cư **${info.than_cu}**: Cho thấy từ trung vận trở đi, trọng tâm cuộc sống và tâm trí của bạn sẽ tập trung rất nhiều vào khía cạnh của cung này. Môi trường và hoàn cảnh của cung này sẽ tác động mạnh mẽ đến hậu vận của bạn.\n`;
    }

    return text;
};

const generate12Cung = (palaces) => {
    return palaces.map(p => {
        return {
            cung: p.ten_cung,
            cung_goc: p.cung_goc,
            hanh: p.ngu_hanh_cung,
            luan_giai: analyzePalace(p),
        };
    });
};

const generateDaiVan = (palaces, currentAge) => {
    const validPalaces = palaces.filter(p => p.dai_han !== null).sort((a, b) => a.dai_han - b.dai_han);
    
    return validPalaces.map(p => {
        let isCurrent = currentAge >= p.dai_han && currentAge < (p.dai_han + 10);
        return {
            do_tuoi: `${p.dai_han} - ${p.dai_han + 9}`,
            cung: p.cung_goc,
            is_current: isCurrent,
            luan_giai: `Trong giai đoạn từ ${p.dai_han} đến ${p.dai_han + 9} tuổi, đại vận của bạn diễn ra tại cung **${p.cung_goc}**. Đây là khoảng thời gian chịu ảnh hưởng mạnh bởi hoàn cảnh và các sao tại cung này.\n\n` + analyzePalace(p)
        };
    });
};

const generateTieuVan = (palaces, currentLunarBranch) => {
    if (!currentLunarBranch) return null;
    
    const palace = palaces.find(p => p.tieu_han === currentLunarBranch);
    if (!palace) return null;
    
    return {
        nam: currentLunarBranch,
        cung: palace.cung_goc,
        luan_giai: `Năm nay tiểu vận của bạn rơi vào cung **${palace.cung_goc}**. Những sự kiện, niềm vui hay thử thách trong năm sẽ mang đậm sắc thái của cung này.\n\n` + analyzePalace(palace)
    };
};

const generateAll = (info, palaces, currentAge, currentLunarBranch) => {
    return {
        tong_quan: generateTongQuan(info),
        cung_12: generate12Cung(palaces),
        dai_van: generateDaiVan(palaces, currentAge),
        tieu_van: generateTieuVan(palaces, currentLunarBranch)
    };
};

module.exports = {
    generateAll
};
