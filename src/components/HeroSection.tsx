import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Zap, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import VoiceOrb from './VoiceOrb';

const features = [
  { icon: Zap, label: 'AI-Powered', desc: 'Natural language DeFi execution' },
  { icon: Globe, label: 'Cross-Chain', desc: 'Bridge any chain to Solana' },
  { icon: Shield, label: 'Risk-Managed', desc: 'Smart vault risk scoring' },
];

const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const { connected } = useWallet();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background grid */}
      <div className="absolute inset-0 grid-pattern opacity-30" />

      {/* Gradient orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-secondary/50 mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
            Solana Devnet Live
          </span>
        </motion.div>

        {/* Main heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6"
        >
          <span className="text-foreground">Your AI </span>
          <span className="gradient-text">Wealth</span>
          <br />
          <span className="text-foreground">Operating System</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Speak naturally. NEURO understands, bridges, deposits, and optimizes
          your cross-chain yield on Solana.
        </motion.p>

        {/* Voice Orb — links to fullscreen voice */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, type: 'spring', stiffness: 100 }}
          className="mb-10 cursor-pointer"
          onClick={() => navigate('/voice')}
        >
          <VoiceOrb size="lg" />
          <p className="text-xs text-muted-foreground mt-4 font-mono">
            &quot;Move 300 USDC from Base to Solana and optimize my yield&quot;
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <button
            onClick={() => navigate(connected ? '/dashboard' : '#')}
            className="group flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all duration-300 bg-primary text-primary-foreground hover:shadow-[0_0_30px_hsl(187_90%_51%/0.3)]"
          >
            {connected ? 'Launch Dashboard' : 'Connect Wallet to Start'}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={() => navigate('/voice')}
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm text-muted-foreground border border-border hover:border-primary/30 hover:text-foreground transition-all duration-300"
          >
            Try Voice Mode
          </button>
        </motion.div>

        {/* Feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto"
        >
          {features.map((feat, i) => (
            <motion.div
              key={feat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 + i * 0.15 }}
              className="group p-5 rounded-xl border border-border bg-card/50 hover:bg-card hover:border-primary/20 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <feat.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">{feat.label}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{feat.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;