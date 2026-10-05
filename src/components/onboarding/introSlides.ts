import type { IntroIllustrationVariant } from "./IntroSlideIllustration";

export type IntroSlide = {
  title: string;
  body: string;
  illustration: IntroIllustrationVariant;
};

export const INTRO_SLIDES: readonly IntroSlide[] = [
  {
    title: "Welcome to Oxformals",
    body: "Formals at colleges across Oxford.",
    illustration: "welcome",
  },
  {
    title: "Browse & List",
    body: "Browse open formals at other colleges, or list your own.",
    illustration: "browse",
  },
  {
    title: "Swap & Chat",
    body: "Swap, spend a credit or pay to join.",
    illustration: "chat",
  },
];
