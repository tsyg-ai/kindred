import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllProfiles, signInWithGoogle } from '../services/db';
import { motion } from 'motion/react';
import { Sparkles, Loader2 } from 'lucide-react';
import { User } from 'firebase/auth';
import { useTranslation } from 'react-i18next';

export default function Welcome({ user }: { user: User | null }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkProfile = async () => {
      if (user) {
        setLoading(true);
        try {
          const profiles = await getAllProfiles();
          if (profiles.length > 0) {
            navigate('/select-profile');
          } else if (localStorage.getItem('kindred_onboarding_seen')) {
            navigate('/setup');
          } else {
            navigate('/onboarding');
          }
        } catch (err) {
          console.error("Error checking profile:", err);
          setError(t('welcome.errors.load_profile'));
          setLoading(false);
        }
      }
    };
    checkProfile();
  }, [user, navigate, t]);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Login failed:", err);
      setError(err.message || t('welcome.errors.sign_in'));
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-wonderland pattern-dots flex flex-col items-center justify-center p-6 text-center relative overflow-hidden"
    >
      {/* Floating decorative shapes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[8%] left-[6%] w-10 h-10 rounded-full bg-sunny-300/35"
             style={{ animation: 'float 5s ease-in-out infinite' }} />
        <div className="absolute top-[20%] right-[7%] w-7 h-7 rounded-full bg-coral-300/30"
             style={{ animation: 'float-slow 7s ease-in-out infinite 1s' }} />
        <div className="absolute top-[55%] left-[4%] w-5 h-5 rounded-full bg-magic-300/25"
             style={{ animation: 'twinkle 3.5s ease-in-out infinite 0.5s' }} />
        <div className="absolute bottom-[18%] left-[14%] w-8 h-8 rounded-full bg-sky-300/25"
             style={{ animation: 'float 6s ease-in-out infinite 2s' }} />
        <div className="absolute bottom-[30%] right-[10%] w-6 h-6 rounded-full bg-mint-300/30"
             style={{ animation: 'float-slow 8s ease-in-out infinite 3s' }} />
        <div className="absolute top-[38%] right-[20%] w-4 h-4 rounded-full bg-sunny-400/25"
             style={{ animation: 'twinkle 4s ease-in-out infinite 1.5s' }} />
        {/* Larger background blobs */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-magic-200/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-coral-200/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-sky-200/15 blur-3xl" />
      </div>

      {/* Card */}
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 18 }}
        className="relative z-10 bg-white/75 backdrop-blur-lg p-10 rounded-[2.5rem] shadow-magic border-2 border-white/60 max-w-lg w-full"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.35, type: 'spring', stiffness: 260, damping: 16 }}
          className="w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'linear-gradient(135deg, #a78bfa, #f472b6)' }}
        >
          <Sparkles size={52} color="white" strokeWidth={1.8} />
        </motion.div>

        <h1 className="text-6xl font-display font-bold mb-3 text-gradient-magic leading-tight">
          Kindred
        </h1>
        <p className="text-warm-600 mb-8 text-xl font-medium">{t('welcome.subtitle')}</p>

        {error && <p className="text-red-500 mb-4 font-medium">{error}</p>}

        <motion.button
          onClick={handleLogin}
          disabled={loading || !!user}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="w-full text-white font-bold py-5 px-8 rounded-full text-xl shadow-magic flex items-center justify-center gap-3 transition-all disabled:opacity-60"
          style={{ background: loading || !!user ? '#c4b5fd' : 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
        >
          {loading || user ? <Loader2 className="animate-spin" size={24} /> : null}
          {loading || user ? t('common.loading') : t('welcome.sign_in')}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
