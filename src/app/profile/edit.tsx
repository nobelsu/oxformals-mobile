import { useKeyboardMetrics } from "@/src/components/chat/useKeyboardVisible";
import { useData } from "@/src/components/data/useData";
import { ProfileEditor } from "@/src/components/swap/ProfileEditor";
import { WishlistChips } from "@/src/components/swap/WishlistChips";
import { OxButton } from "@/src/components/ui/OxButton";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { SCREEN_PADDING } from "@/src/constants/layout";
import { space, TAP_MIN } from "@/src/constants/spacing";
import { useHeaderHeight } from "@react-navigation/elements";
import { Stack } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** In-flow save bar: top pad + button + bottom pad (+ hairline). */
function saveBarHeight(insetsBottom: number) {
  return space[3] + TAP_MIN + space[3] + insetsBottom + 1;
}

export default function EditProfileScreen() {
  const { wishlist, saveWishlist } = useData();
  const { colors } = useOxTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { visible: keyboardVisible } = useKeyboardMetrics();
  const [profileDirty, setProfileDirty] = useState(false);
  const [wishlistDirty, setWishlistDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileSave, setProfileSave] = useState<(() => Promise<void>) | null>(
    null,
  );
  const [profileCancel, setProfileCancel] = useState<(() => void) | null>(null);
  const [wishlistSave, setWishlistSave] = useState<(() => Promise<void>) | null>(
    null,
  );
  const [wishlistCancel, setWishlistCancel] = useState<(() => void) | null>(
    null,
  );

  const registerProfileSave = useCallback((saveFn: () => Promise<void>) => {
    setProfileSave(() => saveFn);
  }, []);

  const registerProfileCancel = useCallback((cancelFn: () => void) => {
    setProfileCancel(() => cancelFn);
  }, []);

  const registerWishlistSave = useCallback((saveFn: () => Promise<void>) => {
    setWishlistSave(() => saveFn);
  }, []);

  const registerWishlistCancel = useCallback((cancelFn: () => void) => {
    setWishlistCancel(() => cancelFn);
  }, []);

  const hasUnsavedChanges = useMemo(
    () => profileDirty || wishlistDirty,
    [profileDirty, wishlistDirty],
  );

  const handleSaveAll = useCallback(async () => {
    if (!hasUnsavedChanges || saving) return;
    setSaving(true);
    try {
      await profileSave?.();
      await wishlistSave?.();
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    } finally {
      setSaving(false);
    }
  }, [hasUnsavedChanges, saving, profileSave, wishlistSave]);

  const handleCancel = useCallback(() => {
    profileCancel?.();
    wishlistCancel?.();
  }, [profileCancel, wishlistCancel]);

  const showSaveBar = hasUnsavedChanges || saving || saved;

  const barHeight = useMemo(
    () => saveBarHeight(insets.bottom),
    [insets.bottom],
  );

  const scrollBottom = useMemo(() => {
    let bottom = space[6];
    if (showSaveBar && keyboardVisible) {
      bottom += barHeight + space[4];
    }
    return bottom;
  }, [showSaveBar, keyboardVisible, barHeight]);

  const keyboardVerticalOffset = headerHeight + (showSaveBar ? barHeight : 0);

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <View style={styles.screen}>
        <Stack.Screen options={{ title: "Edit profile" }} />
        <ScrollView
          style={styles.fill}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: scrollBottom },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <ProfileEditor
            onDirtyChange={setProfileDirty}
            registerSave={registerProfileSave}
            registerCancel={registerProfileCancel}
          />
          <WishlistChips
            selected={wishlist}
            onSave={saveWishlist}
            onDirtyChange={setWishlistDirty}
            registerSave={registerWishlistSave}
            registerCancel={registerWishlistCancel}
          />
        </ScrollView>

        {showSaveBar ? (
          <View
            style={[
              styles.saveBar,
              {
                paddingBottom: insets.bottom + space[3],
                backgroundColor: colors.bg,
                borderTopColor: colors.inkSoft,
              },
            ]}
          >
            <OxButton
              title="Cancel"
              variant="secondary"
              disabled={saving || !hasUnsavedChanges}
              onPress={handleCancel}
              style={styles.saveBarBtn}
            />
            <OxButton
              title={saving ? "Saving…" : saved ? "Saved" : "Save"}
              loading={saving}
              disabled={saving || !hasUnsavedChanges}
              onPress={() => void handleSaveAll()}
              style={styles.saveBarBtn}
            />
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: space[2],
  },
  saveBar: {
    flexDirection: "row",
    gap: space[3],
    paddingHorizontal: space[4],
    paddingTop: space[3],
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
  saveBarBtn: {
    flex: 1,
  },
});
