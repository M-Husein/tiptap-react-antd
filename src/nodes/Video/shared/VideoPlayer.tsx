export interface VideoPlayerProps {
  src: string;
  poster?: string | null;
  width?: number | null;
  height?: number | null;
  className?: string;
}

export const VideoPlayer = ({ src, poster, width, height, className }: VideoPlayerProps) => (
  <video
    className={["rte-video", className].filter(Boolean).join(" ")}
    src={src}
    poster={poster ?? undefined}
    width={width ?? undefined}
    height={height ?? undefined}
    controls
    style={{ maxWidth: "100%" }}
  />
);
