import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { generateAvatarPrompt, generateImage } from '../services/gemini';
import { saveProfile, uploadBase64ToStorage, getProfile } from '../services/db';
import { INTERVIEW_QUESTIONS, getQuestionText, getQuestionLabel, buildInterviewQuestions, type CustomQuestion } from '../services/questions';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Loader2, CheckCircle2, ArrowRight, ArrowLeft, Mic } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AvatarZoom from '../components/AvatarZoom';

export default function ChildInterview() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { name, age, worldStyle, language, selectedQuestionIds, customQuestions } = location.state || { name: '', age: '', worldStyle: 'Watercolor', language: 'en', selectedQuestionIds: undefined, customQuestions: [] };

  const QUESTIONS = buildInterviewQuestions({
    selectedQuestionIds: selectedQuestionIds ?? INTERVIEW_QUESTIONS.map(q => q.id),
    customQuestions: (customQuestions ?? []) as CustomQuestion[],
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({ name, age });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [generatedAvatar, setGeneratedAvatar] = useState<{ url: string; features: string } | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [showZoom, setShowZoom] = useState(false);

  useEffect(() => {
    const loadExisting = async () => {
      const p = await getProfile();
      if (p) {
        setProfileId(p.id);
        setAnswers(prev => ({
          ...prev,
          name: prev.name || p.name || '',
          age: prev.age || (p.interviewAnswers && p.interviewAnswers.age) || ''
        }));
      }
    };
    loadExisting();
  }, []);

  const handleNext = () => {
    if (!answers[QUESTIONS[currentStep].id]?.trim()) {
      setError(t('childInterview.errors.answer_required'));
      return;
    }
    setError('');
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleGenerate();
    }
  };

  const handleBack = () => {
    setError('');
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const formattedAnswers = QUESTIONS.map(q => `${getQuestionLabel(q, language)}: ${answers[q.id] || 'Skipped'}`).join('\n');
      const features = await generateAvatarPrompt(formattedAnswers, worldStyle);
      const url = await generateImage(features);
      setGeneratedAvatar({ url, features });
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
        name: answers['name'] || name || 'Friend',
        worldStyle,
        language: language || 'en',
        avatarFeatures: generatedAvatar.features,
        avatarUrl: storageUrl,
        interviewAnswers: answers,
        customQuestions: (customQuestions ?? []) as CustomQuestion[],
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || t('childInterview.errors.save_failed'));
      setSaving(false);
    }
  };

  const currentQ = QUESTIONS[currentStep];
  const progress = ((currentStep + 1) / QUESTIONS.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="min-h-screen bg-wonderland flex flex-col items-center p-6 relative overflow-hidden"
    >
      {/* Floating shapes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[10%] left-[5%] w-7 h-7 rounded-full bg-sunny-300/30"
             style={{ animation: 'float 5s ease-in-out infinite' }} />
        <div className="absolute top-[30%] right-[6%] w-5 h-5 rounded-full bg-coral-300/25"
             style={{ animation: 'float-slow 7s ease-in-out infinite 1s' }} />
        <div className="absolute bottom-[20%] left-[8%] w-6 h-6 rounded-full bg-sky-300/20"
             style={{ animation: 'float 6s ease-in-out infinite 2s' }} />
        <div className="absolute top-[55%] right-[12%] w-4 h-4 rounded-full bg-magic-300/25"
             style={{ animation: 'twinkle 3s ease-in-out infinite' }} />
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-magic-200/15 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-coral-200/15 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl w-full mt-8">
        {!generatedAvatar && (
          <button
            onClick={() => {
              if (currentStep > 0) {
                handleBack();
              } else {
                navigate('/choose-style', { state: { name, age, language, selectedQuestionIds, customQuestions } });
              }
            }}
            disabled={loading}
            className="mb-6 flex items-center gap-2 text-warm-500 hover:text-warm-800 font-medium transition-colors disabled:opacity-40"
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
          <h1 className="text-4xl font-display font-bold text-warm-800 mb-2">{t('childInterview.title')}</h1>
          <p className="text-warm-500 text-lg">{t('childInterview.subtitle')}</p>
        </div>

        {!generatedAvatar ? (
          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-[2rem] shadow-magic border-2 border-magic-100">
            {/* Progress bar + voice toggle */}
            <div className="flex justify-between items-center mb-6 gap-4">
              <div className="flex-1">
                {/* Step pill */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-magic-500 uppercase tracking-wider">
                    {t('childInterview.question_counter', { current: currentStep + 1, total: QUESTIONS.length })}
                  </span>
                </div>
                {/* Chunky progress bar */}
                <div className="bg-magic-100 h-3 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #8b5cf6, #ec4899)' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}
                  />
                </div>
              </div>
              <button
                onClick={() => navigate('/voice-interview', { state: { name, age, worldStyle, language, selectedQuestionIds, customQuestions } })}
                className="text-magic-600 hover:text-magic-700 font-bold flex items-center gap-1.5 text-sm bg-magic-50 border border-magic-200 px-3 py-2 rounded-full transition-colors whitespace-nowrap flex-shrink-0"
              >
                <Mic size={15} /> {t('childInterview.use_voice')}
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                {/* Question bubble */}
                <div className="bg-magic-50 rounded-2xl p-5 mb-5 border border-magic-100">
                  <h2 className="text-xl font-display font-semibold text-warm-800 mb-1">{getQuestionLabel(currentQ, language)}</h2>
                  <p className="text-warm-600 text-lg leading-relaxed">{getQuestionText(currentQ, language)}</p>
                </div>

                <textarea
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [currentQ.id]: e.target.value })}
                  className="w-full p-4 border-2 border-warm-200 rounded-2xl focus:border-magic-400 focus:outline-none text-lg h-32 resize-none text-warm-800 placeholder:text-warm-300"
                  placeholder={t('childInterview.answer_placeholder')}
                  autoFocus
                />
              </motion.div>
            </AnimatePresence>

            {error && <p className="text-red-500 mt-4 font-medium">{error}</p>}

            <div className="mt-6">
              <motion.button
                onClick={handleNext}
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="w-full text-white font-bold py-4 px-6 rounded-full transition-all text-lg flex items-center justify-center gap-2 shadow-magic disabled:opacity-60"
                style={{ background: loading ? '#c4b5fd' : 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
              >
                {loading ? (
                  <><Loader2 className="animate-spin" size={24} /> {t('common.creating_magic')}</>
                ) : currentStep === QUESTIONS.length - 1 ? (
                  <><Sparkles size={24} /> {t('childInterview.generate_avatar')}</>
                ) : (
                  <>{t('childInterview.next')} <ArrowRight size={24} /></>
                )}
              </motion.button>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            className="bg-white/80 backdrop-blur-sm p-8 rounded-[2rem] shadow-magic border-2 border-magic-100 text-center"
          >
            <h2 className="text-3xl font-display font-bold text-warm-800 mb-6">{t('childInterview.meet_avatar')}</h2>
            {/* Avatar with glow ring */}
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
        )}
      </div>
    </motion.div>
  );
}
