import React from 'react';
import { motion } from 'framer-motion';
import { Code2 } from 'lucide-react';

const stacks = [
  {
    category: 'Smart Contracts',
    items: [
      { name: 'Anchor', desc: 'Solana framework' },
      { name: 'Rust', desc: 'Program language' },
      { name: 'PDA Vaults', desc: 'User accounts' },
    ],
  },
  {
    category: 'Backend',
    items: [
      { name: 'FastAPI', desc: 'Async Python API' },
      { name: 'LI.FI', desc: 'Cross-chain routing' },
      { name: 'QuickNode', desc: 'Solana streams' },
    ],
  },
  {
    category: 'AI / Voice',
    items: [
      { name: 'ElevenLabs', desc: 'Conversational AI' },
      { name: 'WebSocket', desc: 'Real-time streaming' },
      { name: 'Tool Calling', desc: 'DeFi execution' },
    ],
  },
  {
    category: 'Frontend',
    items: [
      { name: 'React 18', desc: 'Web interface' },
      { name: 'React Native', desc: 'Mobile app' },
      { name: 'Zustand', desc: 'State management' },
    ],
  },
];

const TechStackSection: React.FC = () => {
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
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tech Stack</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Built with <span className="gradient-text">Production</span> Tools
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
