import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
	getEntryById,
	updateEntry,
	uploadBlobToStorage,
	FriendshipEntry,
} from "../services/db";
import { generateStoryVideo } from "../services/gemini";
import { motion } from "motion/react";
import { ArrowLeft, Play, Volume2, Loader2, Film } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function StoryDetails() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { t } = useTranslation();
	const [entry, setEntry] = useState<FriendshipEntry | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
	const [videoError, setVideoError] = useState("");

	const audioRef = useRef<HTMLAudioElement | null>(null);
	const videoRef = useRef<HTMLVideoElement | null>(null);

	useEffect(() => {
		const loadData = async () => {
			if (!id) {
				setLoading(false);
				return;
			}
			try {
				const data = await getEntryById(id);
				if (data) {
					setEntry(data);
					// Clear "newly ready" flag when user views the story that has a new video
					if (data.videoUrl && data.videoNewlyReady) {
						updateEntry(id, { videoNewlyReady: false }).catch(
							() => {},
						);
					}
				}
			} catch {
				setError(t("storyDetails.errors.load_failed"));
			} finally {
				setLoading(false);
			}
		};
		loadData();

		return () => {
			if (audioRef.current) {
				audioRef.current.pause();
				audioRef.current.src = "";
			}
		};
	}, [id]);

	useEffect(() => {
		if (entry && entry.audioUrl && !entry.videoUrl) {
			if (audioRef.current) {
				audioRef.current.pause();
				audioRef.current.src = "";
			}
			audioRef.current = new Audio(entry.audioUrl);
			audioRef.current
				.play()
				.catch((e) => console.error("Autoplay prevented:", e));
		}
	}, [entry?.id]);

	const handlePlayAudio = () => {
		if (entry?.videoUrl) {
			videoRef.current?.play();
			return;
		}
		if (entry && entry.audioUrl) {
			if (audioRef.current) {
				audioRef.current.pause();
				audioRef.current.currentTime = 0;
			} else {
				audioRef.current = new Audio(entry.audioUrl);
			}
			audioRef.current.play();
		}
	};

	const handleAnimateStory = async () => {
		if (!entry || !id) return;
		setIsGeneratingVideo(true);
		setVideoError("");

		try {
			// Mark as processing in Firestore so indicator shows across the app
			await updateEntry(id, { videoProcessing: true });
			setEntry((prev) =>
				prev ? { ...prev, videoProcessing: true } : null,
			);

			// Build video prompt with embedded narration for Veo
			const videoPrompt = [
				`An animated children's storybook scene brought to life with gentle, magical motion.`,
				`The scene depicts: ${entry.storyTranscript}`,
				`Voice-over narration (warm, friendly storyteller tone): "${entry.storyTranscript}"`,
				`Keep the same illustrated art style as the reference image. Add subtle animations — characters move gently, environment breathes with life. Child-appropriate, joyful, and heartwarming.`,
			].join(" ");

			// Pass imageUrl directly — Cloud Function fetches it server-side (avoids CORS)
			const videoBlob = await generateStoryVideo(
				videoPrompt,
				entry.imageUrl,
			);

			// Upload video to storage
			const videoUrl = await uploadBlobToStorage(
				videoBlob,
				`videos/entries/${id}.mp4`,
			);

			// Save to Firestore; mark as newly ready (and no longer processing)
			await updateEntry(id, {
				videoUrl,
				videoProcessing: false,
				videoNewlyReady: false,
			});
			setEntry((prev) =>
				prev
					? {
							...prev,
							videoUrl,
							videoProcessing: false,
							videoNewlyReady: false,
						}
					: null,
			);
		} catch (err) {
			console.error("Video generation failed:", err);
			await updateEntry(id, { videoProcessing: false }).catch(() => {});
			setEntry((prev) =>
				prev ? { ...prev, videoProcessing: false } : null,
			);
			setVideoError(t("storyDetails.errors.video_failed"));
		} finally {
			setIsGeneratingVideo(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-wonderland flex items-center justify-center">
				<Loader2 className="animate-spin text-magic-500" size={48} />
			</div>
		);
	}

	if (error || !entry) {
		return (
			<div className="min-h-screen bg-wonderland flex items-center justify-center p-6">
				<div className="bg-white/80 rounded-[2rem] p-8 shadow-magic text-center max-w-sm">
					<p className="text-red-500 font-medium mb-4">
						{error || t("storyDetails.errors.load_failed")}
					</p>
					<button
						onClick={() => navigate("/dashboard")}
						className="flex items-center gap-2 text-magic-500 font-semibold hover:underline mx-auto"
					>
						<ArrowLeft size={18} /> {t("common.back")}
					</button>
				</div>
			</div>
		);
	}

	const canAnimate =
		!entry.videoUrl && !entry.videoProcessing && !isGeneratingVideo;
	const isProcessing = entry.videoProcessing || isGeneratingVideo;

	return (
		<div className="min-h-screen bg-wonderland flex flex-col items-center p-6 relative overflow-hidden">
			{/* Floating shapes */}
			<div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
				<div
					className="absolute top-[8%] left-[5%] w-8 h-8 rounded-full bg-coral-300/30"
					style={{ animation: "float 5s ease-in-out infinite" }}
				/>
				<div
					className="absolute top-[30%] right-[6%] w-5 h-5 rounded-full bg-magic-300/25"
					style={{
						animation: "float-slow 7s ease-in-out infinite 1s",
					}}
				/>
				<div
					className="absolute bottom-[20%] left-[8%] w-6 h-6 rounded-full bg-sky-300/20"
					style={{ animation: "float 6s ease-in-out infinite 2s" }}
				/>
				<div
					className="absolute top-[60%] right-[12%] w-4 h-4 rounded-full bg-sunny-300/30"
					style={{ animation: "twinkle 3s ease-in-out infinite" }}
				/>
				<div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-coral-200/20 blur-3xl" />
				<div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-magic-200/20 blur-3xl" />
			</div>

			<div className="relative z-10 max-w-5xl w-full mt-8">
				<button
					onClick={() =>
						navigate(
							entry?.connectionId
								? `/friend/${entry.connectionId}`
								: "/dashboard",
						)
					}
					className="flex items-center gap-2 text-warm-500 hover:text-warm-800 font-medium mb-6 transition-colors"
				>
					<ArrowLeft size={20} /> {t("common.back")}
				</button>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ type: "spring", stiffness: 260, damping: 20 }}
					className="bg-white/80 backdrop-blur-sm rounded-[2rem] shadow-magic border-2 border-magic-100 overflow-hidden flex flex-col md:flex-row"
				>
					{/* Media section */}
					<div className="md:w-2/3 relative flex items-center justify-center bg-warm-900/5 min-h-[300px]">
						{entry.videoUrl ? (
							<video
								ref={videoRef}
								src={entry.videoUrl}
								controls
								autoPlay
								loop
								className="w-full h-auto max-h-[80vh] object-contain"
							/>
						) : (
							<img
								src={entry.imageUrl}
								alt="Story Scene"
								className="w-full h-auto object-cover max-h-[80vh]"
								referrerPolicy="no-referrer"
							/>
						)}
					</div>

					{/* Sidebar panel */}
					<div
						className="md:w-1/3 p-8 flex flex-col justify-center items-center text-center"
						style={{
							background:
								"linear-gradient(160deg, #ede9fe 0%, #fce7f3 50%, #fef9c3 100%)",
						}}
					>
						<div
							className="w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-magic"
							style={{
								background:
									"linear-gradient(135deg, #8b5cf6, #ec4899)",
							}}
						>
							<Volume2 size={32} color="white" />
						</div>

						<h2 className="text-3xl font-display font-bold text-warm-800 mb-5">
							{t("storyDetails.story_time")}
						</h2>

						<p className="text-warm-700 text-base mb-8 italic leading-relaxed">
							"{entry.storyTranscript}"
						</p>

						<div className="flex flex-col gap-4 w-full">
							{entry.audioUrl && (
								<motion.button
									onClick={handlePlayAudio}
									whileHover={{ scale: 1.03 }}
									whileTap={{ scale: 0.97 }}
									className="w-full text-white font-bold py-4 px-8 rounded-full shadow-magic transition-all flex items-center justify-center gap-3 text-lg"
									style={{
										background:
											"linear-gradient(135deg, #8b5cf6, #ec4899)",
									}}
								>
									<Play size={24} fill="currentColor" />{" "}
									{t("storyDetails.play_story")}
								</motion.button>
							)}

							{/* Animate Story button */}
							{canAnimate && (
								<motion.button
									onClick={handleAnimateStory}
									whileHover={{ scale: 1.03 }}
									whileTap={{ scale: 0.97 }}
									className="w-full font-bold py-4 px-8 rounded-full transition-all flex items-center justify-center gap-3 text-lg border-2 border-magic-300 text-magic-700 bg-white/60 hover:bg-white/80"
								>
									<Film size={22} />{" "}
									{t("storyDetails.animate_story")}
								</motion.button>
							)}

							{/* Processing state */}
							{isProcessing && (
								<div className="w-full space-y-3">
									<div className="bg-magic-50 border-2 border-magic-200 rounded-full py-4 px-6 flex items-center justify-center gap-3 text-magic-700 font-semibold">
										<Loader2
											size={20}
											className="animate-spin"
										/>
										<span>
											{t("storyDetails.video_processing")}
										</span>
									</div>
									<p className="text-warm-500 text-sm text-center leading-relaxed px-2">
										{t(
											"storyDetails.video_generating_info",
										)}
									</p>
								</div>
							)}

							{videoError && (
								<p className="text-red-500 text-sm text-center">
									{videoError}
								</p>
							)}
						</div>
					</div>
				</motion.div>
			</div>
		</div>
	);
}
