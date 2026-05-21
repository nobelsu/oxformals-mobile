import { oxText } from "@/src/constants/oxText";
import { space } from "@/src/constants/spacing";
import { Platform, StyleSheet } from "react-native";

/** Subtle depth for grouped auth controls — hand-drawn but product-polished. */
export function authElevation(ink: string) {
  return Platform.select({
    ios: {
      shadowColor: ink,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    android: { elevation: 3 },
    default: {},
  });
}

export const authTypography = StyleSheet.create({
  title: {
    ...oxText,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  subtitle: {
    ...oxText,
    fontSize: 15,
    lineHeight: 20,
  },
  error: {
    ...oxText,
    fontSize: 14,
    lineHeight: 18,
    textAlign: "center",
  },
  link: {
    ...oxText,
    fontSize: 15,
    lineHeight: 20,
    textDecorationLine: "underline",
  },
});

export const authLayout = StyleSheet.create({
  page: {
    paddingHorizontal: space[4],
    paddingTop: space[2],
    paddingBottom: space[3],
  },
  brand: {
    alignItems: "center",
    gap: space[2],
  },
  copy: {
    marginTop: space[3],
    gap: space[1],
  },
  form: {
    marginTop: space[3],
    gap: space[2],
  },
});
