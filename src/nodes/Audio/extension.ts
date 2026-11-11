import { Node, mergeAttributes, type CommandProps } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    audio: {
      setAudio: (attrs: { src: string; title?: string }) => ReturnType;
    };
  }
}

export const Audio = Node.create({
  name: "audio",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    const noAutoRender = { renderHTML: () => ({}), parseHTML: () => null };
    return {
      src: { default: null, ...noAutoRender },
      title: { default: null, ...noAutoRender },
    };
  },

  parseHTML() {
    return [
      {
        tag: "audio[src]",
        getAttrs: (el) => ({
          src: (el as HTMLElement).getAttribute("src"),
          title: (el as HTMLElement).getAttribute("title"),
        }),
      },
    ];
  },

  renderHTML({ node }) {
    const { src, title } = node.attrs;
    return ["audio", mergeAttributes({ src, title: title ?? undefined, controls: "true" })];
  },

  addCommands() {
    return {
      setAudio:
        (attrs) =>
        ({ commands }: CommandProps) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});

export const createAudioExtensions = () => [Audio];
