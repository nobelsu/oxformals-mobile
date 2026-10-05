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
  ["bookings", "Bookings", "Requests and replies"],
  ["invites", "Group invites", ""],
  ["social", "Social", "New followers"],
  ["credits", "Credits and reminders", ""],
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
      <SectionTitle>Notifications</SectionTitle>
      {!prefs ? (
        <OxSpinner />
      ) : (
        TOPICS.map(([category, title, description]) => (
          <View key={category} style={styles.topic}>
            <OxText style={[styles.rowLabel, { color: colors.ink }]}>{title}</OxText>
            {description ? (
              <OxText style={[styles.rowNote, { color: colors.inkMuted }]}>{description}</OxText>
            ) : null}
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
  const discovery = useQuery(api.contacts.getContactDiscovery, {});
  const setDiscovery = useMutation(api.contacts.setContactDiscovery);
  const unblock = useMutation(api.blocks.unblock);

  return (
    <View style={styles.section}>
      <SectionTitle>Privacy</SectionTitle>
      <ToggleRow
        label="Private account"
        note="Only followers you approve see your activity."
        value={privacy?.isPrivate ?? false}
        onChange={(isPrivate) => {
          setPrivate({ isPrivate }).catch(report("Couldn't save that"));
        }}
      />
      <ToggleRow
        label="Let my contacts find me"
        value={discovery?.discoverable ?? true}
        onChange={(discoverable) => {
          setDiscovery({ discoverable }).catch(report("Couldn't save that"));
        }}
      />
      <OxText style={[styles.rowLabel, { color: colors.ink, marginTop: 14 }]}>
        Blocked people
      </OxText>
      {blocks === undefined ? (
        <OxSpinner />
      ) : blocks.length === 0 ? (
        <OxText style={[styles.rowNote, { color: colors.inkMuted }]}>
          No one blocked.
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
