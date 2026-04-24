export interface ContentNode {
  id: string;
  label: string;
  title: string;
  eyebrow: string;
  body: string;
  accent: string;
  anchor: {
    top: string;
    left: string;
  };
}

export const siteManifest: ContentNode[] = [
  {
    id: "about",
    label: "About",
    eyebrow: "Presence",
    title: "A portfolio built as a living environment.",
    body:
      "AETHERIS treats interaction as atmosphere. Session state, visual state, and product meaning stay separate so the experience feels alive without becoming fragile.",
    accent: "The browser senses. Python composes. The interface blooms.",
    anchor: {
      top: "22%",
      left: "18%",
    },
  },
  {
    id: "work",
    label: "Work",
    eyebrow: "Biomes",
    title: "Projects condense as discovered matter.",
    body:
      "Work is revealed through spatial focus, not a conventional menu. Each node is a biome entrypoint designed to feel discovered instead of opened.",
    accent: "Brush through the veil to uncover active systems.",
    anchor: {
      top: "54%",
      left: "61%",
    },
  },
  {
    id: "contact",
    label: "Contact",
    eyebrow: "Signal",
    title: "Reach the core without leaving the atmosphere.",
    body:
      "Contact appears as a luminous convergence point, keeping the ritual consistent all the way to conversion and conversation.",
    accent: "Presence becomes connection.",
    anchor: {
      top: "74%",
      left: "33%",
    },
  },
];
