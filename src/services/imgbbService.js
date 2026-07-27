const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload';

const createUploadError = (message) => {
    const error = new Error(message);
    error.code = 'AVATAR_UPLOAD_FAILED';
    error.status = 502;
    return error;
};

const createNotConfiguredError = () => {
    const error = new Error('Avatar upload service is not configured');
    error.code = 'IMGBB_NOT_CONFIGURED';
    error.status = 503;
    return error;
};

const sanitizeName = (name) => {
    if (!name || typeof name !== 'string') {
        return 'user-avatar';
    }
    const cleaned = name.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
    return cleaned || 'user-avatar';
};

const uploadImage = async (image, name) => {
    const apiKey = process.env.IMGBB_API_KEY;
    if (!apiKey) {
        throw createNotConfiguredError();
    }

    const body = new URLSearchParams();
    body.append('key', apiKey);
    body.append('image', image);
    body.append('name', sanitizeName(name));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(process.env.IMGBB_UPLOAD_TIMEOUT_MS) || 15000);

    let response;
    try {
        response = await fetch(IMGBB_UPLOAD_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
            signal: controller.signal,
        });
    } catch (error) {
        if (error.name === 'AbortError') {
            throw createUploadError('Avatar upload timed out');
        }
        throw createUploadError('Avatar upload failed');
    } finally {
        clearTimeout(timeout);
    }

    let payload;
    try {
        payload = await response.json();
    } catch {
        throw createUploadError('Avatar upload failed');
    }

    if (!response.ok || !payload?.success) {
        console.warn('[ImgBB] Upload rejected:', payload?.error?.message || response.status);
        throw createUploadError('Avatar upload failed');
    }

    const uploadedUrl = payload.data?.url
        || payload.data?.display_url
        || payload.data?.image?.url
        || null;

    if (!uploadedUrl || !/^https?:\/\//i.test(uploadedUrl)) {
        throw createUploadError('Avatar upload failed');
    }

    return uploadedUrl;
};

module.exports = {
    uploadImage,
};
