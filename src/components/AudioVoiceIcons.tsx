import React from 'react';

/**
 * Speaker Icon (Loa / Âm thanh hiệu ứng) - Based on input_file_0.png
 */
export const SoundSpeakerIcon: React.FC<{ className?: string; off?: boolean }> = ({
  className = 'w-5 h-5',
  off = false,
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Speaker body */}
      <path d="M11 5L6 9H3v6h3l5 4V5z" fill="currentColor" fillOpacity="0.12" />
      {!off ? (
        <>
          {/* Concentric sound wave arcs */}
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18 6a8.5 8.5 0 0 1 0 12" />
          <path d="M20.5 3.5a12 12 0 0 1 0 17" />
        </>
      ) : (
        <>
          {/* Off slash / Mute X */}
          <line x1="16" y1="9" x2="22" y2="15" />
          <line x1="22" y1="9" x2="16" y2="15" />
        </>
      )}
    </svg>
  );
};

/**
 * Person Speaking Icon (Đầu người phát giọng / Giọng đọc thuyết minh) - Based on input_file_1.png
 */
export const VoiceSpeakingIcon: React.FC<{ className?: string; off?: boolean }> = ({
  className = 'w-5 h-5',
  off = false,
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Person head circle */}
      <circle cx="7.5" cy="8" r="3.5" fill="currentColor" fillOpacity="0.1" />
      {/* Person shoulders arc */}
      <path d="M1.5 19a6 6 0 0 1 12 0" fill="currentColor" fillOpacity="0.1" />
      {!off ? (
        <>
          {/* Sound waves radiating from mouth/person towards right */}
          <path d="M14.5 9.5a3.5 3.5 0 0 1 0 5" />
          <path d="M17.5 7a7 7 0 0 1 0 10" />
          <path d="M20.5 4.5a10.5 10.5 0 0 1 0 15" />
        </>
      ) : (
        <>
          {/* Off slash */}
          <line x1="15" y1="9" x2="21" y2="15" />
          <line x1="21" y1="9" x2="15" y2="15" />
        </>
      )}
    </svg>
  );
};
