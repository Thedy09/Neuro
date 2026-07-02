import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Mic, MicOff, Volume2, Loader2 } from 'lucide-react';

interface VoiceOrbProps {
  isListening?: boolean;
  isSpeaking?: boolean;
  isProcessing?: boolean;
  isConnecting?: boolean;
  onToggle?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: { container: 'w-16 h-16', icon: 'w-5 h-5', rings: [20, 28, 36] },
  md: { container: 'w-28 h-28', icon: 'w-7 h-7', rings: [36, 48, 60] },
  lg: { container: 'w-40 h-40', icon: 'w-9 h-9', rings: [52, 68, 84] },
};

const VoiceOrb: React.FC<VoiceOrbProps> = ({
  isListening: externalListening,
  isSpeaking = false,
  isProcessing = false,
  isConnecting = false,
  onToggle,
  size = 'md',
}) => {
  const { t } = useTranslation();
  const [internalListening, setInternalListening] = useState(false);
  const isListening = externalListening ?? internalListening;
  const config = sizeMap[size];

  const handleToggle = useCallback(() => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalListening((prev) => !prev);
    }
  }, [onToggle]);

  const isActive = isListening || isSpeaking || isProcessing || isConnecting;

  const getIcon = () => {
    if (isConnecting) return <Loader2 className={`${config.icon} text-primary animate-spin`} />;
    if (isProcessing) return <Loader2 className={`${config.icon} text-primary animate-spin`} />;
    if (isSpeaking) return <Volume2 className={`${config.icon} text-primary`} />;
    if (isListening) return <Mic className={`${config.icon} text-primary`} />;
    return <MicOff className={`${config.icon} text-muted-foreground`} />;
  };

  const getBorderColor = () => {
    if (isConnecting) return 'border-warning/60';
    if (isProcessing) return 'border-primary/40';
    if (isSpeaking || isListening) return 'border-primary/60';
    return 'border-border hover:border-primary/30';
  };

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer rings */}
      <AnimatePresence>
        {isActive && !isConnecting && (
          <>
            {config.rings.map((ringSize, i) => (
              <motion.div
                key={`ring-${i}`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.15, 0.05, 0.15],
                }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{
                  duration: 2 + i * 0.5,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
                className="absolute rounded-full border border-primary/30"
                style={{ width: ringSize * 2, height: ringSize * 2 }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Glow backdrop */}
      <motion.div
        animate={{
          scale: isActive ? [1, 1.3, 1] : 1,
          opacity: isActive ? [0.3, 0.6, 0.3] : 0.1,
        }}
        transition={{ duration: 3, repeat: Infinity }}
        className={`absolute ${config.container} rounded-full orb-glow`}
      />

      {/* Main orb button */}
      <motion.button
        onClick={handleToggle}
        aria-label={isActive ? t('voicePage.orbStop') : t('voicePage.orbStart')}
        aria-pressed={isActive}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={
          isActive
            ? {
                boxShadow: [
                  '0 0 20px hsl(187 90% 51% / 0.3)',
                  '0 0 40px hsl(187 90% 51% / 0.5)',
                  '0 0 20px hsl(187 90% 51% / 0.3)',
                ],
              }
            : {}
        }
        transition={isActive ? { duration: 2, repeat: Infinity } : {}}
        className={`relative z-10 ${config.container} rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 ${
          isActive ? `bg-primary/20 border-2 ${getBorderColor()}` : `bg-secondary border-2 ${getBorderColor()}`
        }`}
      >
        <motion.div
          animate={isSpeaking ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.5, repeat: isSpeaking ? Infinity : 0 }}
        >
          {getIcon()}
        </motion.div>
      </motion.button>
    </div>
  );
};

export default VoiceOrb;
