import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getProfile, getConnectionById, saveEntry, UserProfile, uploadBase64ToStorage } from '../services/db';
import { generateAvatarPrompt, generateImage, generateStoryImagePrompt, generateNarration } from '../services/gemini';
import { QUESTION_MAP, PROFILE_FIELD_META } from '../services/questions';
import { v4 as uuidv4 } from 'uuid';
import { motion } from 'motion/react';
import AvatarZoom from '../components/AvatarZoom';
import { Mic, Square, Loader2, Sparkles, Image as ImageIcon, Music, ArrowLeft, ArrowRight, Wand2, Keyboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import StylePicker, { STYLES } from '../components/StylePicker';

export default function StoryEngine() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { connectionId } = location.state || {};

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [friendProfile, setFriendProfile] = useState<UserProfile | null>(null);
  const [friendName, setFriendName] = useState('');
  const [story, setStory] = useState('');
  const [inputMode, setInputMode] = useState<'voice' | 'manual'>('voice');
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<any>(null);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'choose-style' | 'write-story'>('choose-style');
  const [zoomAvatar, setZoomAvatar] = useState(false);
  const [selectedSceneStyle, setSelectedSceneStyle] = useState(STYLES[0].prompt);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const p = await getProfile();
        if (!p) { navigate('/'); return; }
        setProfile(p);
        if (p.sceneStyle) setSelectedSceneStyle(p.sceneStyle);

        if (connectionId) {
          const conn = await getConnectionById(connectionId);
          if (!conn) { navigate('/dashboard'); return; }
          setFriendProfile(conn.friendProfile);
          setFriendName(conn.friendProfile.name);
        }
      } catch {
        setError(t('storyEngine.errors.load_failed'));
      }
    };
    loadProfile();
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, [navigate]);

  const resolveQuestionLabel = (key: string): string => {
    if (PROFILE_FIELD_META[key]) return PROFILE_FIELD_META[key].labels.en;
    if (QUESTION_MAP[key]) return QUESTION_MAP[key].labels.en;
    const custom = friendProfile?.customQuestions?.find((cq: any) => cq.id === key);
    if (custom) return custom.label;
    return key;
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setInputMode('manual'); return; }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = profile?.language === 'nl' ? 'nl-NL' : 'en-US';
    let finalTranscript = story;
    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + ' ';
        else interim += event.results[i][0].transcript;
      }
      setStory(finalTranscript);
      setInterimText(interim);
    };
    recognition.onend = () => { setIsListening(false); setInterimText(''); };
    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setInterimText('');
  };

  const handleGenerate = async () => {
    if (!profile) return;
    if (!friendName || !story) {
      setError(t('storyEngine.errors.fill_required'));
      return;
    }

    try {
      setError('');
      const entryId = uuidv4();

      let finalFriendFeatures = friendProfile?.avatarFeatures;
      let finalFriendAvatarUrl = friendProfile?.avatarUrl;

      if (!finalFriendFeatures || !finalFriendAvatarUrl) {
        setLoadingStep(t('storyEngine.steps.imagining_friend'));
        finalFriendFeatures = await generateAvatarPrompt(`A kid named ${friendName}`, profile.worldStyle);
        const friendAvatarBase64 = await generateImage(finalFriendFeatures);
        finalFriendAvatarUrl = await uploadBase64ToStorage(friendAvatarBase64, `avatars/${uuidv4()}.png`);
      }

      setLoadingStep(t('storyEngine.steps.drawing_scene'));
      const scenePrompt = await generateStoryImagePrompt(profile.avatarFeatures, finalFriendFeatures, story, selectedSceneStyle);
      const sceneImageBase64 = await generateImage(scenePrompt);
      const sceneImageUrl = await uploadBase64ToStorage(sceneImageBase64, `scenes/${entryId}.png`);

      setLoadingStep(t('storyEngine.steps.recording_narrator'));
      let audioUrl = '';
      try {
        const audioBase64 = await generateNarration(story, profile.language ?? 'en');
        audioUrl = await uploadBase64ToStorage(audioBase64, `audio/${entryId}.wav`);
      } catch (audioErr: any) {
        console.error("Failed to generate audio in StoryEngine:", audioErr);
      }

      setLoadingStep(t('storyEngine.steps.saving'));
      const newEntry = {
        id: entryId,
        connectionId: connectionId || '',
        storyTranscript: story,
        imageUrl: sceneImageUrl,
        audioUrl,
        isApproved: false,
        createdAt: Date.now()
      };
      await saveEntry(newEntry as any);
      navigate(`/approve/${newEntry.id}`);
    } catch (err: any) {
      setError(err.message || t('storyEngine.errors.generic'));
      setLoadingStep('');
    }
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-wonderland flex flex-col items-center p-6 relative overflow-hidden">
      {/* Floating shapes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[10%] left-[5%] w-7 h-7 rounded-full bg-sunny-300/30" style={{ animation: 'float 5s ease-in-out infinite' }} />
        <div className="absolute top-[30%] right-[6%] w-5 h-5 rounded-full bg-coral-300/25" style={{ animation: 'float-slow 7s ease-in-out infinite 1s' }} />
        <div className="absolute bottom-[20%] left-[8%] w-6 h-6 rounded-full bg-sky-300/20" style={{ animation: 'float 6s ease-in-out infinite 2s' }} />
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-magic-200/15 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-sunny-200/15 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl w-full mt-8">
        <button
          onClick={() => step === 'write-story' ? setStep('choose-style') : navigate(-1)}
          className="flex items-center gap-2 text-warm-500 hover:text-warm-800 font-medium mb-6 transition-colors"
        >
          <ArrowLeft size={20} /> {t('common.back')}
        </button>

        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.05 }}
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #facc15, #f472b6)' }}
          >
            <Sparkles size={36} color="white" strokeWidth={1.8} />
          </motion.div>
          <h1 className="text-4xl font-display font-bold text-warm-800 mb-2">{t('storyEngine.title')}</h1>
          <p className="text-warm-500 text-lg">{t('storyEngine.subtitle')}</p>
        </div>

        {/* Step 1: Choose scene style */}
        {step === 'choose-style' && !loadingStep && (
          <motion.div
            key="choose-style"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[2rem] shadow-magic border-2 border-magic-100 mb-6 text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Wand2 size={22} className="text-magic-500" />
                <h2 className="text-xl font-display font-bold text-warm-800">{t('storyEngine.choose_scene_style', 'Choose scene style')}</h2>
              </div>
              <p className="text-warm-500 text-sm">{t('storyEngine.choose_scene_style_subtitle', 'Pick the art style for your story scene')}</p>
            </div>

            <div className="mb-6">
              <StylePicker selected={selectedSceneStyle} onSelect={setSelectedSceneStyle} />
            </div>

            <motion.button
              onClick={() => setStep('write-story')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="w-full text-white font-bold py-5 px-6 rounded-full transition-all text-lg flex items-center justify-center gap-2 shadow-magic"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
            >
              {t('storyEngine.next_write_story', 'Next: Write your story')} <ArrowRight size={22} />
            </motion.button>
          </motion.div>
        )}

        {/* Step 2: Friend profile card + story form */}
        {friendProfile && step === 'write-story' && !loadingStep && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-sm p-6 rounded-[2rem] shadow-coral border-2 border-coral-100 mb-6 flex gap-5 items-center max-sm:flex-col max-sm:text-center"
          >
            <img
              src={friendProfile.avatarUrl || '/avatar-placeholder.svg'}
              alt={friendProfile.name}
              className="w-20 h-20 rounded-full object-cover border-4 border-coral-200 shadow-sm flex-shrink-0 cursor-zoom-in"
              referrerPolicy="no-referrer"
              onError={(e) => { (e.target as HTMLImageElement).src = '/avatar-placeholder.svg'; }}
              onClick={() => setZoomAvatar(true)}
            />
            {zoomAvatar && (
              <AvatarZoom
                src={friendProfile.avatarUrl || '/avatar-placeholder.svg'}
                alt={friendProfile.name}
                onClose={() => setZoomAvatar(false)}
              />
            )}
            <div className="flex-1">
              <h2 className="text-xl font-display font-bold text-warm-800 mb-1">
                {t('storyEngine.friend_details', { name: friendProfile.name })}
              </h2>
              {friendProfile.interviewAnswers && (
                <div>
                  <span className="text-xs font-bold text-warm-400 uppercase tracking-wider block mb-1">{t('storyEngine.interview_answers')}</span>
                  <ul className="text-warm-700 text-sm list-disc pl-5 text-left max-sm:text-center max-sm:list-none max-sm:pl-0 space-y-0.5">
                    {Object.entries(friendProfile.interviewAnswers).map(([q, a]) => (
                      <li key={q}><strong>{resolveQuestionLabel(q)}:</strong> {a as string}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Loading state (step 2 only) */}
        {step === 'write-story' && loadingStep && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/80 backdrop-blur-sm p-12 rounded-[2rem] shadow-magic border-2 border-magic-100 text-center flex flex-col items-center justify-center min-h-[400px]"
          >
            <Loader2 className="animate-spin text-magic-500 mb-6" size={64} />
            <h2 className="text-2xl font-display font-bold text-warm-800 mb-4">{loadingStep}</h2>
            <div className="flex gap-6 mt-6">
              <div className={`p-3 rounded-full ${loadingStep.includes('Drawing') ? 'bg-magic-100' : 'bg-warm-100'}`}>
                <ImageIcon size={28} className={loadingStep.includes('Drawing') ? 'text-magic-500' : 'text-warm-300'} />
              </div>
              <div className={`p-3 rounded-full ${loadingStep.includes('Recording') ? 'bg-coral-100' : 'bg-warm-100'}`}>
                <Music size={28} className={loadingStep.includes('Recording') ? 'text-coral-500' : 'text-warm-300'} />
              </div>
            </div>
          </motion.div>
        )}

        {/* Story form (step 2 only) */}
        {step === 'write-story' && !loadingStep && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-sm p-8 rounded-[2rem] shadow-magic border-2 border-magic-100"
          >
            <div className="mb-6">
              <label className="block text-warm-700 font-semibold mb-2 text-lg">{t('storyEngine.who_is_friend')}</label>
              <input
                type="text"
                value={friendName}
                onChange={(e) => setFriendName(e.target.value)}
                disabled={!!friendProfile}
                className={`w-full p-4 border-2 rounded-2xl focus:outline-none text-lg text-warm-800 ${
                  friendProfile
                    ? 'bg-warm-100 border-warm-200 text-warm-400 cursor-not-allowed'
                    : 'border-warm-200 focus:border-magic-400 placeholder:text-warm-300'
                }`}
                placeholder={t('storyEngine.friend_placeholder')}
              />
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <label className="text-warm-700 font-semibold text-lg">{t('storyEngine.what_happened')}</label>
                <button
                  onClick={() => { stopListening(); setInputMode(inputMode === 'voice' ? 'manual' : 'voice'); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-warm-100 text-warm-500 hover:bg-warm-200 transition-colors"
                >
                  {inputMode === 'voice' ? <><Keyboard size={13} /> {t('storyEngine.type_instead', 'Type instead')}</> : <><Mic size={13} /> {t('storyEngine.use_voice', 'Use voice')}</>}
                </button>
              </div>

              {inputMode === 'voice' ? (
                <div className="flex flex-col items-center gap-4">
                  <motion.button
                    onClick={isListening ? stopListening : startListening}
                    whileTap={{ scale: 0.93 }}
                    className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all ${
                      isListening
                        ? 'bg-red-500 text-white shadow-red-200'
                        : 'text-white shadow-magic'
                    }`}
                    style={isListening ? {} : { background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
                  >
                    {isListening
                      ? <Square size={32} fill="white" />
                      : <Mic size={36} strokeWidth={1.8} />}
                  </motion.button>
                  {isListening && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-1.5 items-center">
                      {[0, 1, 2, 3].map(i => (
                        <motion.div key={i} className="w-1.5 bg-magic-400 rounded-full" animate={{ height: [8, 20, 8] }} transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }} />
                      ))}
                      <span className="text-magic-500 text-sm font-medium ml-1">{t('storyEngine.listening', 'Listening...')}</span>
                    </motion.div>
                  )}
                  {(story || interimText) && (
                    <div className="w-full p-4 bg-warm-50 border-2 border-warm-200 rounded-2xl text-warm-700 text-base min-h-[80px]">
                      {story}<span className="text-warm-400">{interimText}</span>
                    </div>
                  )}
                  {!story && !isListening && (
                    <p className="text-warm-400 text-sm">{t('storyEngine.tap_mic', 'Tap the mic and tell your story!')}</p>
                  )}
                </div>
              ) : (
                <textarea
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                  className="w-full p-4 border-2 rounded-2xl focus:outline-none text-lg h-40 resize-none transition-colors text-warm-800 placeholder:text-warm-300 border-warm-200 focus:border-magic-400"
                  placeholder={t('storyEngine.story_placeholder')}
                />
              )}
            </div>

            {error && <p className="text-red-500 mb-6 font-medium text-center">{error}</p>}

            <motion.button
              onClick={handleGenerate}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="w-full text-white font-bold py-5 px-6 rounded-full transition-all text-lg flex items-center justify-center gap-2 shadow-magic"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
            >
              <Sparkles size={24} />
              {t('storyEngine.create_magic')}
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
