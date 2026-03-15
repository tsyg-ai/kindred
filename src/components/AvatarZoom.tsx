import { createPortal } from 'react-dom';
import { motion } from 'motion/react';

interface Props {
  src: string;
  alt: string;
  onClose: () => void;
}

export default function AvatarZoom({ src, alt, onClose }: Props) {
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', cursor: 'zoom-out' }}
      onClick={onClose}
    >
      <motion.img
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        src={src}
        alt={alt}
        style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '1.5rem', boxShadow: '0 25px 60px rgba(0,0,0,0.5)', objectFit: 'contain', cursor: 'default' }}
        onError={(e) => { (e.target as HTMLImageElement).src = '/avatar-placeholder.svg'; }}
        referrerPolicy="no-referrer"
        onClick={(e) => e.stopPropagation()}
      />
    </motion.div>,
    document.body
  );
}
