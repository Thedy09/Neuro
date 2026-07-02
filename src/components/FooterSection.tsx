import React from 'react';
import { Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const FooterSection: React.FC = () => {
  const { t } = useTranslation();
  return (
    <footer className="relative border-t border-border py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
              <Zap className="w-3 h-3 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">NEURO</span>
            <span className="text-xs text-muted-foreground">v1.0.0</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('footer.tagline')}
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/Thedy09/Neuro"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://github.com/Thedy09/Neuro/tree/main/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Docs
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
