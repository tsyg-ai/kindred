import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFriendConnections, createInvite, acceptInvite, UserProfile, FriendConnection } from '../services/db';
import { UserPlus, Key, User, CheckCircle2, Copy, Check, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

const CARD_TINTS = [
  { bg: 'bg-magic-50', border: 'border-magic-200', ring: 'border-magic-300', badge: 'bg-magic-100 text-magic-600', shadow: 'shadow-magic' },
  { bg: 'bg-coral-50', border: 'border-coral-200', ring: 'border-coral-300', badge: 'bg-coral-100 text-coral-600', shadow: 'shadow-coral' },
  { bg: 'bg-sky-50',   border: 'border-sky-200',   ring: 'border-sky-300',   badge: 'bg-sky-100 text-sky-600',   shadow: 'shadow-sky'   },
  { bg: 'bg-mint-50',  border: 'border-mint-200',  ring: 'border-mint-300',  badge: 'bg-mint-100 text-mint-600', shadow: 'shadow-mint'  },
  { bg: 'bg-sunny-50', border: 'border-sunny-200', ring: 'border-sunny-200', badge: 'bg-sunny-100 text-sunny-600', shadow: ''           },
];

export default function FriendsTab({ profile }: { profile: UserProfile }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [connections, setConnections] = useState<{ connection: FriendConnection, friendProfile: UserProfile }[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadConnections = async () => {
    const conns = await getFriendConnections();
    setConnections(conns);
  };

  useEffect(() => { loadConnections(); }, []);

  const handleGenerateInvite = async () => {
    setLoading(true);
    try {
      const code = await createInvite();
      setGeneratedCode(code);
    } catch (err: any) {
      setError(err.message || t('friendsTab.errors.generate_invite'));
    } finally {
      setLoading(false);
    }
  };

  const handleProcessCode = async () => {
    if (!inputCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      await acceptInvite(inputCode.trim());
      setShowCodeModal(false);
      setInputCode('');
      loadConnections();
    } catch (err: any) {
      setError(err.message || t('friendsTab.errors.process_code'));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Action buttons */}
      <div className="flex gap-4 max-sm:flex-col">
        <motion.button
          onClick={() => { setShowInviteModal(true); setGeneratedCode(''); setError(''); }}
          whileHover={{ scale: 1.03, y: -2, transition: { type: 'spring', stiffness: 400, damping: 15 } }}
          whileTap={{ scale: 0.97 }}
          className="flex-1 py-5 px-6 rounded-[1.5rem] font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-magic"
          style={{ background: 'linear-gradient(135deg, #ede9fe, #fce7f3)', color: '#7c3aed' }}
        >
          <UserPlus size={24} /> {t('friendsTab.generate_invite')}
        </motion.button>
        <motion.button
          onClick={() => { setShowCodeModal(true); setInputCode(''); setError(''); }}
          whileHover={{ scale: 1.03, y: -2, transition: { type: 'spring', stiffness: 400, damping: 15 } }}
          whileTap={{ scale: 0.97 }}
          className="flex-1 py-5 px-6 rounded-[1.5rem] font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-sky"
          style={{ background: 'linear-gradient(135deg, #e0f2fe, #ede9fe)', color: '#0284c7' }}
        >
          <Key size={24} /> {t('friendsTab.enter_code')}
        </motion.button>
      </div>

      {/* Friends section */}
      <div className="space-y-5">
        <h3 className="text-2xl font-display font-bold text-warm-800">{t('friendsTab.my_friends')}</h3>

        {connections.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/70 backdrop-blur-sm rounded-[2rem] border-2 border-dashed border-magic-200 p-12 text-center"
          >
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                 style={{ background: 'linear-gradient(135deg, #ede9fe, #fce7f3)' }}>
              <Sparkles size={36} className="text-magic-400" />
            </div>
            <p className="text-warm-500 text-lg italic mb-6">{t('friendsTab.no_friends')}</p>
            <motion.button
              onClick={() => { setShowInviteModal(true); setGeneratedCode(''); setError(''); }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="text-white font-bold py-3 px-8 rounded-full shadow-magic"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
            >
              {t('friendsTab.generate_invite')}
            </motion.button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-3 max-sm:grid-cols-2 gap-5">
            {connections.map(({ connection, friendProfile }, index) => {
              const tint = CARD_TINTS[index % CARD_TINTS.length];
              return (
                <motion.div
                  key={connection.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22, delay: index * 0.07 }}
                  whileHover={{ scale: 1.04, y: -6, transition: { type: 'spring', stiffness: 400, damping: 15 } }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(`/friend/${connection.id}`)}
                  className={`${tint.bg} flex flex-col items-center p-5 rounded-[2rem] border-2 ${tint.border} cursor-pointer ${tint.shadow} transition-shadow`}
                >
                  <img
                    src={friendProfile.avatarUrl || '/avatar-placeholder.svg'}
                    alt={friendProfile.name}
                    className={`w-28 h-28 rounded-full object-cover border-4 ${tint.ring} shadow-md mb-4`}
                    referrerPolicy="no-referrer"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/avatar-placeholder.svg'; }}
                  />
                  <div className="text-center">
                    <h4 className="font-display font-bold text-warm-800 text-xl mb-2">{friendProfile.name}</h4>
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${tint.badge}`}>
                      <CheckCircle2 size={14} />
                      <span>{t('friendsTab.connected')}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className="bg-white/95 backdrop-blur-md p-8 rounded-[2rem] max-w-md w-full shadow-magic border-2 border-magic-100"
          >
            <h2 className="text-2xl font-display font-bold text-warm-800 mb-4">{t('friendsTab.invite_title')}</h2>
            {!generatedCode ? (
              <>
                <p className="text-warm-600 mb-6">{t('friendsTab.invite_description')}</p>
                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                <div className="flex gap-4">
                  <button onClick={() => setShowInviteModal(false)} className="flex-1 py-3 text-warm-500 font-bold">{t('common.cancel')}</button>
                  <motion.button
                    onClick={handleGenerateInvite}
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 text-white font-bold py-3 rounded-full flex items-center justify-center gap-2 shadow-magic disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : null}
                    {t('friendsTab.generate_code')}
                  </motion.button>
                </div>
              </>
            ) : (
              <>
                <p className="text-warm-600 mb-4">{t('friendsTab.give_code')}</p>
                <div className="bg-magic-50 p-5 rounded-2xl break-all font-mono text-3xl text-center tracking-[0.35em] text-magic-700 mb-4 border-2 border-magic-200 font-bold">
                  {generatedCode}
                </div>
                <motion.button
                  onClick={copyToClipboard}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full text-white font-bold py-3 rounded-full mb-4 flex items-center justify-center gap-2 shadow-magic"
                  style={{ background: 'linear-gradient(135deg, #453a54, #7c3aed)' }}
                >
                  {copied ? <Check size={20} /> : <Copy size={20} />}
                  {copied ? t('friendsTab.copied') : t('friendsTab.copy_code')}
                </motion.button>
                <button onClick={() => { setShowInviteModal(false); setGeneratedCode(''); }} className="w-full py-3 text-warm-500 font-bold">{t('common.close')}</button>
              </>
            )}
          </motion.div>
        </div>
      )}

      {/* Code Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className="bg-white/95 backdrop-blur-md p-8 rounded-[2rem] max-w-md w-full shadow-sky border-2 border-sky-100"
          >
            <h2 className="text-2xl font-display font-bold text-warm-800 mb-4">{t('friendsTab.enter_code_title')}</h2>
            <p className="text-warm-600 mb-4">{t('friendsTab.enter_code_description')}</p>
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              className="w-full p-4 border-2 border-warm-200 rounded-2xl mb-4 focus:border-magic-400 focus:outline-none text-center font-mono text-2xl tracking-widest uppercase text-warm-800"
              placeholder="XXXXXX"
              maxLength={6}
            />
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <div className="flex gap-4">
              <button onClick={() => { setShowCodeModal(false); setInputCode(''); setError(''); }} className="flex-1 py-3 text-warm-500 font-bold">{t('common.cancel')}</button>
              <motion.button
                onClick={handleProcessCode}
                disabled={loading || !inputCode}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex-1 text-white font-bold py-3 rounded-full flex items-center justify-center gap-2 shadow-sky disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)' }}
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : null}
                {t('friendsTab.connect')}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
