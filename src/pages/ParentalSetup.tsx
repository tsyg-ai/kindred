import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShieldCheck, ArrowRight, ArrowLeft, Globe, ListChecks, Plus, X, Loader2 } from 'lucide-react';
import { getProfile, updateProfile, getUserSettings, saveUserSettings } from '../services/db';
import { INTERVIEW_QUESTIONS, getQuestionLabel, type CustomQuestion, type SupportedLanguage } from '../services/questions';
import { generateCustomQuestion } from '../services/gemini';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'nl', label: 'Nederlands' },
];

export default function ParentalSetup() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [language, setLanguage] = useState(i18n.language || 'en');
  const [profileId, setProfileId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [selectedIds, setSelectedIds] = useState<string[]>(
    INTERVIEW_QUESTIONS.map(q => q.id)
  );
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [customTopicInput, setCustomTopicInput] = useState('');
  const [generatingQuestion, setGeneratingQuestion] = useState(false);
  const [questionError, setQuestionError] = useState('');

  useEffect(() => {
    const loadExisting = async () => {
      const p = await getProfile();
      if (p) {
        if (p.name) setName(p.name);
        if (p.interviewAnswers?.age) setAge(p.interviewAnswers.age);
        if (p.language) {
          setLanguage(p.language);
          i18n.changeLanguage(p.language);
        }
        setProfileId(p.id);
      }
    };
    loadExisting();
  }, []);

  useEffect(() => {
    getUserSettings().then(settings => {
      if (settings) {
        setSelectedIds(settings.selectedQuestionIds);
        setCustomQuestions(settings.customQuestions);
      }
    }).catch(() => {});
  }, []);

  const handleLanguageChange = async (lang: string) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    if (profileId) {
      await updateProfile(profileId, { language: lang });
    }
  };

  const toggleQuestion = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter(x => x !== id);
      }
      return [...prev, id];
    });
  };

  const handleAddCustomQuestion = async () => {
    const topic = customTopicInput.trim();
    if (!topic) return;
    if (!age.trim()) {
      setQuestionError(t('parentalSetup.errors.age_required_for_custom'));
      return;
    }
    setGeneratingQuestion(true);
    setQuestionError('');
    try {
      const texts = await generateCustomQuestion(topic, age);
      setCustomQuestions(prev => [...prev, {
        id: `custom_${Date.now()}`,
        topic,
        label: topic.charAt(0).toUpperCase() + topic.slice(1),
        texts,
      }]);
      setCustomTopicInput('');
    } catch {
      setQuestionError(t('parentalSetup.errors.generate_question_failed'));
    } finally {
      setGeneratingQuestion(false);
    }
  };

  const removeCustomQuestion = (id: string) => {
    setCustomQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleNext = async () => {
    if (!name.trim() || !age.trim()) {
      setError(t('parentalSetup.errors.fill_required'));
      return;
    }
    if (selectedIds.length === 0) {
      setError(t('parentalSetup.errors.min_one_question'));
      return;
    }
    setError('');
    await saveUserSettings({ selectedQuestionIds: selectedIds, customQuestions }).catch(() => {});
    navigate('/choose-style', { state: { name, age, language, selectedQuestionIds: selectedIds, customQuestions } });
  };

  return (
    <div className="min-h-screen bg-wonderland pattern-dots flex flex-col items-center p-6 pb-12 relative overflow-hidden">
      {/* Floating background shapes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[8%] left-[4%] w-8 h-8 rounded-full bg-magic-300/30"
             style={{ animation: 'float 5s ease-in-out infinite' }} />
        <div className="absolute top-[22%] right-[5%] w-5 h-5 rounded-full bg-coral-300/25"
             style={{ animation: 'float-slow 7s ease-in-out infinite 1s' }} />
        <div className="absolute bottom-[15%] left-[8%] w-6 h-6 rounded-full bg-sky-300/20"
             style={{ animation: 'float 6s ease-in-out infinite 2s' }} />
        <div className="absolute top-[50%] right-[10%] w-4 h-4 rounded-full bg-magic-300/25"
             style={{ animation: 'twinkle 3.5s ease-in-out infinite' }} />
        <div className="absolute bottom-[30%] left-[20%] w-5 h-5 rounded-full bg-mint-300/20"
             style={{ animation: 'float-slow 8s ease-in-out infinite 3s' }} />
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-magic-200/15 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-coral-200/15 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="relative z-10 max-w-5xl w-full"
      >
        <button
          onClick={() => navigate('/select-profile')}
          className="mt-6 mb-6 flex items-center gap-2 text-warm-500 hover:text-warm-800 font-medium transition-colors"
        >
          <ArrowLeft size={20} /> {t('common.back')}
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
               style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}>
            <ShieldCheck size={28} color="white" strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-display font-bold text-warm-800">{t('parentalSetup.title')}</h1>
        </div>

        {/* Two-column on tablet landscape / desktop */}
        <div className="grid lg:grid-cols-2 gap-6 items-start">

          {/* ── Left column: basics + continue ── */}
          <div className="flex flex-col gap-6">

            {/* Description card */}
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[1.75rem] shadow-magic border-2 border-magic-100">
              <p className="text-warm-600 text-lg mb-3">{t('parentalSetup.description')}</p>
              <p className="text-warm-600 text-lg mb-3">{t('parentalSetup.interview_info')}</p>
              <p className="text-warm-600 text-lg">{t('parentalSetup.instruction')}</p>
            </div>

            {/* Form card */}
            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-[1.75rem] shadow-magic border-2 border-magic-100">
              <div className="mb-6">
                <label className="block text-warm-700 font-bold mb-2 text-lg">{t('parentalSetup.child_name')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-4 border-2 border-warm-200 rounded-2xl focus:border-magic-400 focus:outline-none text-lg text-warm-800 placeholder:text-warm-300"
                  placeholder={t('parentalSetup.name_placeholder')}
                />
              </div>
              <div className="mb-6">
                <label className="block text-warm-700 font-bold mb-2 text-lg">{t('parentalSetup.child_age')}</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full p-4 border-2 border-warm-200 rounded-2xl focus:border-magic-400 focus:outline-none text-lg text-warm-800 placeholder:text-warm-300"
                  placeholder={t('parentalSetup.age_placeholder')}
                />
              </div>
              <div>
                <label className="block text-warm-700 font-bold mb-2 text-lg flex items-center gap-2">
                  <Globe size={20} className="text-warm-400" />
                  {t('parentalSetup.language')}
                </label>
                <div className="flex gap-3">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`flex-1 py-3 px-4 rounded-2xl border-2 font-bold text-lg transition-colors ${
                        language === lang.code
                          ? 'border-magic-400 bg-magic-50 text-magic-700'
                          : 'border-warm-200 bg-white text-warm-600 hover:border-warm-300'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && <p className="text-red-500 font-medium -mt-2">{error}</p>}

            {/* Continue button */}
            <motion.button
              onClick={handleNext}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="w-full text-white font-bold py-4 px-6 rounded-full transition-all text-lg flex items-center justify-center gap-2 shadow-magic"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
            >
              {t('parentalSetup.continue')} <ArrowRight size={20} />
            </motion.button>
          </div>

          {/* ── Right column: question customisation ── */}
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[1.75rem] shadow-magic border-2 border-magic-100">
            <h2 className="text-xl font-display font-bold text-warm-800 mb-1 flex items-center gap-2">
              <ListChecks size={22} className="text-magic-500" />
              {t('parentalSetup.customize_questions')}
            </h2>
            <p className="text-warm-500 text-sm mb-5">
              {t('parentalSetup.customize_questions_desc')}
            </p>

            {/* Custom question adder — top of card */}
            <div className="mb-5">
              <label className="block text-warm-700 font-bold mb-1">
                {t('parentalSetup.add_custom_question')}
              </label>
              <p className="text-warm-500 text-sm mb-3">
                {t('parentalSetup.add_custom_question_desc')}
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTopicInput}
                  onChange={e => setCustomTopicInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !generatingQuestion && handleAddCustomQuestion()}
                  placeholder={t('parentalSetup.custom_question_placeholder')}
                  maxLength={80}
                  className="flex-1 p-3 border-2 border-warm-200 rounded-2xl focus:border-magic-400 focus:outline-none text-warm-800 placeholder:text-warm-300"
                  disabled={generatingQuestion}
                />
                <motion.button
                  onClick={handleAddCustomQuestion}
                  disabled={generatingQuestion || !customTopicInput.trim()}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-4 py-3 rounded-2xl font-bold text-white disabled:opacity-50 flex items-center gap-1 flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
                >
                  {generatingQuestion
                    ? <Loader2 size={18} className="animate-spin" />
                    : <Plus size={18} />
                  }
                  {t('parentalSetup.add')}
                </motion.button>
              </div>

              {/* Custom questions list */}
              {customQuestions.length > 0 && (
                <div className="mt-3 space-y-2">
                  {customQuestions.map(cq => (
                    <div key={cq.id}
                         className="flex items-center gap-3 p-3 bg-magic-50 border-2 border-magic-200 rounded-2xl"
                    >
                      <span className="text-2xl flex-shrink-0">✏️</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-warm-700 capitalize">{cq.topic}</p>
                        <p className="text-sm text-warm-500">{cq.texts[language as SupportedLanguage]}</p>
                      </div>
                      <button
                        onClick={() => removeCustomQuestion(cq.id)}
                        className="text-warm-400 hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {questionError && <p className="text-red-500 text-sm mt-2">{questionError}</p>}
            </div>

            {/* Divider */}
            <div className="border-t border-warm-100 pt-5">
              {/* Default questions toggle list */}
              <div className="space-y-2">
                {INTERVIEW_QUESTIONS.map(q => {
                  const isOn = selectedIds.includes(q.id);
                  const isLastSelected = selectedIds.length === 1 && isOn;
                  return (
                    <button
                      key={q.id}
                      onClick={() => toggleQuestion(q.id)}
                      disabled={isLastSelected}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-colors text-left
                        ${isOn
                          ? 'border-magic-200 bg-magic-50'
                          : 'border-warm-200 bg-warm-50 opacity-60'
                        }
                        ${isLastSelected ? 'cursor-not-allowed' : 'hover:border-magic-300'}
                      `}
                    >
                      <span className="text-2xl w-8 text-center">{q.emoji}</span>
                      <span className="flex-1 font-medium text-warm-700">
                        {getQuestionLabel(q, language)}
                      </span>
                      <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 flex-shrink-0
                        ${isOn ? 'bg-magic-400' : 'bg-warm-300'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform
                          ${isOn ? 'translate-x-4' : 'translate-x-0'}`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
