export interface AudioPlayerProps {
  src: string;
  title?: string | null;
  className?: string;
}

export const AudioPlayer = ({ src, title, className }: AudioPlayerProps) => (
  <audio
    className={["rte-audio", className].filter(Boolean).join(" ")}
    src={src}
    title={title ?? undefined}
    controls
    style={{ width: "100%" }}
  />
);
