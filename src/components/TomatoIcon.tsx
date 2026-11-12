import React, { useId } from 'react';

interface TomatoIconProps {
  className?: string;
  size?: number;
  /** cor da marca (o fundo aparece pelas três câmaras) */
  bodyColor?: string;
  /** versão reforçada para 24px ou menos: aro mais grosso, divisões mais largas */
  compact?: boolean;
}

// Tomato cortado ao meio: aro, centro e três câmaras (50/30/20%), desenhado num quadro de 256.
const CHAMBERS = 'M148.2 52.7 A78 78 0 0 1 148.2 203.3 L135.8 157.0 A30 30 0 0 0 135.8 99.0 Z M107.8 203.3 A78 78 0 0 1 50.1 123.9 L98.0 126.4 A30 30 0 0 0 120.2 157.0 Z M62.6 85.5 A78 78 0 0 1 107.8 52.7 L120.2 99.0 A30 30 0 0 0 102.8 111.7 Z';
const CHAMBERS_COMPACT = 'M140.2 59.1 A70 70 0 0 1 169.8 184.1 L149.5 156.9 A36 36 0 0 0 134.3 92.5 Z M123.9 197.9 A70 70 0 0 1 61.2 148.9 L93.6 138.7 A36 36 0 0 0 125.9 163.9 Z M63.4 101.0 A70 70 0 0 1 93.0 67.4 L110.0 96.8 A36 36 0 0 0 94.8 114.1 Z';

/** Marca do Strato: a fatia do tomate. */
export const TomatoIcon: React.FC<TomatoIconProps> = ({ className = 'w-6 h-6', size, bodyColor = '#E13513', compact }) => {
  const id = useId().replace(/:/g, '');
  const small = compact ?? (size !== undefined && size <= 24);
  return (
    <svg
      viewBox="0 0 256 256"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      role="img"
      aria-label="Strato"
    >
      <mask id={`st-${id}`}>
        <rect width="256" height="256" fill="#fff" />
        <path d={small ? CHAMBERS_COMPACT : CHAMBERS} fill="#000" stroke="#000" strokeWidth="8" strokeLinejoin="round" />
      </mask>
      <circle cx="128" cy="128" r="108" fill={bodyColor} mask={`url(#st-${id})`} />
    </svg>
  );
};
