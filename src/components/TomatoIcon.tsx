import React from 'react';

interface TomatoIconProps {
  className?: string;
  size?: number;
  bodyColor?: string;
  leafColor?: string;
  /** cor do fundo onde a marca está, usada no recorte entre as folhas e o fruto */
  background?: string;
}

const BODY = 'M16 9.6 C10.2 7.4 3.8 11 3.8 18.2 C3.8 24.6 9.4 28.8 16 28.8 C22.6 28.8 28.2 24.6 28.2 18.2 C28.2 11 21.8 7.4 16 9.6 Z';
const LEAVES = 'M16 11.2 C14.6 8.6 11.4 7.6 8.8 8.6 C11 9.2 12.6 10.6 13.4 12.6 C14.2 11.6 15 11.2 16 11.2 Z M16 11.2 C17.4 8.6 20.6 7.6 23.2 8.6 C21 9.2 19.4 10.6 18.6 12.6 C17.8 11.6 17 11.2 16 11.2 Z';
const STEM = 'M16 11 C16 8.6 16.4 6.6 18 5';

/** Marca do Strato: tomate sólido, chapado, com duas folhas e o cabo. */
export const TomatoIcon: React.FC<TomatoIconProps> = ({ className = 'w-6 h-6', size, bodyColor = '#E13513', leafColor = '#11310C', background = '#FCFCFA' }) => (
  <svg
    viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    role="img"
    aria-label="Strato"
  >
    <path d={BODY} fill={bodyColor} />
    <path d={LEAVES} fill={leafColor} stroke={background} strokeWidth="1.1" strokeLinejoin="round" paintOrder="stroke" />
    <path d={STEM} fill="none" stroke={leafColor} strokeWidth="1.9" strokeLinecap="round" />
  </svg>
);
