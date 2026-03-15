import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { generateAvatarPrompt, generateImage } from '../services/gemini';
import { saveProfile, uploadBase64ToStorage, getProfile } from '../services/db';
import { INTERVIEW_QUESTIONS, getQuestionLabel, buildInterviewQuestions, type CustomQuestion } from '../services/questions';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Loader2, Sparkles, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useVoiceSession } from '../hooks/useVoiceSession';
import { ANSWER_TINTS } from '../constants';
import AvatarZoom from '../components/AvatarZoom';

export default function VoiceInterview() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { name, age, worldStyle, language, selectedQuestionIds, customQuestions } = location.state || { name: '', age: '', worldStyle: 'Watercolor', language: 'en', selectedQuestionIds: undefined, customQuestions: [] };

  const sessionQuestions = buildInterviewQuestions({
    selectedQuestionIds: selectedQuestionIds ?? INTERVIEW_QUESTIONS.map(q => q.id),
    customQuestions: (customQuestions ?? []) as CustomQuestion[],
  });

  const questionLabelMap: Record<string, string> = {
    name: 'Name',
    age: 'Age',
    ...Object.fromEntries(sessionQuestions.map(q => [q.id, getQuestionLabel(q, language)])),
  };

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [generatedAvatar, setGeneratedAvatar] = useState<{ url: string; features: string; answers: any } | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [showZoom, setShowZoom] = useState(false);

  useEffect(() => {
    getProfile().then(p => { if (p) setProfileId(p.id); });
  }, []);

  const handleGenerate = async (answers: any) => {
    setLoading(true);
    setError('');
    try {
      const formattedAnswers = Object.entries(answers).map(([k, v]) => `${k}: ${v}`).join('\n');
      const features = await generateAvatarPrompt(formattedAnswers, worldStyle);
      const url = await generateImage(features);
      setGeneratedAvatar({ url, features, answers });
      setShowZoom(true);
    } catch (err: any) {
      setError(err.message || t('childInterview.errors.generate_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!generatedAvatar) return;
    setSaving(true);
    try {
      const id = profileId || uuidv4();
      const storageUrl = await uploadBase64ToStorage(generatedAvatar.url, `avatars/${id}.png`);
      await saveProfile({
        id,
        name: generatedAvatar.answers.name || name || 'Friend',
        worldStyle,
        language: language || 'en',
        avatarFeatures: generatedAvatar.features,
        avatarUrl: storageUrl,
        interviewAnswers: generatedAvatar.answers,
        customQuestions: (customQuestions ?? []) as CustomQuestion[],
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || t('voiceInterview.errors.save_failed'));
      setSaving(false);
    }
  };

  const { isConnecting, isRecording, liveAnswers, start, stop } = useVoiceSession({
    questions: sessionQuestions,
    childName: name,
    childAge: age,
    language,
    initialAnswers: { name, age },
    finishMessage: `All questions answered! Say exactly "${language === 'nl' ? 'Nu ga ik jouw unieke profielafbeelding maken!' : "Now I'll create your unique profile image!"}" in the session language (${language}), then call the finishInterview tool.`,
    onFinish: handleGenerate,
    onError: setError,
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="min-h-screen bg-wonderland flex flex-col items-center p-6 relative overflow-hidden"
    >
      {/* Floating shapes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[10%] left-[5%] w-7 h-7 rounded-full bg-sunny-300/30" style={{ animation: 'float 5s ease-in-out infinite' }} />
        <div className="absolute top-[30%] right-[6%] w-5 h-5 rounded-full bg-coral-300/25" style={{ animation: 'float-slow 7s ease-in-out infinite 1s' }} />
        <div className="absolute bottom-[20%] left-[8%] w-6 h-6 rounded-full bg-sky-300/20" style={{ animation: 'float 6s ease-in-out infinite 2s' }} />
        <div className="absolute top-[55%] right-[12%] w-4 h-4 rounded-full bg-mint-300/25" style={{ animation: 'twinkle 3s ease-in-out infinite' }} />
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-magic-200/15 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-coral-200/15 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl w-full mt-8">
        {!isRecording && !isConnecting && !loading && !generatedAvatar && (
          <button
            onClick={() => navigate('/choose-style', { state: { name, age, language, selectedQuestionIds, customQuestions } })}
            className="mb-6 flex items-center gap-2 text-warm-500 hover:text-warm-800 font-medium transition-colors"
          >
            <ArrowLeft size={20} /> {t('common.back')}
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #a78bfa, #f472b6)' }}
          >
            <Sparkles size={36} color="white" strokeWidth={1.8} />
          </motion.div>
          <h1 className="text-4xl font-display font-bold text-warm-800 mb-2">{t('voiceInterview.title')}</h1>
          <p className="text-warm-500 text-lg">{t('voiceInterview.subtitle')}</p>
        </div>

        {!generatedAvatar && !loading ? (
          <div className="bg-white/80 backdrop-blur-sm p-10 rounded-[2rem] shadow-magic border-2 border-magic-100 text-center flex flex-col items-center justify-center min-h-[400px]">
            {isConnecting ? (
              <>
                <Loader2 className="animate-spin text-magic-500 mb-6" size={64} />
                <h2 className="text-2xl font-display font-bold text-warm-800 mb-3">{t('voiceInterview.connecting')}</h2>
                <p className="text-warm-400 mb-8">{t('voiceInterview.waking_up')}</p>
              </>
            ) : isRecording ? (
              <>
                <div className="relative mb-8 flex items-center justify-center">
                  <div className="absolute w-40 h-40 rounded-full"
                       style={{ background: 'rgba(139,92,246,0.12)', animation: 'pulse-ring 1.8s ease-out infinite' }} />
                  <div className="absolute w-40 h-40 rounded-full"
                       style={{ background: 'rgba(236,72,153,0.10)', animation: 'pulse-ring 1.8s ease-out infinite 0.6s' }} />
                  <div className="w-28 h-28 rounded-full flex items-center justify-center relative z-10"
                       style={{ background: 'linear-gradient(135deg, #ede9fe, #fce7f3)' }}>
                    <Mic size={52} className="text-magic-500" />
                  </div>
                </div>
                <h2 className="text-2xl font-display font-bold text-warm-800 mb-3">{t('voiceInterview.listening')}</h2>
                <p className="text-warm-400 mb-6">{t('voiceInterview.guide')}</p>
                <motion.button
                  onClick={stop}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="bg-warm-100 hover:bg-warm-200 text-warm-700 font-bold py-3 px-8 rounded-full transition-colors flex items-center gap-2"
                >
                  <MicOff size={20} /> {t('voiceInterview.stop_interview')}
                </motion.button>

                {Object.keys(liveAnswers).length > 0 && (
                  <div className="w-full mt-8 border-t border-magic-100 pt-6">
                    <h3 className="text-base font-bold text-warm-600 mb-4">{t('voiceInterview.recorded_answers')}</h3>
                    <div className="grid grid-cols-2 gap-3 text-left">
                      {Object.entries(liveAnswers).map(([key, val], i) => (
                        <div key={key} className={`p-3 rounded-xl border ${ANSWER_TINTS[i % ANSWER_TINTS.length]}`}>
                          <span className="text-xs text-magic-500 font-bold uppercase block mb-1">{questionLabelMap[key] ?? key}</span>
                          <span className="text-warm-700 font-medium">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <motion.div
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-32 h-32 rounded-full flex items-center justify-center mb-8 bg-magic-50 border-2 border-magic-200"
                >
                  <Mic size={56} className="text-magic-400" />
                </motion.div>
                <h2 className="text-2xl font-display font-bold text-warm-800 mb-3">{t('voiceInterview.ready_title')}</h2>
                <p className="text-warm-400 mb-8">{t('voiceInterview.ready_subtitle')}</p>
                <motion.button
                  onClick={start}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="text-white font-bold py-5 px-10 rounded-full text-lg shadow-magic flex items-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
                >
                  <Mic size={24} /> {t('voiceInterview.start_interview')}
                </motion.button>
                <button
                  onClick={() => navigate('/interview', { state: { name, age, worldStyle, language, selectedQuestionIds, customQuestions } })}
                  className="mt-6 text-warm-500 hover:text-warm-700 font-medium transition-colors"
                >
                  {t('voiceInterview.type_instead')}
                </button>
              </>
            )}
            {error && <p className="text-red-500 mt-6 font-medium">{error}</p>}
          </div>
        ) : loading ? (
          <div className="bg-white/80 backdrop-blur-sm p-10 rounded-[2rem] shadow-magic border-2 border-magic-100 text-center flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="animate-spin text-magic-500 mb-6" size={64} />
            <h2 className="text-2xl font-display font-bold text-warm-800 mb-3">{t('common.creating_magic')}</h2>
            <p className="text-warm-400">{t('voiceInterview.generating_subtitle')}</p>
          </div>
        ) : generatedAvatar ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            className="bg-white/80 backdrop-blur-sm p-8 rounded-[2rem] shadow-magic border-2 border-magic-100 text-center"
          >
            <h2 className="text-3xl font-display font-bold text-warm-800 mb-6">{t('voiceInterview.meet_avatar')}</h2>
            <div className="relative inline-block mb-8 cursor-zoom-in" onClick={() => setShowZoom(true)}>
              <div className="absolute inset-0 rounded-full blur-md opacity-40"
                   style={{ background: 'linear-gradient(135deg, #a78bfa, #f472b6)', transform: 'scale(1.1)' }} />
              <img
                src={generatedAvatar.url}
                alt="Generated Avatar"
                className="w-64 h-64 object-cover rounded-full border-4 border-magic-300 shadow-xl relative z-10"
                referrerPolicy="no-referrer"
              />
            </div>
            <AnimatePresence>
              {showZoom && (
                <AvatarZoom src={generatedAvatar.url} alt="Generated Avatar" onClose={() => setShowZoom(false)} />
              )}
            </AnimatePresence>
            {error && <p className="text-red-500 mb-4 font-medium">{error}</p>}
            <motion.button
              onClick={handleSave}
              disabled={saving}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="w-full text-white font-bold py-5 px-6 rounded-full transition-all text-lg flex items-center justify-center gap-2 shadow-mint disabled:opacity-60 mb-4"
              style={{ background: saving ? '#86efac' : 'linear-gradient(135deg, #4ade80, #22c55e)' }}
            >
              {saving ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle2 size={24} />}
              {saving ? t('common.saving') : t('common.looks_great')}
            </motion.button>
            <button
              onClick={() => setGeneratedAvatar(null)}
              disabled={saving}
              className="w-full text-warm-500 hover:text-warm-700 font-medium py-3 px-6 rounded-full transition-colors disabled:opacity-50"
            >
              {t('common.try_again')}
            </button>
          </motion.div>
        ) : null}
      </div>
    </motion.div>
  );
}
