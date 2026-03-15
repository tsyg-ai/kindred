import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getConnectionById, getEntriesForConnection, deleteFriendConnection, FriendshipEntry, UserProfile, FriendConnection, updateProfile, uploadBase64ToStorage, getProfile, getActiveProfileId, saveCustomAnswersForConnection } from '../services/db';
import { generateProfileSummary, generateNarration, generateCustomAnswersSummary } from '../services/gemini';
import { motion, AnimatePresence } from 'motion/react';
import AvatarZoom from '../components/AvatarZoom';
import { ArrowLeft, Play, Loader2, Plus, CheckCircle2, Clock, Volume2, Trash2, MessageSquarePlus, Film, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { QUESTION_MAP, PROFILE_FIELD_META, type CustomQuestion } from '../services/questions';
import { ANSWER_TINTS } from '../constants';

function getEmoji(id: string, customQuestionMap: Record<string, CustomQuestion>): string {
  if (id in customQuestionMap) return '✏️';
  return QUESTION_MAP[id]?.emoji ?? PROFILE_FIELD_META[id]?.emoji ?? '💬';
}

function AnswerGrid({ answers, getLabel, emoji = '✏️' }: {
  answers: Record<string, string>;
  getLabel: (q: string) => string;
  emoji?: string;
}) {
  return (
    <div className="grid grid-cols-3 max-sm:grid-cols-2 gap-3">
      {Object.entries(answers).map(([q, a], i) => (
        <div key={q} className={`rounded-2xl p-3 border ${ANSWER_TINTS[i % ANSWER_TINTS.length]} flex items-start gap-2 text-left`}>
          <div className="text-xl flex-shrink-0">{emoji}</div>
          <div>
            <p className="text-xs font-bold text-warm-400 uppercase tracking-wider mb-0.5">{getLabel(q)}</p>
            <p className="text-warm-700 font-medium text-sm">{a}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FriendDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [connectionData, setConnectionData] = useState<{ connection: FriendConnection, friendProfile: UserProfile } | null>(null);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [entries, setEntries] = useState<FriendshipEntry[]>([]);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isGeneratingCustomAudio, setIsGeneratingCustomAudio] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [zoomAvatar, setZoomAvatar] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      try {
        const [data, profile] = await Promise.all([getConnectionById(id), getProfile()]);
        if (data) {
          setConnectionData(data);
          const connectionEntries = await getEntriesForConnection(id);
          setEntries(connectionEntries);
        }
        setMyProfile(profile);
      } catch {
        setError(t('friendDetails.errors.load_failed'));
      }
    };
    loadData();
    return () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; } };
  }, [id]);

  const playAudio = async (
    existingUrl: string | undefined,
    generate: () => Promise<string>,
    storagePath: string,
    onSave: (url: string) => Promise<void>,
    setLoading: (v: boolean) => void,
    language = 'en',
  ) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    if (existingUrl) {
      audioRef.current = new Audio(existingUrl);
      audioRef.current.play();
      return;
    }
    setLoading(true);
    try {
      const text = await generate();
      const audioBase64 = await generateNarration(text, language);
      const audioUrl = await uploadBase64ToStorage(audioBase64, storagePath);
      await onSave(audioUrl);
      audioRef.current = new Audio(audioUrl);
      audioRef.current.play();
    } catch {
      setError(t('friendDetails.errors.audio_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handlePlayIntro = () => {
    if (!connectionData) return;
    const friend = connectionData.friendProfile;
    const language = myProfile?.language ?? 'en';
    playAudio(
      friend.profileAudioUrl,
      () => generateProfileSummary(friend.name, friend.interviewAnswers || {}, language),
      `audio/profiles/${friend.id}.wav`,
      async (audioUrl) => {
        const summary = friend.profileSummary ?? '';
        await updateProfile(friend.id, { profileAudioUrl: audioUrl });
        setConnectionData(prev => prev ? {
          ...prev,
          friendProfile: { ...prev.friendProfile, profileAudioUrl: audioUrl, profileSummary: summary }
        } : null);
      },
      setIsGeneratingAudio,
      language,
    );
  };

  const handlePlayCustomAnswers = () => {
    if (!connectionData || !id) return;
    const friendId = connectionData.friendProfile.id;
    const existingAnswers = connectionData.connection.customQAnswers?.[friendId];
    if (!existingAnswers?.answers) return;
    const language = myProfile?.language ?? 'en';
    playAudio(
      existingAnswers.audioUrl,
      () => generateCustomAnswersSummary(connectionData.friendProfile.name, existingAnswers.answers, language),
      `audio/custom-answers/${id}_${friendId}.wav`,
      async (audioUrl) => {
        await saveCustomAnswersForConnection(id, friendId, { ...existingAnswers, audioUrl });
        setConnectionData(prev => {
          if (!prev) return null;
          return {
            ...prev,
            connection: {
              ...prev.connection,
              customQAnswers: { ...prev.connection.customQAnswers, [friendId]: { ...existingAnswers, audioUrl } }
            }
          };
        });
      },
      setIsGeneratingCustomAudio,
      language,
    );
  };

  const handleRemoveFriend = async () => {
    if (!connectionData) return;
    setIsRemoving(true);
    try {
      await deleteFriendConnection(connectionData.connection.id);
      navigate('/dashboard');
    } catch {
      setError(t('friendDetails.errors.remove_failed'));
      setIsRemoving(false);
      setShowRemoveConfirm(false);
    }
  };

  if (!connectionData) {
    return (
      <div className="min-h-screen bg-wonderland-friend flex items-center justify-center p-6">
        {error ? (
          <div className="bg-white/80 rounded-[2rem] p-8 shadow-magic text-center max-w-sm">
            <p className="text-red-500 font-medium mb-4">{error}</p>
            <button onClick={() => navigate('/dashboard')} className="text-magic-500 font-semibold hover:underline">
              {t('friendDetails.back')}
            </button>
          </div>
        ) : null}
      </div>
    );
  }
  const friend = connectionData.friendProfile;
  const myProfileId = getActiveProfileId();

  // Custom question maps for label lookups
  const friendCustomQMap: Record<string, CustomQuestion> = Object.fromEntries(
    (friend.customQuestions ?? []).map(cq => [cq.id, cq])
  );
  const myCustomQMap: Record<string, CustomQuestion> = Object.fromEntries(
    (myProfile?.customQuestions ?? []).map(cq => [cq.id, cq])
  );

  // My answers to friend's custom questions
  const myCustomAnswers = myProfileId ? connectionData.connection.customQAnswers?.[myProfileId] : undefined;
  // Friend's answers to my custom questions
  const friendAnswersToMyQuestions = connectionData.connection.customQAnswers?.[friend.id];

  const hasFriendCustomQuestions = (friend.customQuestions?.length ?? 0) > 0;

  const friendQuestionsState = {
    connectionId: id,
    friendProfile: friend,
    questions: friend.customQuestions,
    myProfileName: myProfile?.name ?? '',
    myProfileAge: myProfile?.interviewAnswers?.age ?? '',
    language: myProfile?.language ?? 'en',
  };
  const hasFriendAnsweredMyQuestions = !!(friendAnswersToMyQuestions?.answers && Object.keys(friendAnswersToMyQuestions.answers).length > 0);
  const hasMyCustomQuestions = (myProfile?.customQuestions?.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-wonderland-friend flex flex-col items-center p-6 relative overflow-hidden">
      {/* Floating shapes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[10%] left-[5%] w-8 h-8 rounded-full bg-mint-300/30" style={{ animation: 'float 5s ease-in-out infinite' }} />
        <div className="absolute top-[30%] right-[6%] w-5 h-5 rounded-full bg-sky-300/25" style={{ animation: 'float-slow 7s ease-in-out infinite 1s' }} />
        <div className="absolute bottom-[20%] left-[8%] w-6 h-6 rounded-full bg-magic-300/20" style={{ animation: 'float 6s ease-in-out infinite 2s' }} />
        <div className="absolute top-[55%] right-[12%] w-4 h-4 rounded-full bg-coral-300/25" style={{ animation: 'twinkle 3s ease-in-out infinite' }} />
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-mint-200/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-sky-200/20 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl w-full mt-8">
        {error && (
          <p className="text-red-500 font-medium text-center mb-4 bg-white/80 rounded-2xl py-3 px-4 shadow-sm">
            {error}
          </p>
        )}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-warm-500 hover:text-warm-800 font-medium transition-colors">
            <ArrowLeft size={20} /> {t('friendDetails.back')}
          </button>
          <button
            onClick={() => setShowRemoveConfirm(true)}
            className="flex items-center gap-2 text-red-400 hover:text-red-600 font-medium transition-colors text-sm"
          >
            <Trash2 size={16} /> {t('friendDetails.remove_friend')}
          </button>
        </div>

        {/* Profile card */}
        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-[2rem] shadow-magic border-2 border-magic-100 mb-6 flex flex-col md:flex-row gap-8 items-center md:items-start">
          {/* Avatar with gradient ring */}
          <div className="flex-shrink-0">
            <div className="rounded-full p-[4px]"
                 style={{ background: 'linear-gradient(135deg, #a78bfa, #38bdf8)' }}>
              <img
                src={friend.avatarUrl || '/avatar-placeholder.svg'}
                alt={friend.name}
                className="w-36 h-36 rounded-full object-cover border-4 border-white cursor-zoom-in"
                referrerPolicy="no-referrer"
                onError={(e) => { (e.target as HTMLImageElement).src = '/avatar-placeholder.svg'; }}
                onClick={() => setZoomAvatar(true)}
              />
            </div>
          </div>
          {zoomAvatar && (
            <AvatarZoom
              src={friend.avatarUrl || '/avatar-placeholder.svg'}
              alt={friend.name}
              onClose={() => setZoomAvatar(false)}
            />
          )}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl font-display font-bold text-warm-800 mb-4">{friend.name}</h1>
            <div>
              <h3 className="text-sm font-bold text-warm-400 uppercase tracking-wider mb-4">{t('friendDetails.interview_answers')}</h3>
              {friend.interviewAnswers ? (
                <div className="grid grid-cols-3 max-sm:grid-cols-2 gap-3">
                  {Object.entries(friend.interviewAnswers!).map(([q, a], i) => {
                    const label = friendCustomQMap[q]?.label
                      ?? (q.startsWith('custom_')
                        ? t('friendDetails.custom_question', 'Custom Question')
                        : t(`friendDetails.interview_meta.${q}`, q));
                    return (
                      <div key={q} className={`rounded-2xl p-3 border ${ANSWER_TINTS[i % ANSWER_TINTS.length]} flex items-start gap-2 text-left`}>
                        <div className="text-xl flex-shrink-0">{getEmoji(q, friendCustomQMap)}</div>
                        <div>
                          <p className="text-xs font-bold text-warm-400 uppercase tracking-wider mb-0.5">{label}</p>
                          <p className="text-warm-700 font-medium text-sm">{a as string}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-warm-500 italic">{t('friendDetails.no_answers')}</p>
              )}
            </div>

            {/* CTA: answer friend's custom questions */}
            {hasFriendCustomQuestions && !myCustomAnswers && (
              <div className="mt-6 pt-5 border-t border-magic-100">
                <motion.button
                  onClick={() => navigate('/friend-questions', { state: friendQuestionsState })}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-3 text-white font-bold py-3 px-6 rounded-full shadow-magic text-sm"
                  style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
                >
                  <MessageSquarePlus size={18} />
                  {t('friendDetails.answer_their_questions', { name: friend.name })}
                </motion.button>
              </div>
            )}
          </div>
        </div>

        {/* My answers to friend's custom questions */}
        {myCustomAnswers && hasFriendCustomQuestions && (
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[2rem] shadow-magic border-2 border-coral-100 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-bold text-warm-800">
                {t('friendDetails.my_answers_to_their_questions', { name: friend.name })}
              </h2>
              <motion.button
                onClick={() => navigate('/friend-questions', { state: friendQuestionsState })}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="text-xs text-magic-500 hover:text-magic-700 font-semibold"
              >
                {t('friendDetails.redo_answers')}
              </motion.button>
            </div>
            <AnswerGrid
              answers={myCustomAnswers.answers}
              getLabel={q => friendCustomQMap[q]?.label ?? q}
            />
          </div>
        )}

        {/* "They answered your questions" section */}
        {hasMyCustomQuestions && hasFriendAnsweredMyQuestions && (
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-[2rem] shadow-magic border-2 border-mint-100 mb-6">
            <h2 className="text-lg font-display font-bold text-warm-800 mb-1">
              {t('friendDetails.they_answered_your_questions', { name: friend.name })}
            </h2>
            <p className="text-warm-400 text-sm mb-4">
              {t('friendDetails.they_answered_subtitle', { name: friend.name })}
            </p>
            <AnswerGrid
              answers={friendAnswersToMyQuestions!.answers}
              getLabel={q => myCustomQMap[q]?.label ?? q}
            />
          </div>
        )}

        {/* Bottom 2-column grid */}
        <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-6 mb-8">
          {/* Intro + custom answers audio panel */}
          <div className="rounded-[2rem] overflow-hidden shadow-magic">
            <div className="p-8 text-white flex flex-col items-center justify-center min-h-[420px] text-center relative"
                 style={{ background: 'linear-gradient(145deg, #8b5cf6, #ec4899, #38bdf8)' }}>
              <Volume2 size={44} className="mb-4 opacity-90" />
              <h2 className="text-2xl font-display font-bold mb-2">{t('friendDetails.meet_friend', { name: friend.name })}</h2>
              <p className="text-white/80 mb-6 max-w-xs text-sm">
                {t('friendDetails.intro_subtitle', { name: friend.name })}
              </p>

              {/* Profile intro button */}
              <motion.button
                onClick={handlePlayIntro}
                disabled={isGeneratingAudio || isGeneratingCustomAudio}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white font-bold py-3 px-7 rounded-full shadow-lg transition-all flex items-center gap-3 text-base disabled:opacity-60 mb-3"
                style={{ color: '#8b5cf6' }}
              >
                {isGeneratingAudio ? (
                  <><Loader2 className="animate-spin" size={20} /> {t('common.creating_magic')}</>
                ) : (
                  <><Play size={20} fill="currentColor" /> {t('friendDetails.play_intro')}</>
                )}
              </motion.button>

              {friend.profileSummary && (
                <div className="mb-4 p-3 bg-white/15 rounded-2xl text-xs text-white italic max-w-sm backdrop-blur-sm">
                  "{friend.profileSummary}"
                </div>
              )}

              {/* Custom answers audio button — shown when friend has answered MY custom questions */}
              {hasMyCustomQuestions && hasFriendAnsweredMyQuestions && (
                <>
                  <motion.button
                    onClick={handlePlayCustomAnswers}
                    disabled={isGeneratingAudio || isGeneratingCustomAudio}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-white/20 border border-white/40 hover:bg-white/30 font-bold py-3 px-7 rounded-full transition-all flex items-center gap-3 text-base disabled:opacity-60 mb-3"
                  >
                    {isGeneratingCustomAudio ? (
                      <><Loader2 className="animate-spin" size={20} /> {t('common.creating_magic')}</>
                    ) : (
                      <><Play size={20} fill="white" /> {t('friendDetails.play_custom_answers')}</>
                    )}
                  </motion.button>

                  {friendAnswersToMyQuestions?.summary && (
                    <div className="p-3 bg-white/15 rounded-2xl text-xs text-white italic max-w-sm backdrop-blur-sm">
                      "{friendAnswersToMyQuestions.summary}"
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Stories card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-[2rem] shadow-magic border-2 border-magic-100 p-6 flex flex-col max-h-[500px]">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-display font-bold text-warm-800">{t('friendDetails.stories_with', { name: friend.name })}</h2>
              <motion.button
                onClick={() => navigate('/story', { state: { connectionId: connectionData.connection.id, friendProfile: friend } })}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="text-white p-2.5 rounded-full shadow-magic transition-colors"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
                title={t('friendDetails.create_new_story')}
              >
                <Plus size={22} />
              </motion.button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {entries.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-warm-400 py-8">
                  <p className="italic mb-4">{t('friendDetails.no_stories')}</p>
                  <motion.button
                    onClick={() => navigate('/story', { state: { connectionId: connectionData.connection.id, friendProfile: friend } })}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="text-white font-medium py-2 px-6 rounded-full shadow-magic text-sm"
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
                  >
                    {t('friendDetails.create_story')}
                  </motion.button>
                </div>
              ) : (
                entries.map((entry, i) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-2 border-magic-100 rounded-2xl overflow-hidden cursor-pointer hover:shadow-magic transition-shadow"
                    onClick={() => {
                      if (!entry.isApproved) navigate(`/approve/${entry.id}`);
                      else navigate(`/story-view/${entry.id}`);
                    }}
                  >
                    <div className="relative h-28">
                      <img
                        src={entry.imageUrl}
                        alt="Story Scene"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
                        {entry.isApproved ? (
                          <><CheckCircle2 size={12} className="text-mint-500" /><span className="text-warm-700">{t('friendDetails.approved')}</span></>
                        ) : (
                          <><Clock size={12} className="text-sunny-500" /><span className="text-warm-700">{t('friendDetails.needs_review')}</span></>
                        )}
                      </div>
                      {entry.videoNewlyReady && (
                        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md"
                             style={{ color: '#7c3aed', border: '1.5px solid #c4b5fd' }}>
                          <Sparkles size={13} style={{ color: '#ec4899' }} /> {t('storyDetails.new_video_ready')}
                        </div>
                      )}
                      {entry.videoProcessing && (
                        <div className="absolute top-2 left-2 bg-magic-100 border border-magic-200 px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-sm text-magic-700">
                          <Loader2 size={11} className="animate-spin" /> {t('storyDetails.animating')}
                        </div>
                      )}
                      {entry.videoUrl && !entry.videoNewlyReady && (
                        <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 text-white">
                          <Film size={11} />
                        </div>
                      )}
                    </div>
                    <div className="p-3 bg-warm-50">
                      <p className="text-warm-600 text-sm line-clamp-2 mb-2">{entry.storyTranscript}</p>
                      {!entry.isApproved && (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/approve/${entry.id}`); }}
                          className="w-full bg-magic-100 hover:bg-magic-200 text-magic-700 font-bold py-1.5 px-3 rounded-xl transition-colors text-xs"
                        >
                          {t('friendDetails.review_with_parent')}
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Remove friend confirmation modal */}
      <AnimatePresence>
        {showRemoveConfirm && (
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
                {t('friendDetails.remove_friend_title', { name: friend.name })}
              </h2>
              <p className="text-warm-500 mb-6 text-sm leading-relaxed">
                {t('friendDetails.remove_friend_confirm')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRemoveConfirm(false)}
                  disabled={isRemoving}
                  className="flex-1 py-3 px-4 rounded-full border-2 border-warm-200 text-warm-600 font-semibold hover:bg-warm-50 transition-colors disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleRemoveFriend}
                  disabled={isRemoving}
                  className="flex-1 py-3 px-4 rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isRemoving ? <Loader2 size={18} className="animate-spin" /> : null}
                  {t('friendDetails.remove_friend_button')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
