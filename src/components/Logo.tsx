import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  lightText?: boolean;
  showSubtitle?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  lightText = false,
  showSubtitle = true,
}) => {
  const iconBoxClass =
    size === 'sm' ? 'h-8 w-8 rounded-lg' : size === 'lg' ? 'h-13 w-13 rounded-2xl' : 'h-10 w-10 rounded-xl';

  return (
    <div className="flex items-center gap-3 select-none">
      <div
        className={`icon-light ${iconBoxClass} shrink-0 overflow-hidden border border-[#B9E4E8]/35 bg-[#071B2B]`}
      >
        <img
          src="/assets/aistudio/Logo_Peternakan_Ayam_Bhayangkara_be238611.png"
          alt="Logo BHAYANGKARA FARM"
          className="h-full w-full scale-105 object-cover"
        />
      </div>

      <div className="min-w-0">
        <div
          className={`font-display font-bold tracking-tight leading-none whitespace-nowrap ${
            size === 'lg' ? 'text-xl sm:text-2xl' : size === 'sm' ? 'text-sm' : 'text-[15px]'
          } ${lightText ? 'text-[#EEEEEE]' : 'text-[#071B2B] dark:text-[#B9E4E8]'}`}
        >
          BHAYANGKARA FARM
        </div>
        {showSubtitle && (
          <div
            className={`mt-1 text-[10px] font-medium tracking-wide uppercase whitespace-nowrap ${
              lightText ? 'text-[#B9E4E8]' : 'text-[#355365] dark:text-[#8BC2CB]'
            }`}
          >
            Farm Management &amp; Financial
          </div>
        )}
      </div>
    </div>
  );
};
