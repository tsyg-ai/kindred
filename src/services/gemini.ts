import {
	GoogleGenAI,
	type FunctionDeclaration,
	Modality,
	Type,
} from "@google/genai";
import { httpsCallable } from "firebase/functions";
import { functions } from "./db";
import { VOICE_INTERVIEW_SYSTEM_PROMPT } from "./prompts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function call<T = unknown>(name: string) {
	return httpsCallable<Record<string, unknown>, T>(functions, name);
}

// ---------------------------------------------------------------------------
// Avatar & image
// ---------------------------------------------------------------------------

export const generateAvatarPrompt = async (
	childInput: string,
	worldStyle: string,
): Promise<string> => {
	const result = await call<{ text: string }>("generateAvatarPrompt")({
		childInput,
		worldStyle,
	});
	return result.data.text;
};

export const generateImage = async (prompt: string): Promise<string> => {
	const result = await call<{ dataUrl: string }>("generateImage")({ prompt });
	return result.data.dataUrl;
};

export const generateStoryImagePrompt = async (
	userAvatar: string,
	friendAvatar: string,
	story: string,
	worldStyle: string,
): Promise<string> => {
	const result = await call<{ text: string }>("generateStoryImagePrompt")({
		userAvatar,
		friendAvatar,
		story,
		worldStyle,
	});
	return result.data.text;
};

// ---------------------------------------------------------------------------
// Narration
// ---------------------------------------------------------------------------

export const generateNarration = async (
	story: string,
	language = "en",
): Promise<string> => {
	const result = await call<{ dataUrl: string }>("generateNarration")({
		story,
		language,
	});
	return result.data.dataUrl;
};

// ---------------------------------------------------------------------------
// Profile summaries
// ---------------------------------------------------------------------------

export const generateProfileSummary = async (
	name: string,
	answers: Record<string, string>,
	language = "en",
): Promise<string> => {
	const result = await call<{ text: string }>("generateProfileSummary")({
		name,
		answers,
		language,
	});
	return result.data.text;
};

export const generateCustomAnswersSummary = async (
	answererName: string,
	answers: Record<string, string>,
	language = "en",
): Promise<string> => {
	const result = await call<{ text: string }>("generateCustomAnswersSummary")(
		{ answererName, answers, language },
	);
	return result.data.text;
};

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export const chatWithGemini = async (
	friendName: string,
	friendDetails: string,
	friendStory: string,
	message: string,
): Promise<string> => {
	const result = await call<{ text: string }>("chatWithGemini")({
		friendName,
		friendDetails,
		friendStory,
		message,
	});
	return result.data.text;
};

// ---------------------------------------------------------------------------
// Custom questions
// ---------------------------------------------------------------------------

export const generateCustomQuestion = async (
	topic: string,
	childAge: string,
): Promise<{ en: string; nl: string }> => {
	const result = await call<{ en: string; nl: string }>(
		"generateCustomQuestion",
	)({ topic, childAge });
	return result.data;
};

// ---------------------------------------------------------------------------
// Math problems (no Gemini call — static list, stays client-side)
// ---------------------------------------------------------------------------

const MATH_PROBLEMS = [
	{ problem: "What is 5 + 7?", answer: 12 },
	{ problem: "What is 12 - 4?", answer: 8 },
	{ problem: "What is 3 x 4?", answer: 12 },
	{ problem: "What is 15 + 6?", answer: 21 },
	{ problem: "What is 20 - 9?", answer: 11 },
	{ problem: "What is 6 x 3?", answer: 18 },
	{ problem: "What is 14 + 8?", answer: 22 },
	{ problem: "What is 25 - 10?", answer: 15 },
	{ problem: "What is 4 x 5?", answer: 20 },
	{ problem: "What is 9 + 9?", answer: 18 },
	{ problem: "What is 18 - 7?", answer: 11 },
	{ problem: "What is 7 x 2?", answer: 14 },
	{ problem: "What is 11 + 13?", answer: 24 },
	{ problem: "What is 30 - 15?", answer: 15 },
	{ problem: "What is 8 x 3?", answer: 24 },
	{ problem: "What is 16 + 5?", answer: 21 },
	{ problem: "What is 22 - 8?", answer: 14 },
	{ problem: "What is 5 x 5?", answer: 25 },
	{ problem: "What is 13 + 9?", answer: 22 },
	{ problem: "What is 40 - 20?", answer: 20 },
];

export const generateMathProblem = async () =>
	MATH_PROBLEMS[Math.floor(Math.random() * MATH_PROBLEMS.length)];

// ---------------------------------------------------------------------------
// Story video
// ---------------------------------------------------------------------------

export const generateStoryVideo = async (
	prompt: string,
	imageUrl: string,
): Promise<Blob> => {
	// Video generation can take several minutes — override the default 70s client timeout
	const callable = httpsCallable<
		Record<string, unknown>,
		{ dataUrl: string }
	>(functions, "generateStoryVideo", { timeout: 1800000 });
	const result = await callable({ prompt, imageUrl });
	const res = await fetch(result.data.dataUrl);
	return res.blob();
};

// ---------------------------------------------------------------------------
// Live interview (stays client-side; uses ephemeral token from Cloud Function)
// ---------------------------------------------------------------------------

const finishInterviewDeclaration: FunctionDeclaration = {
	name: "finishInterview",
	description:
		"Call this function when all questions have been answered to finalize the interview and generate the avatar.",
	parameters: {
		type: Type.OBJECT,
		properties: {
			ready: { type: Type.BOOLEAN },
		},
	},
};

const recordAnswerDeclaration: FunctionDeclaration = {
	name: "recordAnswer",
	description:
		"Call this ONLY after the user has clearly and completely spoken their answer to the current question in their own words. Do NOT call this based on ambient sounds, the assistant's own speech, very short or unclear utterances, or before receiving a substantive spoken response from the user. If the answer is ambiguous, ask the user to clarify first.",
	parameters: {
		type: Type.OBJECT,
		properties: {
			questionId: {
				type: Type.STRING,
				description:
					"The ID of the question (e.g., 'name', 'age', 'eyeColor')",
			},
			answer: {
				type: Type.STRING,
				description: "A short summary of the user's answer",
			},
		},
		required: ["questionId", "answer"],
	},
};

export const getEphemeralToken = async (): Promise<string> => {
	const result = await call<{ token: string }>("getEphemeralToken")({});
	return result.data.token;
};

export const startLiveInterviewSession = (
	callbacks: Parameters<GoogleGenAI["live"]["connect"]>[0]["callbacks"],
	childName: string,
	childAge: string,
	language: string,
	ephemeralToken: string,
) => {
	// Ephemeral tokens require v1alpha for the WebSocket connection.
	// baseUrl without trailing slash avoids the SDK's double-slash bug in the WebSocket URL.
	const ai = new GoogleGenAI({
		apiKey: ephemeralToken,
		httpOptions: {
			apiVersion: "v1alpha",
			baseUrl: "https://generativelanguage.googleapis.com",
		},
	});
	return ai.live.connect({
		model: "gemini-2.5-flash-native-audio-preview-12-2025",
		callbacks,
		config: {
			responseModalities: [Modality.AUDIO],
			speechConfig: {
				voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
			},
			systemInstruction: VOICE_INTERVIEW_SYSTEM_PROMPT(
				childName,
				childAge,
				language,
			),
			tools: [
				{
					functionDeclarations: [
						finishInterviewDeclaration,
						recordAnswerDeclaration,
					],
				},
			],
		},
	});
};
