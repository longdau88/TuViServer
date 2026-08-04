const aiHoroscopeService = require('../services/aiHoroscopeService');
const aiKnowledgeService = require('../services/aiKnowledgeService');
const { findUserByDeviceId, findUserById } = require('../models/userModel');

/**
 * Controller: Chat with AI Horoscope Assistant (Cross-Platform API)
 */
exports.chatWithAi = async (req, res) => {
    try {
        const body = req.body || {};
        const query = req.query || {};

        const message = body.message || query.message;
        const history = body.history || [];

        if (!message || typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({
                status: 400,
                error: 1,
                message: 'Thiếu tin nhắn người dùng (bắt buộc: message)',
                data: {},
            });
        }

        // Resolve user profile
        let personInput = null;

        if (body.person && body.person.birthday && body.person.birth_time && body.person.gender) {
            personInput = body.person;
        } else if (body.birthday && body.birth_time && body.gender) {
            personInput = {
                full_name: body.full_name || query.full_name || 'Người dùng',
                birthday: body.birthday,
                birth_time: body.birth_time,
                gender: body.gender,
            };
        } else {
            const userId = body.user_id || query.user_id;
            const deviceId = body.device_id || query.device_id;

            let dbUser = null;
            if (userId) {
                dbUser = await findUserById(userId);
            } else if (deviceId) {
                dbUser = await findUserByDeviceId(deviceId);
            }

            if (dbUser && dbUser.birthday && dbUser.birth_time && dbUser.gender) {
                personInput = {
                    full_name: dbUser.full_name || 'Người dùng',
                    birthday: dbUser.birthday,
                    birth_time: dbUser.birth_time,
                    gender: dbUser.gender,
                };
            }
        }

        if (!personInput) {
            personInput = {
                full_name: body.full_name || 'Người dùng',
                birthday: '2000-05-15',
                birth_time: '08:30',
                gender: 'nam',
            };
        }

        // Compute AI Response
        const result = await aiHoroscopeService.generateAiHoroscopeResponse(message, history, personInput);

        res.set('Cache-Control', 'no-cache');
        return res.json({
            status: 200,
            error: 0,
            message: 'OK',
            data: result,
        });
    } catch (error) {
        console.error('chatWithAi error:', error);
        return res.status(500).json({
            status: 500,
            error: 1,
            message: 'Lỗi server khi tương tác với Trợ Lý AI Tử Vi',
            data: {},
        });
    }
};

/**
 * Controller: Get Preset Prompts for AI Chat
 */
exports.getPresetPrompts = (req, res) => {
    return res.json({
        status: 200,
        error: 0,
        message: 'OK',
        data: aiHoroscopeService.PRESET_PROMPTS,
    });
};

/**
 * Controller: Get All Trained Knowledge Items
 */
exports.getKnowledgeList = (req, res) => {
    const list = aiKnowledgeService.getAllKnowledge();
    return res.json({
        status: 200,
        error: 0,
        message: 'OK',
        total: list.length,
        data: list,
    });
};

/**
 * Controller: Train/Add New Knowledge Item to AI Knowledge Base (Admin API)
 */
exports.addKnowledge = (req, res) => {
    try {
        const body = req.body || {};
        if (!body.title || !body.details) {
            return res.status(400).json({
                status: 400,
                error: 1,
                message: 'Thiếu thông tin tri thức (bắt buộc: title, details)',
                data: {},
            });
        }

        const added = aiKnowledgeService.addKnowledgeItem(body);
        return res.json({
            status: 200,
            error: 0,
            message: 'Đã nạp tri thức thành công vào AI Knowledge Base!',
            data: added,
        });
    } catch (err) {
        console.error('addKnowledge error:', err);
        return res.status(500).json({
            status: 500,
            error: 1,
            message: err.message || 'Lỗi nạp tri thức',
            data: {},
        });
    }
};
