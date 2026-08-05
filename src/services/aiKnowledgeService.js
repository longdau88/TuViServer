const fs = require('fs');
const path = require('path');

const KNOWLEDGE_FILE_PATH = path.join(__dirname, '../data/aiKnowledgeBase.json');

const KNOWLEDGE_DIR = path.join(__dirname, '../data/knowledge');

/**
 * Get Custom Knowledge from aiKnowledgeBase.json
 */
const getCustomKnowledge = () => {
    try {
        if (!fs.existsSync(KNOWLEDGE_FILE_PATH)) {
            return [];
        }
        const data = fs.readFileSync(KNOWLEDGE_FILE_PATH, 'utf8');
        return JSON.parse(data || '[]');
    } catch (err) {
        console.error('getCustomKnowledge error:', err);
        return [];
    }
};

/**
 * Save custom knowledge array to JSON file
 */
const saveCustomKnowledge = (items) => {
    try {
        fs.writeFileSync(KNOWLEDGE_FILE_PATH, JSON.stringify(items, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('saveCustomKnowledge error:', err);
        return false;
    }
};

/**
 * Get Static Knowledge from all JSON files in src/data/knowledge/
 */
const getStaticKnowledge = () => {
    let staticItems = [];
    try {
        if (fs.existsSync(KNOWLEDGE_DIR)) {
            const files = fs.readdirSync(KNOWLEDGE_DIR);
            files.forEach(file => {
                if (file.endsWith('.json')) {
                    const filePath = path.join(KNOWLEDGE_DIR, file);
                    const data = fs.readFileSync(filePath, 'utf8');
                    const parsed = JSON.parse(data || '[]');
                    if (Array.isArray(parsed)) {
                        staticItems = staticItems.concat(parsed);
                    }
                }
            });
        }
    } catch (err) {
        console.error('getStaticKnowledge error:', err);
    }
    return staticItems;
};

/**
 * Load all knowledge items (Static + Custom)
 */
const getAllKnowledge = () => {
    const custom = getCustomKnowledge();
    const staticData = getStaticKnowledge();
    return custom.concat(staticData);
};

const vectorDbService = require('./vectorDbService');

/**
 * Search Knowledge Base for relevant knowledge nodes using Hybrid Search (Semantic + Keyword)
 */
const searchKnowledgeAsync = async (query) => {
    if (!query || typeof query !== 'string') return [];

    const qLower = query.trim().toLowerCase();
    const all = getAllKnowledge();
    const matched = [];

    // Lấy vector của câu hỏi
    let queryVector = null;
    try {
        queryVector = await vectorDbService.getEmbedding(qLower);
    } catch (err) {
        console.error('Lỗi khi lấy vector câu hỏi:', err);
    }

    for (const item of all) {
        let score = 0;
        let semanticScore = 0;

        // Semantic Match
        if (queryVector) {
            // Lấy hoặc tạo vector cho nội dung item (kết hợp title và summary)
            const textToEmbed = `${item.title}. ${item.summary}`;
            try {
                const itemVector = await vectorDbService.getOrCreateVector(item.id, textToEmbed);
                semanticScore = vectorDbService.cosineSimilarity(queryVector, itemVector);
                // Cosine similarity trả về -1 đến 1. Chuyển thành điểm 0-100
                score += Math.max(0, semanticScore * 50); 
            } catch(e) {
                console.error('Lỗi khi tính vector item:', e);
            }
        }

        // Keyword matches (vẫn giữ để tạo Hybrid Search tốt hơn)
        if (item.keywords && Array.isArray(item.keywords)) {
            item.keywords.forEach((kw) => {
                const kwLower = kw.toLowerCase();
                if (qLower.includes(kwLower)) {
                    score += 15;
                }
            });
        }

        if (item.title && qLower.includes(item.title.toLowerCase())) {
            score += 20;
        }

        if (item.category && qLower.includes(item.category.toLowerCase())) {
            score += 5;
        }

        // Nếu điểm cao hơn 15 (nghĩa là có semantic match tốt hoặc keyword match)
        if (score > 15) {
            matched.push({ ...item, score, semanticScore });
        }
    }

    // Sort by relevance score descending
    return matched.sort((a, b) => b.score - a.score);
};

// Cũ: Giữ lại bản đồng bộ tạm thời (nếu có chỗ dùng cũ)
const searchKnowledge = (query) => {
    return [];
};

/**
 * Add a new custom Knowledge Item to the Knowledge Base (Admin API)
 */
const addKnowledgeItem = (item) => {
    if (!item || !item.title || !item.details) {
        throw new Error('Thiếu thông tin tri thức (bắt buộc: title, details)');
    }

    const items = getCustomKnowledge();
    const id = item.id || `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newItem = {
        id,
        category: item.category || 'chung',
        keywords: Array.isArray(item.keywords) ? item.keywords : (item.keywords ? item.keywords.split(',').map(s => s.trim()) : []),
        title: item.title,
        summary: item.summary || item.title,
        details: item.details,
        created_at: new Date().toISOString(),
    };

    items.push(newItem);
    saveCustomKnowledge(items);
    return newItem;
};

/**
 * Delete a Knowledge Item from the Custom Knowledge Base (Admin API)
 */
const deleteKnowledgeItem = (id) => {
    let items = getCustomKnowledge();
    const initialLen = items.length;
    items = items.filter(item => item.id !== id);
    if (items.length !== initialLen) {
        saveCustomKnowledge(items);
        return true;
    }
    return false;
};

module.exports = {
    getAllKnowledge,
    searchKnowledge,
    searchKnowledgeAsync,
    addKnowledgeItem,
    deleteKnowledgeItem,
};

