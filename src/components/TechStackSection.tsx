import React from 'react';
import { motion } from 'framer-motion';
import { Code2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const STACK_META = [
  {
    categoryKey: 'contracts',
    items: [
      { name: 'Anchor', descKey: 'anchor' },
      { name: 'Rust', descKey: 'rust' },
      { name: 'PDA Vaults', descKey: 'pda' },
    ],
  },
  {
    categoryKey: 'backend',
    items: [
      { name: 'FastAPI', descKey: 'fastapi' },
      { name: 'LI.FI', descKey: 'lifi' },
      { name: 'QuickNode', descKey: 'quicknode' },
    ],
  },
  {
    categoryKey: 'ai',
    items: [
      { name: 'ElevenLabs', descKey: 'elevenlabs' },
      { name: 'WebSocket', descKey: 'websocket' },
      { name: 'Tool Calling', descKey: 'toolCalling' },
    ],
  },
  {
    categoryKey: 'frontend',
    items: [
      { name: 'React 18', descKey: 'react' },
      { name: 'React Native', descKey: 'reactNative' },
      { name: 'Zustand', descKey: 'zustand' },
    ],
  },
] as const;

const TechStackSection: React.FC = () => {
  const { t } = useTranslation();

  const stacks = STACK_META.map((stack) => ({
    category: t(`techStack.categories.${stack.categoryKey}`),
    items: stack.items.map((item) => ({
      name: item.name,
      desc: t(`techStack.items.${item.descKey}`),
    })),
  }));

  return (
    <section className="relative py-24 overflow-hidden">
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-secondary/50 mb-4">
            <Code2 className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('techStack.badge')}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {t('techStack.title')}<span className="gradient-text">{t('techStack.titleGradient')}</span>{t('techStack.titleSuffix')}
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stacks.map((stack, si) => (
            <motion.div
              key={stack.category}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: si * 0.1 }}
              className="p-5 rounded-xl border border-border bg-card/50"
            >
              <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-4">
                {stack.category}
              </h3>
              <div className="space-y-3">
                {stack.items.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{item.name}</span>
                    <span className="text-[11px] text-muted-foreground">{item.desc}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TechStackSection;
