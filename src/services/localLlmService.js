const path = require('path');
const fs = require('fs');

let getLlama;
let LlamaChatSession;

class LocalLlmService {
    constructor() {
        this.llama = null;
        this.model = null;
        this.context = null;
        this.isReady = false;
        this.initPromise = null;
        
        const modelPath = path.join(__dirname, '../data/models/qwen2-1.5b.gguf');
        this.modelPath = modelPath;

        this.initPromise = this.init();
    }

    async init() {
        try {
            if (!getLlama) {
                const llama = await import('node-llama-cpp');
                getLlama = llama.getLlama;
                LlamaChatSession = llama.LlamaChatSession;
            }
            if (!fs.existsSync(this.modelPath)) {
                console.log('[LocalLLM] Model file not found at:', this.modelPath);
                return;
            }
            const stat = fs.statSync(this.modelPath);
            // Qwen2-1.5b is ~986MB.
            if (stat.size < 900000000) {
                console.log('[LocalLLM] Model file is still downloading... Size:', stat.size);
                return;
            }
            console.log('[LocalLLM] Initializing Llama Engine...');
            this.llama = await getLlama();
            
            console.log('[LocalLLM] Loading model (this may take a few seconds)...');
            this.model = await this.llama.loadModel({
                modelPath: this.modelPath
            });

            this.context = await this.model.createContext();
            
            this.isReady = true;
            console.log('[LocalLLM] Model loaded successfully. 100% Offline Generation Ready.');
        } catch (err) {
            console.error('[LocalLLM] Init error:', err);
        }
    }

    async generateResponse(userMessage, systemPrompt = '') {
        if (!this.isReady) {
            // Wait for up to 30 seconds if it's still downloading/initializing
            for(let i=0; i<30; i++) {
                if (this.isReady) break;
                await new Promise(r => setTimeout(r, 1000));
            }
            if (!this.isReady) {
                return "[Hệ thống AI Offline đang tải mô hình ngôn ngữ hoặc chưa sẵn sàng. Vui lòng thử lại sau.]";
            }
        }

        let sequence = null;
        try {
            sequence = this.context.getSequence();
            const session = new LlamaChatSession({
                contextSequence: sequence,
                systemPrompt: systemPrompt
            });

            console.log('[LocalLLM] Generating response...');
            const response = await session.prompt(userMessage, {
                maxTokens: 512,
                temperature: 0.8,
                topK: 40,
                topP: 0.9,
                repeatPenalty: 1.15
            });
            
            return response;
        } catch (err) {
            console.error('[LocalLLM] Generation error:', err);
            return "[Lỗi phát sinh khi chạy LLM Offline]";
        } finally {
            if (sequence) {
                try {
                    sequence.dispose();
                } catch(e) {
                    console.error('[LocalLLM] Sequence dispose error:', e);
                }
            }
        }
    }
}

module.exports = new LocalLlmService();
