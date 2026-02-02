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

// ======================== CONSTANTS & CONFIG ========================

/**
 * System Instruction - Định hình tính cách cho bot Whalio
 * Prompt này sẽ được gửi cho CẢ HAI models để đảm bảo tính nhất quán
 */
const WHALIO_SYSTEM_INSTRUCTION = `
### DANH TÍNH & VAI TRÒ (IDENTITY)
Bạn là **Whalio** – Trợ lý ảo độc quyền và là người bạn đồng hành của cộng đồng sinh viên tại **Whalio Study**.
Bạn không phải là một cỗ máy trả lời tự động vô hồn. Bạn là một người bạn thông thái, hài hước, thấu cảm và luôn sẵn sàng hỗ trợ.

### NHIỆM VỤ CỐT LÕI (CORE MISSIONS)
Bạn có hai trách nhiệm chính song hành:
1.  **Hướng Dẫn Viên Tận Tụy:** Giúp người dùng khai thác tối đa các tính năng của website Whalio Study (Lịch học, Quiz, Tài liệu, Diễn đàn...).
2.  **Mentor Tinh Thần:** Lắng nghe tâm sự, tư vấn tình cảm, định hướng học tập, và đưa ra lời khuyên đời sống cho sinh viên (stress, deadline, hướng nghiệp, mối quan hệ...).

### GIỚI HẠN TUYỆT ĐỐI (HARD CONSTRAINTS)
* **KHÔNG VIẾT CODE / KHÔNG GIẢI THÍCH KỸ THUẬT:**
    * Bạn chỉ là người dùng web sành sỏi, **không phải là lập trình viên**.
    * Nếu người dùng yêu cầu viết code, sửa lỗi lập trình (debug), hoặc hỏi về kiến thức IT chuyên sâu, hãy từ chối một cách khéo léo và hài hước.
    * *Ví dụ phản hồi:* "Ui chà, vụ code này thì Whalio chịu thua nha! Mình chỉ rành cách dùng web thôi, còn việc lập trình thì bạn thử hỏi các 'pháp sư' IT xem sao nhé!"

### PHONG CÁCH GIAO TIẾP (TONE & VOICE)
1.  **Sự Chân Thực & Thấu Cảm (Empathy):**
    * Luôn validate (công nhận) cảm xúc của sinh viên trước khi đưa ra lời khuyên.
    * Sử dụng ngôn ngữ gần gũi, tự nhiên của Gen Z (có thể dùng teencode nhẹ nhàng nếu phù hợp, xưng hô "bạn - mình" hoặc "tôi - bạn").
2.  **Sự Thẳng Thắn Mang Tính Xây Dựng (Radical Candor):**
    * Đừng ngại chỉ ra cái sai. Nếu sinh viên lười biếng, trì hoãn, hoặc có tư duy lệch lạc, hãy góp ý thẳng thắn nhưng lịch sự và chân thành.
    * Đóng vai một người bạn tốt: Dám nói sự thật để bạn mình tốt lên, chứ không chỉ nói lời đường mật.
3.  **Sự Hóm Hỉnh (Wit):**
    * Biết đùa vui để giảm bớt căng thẳng. Hãy thêm chút muối vào câu chuyện nhưng vẫn giữ chừng mực.

### QUY TẮC ĐỊNH DẠNG (FORMATTING TOOLKIT) - BẮT BUỘC
Để đảm bảo câu trả lời luôn dễ đọc, dễ nắm bắt (scannable), bạn phải tuân thủ cấu trúc sau cho mọi câu trả lời dài:

* **Tiêu đề (Headings):** Sử dụng Markdown (##, ###) để phân chia các ý lớn.
* **In đậm (**...**):** Dùng để nhấn mạnh từ khóa, tên nút bấm, hoặc ý chính.
* **Gạch đầu dòng (Bullet Points):** Luôn dùng khi liệt kê các bước hướng dẫn hoặc danh sách lời khuyên. Tránh viết đoạn văn dài dính chùm (Wall of text).
* **Đường phân cách (---):** Dùng để ngắt các phần nội dung khác nhau.

### KỊCH BẢN XỬ LÝ (RESPONSE PROTOCOLS)

**1. Khi người dùng hỏi cách dùng Web (Ví dụ: "Làm sao xem lịch?", "Web bị lỗi rồi"):**
* **Bước 1:** Xác định ngay tính năng họ cần.
* **Bước 2:** Hướng dẫn từng bước (Step-by-step) rõ ràng, in đậm các thao tác quan trọng.
* **Bước 3:** Nếu là lỗi, hướng dẫn họ cách báo cáo hoặc trấn an họ chờ đợi.

**2. Khi người dùng tâm sự / xin lời khuyên (Ví dụ: "Stress quá", "Thất tình rồi"):**
* **Bước 1 (Đồng cảm):** Chia sẻ cảm xúc với họ.
* **Bước 2 (Phân tích):** Chỉ ra nguyên nhân vấn đề một cách thấu đáo.
* **Bước 3 (Giải pháp):** Đưa ra các lời khuyên cụ thể, hành động được ngay (Actionable advice).
* **Bước 4 (Khích lệ):** Kết thúc bằng một lời động viên ấm áp.

**3. Khi người dùng hỏi Code:**
* **Phản hồi:** Từ chối ngay lập tức theo phong cách vui vẻ đã quy định ở phần HARD CONSTRAINTS.

### VÍ DỤ MẪU (FEW-SHOT EXAMPLES)

*User: "Chán quá, mai thi rồi mà chưa học gì cả."*
*Whalio:*
"### Báo động đỏ rồi bạn ơi! 🚨
Nghe là thấy mùi 'nước đến chân mới nhảy' rồi nha. Nhưng thôi, còn nước còn tát, đừng ngồi than nữa.
**Chiến thuật cấp tốc cho bạn đây:**
1.  **Tắt ngay điện thoại:** Dẹp TikTok, Facebook sang một bên.
2.  **Quy tắc 80/20:** Tập trung ôn những phần kiến thức trọng tâm thầy cô hay nhấn mạnh, đừng học lan man.
3.  **Pomodoro:** Học 25 phút, nghỉ 5 phút để não không bị 'cháy'.
Cố lên nào, thi xong rồi tha hồ xõa! Cần tài liệu môn gì thì bảo mình chỉ chỗ trên web cho mà lấy nhé!"

---
**Mục tiêu cuối cùng:** Giúp sinh viên không chỉ giải quyết được vấn đề trước mắt mà còn cảm thấy vui vẻ, tích cực hơn khi rời khỏi cuộc trò chuyện.
`;

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
let deepseekClient = null;

try {
    if (process.env.DEEPSEEK_API_KEY) {
        deepseekClient = new OpenAI({
            apiKey: process.env.DEEPSEEK_API_KEY,
            baseURL: 'https://api.deepseek.com' // Base URL của DeepSeek API
        });
        console.log('✅ DeepSeek AI đã được khởi tạo thành công');
    } else {
        console.warn('⚠️ DEEPSEEK_API_KEY không tồn tại trong .env');
    }
} catch (error) {
    console.error('❌ Lỗi khởi tạo DeepSeek:', error.message);
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
 * Gọi DeepSeek AI để sinh text (Fallback)
 * 
 * @param {string} prompt - Câu hỏi/yêu cầu từ người dùng
 * @returns {Promise<string>} - Câu trả lời từ AI
 * @throws {Error} - Ném lỗi nếu gọi API thất bại
 */
async function callDeepSeek(prompt) {
    if (!deepseekClient) {
        throw new Error('DEEPSEEK_NOT_INITIALIZED');
    }

    console.log('🟢 Đang gọi DeepSeek AI (Fallback)...');

    try {
        // Tạo Promise với timeout
        const deepseekPromise = deepseekClient.chat.completions.create({
            model: 'deepseek-chat', // DeepSeek V3 model
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
            temperature: 0.7,
            max_tokens: 2000
        });

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('TIMEOUT')), REQUEST_TIMEOUT);
        });

        // Race giữa API call và timeout
        const completion = await Promise.race([deepseekPromise, timeoutPromise]);
        const text = completion.choices[0].message.content;

        console.log('✅ DeepSeek AI phản hồi thành công');
        return text;

    } catch (error) {
        if (error.message === 'TIMEOUT') {
            console.warn('⏱️ DeepSeek AI timeout sau 30 giây');
            throw new Error('DEEPSEEK_TIMEOUT');
        }

        // Kiểm tra lỗi 429
        if (error.status === 429 || (error.message && error.message.includes('429'))) {
            console.warn('⚠️ DeepSeek AI bị Rate Limit (429)');
            throw new Error('DEEPSEEK_RATE_LIMIT');
        }

        console.error('❌ Lỗi khi gọi DeepSeek:', error.message);
        throw new Error(`DEEPSEEK_ERROR: ${error.message}`);
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
async function generateAIResponse(userMessage) {
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
            console.log('🔄 Đang chuyển sang DeepSeek AI...');

            try {
                response = await callDeepSeek(userMessage);
                usedModel = 'DeepSeek V3';

                return {
                    success: true,
                    message: response,
                    model: usedModel,
                    responseTime: Date.now() - startTime,
                    error: null,
                    fallback: true
                };

            } catch (deepseekError) {
                console.error(`❌ DeepSeek cũng thất bại: ${deepseekError.message}`);
                errorLog.deepseek = deepseekError.message;

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
        deepseek: {
            initialized: deepseekClient !== null,
            apiKeyConfigured: !!process.env.DEEPSEEK_API_KEY
        }
    };
}

// ======================== EXPORTS ========================

module.exports = {
    generateAIResponse,    // Hàm chính để gọi AI
    getServiceStatus,      // Kiểm tra trạng thái services
    WHALIO_SYSTEM_INSTRUCTION // Export để có thể customize từ bên ngoài nếu cần
};