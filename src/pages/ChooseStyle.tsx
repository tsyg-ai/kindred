import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Wand2, ArrowRight, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import StylePicker, { STYLES } from '../components/StylePicker';

export default function ChooseStyle() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { name, age, language, selectedQuestionIds, customQuestions } = location.state || { name: '', age: '', language: 'en', selectedQuestionIds: undefined, customQuestions: [] };

  const [selectedStyle, setSelectedStyle] = useState(STYLES[0].prompt);

  const handleNext = () => {
    navigate('/voice-interview', { state: { name, age, worldStyle: selectedStyle, language, selectedQuestionIds, customQuestions } });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="min-h-screen bg-wonderland pattern-dots flex flex-col p-6 max-w-2xl mx-auto relative"
    >
      {/* Floating background shapes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[8%] right-[5%] w-8 h-8 rounded-full bg-coral-300/30"
             style={{ animation: 'float 5s ease-in-out infinite' }} />
        <div className="absolute bottom-[15%] left-[4%] w-6 h-6 rounded-full bg-magic-300/25"
             style={{ animation: 'float-slow 7s ease-in-out infinite 2s' }} />
        <div className="absolute top-[45%] right-[3%] w-5 h-5 rounded-full bg-sunny-300/30"
             style={{ animation: 'twinkle 4s ease-in-out infinite' }} />
      </div>

      <div className="relative z-10">
        <button
          onClick={() => navigate('/setup')}
          className="mt-8 mb-6 flex items-center gap-2 text-warm-500 hover:text-warm-800 font-medium transition-colors"
        >
          <ArrowLeft size={20} /> {t('common.back')}
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6 justify-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #f472b6, #facc15)' }}>
            <Wand2 size={30} color="white" strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-display font-bold text-warm-800">{t('chooseStyle.title')}</h1>
        </div>

        {/* Subtitle card */}
        <div className="bg-white/70 backdrop-blur-sm p-5 rounded-[1.5rem] shadow-magic border-2 border-magic-100 mb-8 text-center">
          <p className="text-warm-600 text-lg">{t('chooseStyle.subtitle', { name })}</p>
        </div>

        <div className="mb-10">
          <StylePicker selected={selectedStyle} onSelect={setSelectedStyle} />
        </div>

        {/* Bottom button */}
        <div className="pb-8">
          <motion.button
            onClick={handleNext}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="w-full text-white font-bold py-4 px-6 rounded-full transition-all text-lg flex items-center justify-center gap-2 shadow-magic"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
          >
            {t('chooseStyle.start_interview')} <ArrowRight size={20} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
