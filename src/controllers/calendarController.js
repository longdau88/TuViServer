const solarlunar = require('solarlunar').default || require('solarlunar');
const { toVietnameseCanChi } = require('../services/astroService');
const { getNapAmByCanChi } = require('../services/displayService');

// Helper to format a single day
const formatDay = (year, month, day) => {
    const sl = solarlunar.solar2lunar(year, month, day);
    if (!sl || sl === -1) return null; // Invalid date

    const canChiYear = toVietnameseCanChi(sl.gzYear) || sl.gzYear;
    const canChiMonth = toVietnameseCanChi(sl.gzMonth) || sl.gzMonth;
    const canChiDay = toVietnameseCanChi(sl.gzDay) || sl.gzDay;

    // Giờ Hoàng Đạo
    const chiNgay = canChiDay.split(' ')[1]; // Tý, Sửu, ...
    let gioHoangDao = '';
    if (['Tý', 'Ngọ'].includes(chiNgay)) gioHoangDao = 'Tý (23g-1g), Sửu (1g-3g), Mão (5g-7g), Ngọ (11g-13g), Thân (15g-17g), Dậu (17g-19g)';
    else if (['Sửu', 'Mùi'].includes(chiNgay)) gioHoangDao = 'Dần (3g-5g), Mão (5g-7g), Tỵ (9g-11g), Thân (15g-17g), Tuất (19g-21g), Hợi (21g-23g)';
    else if (['Dần', 'Thân'].includes(chiNgay)) gioHoangDao = 'Tý (23g-1g), Sửu (1g-3g), Thìn (7g-9g), Tỵ (9g-11g), Mùi (13g-15g), Tuất (19g-21g)';
    else if (['Mão', 'Dậu'].includes(chiNgay)) gioHoangDao = 'Tý (23g-1g), Dần (3g-5g), Mão (5g-7g), Ngọ (11g-13g), Mùi (13g-15g), Dậu (17g-19g)';
    else if (['Thìn', 'Tuất'].includes(chiNgay)) gioHoangDao = 'Dần (3g-5g), Thìn (7g-9g), Tỵ (9g-11g), Thân (15g-17g), Dậu (17g-19g), Hợi (21g-23g)';
    else if (['Tỵ', 'Hợi'].includes(chiNgay)) gioHoangDao = 'Sửu (1g-3g), Thìn (7g-9g), Ngọ (11g-13g), Mùi (13g-15g), Tuất (19g-21g), Hợi (21g-23g)';

    // Check if lunar month is large (30 days)
    const sl30 = solarlunar.solar2lunar(year, month, day + (30 - sl.lDay));
    const isLargeMonth = sl30 && sl30.lMonth === sl.lMonth && sl30.lDay === 30;

    const quotes = [
        "Stephen Hawking là nhà vật lý học, tác giả người Anh, khởi xướng nền vũ trụ học dựa trên thuyết tương đối và cơ học lượng tử.",
        "Thiên tài 1% là cảm hứng và 99% là mồ hôi. - Thomas Edison",
        "Cách tốt nhất để dự đoán tương lai là tạo ra nó. - Abraham Lincoln",
        "Cuộc sống là một cuộc phiêu lưu táo bạo hoặc không là gì cả. - Helen Keller"
    ];
    const quote = quotes[(year + month + day) % quotes.length];

    const saos = ['Giác', 'Cang', 'Đê', 'Phòng', 'Tâm', 'Vĩ', 'Cơ', 'Đẩu', 'Ngưu', 'Nữ', 'Hư', 'Nguy', 'Thất', 'Bích', 'Khuê', 'Lâu', 'Vị', 'Mão', 'Tất', 'Chủy', 'Sâm', 'Tỉnh', 'Quỷ', 'Liễu', 'Tinh', 'Trương', 'Dực', 'Chẩn'];
    const trucs = ['Kiến', 'Trừ', 'Mãn', 'Bình', 'Định', 'Chấp', 'Phá', 'Nguy', 'Thành', 'Thâu', 'Khai', 'Bế'];
    
    return {
        solar: { year: sl.cYear, month: sl.cMonth, day: sl.cDay, isToday: sl.isToday },
        lunar: { year: sl.lYear, month: sl.lMonth, day: sl.lDay, isLeap: sl.isLeap, isLarge: isLargeMonth },
        canChi: { year: canChiYear, month: canChiMonth, day: canChiDay },
        napAm: {
            year: getNapAmByCanChi(canChiYear) || 'Không rõ',
            month: getNapAmByCanChi(canChiMonth) || 'Không rõ',
            day: getNapAmByCanChi(canChiDay) || 'Không rõ',
        },
        nWeek: sl.nWeek,
        term: sl.term || null,
        gioHoangDao,
        quote,
        sao: saos[(sl.cYear + sl.cMonth + sl.cDay) % 28],
        truc: trucs[(sl.cYear + sl.cMonth + sl.cDay) % 12],
    };
};

exports.getToday = (req, res) => {
    const today = new Date();
    const data = formatDay(today.getFullYear(), today.getMonth() + 1, today.getDate());
    return res.json({ status: 200, error: 0, message: 'OK', data });
};

exports.getMonth = (req, res) => {
    const year = parseInt(req.query.year);
    const month = parseInt(req.query.month);

    if (!year || !month || month < 1 || month > 12) {
        return res.status(400).json({ status: 400, error: 1, message: 'Invalid year or month' });
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    const data = [];
    for (let day = 1; day <= daysInMonth; day++) {
        data.push(formatDay(year, month, day));
    }

    return res.json({ status: 200, error: 0, message: 'OK', data });
};

exports.getYear = (req, res) => {
    const year = parseInt(req.query.year);

    if (!year) {
        return res.status(400).json({ status: 400, error: 1, message: 'Invalid year' });
    }

    const data = [];
    // Just return 12 months array
    for (let m = 1; m <= 12; m++) {
        const daysInMonth = new Date(year, m, 0).getDate();
        const monthData = [];
        for (let day = 1; day <= daysInMonth; day++) {
            monthData.push(formatDay(year, m, day));
        }
        data.push(monthData);
    }

    return res.json({ status: 200, error: 0, message: 'OK', data });
};

exports.convertDate = (req, res) => {
    const { date, type } = req.query; // type: solar2lunar or lunar2solar
    if (!date || !type) {
        return res.status(400).json({ status: 400, error: 1, message: 'Missing date or type' });
    }

    const parts = date.split('-');
    if (parts.length !== 3) {
        return res.status(400).json({ status: 400, error: 1, message: 'Invalid date format YYYY-MM-DD' });
    }

    const y = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    const d = parseInt(parts[2]);

    let sl;
    if (type === 'solar2lunar') {
        sl = solarlunar.solar2lunar(y, m, d);
    } else if (type === 'lunar2solar') {
        // solarlunar uses lunar2solar(y, m, d, isLeapMonth)
        const isLeap = req.query.isLeap === 'true';
        sl = solarlunar.lunar2solar(y, m, d, isLeap);
    } else {
        return res.status(400).json({ status: 400, error: 1, message: 'Invalid type' });
    }

    if (!sl || sl === -1) {
        return res.status(400).json({ status: 400, error: 1, message: 'Conversion failed' });
    }

    // Return formatDay representation of the target solar date
    const data = formatDay(sl.cYear, sl.cMonth, sl.cDay);
    return res.json({ status: 200, error: 0, message: 'OK', data });
};

exports.getCalendarGrid = (req, res) => {
    const year = parseInt(req.query.year);
    const month = parseInt(req.query.month);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ status: 400, error: 1, message: 'Invalid year or month' });
    }

    const result = [];
    const firstDay = new Date(year, month - 1, 1);
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6; 

    const startDate = new Date(year, month - 1, 1 - startOffset);

    for (let i = 0; i < 42; i++) {
        const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
        const d = formatDay(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());
        if (d) {
            d.isCurrentMonth = (currentDate.getMonth() + 1 === month);
            result.push(d);
        }
    }

    return res.json({ status: 200, error: 0, message: 'OK', data: result });
};
