import React from 'react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import ArchitectureSection from '@/components/ArchitectureSection';
import TechStackSection from '@/components/TechStackSection';
import FooterSection from '@/components/FooterSection';

const Index: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <ArchitectureSection />
      <TechStackSection />
      <FooterSection />
    </div>
  );
};

export default Index;
