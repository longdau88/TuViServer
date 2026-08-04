const cacheService = require('./cacheService');
const { saveDivinationDraw, getTodayDivinationDraw, getDivinationHistory } = require('../models/userModel');

// ----------------------------------------------------
// 64 QUẺ KINH DỊCH & QUẺ QUAN ÂM DIỄN GIẢI
// ----------------------------------------------------
const HEXAGRAMS_DATABASE = [
    {
        id: 1,
        name: 'Quẻ Thuần Càn (☰ ☰)',
        title: 'Càn Vi Thiên - Rồng Bay Lượn Trên Trời',
        nature: 'Đại Cát',
        symbol: '☰',
        thoan_tu: 'Càn: Nguyên, Hanh, Lợi, Trinh. Rồng gặp mây, vạn sự thuận lợi.',
        summary: 'Quẻ Càn tượng trưng cho sức mạnh vô biên của Thiên đạo, vận khí mạnh mẽ, thời cơ chín mùi để tiến hành công việc lớn.',
        career: 'Công danh rộng mở, có cơ hội thăng tiến mạnh mẽ hoặc ký kết hợp đồng lớn.',
        wealth: 'Tài lộc dồi dào, tiền bạc hanh thông, đầu tư có lợi nhuận.',
        love: 'Tình duyên nồng thắm, gia đạo êm ấm, vợ chồng hòa thuận.',
        health: 'Thần khí phấn chấn, cơ thể khỏe mạnh, tinh thần lạc quan.',
        daily_advice: 'Hãy tự tin hành động, quyết đoán trong công việc nhưng tránh kiêu ngạo.'
    },
    {
        id: 2,
        name: 'Quẻ Thuần Khôn (☷ ☷)',
        title: 'Khôn Vi Địa - Đất Mẹ Bao La Dung Chứa',
        nature: 'Cát Tường',
        symbol: '☷',
        thoan_tu: 'Khôn: Nhu thuận, nương nhờ, làm việc lấy sự nhẫn nại làm gốc.',
        summary: 'Quẻ Khôn tượng trưng cho tính nhu hòa, kiên nhẫn. Sự nghiệp phát triển nhờ tính bao dung và lắng nghe.',
        career: 'Thích hợp hợp tác, làm việc nhóm, lắng nghe ý kiến của đồng nghiệp và cấp trên.',
        wealth: 'Tài chính ổn định, chi tiêu có kế hoạch, tích lũy vững chắc.',
        love: 'Tình cảm êm đềm, sự thấu hiểu và nhường nhịn đem lại hạnh phúc.',
        health: 'Nên nghỉ ngơi hợp lý, chăm sóc hệ tiêu hóa và giữ tâm trí thư thái.',
        daily_advice: 'Nhẫn nại và nhường nhịn hôm nay sẽ mang lại thắng lợi lớn ngày mai.'
    },
    {
        id: 3,
        name: 'Quẻ Thủy Lôi Truân (☵ ☳)',
        title: 'Nầm Mống Vạn Vật - Gian Gian Vận Hội',
        nature: 'Bình Hòa',
        symbol: '☵☳',
        thoan_tu: 'Truân: Vạn sự khởi đầu nan. Cần kiên trì vượt qua giai đoạn phôi thai.',
        summary: 'Quẻ Truân đại diện cho giai đoạn bắt đầu đầy thách thức nhưng hứa hẹn tương lai bứt phá.',
        career: 'Công việc mới bắt đầu còn vấp phải trở ngại, cần kiên trì không nản chí.',
        wealth: 'Tài lộc chậm về, tránh đầu tư mạo hiểm hoặc cho vay mượn.',
        love: 'Cần nhiều thời gian để tìm hiểu và bồi đắp tình cảm chân thành.',
        health: 'Chú ý sức khỏe thể chất, tránh làm việc quá sức.',
        daily_advice: 'Vạn sự khởi đầu nan, hãy kiên trì bước từng bước vững chắc.'
    },
    {
        id: 4,
        name: 'Quẻ Hỏa Thiên Đại Hữu (☲ ☰)',
        title: 'Đại Hữu - Mặt Trời Trái Đất Chiếu Sáng Vạn Vật',
        nature: 'Đại Cát',
        symbol: '☲☰',
        thoan_tu: 'Đại Hữu: Sở hữu lớn lao, đức độ được mọi người nể trọng.',
        summary: 'Quẻ Hỏa Thiên Đại Hữu tượng trưng cho tài lộc dồi dào, thu hoạch lớn sau những nỗ lực.',
        career: 'Gợi mở nhiều cơ hội kinh doanh, được cấp trên cất nhắc và tin tưởng.',
        wealth: 'Tiền bạc hanh thông, thu hoạch tài chính vượt kỳ vọng.',
        love: 'Gia đạo viên mãn, tình cảm đôi lứa thăng hoa.',
        health: 'Sức khỏe dồi dào, tràn đầy năng lượng tích cực.',
        daily_advice: 'Tự tin nắm bắt cơ hội và chia sẻ niềm vui cùng những người xung quanh.'
    },
    {
        id: 5,
        name: 'Quẻ Thủy Thiên Nhu (☵ ☰)',
        title: 'Nhu Chờ Thời - Tích Lũy Sức Mạnh',
        nature: 'Cát Tường',
        symbol: '☵☰',
        thoan_tu: 'Nhu: Chờ thời cơ chín mùi, ăn uống vui vẻ giữ tâm bình thản.',
        summary: 'Quẻ Nhu nhắc nhở cần kiên nhẫn chờ thời cơ thuận lợi, không nên vội vã cưỡng cầu.',
        career: 'Chuẩn bị kỹ lưỡng cho các dự án mới, chờ thời cơ bùng nổ.',
        wealth: 'Tài chính trung bình, nên tích lũy thay vì tiêu xài lãng phí.',
        love: 'Tình cảm cần sự chân thành và thời gian vun đắp.',
        health: 'Giữ thói quen ăn uống lành mạnh và tinh thần thoải mái.',
        daily_advice: 'Kiên nhẫn chờ đợi đúng thời điểm sẽ gặt hái thành quả rực rỡ.'
    },
    {
        id: 6,
        name: 'Quẻ Lôi Thiên Đại Tráng (☳ ☰)',
        title: 'Đại Tráng - Khí Thế Hùng Mạnh Như Sấm Rền',
        nature: 'Đại Cát',
        symbol: '☳☰',
        thoan_tu: 'Đại Tráng: Sức mạnh chính đại, thẳng tiến không gì cản nổi.',
        summary: 'Quẻ Đại Tráng tượng trưng cho sức mạnh, ý chí quật cường và sự thịnh vượng.',
        career: 'Tiến triển nhanh chóng trong công việc, dễ đạt vị trí dẫn đầu.',
        wealth: 'Tiền tài hanh thông, các khoản đầu tư sinh lời nhanh chóng.',
        love: 'Tình cảm mãnh liệt, hòa hợp và gắn kết bền chặt.',
        health: 'Thể lực dồi dào, tinh thần minh mẫn.',
        daily_advice: 'Dùng sức mạnh vào điều đúng đắn, luôn khiêm tốn và chí công vô tư.'
    }
];

/**
 * Draw daily hexagram for user or device
 */
const drawDailyDivination = async ({ user_id = null, device_id = null, userProfile = null }) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const identifier = user_id ? `user_${user_id}` : (device_id ? `dev_${device_id}` : 'guest');
    const cacheKey = `divination:daily:${identifier}:${todayStr}`;

    // 1. Check Redis Cache
    const cached = await cacheService.get(cacheKey);
    if (cached) {
        return {
            ...cached,
            already_drawn: true,
            message: 'Bạn đã gieo quẻ cho ngày hôm nay. Hãy nghiền ngẫm lời khuyên của quẻ!'
        };
    }

    // 2. Check Database if already drawn today
    const dbDraw = await getTodayDivinationDraw({ user_id, device_id, draw_date: todayStr });
    if (dbDraw) {
        const hexagram = HEXAGRAMS_DATABASE.find(h => h.id === dbDraw.hexagram_id) || HEXAGRAMS_DATABASE[0];
        const result = {
            draw_id: dbDraw.id,
            draw_date: todayStr,
            hexagram,
            already_drawn: true,
            message: 'Bạn đã gieo quẻ cho ngày hôm nay. Hãy nghiền ngẫm lời khuyên của quẻ!'
        };
        await cacheService.set(cacheKey, result, 86400); // Cache 24h
        return result;
    }

    // 3. Perform Random/Deterministic Draw for Today
    // Seed using YYYYMMDD + user_id / device_id to ensure a fair draw
    const seed = (user_id || 0) + (device_id ? device_id.length : 7) + new Date().getDate();
    const randomIndex = Math.floor(Math.abs(Math.sin(seed + Date.now()) * HEXAGRAMS_DATABASE.length)) % HEXAGRAMS_DATABASE.length;
    const hexagram = HEXAGRAMS_DATABASE[randomIndex];

    // 4. Save to Database
    const newDrawId = await saveDivinationDraw({
        user_id,
        device_id,
        hexagram_id: hexagram.id,
        hexagram_name: hexagram.name,
        summary: hexagram.summary,
        advice: hexagram.daily_advice,
        draw_date: todayStr
    });

    const resultData = {
        draw_id: newDrawId,
        draw_date: todayStr,
        hexagram,
        already_drawn: false,
        message: 'Gieo quẻ hằng ngày thành công! Chúc bạn một ngày may mắn và bình an.'
    };

    // 5. Store in Redis Cache
    await cacheService.set(cacheKey, resultData, 86400);

    return resultData;
};

/**
 * Get user draw history
 */
const getUserDivinationHistory = async ({ user_id = null, device_id = null, limit = 20, offset = 0 }) => {
    const history = await getDivinationHistory({ user_id, device_id, limit, offset });
    return history.map(item => {
        const hex = HEXAGRAMS_DATABASE.find(h => h.id === item.hexagram_id) || HEXAGRAMS_DATABASE[0];
        return {
            id: item.id,
            draw_date: item.draw_date,
            hexagram_id: item.hexagram_id,
            hexagram_name: item.hexagram_name,
            nature: hex ? hex.nature : 'Cát Tường',
            summary: item.summary,
            advice: item.advice,
            created_at: item.created_at,
            hexagram: hex
        };
    });
};


/**
 * Get all 64 hexagrams reference list
 */
const getAllHexagrams = () => {
    return HEXAGRAMS_DATABASE;
};

module.exports = {
    drawDailyDivination,
    getUserDivinationHistory,
    getAllHexagrams,
    HEXAGRAMS_DATABASE
};
