import * as SecureStore from "expo-secure-store";

const INTRO_SEEN_KEY = "oxformals.hasSeenIntro";

export async function getHasSeenIntro(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(INTRO_SEEN_KEY);
  return value === "true";
}

export async function setHasSeenIntro(): Promise<void> {
  await SecureStore.setItemAsync(INTRO_SEEN_KEY, "true");
}
