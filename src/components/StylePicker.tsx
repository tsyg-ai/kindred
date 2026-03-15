import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

export const STYLES = [
  { id: 'Watercolor', name: 'Watercolor', filename: 'style_watercolor.png', prompt: 'Soft, whimsical watercolor painting' },
  { id: 'Paper-craft', name: 'Paper-craft', filename: 'style_paper.png', prompt: 'Textured, layered paper-craft art' },
  { id: '3D Animation', name: '3D Animation', filename: 'style_animation.png', prompt: 'Vibrant, modern 3D animation style' },
  { id: 'Toy', name: '3D Toy', filename: 'style_toy.png', prompt: 'Cute 3D vinyl toy style' },
  { id: 'Chalk', name: 'Chalk', filename: 'style_chalk.png', prompt: 'Colorful chalk drawing on a blackboard' },
  { id: 'Clay', name: 'Claymation', filename: 'style_clay.png', prompt: 'Stop-motion claymation style' },
  { id: '8-Bit', name: '8-Bit', filename: 'style_8bit.png', prompt: 'Retro 8-bit pixel art' },
  { id: 'Crayon', name: 'Crayon', filename: 'style_crayon.png', prompt: 'Child-like crayon drawing' },
  { id: 'Cartoon', name: 'Cartoon', filename: 'style_cartoon.png', prompt: 'Classic 2D cartoon style' },
  { id: 'Stitched', name: 'Stitched', filename: 'style_stitched.png', prompt: 'Stitched fabric and embroidery style' },
  { id: 'Neon', name: 'Neon', filename: 'style_neon.png', prompt: 'Bright neon cyberpunk style' },
  { id: 'Default', name: 'Default', filename: 'style_default.png', prompt: 'Beautiful digital illustration' },
];

interface StylePickerProps {
  selected: string;
  onSelect: (prompt: string) => void;
}

export default function StylePicker({ selected, onSelect }: StylePickerProps) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-4 max-sm:grid-cols-3 gap-3">
      {STYLES.map((style, index) => {
        const isSelected = selected === style.prompt;
        return (
          <motion.button
            key={style.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22, delay: index * 0.03 }}
            whileHover={{ scale: 1.04, y: -3 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onSelect(style.prompt)}
            className={`rounded-[1.2rem] overflow-hidden text-left transition-all ${
              isSelected
                ? 'border-4 border-magic-500 shadow-magic scale-105'
                : 'border-4 border-transparent hover:border-coral-300 shadow-md'
            }`}
          >
            <img
              src={`/${style.filename}`}
              alt={style.name}
              className="w-full aspect-square object-cover"
              loading={index < 4 ? 'eager' : 'lazy'}
            />
            <div
              className={`p-2 text-center font-display font-semibold text-xs ${isSelected ? 'text-white' : 'bg-white text-warm-700'}`}
              style={isSelected ? { background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' } : {}}
            >
              {t(`chooseStyle.styles.${style.id}`, style.name)}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
