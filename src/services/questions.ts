export type SupportedLanguage = "en" | "nl";

export type Question = {
	id: string;
	emoji: string;
	labels: Record<SupportedLanguage, string>;
	texts: Record<SupportedLanguage, string>;
};

/**
 * All interview questions. Each question carries its own emoji, localized label,
 * and localized question text — making the list the single source of truth.
 */
export const INTERVIEW_QUESTIONS: Question[] = [
	{
		id: "eyeColor",
		emoji: "👁️",
		labels: { en: "Eye Color", nl: "Oogkleur" },
		texts: {
			en: "What color are your eyes? Are they blue like the sky, brown like a chocolate bar, green like a sparkly forest, or maybe a totally different color?",
			nl: "Welke kleur hebben jouw ogen? Zijn ze blauw zoals de lucht, bruin zoals een chocoladereep, groen zoals een sprankelend bos, of misschien een heel andere kleur?",
		},
	},
	{
		id: "hair",
		emoji: "💇",
		labels: { en: "Hair Color & Style", nl: "Haarkleur & Stijl" },
		texts: {
			en: "What does your hair look like? Is it dark like a night sky, golden like a lion's mane, or maybe another color? And is it straight, wavy, full of curls, or something else?",
			nl: "Hoe ziet jouw haar eruit? Is het donker als een nachtelijke hemel, gouden als een leeuwenmaan, of misschien een andere kleur? En is het stijl, golvend, vol met krullen, of iets anders?",
		},
	},
	{
		id: "color",
		emoji: "🎨",
		labels: { en: "Favorite Color", nl: "Lievelingskleur" },
		texts: {
			en: "What is your favorite color? Do you love sunny yellow, deep ocean blue, bright grassy green, or something else?",
			nl: "Wat is jouw lievelingskleur? Hou je van zonnig geel, diep oceaanblauw, fel grasgroen, of iets heel anders?",
		},
	},
	{
		id: "animal",
		emoji: "🐾",
		labels: { en: "Favorite Animal", nl: "Lievelingsdier" },
		texts: {
			en: "What is your favorite animal? It can be anything — a cuddly cat, a roaring lion, or even a unicorn or a dinosaur!",
			nl: "Wat is jouw lievelingsdier? Het mag van alles zijn — een knuffelige kat, een brullende leeuw, of zelfs een eenhoorn of een dinosaurus!",
		},
	},
	{
		id: "food",
		emoji: "🍕",
		labels: { en: "Favorite Food", nl: "Lievelingseten" },
		texts: {
			en: "What is your favorite food? Is it something sweet like ice cream, savory like pizza, or maybe a special dish your family makes at home?",
			nl: "Wat is jouw lievelingseten? Is het iets zoets zoals ijs, hartig zoals pizza, of misschien een speciaal gerecht dat thuis wordt gemaakt?",
		},
	},
	{
		id: "hobby",
		emoji: "🎨",
		labels: { en: "Favorite Hobby", nl: "Favoriete Hobby" },
		texts: {
			en: "What is your favorite hobby or activity? Do you love drawing, playing sports, building with Lego, or something else entirely?",
			nl: "Wat is jouw favoriete hobby of activiteit? Hou je van tekenen, sporten, bouwen met Lego, of iets heel anders?",
		},
	},
	{
		id: "bookMovie",
		emoji: "📚",
		labels: { en: "Favorite Book/Movie", nl: "Lievelingsboek/-film" },
		texts: {
			en: "What is your favorite book or movie? Do you love adventure stories, funny cartoons, magical fairy tales, or something else?",
			nl: "Wat is jouw lievelingsboek of -film? Hou je van avonturenverhalen, grappige tekenfilms, magische sprookjes, of iets anders?",
		},
	},
	{
		id: "superpower",
		emoji: "⚡",
		labels: { en: "The Superpower", nl: "De Superkracht" },
		texts: {
			en: "What superpower would you want most? For example, could you fly like a bird, become invisible like a ghost, or maybe something totally different?",
			nl: "Welke superkracht zou jij het liefste willen? Zou je kunnen vliegen als een vogel, onzichtbaar worden als een geest, of misschien iets heel anders?",
		},
	},
	{
		id: "dreams",
		emoji: "✨",
		labels: { en: "Future Dreams", nl: "Toekomstdromen" },
		texts: {
			en: "What do you want to be when you grow up? Maybe a doctor, an astronaut, an artist, or something completely new that doesn't even exist yet?",
			nl: "Wat wil jij worden als je later groot bent? Misschien een dokter, een astronaut, een kunstenaar, of iets heel bijzonders dat nog niet eens bestaat?",
		},
	},
];

/**
 * Extra metadata for non-interview profile fields shown on the friend profile card.
 */
export const PROFILE_FIELD_META: Record<
	string,
	{ emoji: string; labels: Record<SupportedLanguage, string> }
> = {
	name: { emoji: "👤", labels: { en: "Name", nl: "Naam" } },
	age: { emoji: "🎂", labels: { en: "Age", nl: "Leeftijd" } },
};

export type CustomQuestion = {
	id: string;
	topic: string;
	label: string;
	texts: Record<SupportedLanguage, string>;
};

export type InterviewConfig = {
	selectedQuestionIds: string[];
	customQuestions: CustomQuestion[];
};

export function resolveCustomQuestion(cq: CustomQuestion): Question {
	return {
		id: cq.id,
		emoji: "✏️",
		labels: { en: cq.label, nl: cq.label },
		texts: cq.texts,
	};
}

/** Builds final ordered question list: selected defaults first, then custom. */
export function buildInterviewQuestions(config: InterviewConfig): Question[] {
	const selected = INTERVIEW_QUESTIONS.filter((q) =>
		config.selectedQuestionIds.includes(q.id),
	);
	const custom = config.customQuestions.map(resolveCustomQuestion);
	return [...selected, ...custom];
}

/**
 * Quick lookup map: question id → Question.
 */
export const QUESTION_MAP: Record<string, Question> = Object.fromEntries(
	INTERVIEW_QUESTIONS.map((q) => [q.id, q]),
);

/** Returns the localized question text, falling back to English. */
export function getQuestionText(question: Question, lang: string): string {
	return question.texts[lang as SupportedLanguage] ?? question.texts.en;
}

/** Returns the localized question label/title, falling back to English. */
export function getQuestionLabel(question: Question, lang: string): string {
	return question.labels[lang as SupportedLanguage] ?? question.labels.en;
}
