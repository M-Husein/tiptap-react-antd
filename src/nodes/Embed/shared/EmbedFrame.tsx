import { resolveEmbed, EMBED_SANDBOX, type EmbedProvider } from "../security";
import type { EmbedValidationOptions } from "../security";

export interface EmbedFrameProps {
  src: string;
  provider: EmbedProvider;
  width?: number | null;
  height?: number | null;
  title?: string | null;
  validation?: EmbedValidationOptions;
  className?: string;
}

/**
 * Re-validates and re-resolves the embed src at render time (same
 * function the extension's renderHTML uses) rather than trusting
 * whatever is sitting in the JSON attrs — belt-and-braces against a
 * document that was hand-edited or came from an untrusted import.
 */
export const EmbedFrame = ({
  src,
  provider,
  width = 560,
  height = 315,
  title,
  validation,
  className,
}: EmbedFrameProps) => {
  const resolved = resolveEmbed(src, provider, validation);

  if (!resolved) {
    return (
      <div className="rte-embed-blocked" role="alert">
        Embed blocked: could not validate this {provider} link.
      </div>
    );
  }

  return (
    <div
      className={["rte-embed", className].filter(Boolean).join(" ")}
      style={{ aspectRatio: `${width ?? 560} / ${height ?? 315}`, width: "100%" }}
    >
      <iframe
        src={resolved.embedSrc}
        title={title ?? `${provider} embed`}
        width={width ?? undefined}
        height={height ?? undefined}
        sandbox={EMBED_SANDBOX}
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        loading="lazy"
        frameBorder={0}
        style={{ width: "100%", height: "100%", border: 0 }}
      />
    </div>
  );
};
