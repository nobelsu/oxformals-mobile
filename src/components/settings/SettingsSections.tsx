import { api } from "@/convex/_generated/api";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxSpinner } from "@/src/components/ui/OxSpinner";
import { OxText } from "@/src/components/ui/OxText";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { errorMessage } from "@/src/lib/errorMessage";
import { useMutation, useQuery } from "convex/react";
import { Alert, StyleSheet, Switch, View } from "react-native";

const TOPICS = [
  ["bookings", "Bookings", "Requests, replies and cancelled formals"],
  ["invites", "Group invites", "Invites to a group, and who has joined yours"],
  ["social", "Social", "New followers, and friends joining Oxformals"],
  ["credits", "Credits and reminders", "Credits, formal tomorrow, and new formals you want"],
] as const;

const CHANNELS = [
  ["push", "Push"],
  ["email", "Email"],
] as const;

function report(title: string) {
  return (error: unknown) => Alert.alert(title, errorMessage(error));
}

function SectionTitle({ children }: { children: string }) {
  const { colors } = useOxTheme();
  return (
    <OxText style={[styles.sectionTitle, { color: colors.ink, fontFamily: FONT_DISPLAY }]}>
      {children}
    </OxText>
  );
}

function ToggleRow({
  label,
  note,
  value,
  onChange,
}: {
  label: string;
  note?: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  const { colors } = useOxTheme();
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <OxText style={[styles.rowLabel, { color: colors.ink }]}>{label}</OxText>
        {note ? (
          <OxText style={[styles.rowNote, { color: colors.inkMuted }]}>{note}</OxText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.accent, false: colors.inkSoft }}
        accessibilityLabel={label}
      />
    </View>
  );
}

/** What you're told about, by push and by email. */
export function NotificationPrefsSection() {
  const { colors } = useOxTheme();
  const prefs = useQuery(api.notifications.getMyNotificationPrefs, {});
  const setPref = useMutation(api.notifications.setNotificationPref);

  return (
    <View style={styles.section}>
      <SectionTitle>What you hear about</SectionTitle>
      {!prefs ? (
        <OxSpinner />
      ) : (
        TOPICS.map(([category, title, description]) => (
          <View key={category} style={styles.topic}>
            <OxText style={[styles.rowLabel, { color: colors.ink }]}>{title}</OxText>
            <OxText style={[styles.rowNote, { color: colors.inkMuted }]}>{description}</OxText>
            <View style={styles.channels}>
              {CHANNELS.map(([channel, label]) => (
                <View key={channel} style={styles.channel}>
                  <OxText style={[styles.rowNote, { color: colors.ink }]}>{label}</OxText>
                  <Switch
                    value={prefs[channel][category]}
                    onValueChange={(enabled) => {
                      setPref({ channel, category, enabled }).catch(
                        report("Couldn't save that"),
                      );
                    }}
                    trackColor={{ true: colors.accent, false: colors.inkSoft }}
                    accessibilityLabel={`${title}: ${label}`}
                  />
                </View>
              ))}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

/** Private account and the people you've blocked. */
export function PrivacySection() {
  const { colors } = useOxTheme();
  const privacy = useQuery(api.follows.getMyPrivacy, {});
  const blocks = useQuery(api.blocks.listMyBlocks, {});
  const setPrivate = useMutation(api.follows.setPrivate);
  const unblock = useMutation(api.blocks.unblock);

  return (
    <View style={styles.section}>
      <SectionTitle>Privacy</SectionTitle>
      <ToggleRow
        label="Private account"
        note="Only people you approve can follow you and see your reviews, formals and badges."
        value={privacy?.isPrivate ?? false}
        onChange={(isPrivate) => {
          setPrivate({ isPrivate }).catch(report("Couldn't save that"));
        }}
      />
      <OxText style={[styles.rowLabel, { color: colors.ink, marginTop: 14 }]}>
        Blocked people
      </OxText>
      {blocks === undefined ? (
        <OxSpinner />
      ) : blocks.length === 0 ? (
        <OxText style={[styles.rowNote, { color: colors.inkMuted }]}>
          You haven&apos;t blocked anyone. Block someone from their profile.
        </OxText>
      ) : (
        blocks.map((b) => (
          <View key={b.userId} style={styles.row}>
            <View style={styles.rowText}>
              <OxText numberOfLines={1} style={[styles.rowLabel, { color: colors.ink }]}>
                {b.name}
              </OxText>
              {b.college ? (
                <OxText style={[styles.rowNote, { color: colors.inkMuted }]}>{b.college}</OxText>
              ) : null}
            </View>
            <OxButton
              title="Unblock"
              variant="secondary"
              onPress={() => {
                unblock({ userId: b.userId }).catch(report("Couldn't unblock them"));
              }}
            />
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24, gap: 8 },
  sectionTitle: { fontSize: 20, textTransform: "uppercase" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 16 },
  rowNote: { fontSize: 13, lineHeight: 17 },
  topic: { paddingVertical: 6 },
  channels: { flexDirection: "row", gap: 24, marginTop: 6 },
  channel: { flexDirection: "row", alignItems: "center", gap: 8 },
});
