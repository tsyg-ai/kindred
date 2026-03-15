import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { saveCustomAnswersForConnection, getActiveProfileId } from '../services/db';
import { resolveCustomQuestion, type CustomQuestion } from '../services/questions';
import { motion } from 'motion/react';
import { Mic, MicOff, Loader2, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useVoiceSession } from '../hooks/useVoiceSession';
import { ANSWER_TINTS } from '../constants';

export default function FriendQuestionsInterview() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    connectionId,
    friendProfile,
    questions,
    myProfileName,
    myProfileAge,
    language,
  } = location.state || {};

  const sessionQuestions = (questions as CustomQuestion[] ?? []).map(resolveCustomQuestion);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const questionLabelMap: Record<string, string> = Object.fromEntries(
    sessionQuestions.map(q => [q.id, q.labels['en'] ?? q.id])
  );

  const handleSaveAnswers = async (answers: Record<string, string>) => {
    setSaving(true);
    setError('');
    try {
      const myProfileId = getActiveProfileId();
      if (!myProfileId || !connectionId) throw new Error('Missing profile or connection');
      await saveCustomAnswersForConnection(connectionId, myProfileId, { answers });
      navigate(`/friend/${connectionId}`, { replace: true });
    } catch (err: any) {
      console.error('Failed to save answers:', err);
      setError(err.message || 'Failed to save answers. Please try again.');
      setSaving(false);
    }
  };

  const { isConnecting, isRecording, liveAnswers, start, stop } = useVoiceSession({
    questions: sessionQuestions,
    childName: myProfileName,
    childAge: myProfileAge,
    language: language || 'nl',
    finishMessage: `All questions answered! Say "Thank you, I'll save your answers now!" and then call the finishInterview tool.`,
    onFinish: handleSaveAnswers,
    onError: setError,
  });

  if (saving) {
    return (
      <div className="min-h-screen bg-wonderland flex flex-col items-center justify-center p-6">
        <Loader2 className="animate-spin text-magic-500 mb-6" size={64} />
        <h2 className="text-2xl font-display font-bold text-warm-800 mb-3">{t('common.saving')}</h2>
        <p className="text-warm-400">{t('common.creating_magic')}</p>
        {error && <p className="text-red-500 mt-6 font-medium">{error}</p>}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-wonderland flex flex-col items-center p-6 relative overflow-hidden"
    >
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[10%] left-[5%] w-7 h-7 rounded-full bg-sunny-300/30" style={{ animation: 'float 5s ease-in-out infinite' }} />
        <div className="absolute top-[30%] right-[6%] w-5 h-5 rounded-full bg-coral-300/25" style={{ animation: 'float-slow 7s ease-in-out infinite 1s' }} />
        <div className="absolute bottom-[20%] left-[8%] w-6 h-6 rounded-full bg-sky-300/20" style={{ animation: 'float 6s ease-in-out infinite 2s' }} />
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-magic-200/15 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-coral-200/15 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl w-full mt-8">
        {!isRecording && !isConnecting && (
          <button
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center gap-2 text-warm-500 hover:text-warm-800 font-medium transition-colors"
          >
            <ArrowLeft size={20} /> {t('common.back')}
          </button>
        )}

        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold text-warm-800 mb-2">
            {t('friendQuestionsInterview.title', { name: friendProfile?.name ?? 'friend' })}
          </h1>
          <p className="text-warm-500">{t('friendQuestionsInterview.subtitle')}</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm p-10 rounded-[2rem] shadow-magic border-2 border-magic-100 text-center flex flex-col items-center justify-center min-h-[400px]">
          {isConnecting ? (
            <>
              <Loader2 className="animate-spin text-magic-500 mb-6" size={64} />
              <h2 className="text-2xl font-display font-bold text-warm-800 mb-3">{t('voiceInterview.connecting')}</h2>
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
              <p className="text-warm-400 mb-2">{t('friendQuestionsInterview.question_count', { count: sessionQuestions.length })}</p>
              <div className="flex flex-wrap gap-2 justify-center mb-8">
                {sessionQuestions.map(q => (
                  <span key={q.id} className="text-sm bg-magic-50 border border-magic-100 text-magic-700 px-3 py-1 rounded-full font-medium">
                    {q.emoji} {q.labels['en']}
                  </span>
                ))}
              </div>
              <motion.button
                onClick={start}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="text-white font-bold py-5 px-10 rounded-full text-lg shadow-magic flex items-center gap-2"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
              >
                <Mic size={24} /> {t('voiceInterview.start_interview')}
              </motion.button>
            </>
          )}
          {error && <p className="text-red-500 mt-6 font-medium">{error}</p>}
        </div>
      </div>
    </motion.div>
  );
}
