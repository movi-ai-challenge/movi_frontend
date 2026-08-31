const BAR_HEIGHTS = [0.5, 1, 0.7, 0.9, 0.6] as const;

interface VoiceWaveProps {
  /** 막대 최대 높이(px) */
  size?: number;
  className?: string;
}

/**
 * 음성 입출력 중임을 나타내는 파형.
 *
 * 순수 장식이므로 aria-hidden 이다. 상태는 반드시 옆의 문구가
 * 전달해야 하며, 이 컴포넌트만으로 상태를 표현해서는 안 된다.
 * 모션을 줄인 환경에서는 globals.css 가 애니메이션을 멈춘다.
 */
export function VoiceWave({ size = 20, className = "" }: VoiceWaveProps) {
  return (
    <span aria-hidden="true" className={`flex items-end gap-[3px] ${className}`} style={{ height: size }}>
      {BAR_HEIGHTS.map((ratio, index) => (
        <span
          key={index}
          className="movi-wave-bar w-[3px] rounded-full bg-[var(--color-accent)]"
          style={{ height: size * ratio, animationDelay: `${index * 0.1}s` }}
        />
      ))}
    </span>
  );
}
