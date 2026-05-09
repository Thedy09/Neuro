import React from 'react';
import { motion } from 'framer-motion';
import { Brain, ArrowRight, Server, Smartphone, Shield, Layers } from 'lucide-react';

const layers = [
  {
    icon: Smartphone,
    title: 'Frontend Layer',
    desc: 'React Web + React Native mobile with voice AI interface',
    tech: ['React 18', 'Expo', 'Zustand', 'NativeWind'],
    color: 'primary',
  },
  {
    icon: Brain,
    title: 'AI Agent Layer',
    desc: 'ElevenLabs conversational agent with DeFi tool calling',
    tech: ['ElevenLabs', 'WebSocket', 'Tool Calling', 'Streaming'],
    color: 'primary',
  },
  {
    icon: Server,
    title: 'Backend Layer',
    desc: 'FastAPI async backend with LI.FI and QuickNode integration',
    tech: ['FastAPI', 'LI.FI', 'QuickNode', 'Pydantic v2'],
    color: 'primary',
  },
  {
    icon: Shield,
    title: 'Smart Contract Layer',
    desc: 'Anchor-based Risk-Weighted Vault system on Solana',
    tech: ['Anchor', 'Rust', 'PDA Vaults', 'Risk Scoring'],
    color: 'primary',
  },
];

const flowSteps = [
  'User speaks to NEURO',
  'AI parses intent',
  'Fetches LI.FI route',
  'Prepares bridge TX',
  'User signs on wallet',
  'Funds arrive on Solana',
  'Deposits into vault',
  'AI confirms via voice',
];

const ArchitectureSection: React.FC = () => {
  return (
    <section id="architecture" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 dot-pattern opacity-20" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-secondary/50 mb-4">
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Full-Stack <span className="gradient-text">Monorepo</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Production-grade infrastructure from voice input to on-chain execution.
          </p>
        </motion.div>

        {/* Architecture layers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
          {layers.map((layer, i) => (
            <motion.div
              key={layer.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group p-6 rounded-xl border border-border bg-card/50 hover:bg-card hover:border-primary/20 transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <layer.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-foreground mb-1">{layer.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{layer.desc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {layer.tech.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-md bg-secondary text-secondary-foreground border border-border"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Transaction flow */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="p-6 rounded-xl border border-border bg-card/50"
        >
          <h3 className="text-sm font-semibold text-foreground mb-6 flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-primary" />
            Transaction Flow
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {flowSteps.map((step, i) => (
              <React.Fragment key={step}>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary border border-border">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-mono font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-xs font-medium text-foreground whitespace-nowrap">{step}</span>
                </div>
                {i < flowSteps.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0 hidden sm:block" />
                )}
              </React.Fragment>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ArchitectureSection;
