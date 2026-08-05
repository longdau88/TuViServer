const fs = require('fs');
const path = require('path');

let pipeline;
try {
    const transformers = require('@xenova/transformers');
    pipeline = transformers.pipeline;
} catch (e) {
    console.error('[VectorDB] @xenova/transformers not installed yet.');
}

class VectorDBService {
    constructor() {
        this.embedder = null;
        this.cachePath = path.join(__dirname, '../data/vector_cache.json');
        this.vectors = new Map();
        this.isReady = false;
        this.initPromise = null;
        
        if (pipeline) {
            this.initPromise = this.init();
        }
    }

    async init() {
        try {
            // Load pre-computed vectors if any
            if (fs.existsSync(this.cachePath)) {
                const data = fs.readFileSync(this.cachePath, 'utf8');
                const parsed = JSON.parse(data || '[]');
                parsed.forEach(item => {
                    this.vectors.set(item.id, item.vector);
                });
                console.log(`[VectorDB] Loaded ${this.vectors.size} cached vectors.`);
            }

            // Using paraphrase-multilingual-MiniLM-L12-v2 for Vietnamese
            console.log('[VectorDB] Loading embedding model (first run might take a minute to download weights)...');
            this.embedder = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2', {
                quantized: true, // Use int8 for faster download (~110MB)
            });
            this.isReady = true;
            console.log('[VectorDB] Embedding model loaded successfully.');
        } catch (err) {
            console.error('[VectorDB] Init error:', err);
        }
    }

    async getEmbedding(text) {
        if (!this.isReady || !this.embedder) {
            // Wait a bit if not ready
            for(let i=0; i<30; i++) {
                if(this.isReady) break;
                await new Promise(r => setTimeout(r, 1000));
            }
            if (!this.isReady) throw new Error("Embedding model not ready yet");
        }
        
        const output = await this.embedder(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
    }

    cosineSimilarity(vecA, vecB) {
        let dotProduct = 0.0;
        let normA = 0.0;
        let normB = 0.0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    async getOrCreateVector(id, text) {
        if (this.vectors.has(id)) {
            return this.vectors.get(id);
        }
        const vec = await this.getEmbedding(text);
        this.vectors.set(id, vec);
        // Debounce or save immediately
        this.saveCache();
        return vec;
    }

    saveCache() {
        try {
            const arr = [];
            this.vectors.forEach((vector, id) => {
                arr.push({ id, vector });
            });
            fs.writeFileSync(this.cachePath, JSON.stringify(arr), 'utf8');
        } catch(err) {
            console.error('[VectorDB] Save cache error:', err);
        }
    }
}

module.exports = new VectorDBService();
