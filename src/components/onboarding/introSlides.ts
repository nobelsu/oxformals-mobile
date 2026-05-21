import type { IntroIllustrationVariant } from "./IntroSlideIllustration";

export type IntroSlide = {
  title: string;
  body: string;
  illustration: IntroIllustrationVariant;
};

export const INTRO_SLIDES: readonly IntroSlide[] = [
  {
    title: "Welcome to Oxformals",
    body: "The easiest way to experience formals at colleges across Oxford.",
    illustration: "welcome",
  },
  {
    title: "Browse & List",
    body: "Browse open formals at other colleges, or list your own.",
    illustration: "browse",
  },
  {
    title: "Swap & Chat",
    body: "Request swaps or pay to join — then chat with your group.",
    illustration: "chat",
  },
];
