import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, UserProfile, logOut, getEntriesWithNewVideos } from '../services/db';
import { LogOut, Settings, Users } from 'lucide-react';
import { motion } from 'motion/react';
import FriendsTab from '../components/FriendsTab';
import AvatarZoom from '../components/AvatarZoom';
import { useTranslation } from 'react-i18next';

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState('');
  const [zoomAvatar, setZoomAvatar] = useState(false);
  const [hasNewVideos, setHasNewVideos] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [p, newVideoEntries] = await Promise.all([getProfile(), getEntriesWithNewVideos()]);
        if (!p) { navigate('/select-profile'); return; }
        setProfile(p);
        setHasNewVideos(newVideoEntries.length > 0);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
        navigate('/');
      }
    };
    loadData();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await logOut();
      navigate('/');
    } catch {
      setError(t('dashboard.errors.logout_failed'));
    }
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-wonderland pattern-dots flex flex-col items-center p-6 pb-12 relative overflow-hidden">
      {/* Floating background shapes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[8%] left-[4%] w-8 h-8 rounded-full bg-sunny-300/30"
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

      <div className="relative z-10 max-w-4xl w-full">
        {/* Redesigned header */}
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="bg-white/70 backdrop-blur-sm rounded-[2rem] shadow-magic border-2 border-magic-100 p-6 mb-8 mt-6"
        >
          <div className="flex items-center justify-between gap-4">
            {/* Avatar + greeting */}
            <div className="flex items-center gap-5">
              {/* Avatar with gradient ring */}
              <div className="relative flex-shrink-0">
                <div className="rounded-full p-[3px]"
                     style={{ background: 'linear-gradient(135deg, #a78bfa, #f472b6)' }}>
                  <img
                    src={profile.avatarUrl || '/avatar-placeholder.svg'}
                    alt="Profile Avatar"
                    className="w-20 h-20 rounded-full object-cover border-2 border-white cursor-zoom-in"
                    referrerPolicy="no-referrer"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/avatar-placeholder.svg'; }}
                    onClick={() => setZoomAvatar(true)}
                  />
                </div>
                {hasNewVideos && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center"
                       style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', animation: 'twinkle 2s ease-in-out infinite' }}>
                    <span className="text-white text-[9px] font-black leading-none">✦</span>
                  </div>
                )}
              </div>
              {zoomAvatar && (
                <AvatarZoom
                  src={profile.avatarUrl || '/avatar-placeholder.svg'}
                  alt="Profile Avatar"
                  onClose={() => setZoomAvatar(false)}
                />
              )}
              <div>
                <h1 className="text-3xl font-display font-bold text-warm-800">
                  {t('dashboard.greeting', { name: profile.name })}
                </h1>
                <span className="inline-block mt-1 text-sm font-semibold text-magic-600 bg-magic-100 px-3 py-1 rounded-full">
                  {t('dashboard.world', { style: profile.worldStyle })}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <motion.button
                onClick={() => navigate('/select-profile')}
                title={t('dashboard.switch_profile')}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-3 bg-white/80 rounded-full shadow-sm text-warm-400 hover:text-magic-500 transition-colors border border-magic-100"
              >
                <Users size={22} />
              </motion.button>
              <motion.button
                onClick={() => navigate('/setup')}
                title={t('dashboard.edit_profile')}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-3 bg-white/80 rounded-full shadow-sm text-warm-400 hover:text-magic-500 transition-colors border border-magic-100"
              >
                <Settings size={22} />
              </motion.button>
              <motion.button
                onClick={handleLogout}
                title={t('dashboard.log_out')}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-3 bg-white/80 rounded-full shadow-sm text-warm-400 hover:text-red-500 transition-colors border border-magic-100"
              >
                <LogOut size={22} />
              </motion.button>
            </div>
          </div>
        </motion.header>

        {error && (
          <p className="text-red-500 font-medium text-center mb-4 bg-white/80 rounded-2xl py-3 px-4 shadow-sm">
            {error}
          </p>
        )}
        <FriendsTab profile={profile} />
      </div>
    </div>
  );
}
