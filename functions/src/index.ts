import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenAI } from "@google/genai";
import {
	AVATAR_GENERATION_SYSTEM_PROMPT,
	AVATAR_GENERATION_PROMPT,
	STORY_IMAGE_SYSTEM_PROMPT,
	STORY_IMAGE_PROMPT,
	CHAT_SYSTEM_PROMPT,
	CUSTOM_QUESTION_PROMPT,
	CUSTOM_QUESTION_SYSTEM_PROMPT,
	CHILDREN_NARRATOR_SYSTEM,
	NARRATION_PROMPT,
	PROFILE_SUMMARY_PROMPT,
	CUSTOM_ANSWERS_SUMMARY_PROMPT,
} from "./prompts";

const geminiApiKey = defineSecret("GEMINI_API_KEY");

function getAI(key: string) {
	return new GoogleGenAI({ apiKey: key });
}

function requireAuth(request: { auth?: { uid: string } }) {
	if (!request.auth)
		throw new HttpsError("unauthenticated", "Authentication required");
}

function formatAnswers(answers: Record<string, string>): string {
	return Object.entries(answers)
		.map(([q, a]) => `${q}: ${a}`)
		.join("\n");
}

function pcmBase64ToWavBase64(pcmBase64: string, sampleRate = 24000): string {
	const pcmData = Buffer.from(pcmBase64, "base64");
	const header = Buffer.alloc(44);
	header.write("RIFF", 0);
	header.writeUInt32LE(36 + pcmData.length, 4);
	header.write("WAVE", 8);
	header.write("fmt ", 12);
	header.writeUInt32LE(16, 16);
	header.writeUInt16LE(1, 20);
	header.writeUInt16LE(1, 22);
	header.writeUInt32LE(sampleRate, 24);
	header.writeUInt32LE(sampleRate * 2, 28);
	header.writeUInt16LE(2, 32);
	header.writeUInt16LE(16, 34);
	header.write("data", 36);
	header.writeUInt32LE(pcmData.length, 40);
	return Buffer.concat([header, pcmData]).toString("base64");
}

const SECRET_OPTS = { secrets: [geminiApiKey], cors: true };

export const generateAvatarPrompt = onCall(SECRET_OPTS, async (request) => {
	requireAuth(request);
	const { childInput, worldStyle } = request.data as {
		childInput: string;
		worldStyle: string;
	};
	const ai = getAI(geminiApiKey.value());
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: AVATAR_GENERATION_PROMPT(childInput, worldStyle),
		config: { systemInstruction: AVATAR_GENERATION_SYSTEM_PROMPT },
	});
	return { text: response.text ?? "" };
});

export const generateImage = onCall(
	{ ...SECRET_OPTS, timeoutSeconds: 120 },
	async (request) => {
		requireAuth(request);
		const { prompt } = request.data as { prompt: string };
		const ai = getAI(geminiApiKey.value());
		const response = await ai.models.generateContent({
			model: "gemini-3.1-flash-image-preview",
			contents: { parts: [{ text: prompt }] },
		});
		for (const part of response.candidates?.[0]?.content?.parts ?? []) {
			if (part.inlineData)
				return {
					dataUrl: `data:image/png;base64,${part.inlineData.data}`,
				};
		}
		throw new HttpsError("internal", "Failed to generate image");
	},
);

export const generateStoryImagePrompt = onCall(SECRET_OPTS, async (request) => {
	requireAuth(request);
	const { userAvatar, friendAvatar, story, worldStyle } = request.data as {
		userAvatar: string;
		friendAvatar: string;
		story: string;
		worldStyle: string;
	};
	const ai = getAI(geminiApiKey.value());
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: STORY_IMAGE_PROMPT(
			userAvatar,
			friendAvatar,
			story,
			worldStyle,
		),
		config: { systemInstruction: STORY_IMAGE_SYSTEM_PROMPT },
	});
	return { text: response.text ?? "" };
});

export const generateNarration = onCall(
	{ ...SECRET_OPTS, timeoutSeconds: 120 },
	async (request) => {
		requireAuth(request);
		const { story, language = "en" } = request.data as {
			story: string;
			language?: string;
		};
		const ai = getAI(geminiApiKey.value());
		const response = await ai.models.generateContent({
			model: "gemini-2.5-flash-preview-tts",
			contents: [
				{
					parts: [{ text: NARRATION_PROMPT(story, language) }],
				},
			],
			config: {
				responseModalities: ["AUDIO"],
				speechConfig: {
					voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
				},
			},
		});
		const pcmBase64 =
			response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
		if (!pcmBase64)
			throw new HttpsError("internal", "Failed to generate audio");
		return {
			dataUrl: `data:audio/wav;base64,${pcmBase64ToWavBase64(pcmBase64)}`,
		};
	},
);

export const generateProfileSummary = onCall(SECRET_OPTS, async (request) => {
	requireAuth(request);
	const {
		name,
		answers,
		language = "en",
	} = request.data as {
		name: string;
		answers: Record<string, string>;
		language?: string;
	};
	const ai = getAI(geminiApiKey.value());
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: PROFILE_SUMMARY_PROMPT(name, formatAnswers(answers), language),
		config: { systemInstruction: CHILDREN_NARRATOR_SYSTEM },
	});
	return { text: response.text ?? "" };
});

export const generateCustomAnswersSummary = onCall(
	SECRET_OPTS,
	async (request) => {
		requireAuth(request);
		const {
			answererName,
			answers,
			language = "en",
		} = request.data as {
			answererName: string;
			answers: Record<string, string>;
			language?: string;
		};
		const ai = getAI(geminiApiKey.value());
		const response = await ai.models.generateContent({
			model: "gemini-3-flash-preview",
			contents: CUSTOM_ANSWERS_SUMMARY_PROMPT(
				answererName,
				formatAnswers(answers),
				language,
			),
			config: { systemInstruction: CHILDREN_NARRATOR_SYSTEM },
		});
		return { text: response.text ?? "" };
	},
);

export const chatWithGemini = onCall(SECRET_OPTS, async (request) => {
	requireAuth(request);
	const { friendName, friendDetails, friendStory, message } =
		request.data as {
			friendName: string;
			friendDetails: string;
			friendStory: string;
			message: string;
		};
	const ai = getAI(geminiApiKey.value());
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: message,
		config: {
			systemInstruction: CHAT_SYSTEM_PROMPT(
				friendName,
				friendDetails,
				friendStory,
			),
		},
	});
	return { text: response.text ?? "" };
});

export const generateCustomQuestion = onCall(SECRET_OPTS, async (request) => {
	requireAuth(request);
	const { topic, childAge } = request.data as {
		topic: string;
		childAge: string;
	};
	const ai = getAI(geminiApiKey.value());
	const response = await ai.models.generateContent({
		model: "gemini-3-flash-preview",
		contents: CUSTOM_QUESTION_PROMPT(topic, childAge),
		config: { systemInstruction: CUSTOM_QUESTION_SYSTEM_PROMPT },
	});
	const text = response.text ?? "";
	const enMatch = text.match(/LINE_EN:\s*(.+)/);
	const nlMatch = text.match(/LINE_NL:\s*(.+)/);
	return {
		en: enMatch?.[1]?.trim() ?? `Tell me about your ${topic}!`,
		nl: nlMatch?.[1]?.trim() ?? `Vertel me over jouw ${topic}!`,
	};
});

export const generateStoryVideo = onCall(
	{ ...SECRET_OPTS, timeoutSeconds: 1800 },
	async (request) => {
		requireAuth(request);
		const {
			prompt,
			imageUrl,
			imageBase64,
			mimeType = "image/png",
		} = request.data as {
			prompt: string;
			imageUrl?: string;
			imageBase64?: string;
			mimeType?: string;
		};
		const key = geminiApiKey.value();
		const ai = getAI(key);

		// Fetch image server-side if a URL was provided (avoids client-side CORS issues)
		let resolvedBase64 = imageBase64;
		let resolvedMimeType = mimeType;
		if (imageUrl && !resolvedBase64) {
			const imgResponse = await fetch(imageUrl);
			const arrayBuffer = await imgResponse.arrayBuffer();
			resolvedBase64 = Buffer.from(arrayBuffer).toString("base64");
			resolvedMimeType =
				imgResponse.headers.get("content-type") ?? mimeType;
		}
		if (!resolvedBase64)
			throw new HttpsError(
				"invalid-argument",
				"imageUrl or imageBase64 required",
			);

		let operation = await ai.models.generateVideos({
			model: "veo-3.1-fast-generate-preview",
			prompt,
			image: { imageBytes: resolvedBase64, mimeType: resolvedMimeType },
			config: {
				numberOfVideos: 1,
				resolution: "720p",
				aspectRatio: "16:9",
			},
		});

		let pollInterval = 10000;
		while (!operation.done) {
			await new Promise((resolve) => setTimeout(resolve, pollInterval));
			pollInterval = Math.min(pollInterval * 2, 60000);
			operation = await ai.operations.getVideosOperation({ operation });
		}

		const downloadLink =
			operation.response?.generatedVideos?.[0]?.video?.uri;
		if (!downloadLink)
			throw new HttpsError("internal", "Video generation failed");

		const videoResponse = await fetch(downloadLink, {
			headers: { "x-goog-api-key": key },
		});
		const arrayBuffer = await videoResponse.arrayBuffer();
		const base64 = Buffer.from(arrayBuffer).toString("base64");
		const contentType =
			videoResponse.headers.get("content-type") ?? "video/mp4";
		return { dataUrl: `data:${contentType};base64,${base64}` };
	},
);

export const getEphemeralToken = onCall(SECRET_OPTS, async (request) => {
	requireAuth(request);
	// authTokens.create() is v1alpha only — must pass apiVersion explicitly
	const ai = new GoogleGenAI({
		apiKey: geminiApiKey.value(),
		httpOptions: { apiVersion: "v1alpha" },
	});
	const now = Date.now();
	// newSessionExpireTime: 60s window to open the WebSocket connection
	// expireTime: 35 minutes for the session to remain active once opened
	const token = await (ai as any).authTokens.create({
		config: {
			uses: 1,
			newSessionExpireTime: new Date(now + 60_000).toISOString(),
			expireTime: new Date(now + 35 * 60_000).toISOString(),
		},
	});
	return { token: token.name as string };
});
