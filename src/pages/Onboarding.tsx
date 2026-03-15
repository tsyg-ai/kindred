import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Sparkles, Palette, Users, BookOpen, Shield, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const FEATURES = [
  {
    icon: Palette,
    titleKey: 'onboarding.feature1.title',
    descKey: 'onboarding.feature1.desc',
    gradient: 'linear-gradient(135deg, #f472b6, #fb923c)',
    bg: 'bg-coral-50',
    border: 'border-coral-200',
    shadow: 'shadow-coral',
    step: '1',
  },
  {
    icon: Users,
    titleKey: 'onboarding.feature2.title',
    descKey: 'onboarding.feature2.desc',
    gradient: 'linear-gradient(135deg, #38bdf8, #818cf8)',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    shadow: 'shadow-sky',
    step: '2',
  },
  {
    icon: BookOpen,
    titleKey: 'onboarding.feature3.title',
    descKey: 'onboarding.feature3.desc',
    gradient: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
    bg: 'bg-magic-50',
    border: 'border-magic-200',
    shadow: 'shadow-magic',
    step: '3',
  },
  {
    icon: Shield,
    titleKey: 'onboarding.feature4.title',
    descKey: 'onboarding.feature4.desc',
    gradient: 'linear-gradient(135deg, #4ade80, #22d3ee)',
    bg: 'bg-mint-50',
    border: 'border-mint-200',
    shadow: 'shadow-mint',
    step: '4',
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleGetStarted = () => {
    localStorage.setItem('kindred_onboarding_seen', 'true');
    navigate('/setup');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-wonderland pattern-dots flex flex-col items-center p-6 pb-16 relative overflow-hidden"
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
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-magic-200/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-coral-200/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-sky-200/15 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl w-full pt-10">
        {/* Header */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 18 }}
          className="text-center mb-10"
        >
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 16 }}
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: 'linear-gradient(135deg, #a78bfa, #f472b6)' }}
          >
            <Sparkles size={38} color="white" strokeWidth={1.8} />
          </motion.div>

          <h1 className="text-5xl font-display font-bold text-gradient-magic leading-tight mb-3">
            {t('onboarding.title')}
          </h1>
          <p className="text-warm-500 text-lg font-medium max-w-md mx-auto">
            {t('onboarding.subtitle')}
          </p>
        </motion.div>

        {/* Feature cards */}
        <div className="space-y-4 mb-8">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1, type: 'spring', stiffness: 220, damping: 22 }}
              className={`${feature.bg} ${feature.border} ${feature.shadow} border-2 rounded-3xl p-5 flex gap-4 items-start`}
            >
              {/* Icon with step badge */}
              <div className="relative flex-shrink-0">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: feature.gradient }}
                >
                  <feature.icon size={26} color="white" strokeWidth={1.8} />
                </div>
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm border border-white">
                  <span className="text-xs font-bold text-warm-600">{feature.step}</span>
                </div>
              </div>

              {/* Text */}
              <div className="pt-0.5">
                <h3 className="text-warm-800 font-display font-bold text-lg mb-1 leading-snug">
                  {t(feature.titleKey)}
                </h3>
                <p className="text-warm-600 text-sm font-medium leading-relaxed">
                  {t(feature.descKey)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Privacy note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85 }}
          className="text-center text-warm-400 text-sm font-medium mb-6 px-4"
        >
          {t('onboarding.privacy_note')}
        </motion.p>

        {/* CTA button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, type: 'spring', stiffness: 220, damping: 20 }}
          onClick={handleGetStarted}
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.97 }}
          className="w-full text-white font-bold py-5 px-8 rounded-full text-xl shadow-magic flex items-center justify-center gap-3 transition-all"
          style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
        >
          {t('onboarding.cta')}
          <ArrowRight size={22} strokeWidth={2.5} />
        </motion.button>
      </div>
    </motion.div>
  );
}
