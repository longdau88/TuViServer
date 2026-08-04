const fs = require('fs');
const path = require('path');

const KNOWLEDGE_FILE_PATH = path.join(__dirname, '../data/aiKnowledgeBase.json');

/**
 * Load all knowledge items from JSON file
 */
const getAllKnowledge = () => {
    try {
        if (!fs.existsSync(KNOWLEDGE_FILE_PATH)) {
            return [];
        }
        const data = fs.readFileSync(KNOWLEDGE_FILE_PATH, 'utf8');
        return JSON.parse(data || '[]');
    } catch (err) {
        console.error('getAllKnowledge error:', err);
        return [];
    }
};

/**
 * Save knowledge array to JSON file
 */
const saveAllKnowledge = (items) => {
    try {
        fs.writeFileSync(KNOWLEDGE_FILE_PATH, JSON.stringify(items, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('saveAllKnowledge error:', err);
        return false;
    }
};

/**
 * Search Knowledge Base for relevant knowledge nodes (RAG Search)
 */
const searchKnowledge = (query) => {
    if (!query || typeof query !== 'string') return [];

    const qLower = query.trim().toLowerCase();
    const all = getAllKnowledge();

    const matched = [];

    all.forEach((item) => {
        let score = 0;

        // Keyword matches
        if (item.keywords && Array.isArray(item.keywords)) {
            item.keywords.forEach((kw) => {
                const kwLower = kw.toLowerCase();
                if (qLower.includes(kwLower)) {
                    score += 10;
                }
            });
        }

        // Title matches
        if (item.title && qLower.includes(item.title.toLowerCase())) {
            score += 15;
        }

        // Category matches
        if (item.category && qLower.includes(item.category.toLowerCase())) {
            score += 5;
        }

        if (score > 0) {
            matched.push({ ...item, score });
        }
    });

    // Sort by relevance score descending
    return matched.sort((a, b) => b.score - a.score);
};

/**
 * Add a new custom Knowledge Item to the Knowledge Base (Admin API)
 */
const addKnowledgeItem = (item) => {
    if (!item || !item.title || !item.details) {
        throw new Error('Thiếu thông tin tri thức (bắt buộc: title, details)');
    }

    const items = getAllKnowledge();
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
    saveAllKnowledge(items);
    return newItem;
};

/**
 * Delete a Knowledge Item from the Knowledge Base (Admin API)
 */
const deleteKnowledgeItem = (id) => {
    let items = getAllKnowledge();
    const initialLen = items.length;
    items = items.filter(item => item.id !== id);
    if (items.length !== initialLen) {
        saveAllKnowledge(items);
        return true;
    }
    return false;
};

module.exports = {
    getAllKnowledge,
    searchKnowledge,
    addKnowledgeItem,
    deleteKnowledgeItem,
};

