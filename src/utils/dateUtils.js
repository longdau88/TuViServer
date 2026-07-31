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

module.exports = {
    parseDateInput,
    formatDateToYMD,
    normalizeBirthday,
    parseBirthdayDate,
    normalizeBirthTime,
    normalizeBirthTimeForDb,
    resolveBirthDateTime,
};
