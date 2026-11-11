export interface VideoAttributes {
  src: string;
  poster?: string | null;
  width?: number | null;
  height?: number | null;
  /** Persisted per spec 20 — playback controls should be visible by
   * default; autoplay/loop are deliberately not exposed as they are
   * accessibility/UX footguns the library shouldn't bless as document
   * data. Add them later as explicit, documented opt-ins if needed. */
}
