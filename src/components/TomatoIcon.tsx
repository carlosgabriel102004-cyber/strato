import React from 'react';

interface TomatoIconProps {
  className?: string;
  size?: number;
  /** cor do cálice (use a cor de destaque em fundos escuros) */
  leafColor?: string;
  bodyColor?: string;
}

const CALYX = 'M16.00 4.40 L17.12 7.37 L21.90 7.30 L17.81 9.07 L19.64 12.00 L16.00 10.12 L12.36 12.00 L14.19 9.07 L10.10 7.30 L14.88 7.37 Z';

/** Marca do Strato: tomate chapado cortado em três camadas ("strato"), com o cálice em estrela. */
export const TomatoIcon: React.FC<TomatoIconProps> = ({ className = 'w-6 h-6', size, leafColor = '#11310C', bodyColor = '#E13513' }) => {
  const maskId = React.useId();
  return (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      role="img"
      aria-label="Strato"
    >
      <mask id={maskId}>
        <rect width="32" height="32" fill="white" />
        <path d="M3 15.4H29M3 21.2H29" stroke="black" strokeWidth="1.5" />
        <path d={CALYX} fill="black" stroke="black" strokeWidth="2.2" strokeLinejoin="round" />
      </mask>
      <ellipse cx="16" cy="18.6" rx="11.6" ry="10.4" fill={bodyColor} mask={`url(#${maskId})`} />
      <path d={CALYX} fill={leafColor} stroke={leafColor} strokeWidth="0.6" strokeLinejoin="round" />
    </svg>
  );
};
