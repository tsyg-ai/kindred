import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllProfiles, setActiveProfileId, deleteProfile, UserProfile } from '../services/db';
import i18n from '../i18n';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Plus, Loader2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Rotating card accent colors per profile slot
const CARD_TINTS = [
  { bg: 'bg-magic-50', border: 'border-magic-200', ring: 'border-magic-300', shadow: 'shadow-magic' },
  { bg: 'bg-coral-50', border: 'border-coral-200', ring: 'border-coral-300', shadow: 'shadow-coral' },
  { bg: 'bg-sky-50',   border: 'border-sky-200',   ring: 'border-sky-300',   shadow: 'shadow-sky'   },
  { bg: 'bg-mint-50',  border: 'border-mint-200',  ring: 'border-mint-300',  shadow: 'shadow-mint'  },
  { bg: 'bg-sunny-50', border: 'border-sunny-200', ring: 'border-sunny-200', shadow: ''             },
];

export default function SelectProfile() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profileToDelete, setProfileToDelete] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const fetchedProfiles = await getAllProfiles();
        setProfiles(fetchedProfiles);
      } catch (err) {
        console.error("Error fetching profiles:", err);
        setError(t('selectProfile.errors.load_profiles'));
      } finally {
        setLoading(false);
      }
    };
    fetchProfiles();
  }, []);

  const handleSelectProfile = (profile: UserProfile) => {
    setActiveProfileId(profile.id);
    if (profile.language) i18n.changeLanguage(profile.language);
    navigate('/dashboard');
  };

  const handleCreateNew = () => {
    setActiveProfileId('');
    navigate('/setup');
  };

  const handleDeleteProfile = async () => {
    if (!profileToDelete) return;
    setIsDeleting(true);
    try {
      await deleteProfile(profileToDelete.id);
      setProfiles(prev => prev.filter(p => p.id !== profileToDelete.id));
      setProfileToDelete(null);
    } catch (err) {
      console.error("Error deleting profile:", err);
      setError(t('selectProfile.errors.delete_profile'));
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-wonderland flex items-center justify-center">
        <Loader2 className="animate-spin text-magic-500" size={48} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="min-h-screen bg-wonderland pattern-dots flex flex-col items-center p-6 relative overflow-hidden"
    >
      {/* Floating background shapes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[10%] left-[5%] w-8 h-8 rounded-full bg-sunny-300/30"
             style={{ animation: 'float 5s ease-in-out infinite' }} />
        <div className="absolute top-[25%] right-[6%] w-5 h-5 rounded-full bg-coral-300/25"
             style={{ animation: 'float-slow 7s ease-in-out infinite 1s' }} />
        <div className="absolute bottom-[20%] left-[10%] w-6 h-6 rounded-full bg-sky-300/20"
             style={{ animation: 'float 6s ease-in-out infinite 2s' }} />
        <div className="absolute top-[55%] right-[15%] w-4 h-4 rounded-full bg-magic-300/25"
             style={{ animation: 'twinkle 3s ease-in-out infinite' }} />
        <div className="absolute bottom-[38%] left-[22%] w-5 h-5 rounded-full bg-mint-300/20"
             style={{ animation: 'float-slow 8s ease-in-out infinite 3s' }} />
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-magic-200/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-coral-200/20 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-3xl w-full mt-10">
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
            className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: 'linear-gradient(135deg, #a78bfa, #38bdf8)' }}
          >
            <Sparkles size={44} color="white" strokeWidth={1.8} />
          </motion.div>
          <h1 className="text-4xl font-display font-bold text-warm-800 mb-3">{t('selectProfile.title')}</h1>
          <p className="text-warm-500 text-lg">{t('selectProfile.subtitle')}</p>
        </div>

        {error && <p className="text-red-500 text-center mb-6 font-medium">{error}</p>}

        <div className="grid grid-cols-3 max-sm:grid-cols-2 gap-5">
          {profiles.map((profile, index) => {
            const tint = CARD_TINTS[index % CARD_TINTS.length];
            return (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22, delay: index * 0.07 }}
                className="relative"
              >
                <motion.button
                  whileHover={{ scale: 1.05, y: -5, transition: { type: 'spring', stiffness: 400, damping: 15 } }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleSelectProfile(profile)}
                  className={`w-full ${tint.bg} p-6 rounded-[2rem] border-2 ${tint.border} flex flex-col items-center text-center ${tint.shadow} hover:shadow-lg transition-shadow`}
                >
                  <img
                    src={profile.avatarUrl || '/avatar-placeholder.svg'}
                    alt={profile.name}
                    className={`w-28 h-28 rounded-full object-cover border-4 ${tint.ring} mb-4`}
                    referrerPolicy="no-referrer"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/avatar-placeholder.svg'; }}
                  />
                  <h2 className="text-xl font-display font-semibold text-warm-800">{profile.name}</h2>
                  <p className="text-sm text-warm-400 mt-1 capitalize">{t('selectProfile.world_style', { worldStyle: profile.worldStyle })}</p>
                </motion.button>
                <button
                  onClick={(e) => { e.stopPropagation(); setProfileToDelete(profile); }}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 hover:bg-red-100 flex items-center justify-center text-warm-400 hover:text-red-500 transition-colors shadow-sm"
                  title={t('selectProfile.delete_profile_button')}
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            );
          })}

          {/* Create new profile */}
          <motion.button
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22, delay: profiles.length * 0.07 }}
            whileHover={{ scale: 1.05, y: -5, transition: { type: 'spring', stiffness: 400, damping: 15 } }}
            whileTap={{ scale: 0.96 }}
            onClick={handleCreateNew}
            className="bg-white/60 backdrop-blur-sm p-6 rounded-[2rem] border-2 border-dashed border-magic-300 flex flex-col items-center justify-center text-center hover:bg-white/80 transition-colors"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="w-24 h-24 rounded-full flex items-center justify-center mb-4"
              style={{ background: 'linear-gradient(135deg, #c4b5fd, #f9a8d4)' }}
            >
              <Plus size={40} color="white" strokeWidth={2.5} />
            </motion.div>
            <h2 className="text-xl font-display font-semibold text-warm-700">{t('selectProfile.new_profile')}</h2>
          </motion.button>
        </div>
      </div>

      {/* Delete profile confirmation modal */}
      <AnimatePresence>
        {profileToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-xl text-center"
            >
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={28} className="text-red-500" />
              </div>
              <h2 className="text-2xl font-display font-bold text-warm-800 mb-3">
                {t('selectProfile.delete_profile_title', { name: profileToDelete.name })}
              </h2>
              <p className="text-warm-500 mb-6 text-sm leading-relaxed">
                {t('selectProfile.delete_profile_confirm')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setProfileToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 rounded-full border-2 border-warm-200 text-warm-600 font-semibold hover:bg-warm-50 transition-colors disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleDeleteProfile}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? <Loader2 size={18} className="animate-spin" /> : null}
                  {t('selectProfile.delete_profile_button')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
