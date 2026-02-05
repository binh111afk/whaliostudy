/**
 * AI Service - Module xử lý gọi AI với Fallback thông minh
 * 
 * Luồng hoạt động:
 * 1. Ưu tiên gọi Gemini 2.5 Flash (model chính)
 * 2. Nếu Gemini lỗi 429 (Rate Limit) -> Tự động chuyển sang DeepSeek V3
 * 3. Nếu cả hai đều lỗi -> Trả về thông báo thân thiện
 * 
 * @author Whalio Team
 * @version 1.0.0
 */

// ======================== IMPORT LIBRARIES ========================
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// ======================== CONSTANTS & CONFIG ========================

/**
 * System Instruction - Định hình tính cách cho bot Whalio
 * Prompt này được đọc từ file whalio_prompt.txt để dễ quản lý
 */
let WHALIO_SYSTEM_INSTRUCTION;

try {
    const promptPath = path.join(__dirname, 'whalio_prompt.txt');
    WHALIO_SYSTEM_INSTRUCTION = fs.readFileSync(promptPath, 'utf8');
    console.log('✅ Đã tải thành công Whalio System Prompt từ file');
} catch (error) {
    console.warn('⚠️ Không thể đọc file whalio_prompt.txt, sử dụng prompt mặc định:', error.message);
    // Fallback prompt ngắn gọn
    WHALIO_SYSTEM_INSTRUCTION = `
### DANH TÍNH & VAI TRÒ
Bạn là **Whalio** – Trợ lý AI thân thiện và hài hước của cộng đồng sinh viên Whalio Study.

### NHIỆM VỤ CHÍNH
1. Hướng dẫn sử dụng các tính năng của website Whalio Study
2. Tư vấn học tập và đời sống cho sinh viên

### GIỚI HẠN
- KHÔNG viết code hoặc giải thích kỹ thuật
- Chỉ hỗ trợ về các tính năng có thật của website

### PHONG CÁCH
- Thân thiện, hài hước, thấu cảm
- Sử dụng ngôn ngữ Gen Z phù hợp
- Đưa ra lời khuyên thẳng thắn nhưng xây dựng
`;
}

/**
 * Timeout cho mỗi request (milliseconds)
 * Nếu AI không phản hồi trong 30 giây -> Chuyển sang model dự phòng
 */
const REQUEST_TIMEOUT = 30000; // 30 seconds

// ======================== INITIALIZATION ========================

/**
 * Khởi tạo Gemini AI Client
 * API Key lấy từ biến môi trường GEMINI_API_KEY
 */
let geminiClient = null;
let geminiModel = null;

try {
    if (process.env.GEMINI_API_KEY) {
        geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        geminiModel = geminiClient.getGenerativeModel({
            model: "gemini-2.5-flash", // Gemini 2.5 Flash - đồng bộ với server.js
            systemInstruction: WHALIO_SYSTEM_INSTRUCTION
        });
        console.log('✅ Gemini AI đã được khởi tạo thành công');
    } else {
        console.warn('⚠️ GEMINI_API_KEY không tồn tại trong .env');
    }
} catch (error) {
    console.error('❌ Lỗi khởi tạo Gemini:', error.message);
}

// 2. Khởi tạo Groq (Fallback 1)
let groqClient = null;

try {
    if (process.env.GROQ_API_KEY) {
        groqClient = new OpenAI({
            apiKey: process.env.GROQ_API_KEY,
            baseURL: 'https://api.groq.com/openai/v1'
        });
        console.log('✅ [Layer 2] Groq AI (Llama 3) đã sẵn sàng');
    } else {
        console.warn('⚠️ Chưa cấu hình GROQ_API_KEY');
    }
} catch (error) {
    console.error('❌ Lỗi khởi tạo Groq:', error.message);
}

/**
 * Khởi tạo DeepSeek AI Client
 * API Key lấy từ biến môi trường DEEPSEEK_API_KEY
 * DeepSeek sử dụng chuẩn OpenAI API, nên ta dùng thư viện 'openai'
 */
let openRouterClient = null;
try {
    if (process.env.OPENROUTER_API_KEY) {
        openRouterClient = new OpenAI({
            apiKey: process.env.OPENROUTER_API_KEY,
            baseURL: 'https://openrouter.ai/api/v1',
            // OpenRouter yêu cầu thêm 2 header này để định danh app của ông (để họ biết ai đang dùng Free)
            defaultHeaders: {
                "HTTP-Referer": "https://whalio.com", // Thay bằng link web của ông (hoặc để vậy cũng được)
                "X-Title": "Whalio Study",
            }
        });
        console.log('✅ [Layer 3] OpenRouter (Free Models) đã sẵn sàng');
    } else {
        console.warn('⚠️ Chưa cấu hình OPENROUTER_API_KEY');
    }
} catch (error) {
    console.error('❌ Lỗi khởi tạo OpenRouter:', error.message);
}

// ======================== CORE FUNCTIONS ========================

/**
 * Gọi Gemini AI để sinh text
 * 
 * @param {string} prompt - Câu hỏi/yêu cầu từ người dùng
 * @returns {Promise<string>} - Câu trả lời từ AI
 * @throws {Error} - Ném lỗi nếu gọi API thất bại
 */
async function callGemini(prompt) {
    if (!geminiModel) {
        throw new Error('GEMINI_NOT_INITIALIZED');
    }

    console.log('🔵 Đang gọi Gemini AI...');

    try {
        // Tạo Promise với timeout
        const geminiPromise = geminiModel.generateContent(prompt);
        
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('TIMEOUT')), REQUEST_TIMEOUT);
        });

        // Race giữa API call và timeout
        const result = await Promise.race([geminiPromise, timeoutPromise]);
        const response = await result.response;
        const text = response.text();

        console.log('✅ Gemini AI phản hồi thành công');
        return text;

    } catch (error) {
        // Xác định loại lỗi
        if (error.message === 'TIMEOUT') {
            console.warn('⏱️ Gemini AI timeout sau 30 giây');
            throw new Error('GEMINI_TIMEOUT');
        }

        // Kiểm tra lỗi 429 (Rate Limit)
        if (error.message && (
            error.message.includes('429') ||
            error.message.includes('RESOURCE_EXHAUSTED') ||
            error.message.includes('quota') ||
            error.message.includes('rate limit')
        )) {
            console.warn('⚠️ Gemini AI bị Rate Limit (429)');
            throw new Error('GEMINI_RATE_LIMIT');
        }

        // Các lỗi khác
        console.error('❌ Lỗi khi gọi Gemini:', error.message);
        throw new Error(`GEMINI_ERROR: ${error.message}`);
    }
}

/**
 * Gọi Groq AI (Llama 3) để sinh text
 * * @param {string} prompt - Câu hỏi/yêu cầu từ người dùng
 * @returns {Promise<string>} - Câu trả lời từ AI
 * @throws {Error} - Ném lỗi nếu gọi API thất bại
 */
async function callGroq(prompt) {
    if (!groqClient) {
        throw new Error('GROQ_NOT_INITIALIZED');
    }

    console.log('🟠 Đang gọi Groq AI (Llama 3)...');

    try {
        // Tạo Promise gọi API
        // Lưu ý: Groq dùng SDK của OpenAI nên cú pháp là chat.completions.create
        const groqPromise = groqClient.chat.completions.create({
            model: "llama-3.3-70b-versatile", // Model mạnh nhất Free của Groq hiện tại
            messages: [
                { role: "system", content: WHALIO_SYSTEM_INSTRUCTION }, // Nhớ đảm bảo biến này đã khai báo ở trên
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 2048
        });
        
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('TIMEOUT')), REQUEST_TIMEOUT);
        });

        // Race giữa API call và timeout
        const completion = await Promise.race([groqPromise, timeoutPromise]);
        const text = completion.choices[0].message.content;

        console.log('✅ Groq AI phản hồi thành công');
        return text;

    } catch (error) {
        // Xác định loại lỗi
        if (error.message === 'TIMEOUT') {
            console.warn('⏱️ Groq AI timeout sau 30 giây');
            throw new Error('GROQ_TIMEOUT');
        }

        // Kiểm tra lỗi 429 (Rate Limit)
        // Thư viện OpenAI thường trả về error.status hoặc message chứa '429'
        if (error.status === 429 || (error.message && (
            error.message.includes('429') ||
            error.message.includes('rate limit') ||
            error.message.includes('quota') ||
            error.message.includes('Too Many Requests')
        ))) {
            console.warn('⚠️ Groq AI bị Rate Limit (429)');
            throw new Error('GROQ_RATE_LIMIT');
        }

        // Các lỗi khác
        console.error('❌ Lỗi khi gọi Groq:', error.message);
        throw new Error(`GROQ_ERROR: ${error.message}`);
    }
}

/**
 * Gọi OpenRouter AI (Gemma 2 - Free) để sinh text
 * Thay thế cho DeepSeek ở vị trí Fallback 2
 * * @param {string} prompt - Câu hỏi/yêu cầu từ người dùng
 * @returns {Promise<string>} - Câu trả lời từ AI
 * @throws {Error} - Ném lỗi nếu gọi API thất bại
 */
async function callOpenRouter(prompt) {
    if (!openRouterClient) {
        throw new Error('OPENROUTER_NOT_INITIALIZED');
    }

    console.log('🔵 [3] Đang gọi OpenRouter (Gemma 2 - Free)...');

    try {
        // Tạo Promise gọi API OpenRouter
        const openRouterPromise = openRouterClient.chat.completions.create({
            model: "google/gemma-2-9b-it:free", // Model miễn phí chất lượng cao của Google
            messages: [
                {
                    role: 'system',
                    content: WHALIO_SYSTEM_INSTRUCTION // Gửi system prompt
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            // OpenRouter đôi khi yêu cầu referer trong header (đã config lúc init), nhưng thêm vào đây cho chắc nếu cần
            extra_headers: {
                "HTTP-Referer": "https://whalio-study.onrender.com",
                "X-Title": "Whalio Study"
            },
            temperature: 0.7,
            max_tokens: 2000
        });

        // Tạo Promise Timeout
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('TIMEOUT')), REQUEST_TIMEOUT);
        });

        // Race giữa API call và timeout
        const completion = await Promise.race([openRouterPromise, timeoutPromise]);
        
        // Kiểm tra xem OpenRouter có trả về lỗi trong body không
        if (completion.error) {
            throw new Error(completion.error.message);
        }

        const text = completion.choices[0].message.content;

        console.log('✅ OpenRouter phản hồi thành công');
        return text;

    } catch (error) {
        if (error.message === 'TIMEOUT') {
            console.warn('⏱️ OpenRouter timeout sau 30 giây');
            throw new Error('OPENROUTER_TIMEOUT');
        }

        // Kiểm tra lỗi 429 (Rate Limit)
        if (error.status === 429 || (error.message && error.message.includes('429'))) {
            console.warn('⚠️ OpenRouter bị Rate Limit (429)');
            throw new Error('OPENROUTER_RATE_LIMIT');
        }

        console.error('❌ Lỗi khi gọi OpenRouter:', error.message);
        throw new Error(`OPENROUTER_ERROR: ${error.message}`);
    }
}

/**
 * Hàm chính - Gọi AI với Fallback thông minh 3 lớp (3-Layer Defense)
 * * Luồng hoạt động:
 * 1. 🟢 Ưu tiên: Gemini 2.5 Flash (Free Tier)
 * 2. 🟡 Dự phòng 1: Groq (Llama 3 - Free Beta) - Khi Gemini lỗi 429/Timeout
 * 3. 🔴 Dự phòng 2: DeepSeek V3 (Giá rẻ) - Khi cả Gemini và Groq đều sập
 * * @param {string} userMessage - Tin nhắn từ người dùng
 * @returns {Promise<Object>} - Object chứa response và metadata
 */
async function generateAIResponse(userMessage, imageBase64 = null) {
    // Validate input
    if (!userMessage || typeof userMessage !== 'string' || userMessage.trim() === '') {
        return {
            success: false,
            message: 'Xin lỗi, tôi không nhận được câu hỏi của bạn. Vui lòng thử lại! 😊',
            model: null,
            error: 'INVALID_INPUT'
        };
    }

    const startTime = Date.now();
    let response = null;
    let usedModel = null;
    let errorLog = {}; // Lưu lại lỗi để debug nếu cần

    // ============ BƯỚC 1: Thử gọi GEMINI (Main) ============
    try {
        response = await callGemini(userMessage);
        usedModel = 'Gemini 2.5 Flash';

        return {
            success: true,
            message: response,
            model: usedModel,
            responseTime: Date.now() - startTime,
            error: null
        };

    } catch (geminiError) {
        console.warn(`⚠️ Gemini thất bại: ${geminiError.message}`);
        errorLog.gemini = geminiError.message;

        // ============ BƯỚC 2: Fallback sang GROQ (Dự phòng 1) ============
        // Chúng ta thử Groq ngay cả khi lỗi không phải là 429 để đảm bảo user luôn có câu trả lời
        console.log('🔄 Đang chuyển sang Groq AI (Llama 3)...');

        try {
            response = await callGroq(userMessage);
            usedModel = 'Groq (Llama 3)';

            return {
                success: true,
                message: response,
                model: usedModel,
                responseTime: Date.now() - startTime,
                error: null,
                fallback: true // Đánh dấu là đã fallback
            };

        } catch (groqError) {
            console.warn(`⚠️ Groq cũng thất bại: ${groqError.message}`);
            errorLog.groq = groqError.message;

            // ============ BƯỚC 3: Fallback sang DEEPSEEK (Dự phòng 2 - Chốt chặn cuối) ============
            console.log('🔄 Đang chuyển sang OpenRouter (Gemma 2)...');

            try {
                response = await callOpenRouter(userMessage);
                usedModel = 'OpenRouter (Gemma 2)';

                return {
                    success: true,
                    message: response,
                    model: usedModel,
                    responseTime: Date.now() - startTime,
                    error: null,
                    fallback: true
                };

            } catch (openRouterError) {
                console.error(`❌ OpenRouter cũng thất bại: ${openRouterError.message}`);
                errorLog.openRouter = openRouterError.message;

                // ============ CẢ 3 ĐỀU THẤT BẠI ============
                return {
                    success: false,
                    message: '😔 Hic, hiện tại cả 3 "bộ não" của Whalio đều đang quá tải hoặc gặp sự cố. Bạn vui lòng đợi 1-2 phút rồi thử lại nhé!',
                    model: null,
                    responseTime: Date.now() - startTime,
                    error: 'ALL_MODELS_FAILED',
                    details: errorLog
                };
            }
        }
    }
}

/**
 * Kiểm tra trạng thái của các AI services
 * Hữu ích cho việc monitoring và debugging
 * * @returns {Object} - Trạng thái của từng service
 */
function getServiceStatus() {
    return {
        gemini: {
            initialized: geminiModel !== null,
            apiKeyConfigured: !!process.env.GEMINI_API_KEY
        },
        groq: {
            initialized: groqClient !== null,
            apiKeyConfigured: !!process.env.GROQ_API_KEY
        },
        openRouter: {
            initialized: openRouterClient !== null,
            apiKeyConfigured: !!process.env.OPENROUTER_API_KEY
        }
    };
}

// ======================== EXPORTS ========================

module.exports = {
    generateAIResponse,    // Hàm chính để gọi AI
    getServiceStatus,      // Kiểm tra trạng thái services
    WHALIO_SYSTEM_INSTRUCTION // Export để có thể customize từ bên ngoài nếu cần
};