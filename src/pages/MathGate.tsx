import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEntries, updateEntry, deleteEntry, FriendshipEntry } from '../services/db';
import { generateMathProblem } from '../services/gemini';
import { motion } from 'motion/react';
import { ShieldAlert, CheckCircle2, XCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function MathGate() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [entry, setEntry] = useState<FriendshipEntry | null>(null);
  const [problem, setProblem] = useState<{ problem: string; answer: number } | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return navigate('/dashboard');
      try {
        const entries = await getEntries();
        const e = entries.find(x => x.id === id);
        if (!e) return navigate('/dashboard');
        setEntry(e);
      } catch {
        setError(t('mathGate.errors.load_failed'));
        setLoading(false);
        return;
      }
      try {
        const prob = await generateMathProblem();
        setProblem(prob);
      } catch {
        setProblem({ problem: '14 + 7', answer: 21 });
      }
      setLoading(false);
    };
    loadData();
  }, [id, navigate]);

  const handleVerify = async () => {
    if (!problem || !entry) return;
    if (parseInt(userAnswer) === problem.answer) {
      try {
        await updateEntry(entry.id, { isApproved: true });
        navigate(`/story-view/${entry.id}`);
      } catch {
        setError(t('mathGate.errors.approve_failed'));
      }
    } else {
      setError(t('mathGate.errors.incorrect'));
    }
  };

  const handleDelete = async () => {
    if (!entry) return;
    try {
      await deleteEntry(entry.id);
      navigate('/dashboard');
    } catch {
      setError(t('mathGate.errors.delete_failed'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-wonderland-parent flex items-center justify-center">
        <Loader2 className="animate-spin text-magic-500" size={48} />
      </div>
    );
  }

  if (!entry || !problem) {
    return (
      <div className="min-h-screen bg-wonderland-parent flex items-center justify-center p-6">
        <div className="bg-white/90 rounded-[2rem] p-8 shadow-sky text-center max-w-sm">
          <p className="text-red-500 font-medium">{error || t('mathGate.errors.load_failed')}</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="min-h-screen bg-wonderland-parent flex flex-col items-center p-6"
    >
      <div className="max-w-xl w-full mt-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 justify-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #38bdf8, #8b5cf6)' }}>
            <ShieldAlert size={28} color="white" strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-display font-bold text-warm-800">{t('mathGate.title')}</h1>
        </div>

        {/* Story review card */}
        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-[2rem] shadow-sky border border-sky-200 mb-6 text-center">
          <h2 className="text-xl font-display font-semibold text-warm-800 mb-5">{t('mathGate.review_story')}</h2>

          <div className="relative h-64 rounded-2xl overflow-hidden mb-6 shadow-md">
            <img
              src={entry.imageUrl}
              alt="Generated Scene"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <p className="text-white font-medium line-clamp-2 text-left">{entry.storyTranscript}</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-bold text-warm-400 uppercase tracking-wider mb-2">{t('mathGate.generated_audio')}</h3>
            {entry.audioUrl ? (
              <audio controls src={entry.audioUrl} className="w-full" />
            ) : (
              <p className="text-warm-400 italic text-sm bg-warm-50 p-3 rounded-xl border border-warm-200">{t('mathGate.audio_failed')}</p>
            )}
          </div>

          <button
            onClick={handleDelete}
            className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 px-4 rounded-2xl transition-colors flex items-center justify-center gap-2"
          >
            <XCircle size={20} /> {t('mathGate.reject_delete')}
          </button>
        </div>

        {/* Math verification card */}
        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-[2rem] shadow-sky border border-sky-200 text-center">
          <h2 className="text-xl font-display font-semibold text-warm-800 mb-2">{t('mathGate.verify_adult')}</h2>
          <p className="text-warm-500 mb-6">{t('mathGate.solve_math')}</p>

          <div className="text-4xl font-mono font-bold text-warm-800 mb-6 bg-sky-50 py-5 rounded-2xl border-2 border-sky-200">
            {problem.problem} = ?
          </div>

          <div className="flex gap-4 mb-4">
            <input
              type="number"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              className="flex-1 p-4 border-2 border-warm-200 rounded-2xl focus:border-magic-400 focus:outline-none text-2xl text-center font-mono text-warm-800"
              placeholder={t('mathGate.answer_placeholder')}
            />
            <motion.button
              onClick={handleVerify}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="text-white font-bold py-4 px-8 rounded-2xl text-lg shadow-magic flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)' }}
            >
              {t('mathGate.approve')} <ArrowRight size={24} />
            </motion.button>
          </div>

          {error && <p className="text-red-500 font-medium">{error}</p>}
        </div>
      </div>
    </motion.div>
  );
}
