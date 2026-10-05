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
    title: "Find a seat",
    body: "Swap a seat, spend a credit or pay the host.",
    illustration: "browse",
  },
  {
    title: "Go together",
    body: "Bring friends. Host a guest to earn a credit.",
    illustration: "chat",
  },
];
