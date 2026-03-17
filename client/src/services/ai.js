import { getFullApiUrl } from "../config/apiConfig";

const extractJsonBlock = (text) => {
	if (!text) return null;

	const codeFenceMatch = String(text).match(/```json\s*([\s\S]*?)```/i);
	if (codeFenceMatch?.[1]) {
		return codeFenceMatch[1].trim();
	}

	const firstBrace = String(text).indexOf("{");
	const lastBrace = String(text).lastIndexOf("}");
	if (firstBrace >= 0 && lastBrace > firstBrace) {
		return String(text).slice(firstBrace, lastBrace + 1);
	}

	return null;
};

const buildExamPrompt = (userPrompt) => `
Ban la tro ly tao de thi. Tra ve duy nhat 1 JSON hop le, KHONG them van ban nao khac.

Yeu cau:
- title: string
- subject: string
- time: number (phut)
- description: string
- questions: array

Moi phan tu questions co dang:
{
	"question": "...",
	"type": "multiple_choice|checkbox|short_answer|essay",
	"options": ["A","B","C","D"],
	"correctAnswer": 0,
	"correctAnswers": [0,2],
	"correctText": "...",
	"points": 1
}

Quy tac:
- multiple_choice: bat buoc co 4 options, dung correctAnswer.
- checkbox: bat buoc co 4 options, dung correctAnswers.
- short_answer/essay: options la [], dung correctText.
- Khong tra ve markdown, khong tra ve mo ta bo sung.

Prompt nguoi dung: ${String(userPrompt || "").trim()}
`;

export const aiService = {
	async generateExamFromPrompt(prompt) {
		const formData = new FormData();
		formData.append("message", buildExamPrompt(prompt));
		formData.append("username", "guest");

		const response = await fetch(getFullApiUrl("/api/chat"), {
			method: "POST",
			body: formData,
		});

		const payload = await response.json();

		if (!response.ok || !payload?.success) {
			throw new Error(payload?.message || "AI service error");
		}

		const text = payload.response || payload.text || "";
		const rawJson = extractJsonBlock(text);

		if (!rawJson) {
			throw new Error("AI không trả về JSON hợp lệ.");
		}

		try {
			return JSON.parse(rawJson);
		} catch (error) {
			throw new Error("Không thể phân tích JSON do AI trả về.");
		}
	},
};
