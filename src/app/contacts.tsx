import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Avatar } from "@/src/components/ui/Avatar";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxLoadingView } from "@/src/components/ui/OxLoadingView";
import { OxText } from "@/src/components/ui/OxText";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { SCREEN_PADDING } from "@/src/constants/layout";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import type { AvatarSource } from "@/src/lib/auth/types";
import { errorMessage } from "@/src/lib/errorMessage";
import { WEB_ORIGIN } from "@/src/lib/webOrigin";
import { useMutation } from "convex/react";
import * as Contacts from "expo-contacts";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  SectionList,
  Share,
  StyleSheet,
  View,
} from "react-native";

/** The backend takes this many address-book entries per lookup. */
const MAX_CONTACTS = 1000;

type Entry = { name: string; phones: string[]; emails: string[] };
type Match = {
  contactIndex: number;
  id: Id<"users">;
  name: string;
  college: string | null;
  avatar?: AvatarSource;
  following: "none" | "pending" | "active";
};
type Row =
  | { kind: "member"; key: string; match: Match }
  | { kind: "invite"; key: string; entry: Entry };

type Stage =
  | { name: "checking" }
  | { name: "ask" }
  | { name: "blocked" }
  | { name: "loading" }
  | { name: "ready"; members: Match[]; others: Entry[] }
  | { name: "error"; message: string };

async function readAddressBook(): Promise<Entry[]> {
  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
  });
  const entries: Entry[] = [];
  for (const contact of data) {
    const phones = (contact.phoneNumbers ?? [])
      .map((p) => p.number ?? "")
      .filter(Boolean);
    const emails = (contact.emails ?? []).map((e) => e.email ?? "").filter(Boolean);
    const name = contact.name?.trim();
    if (!name || (phones.length === 0 && emails.length === 0)) continue;
    entries.push({ name, phones, emails });
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  return entries.slice(0, MAX_CONTACTS);
}

/** Friends from your address book: follow the ones on Oxformals, invite the rest. */
export default function ContactsScreen() {
  const { colors } = useOxTheme();
  const router = useRouter();
  const matchContacts = useMutation(api.contacts.matchContacts);
  const follow = useMutation(api.follows.follow);
  const getInviteCode = useMutation(api.invites.getOrCreateMyInviteCode);
  const [stage, setStage] = useState<Stage>({ name: "checking" });
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStage({ name: "loading" });
    try {
      const entries = await readAddressBook();
      const matches = await matchContacts({
        contacts: entries.map(({ phones, emails }) => ({ phones, emails })),
      });
      const matched = new Set(matches.map((m) => m.contactIndex));
      setStage({
        name: "ready",
        members: matches,
        others: entries.filter((_, index) => !matched.has(index)),
      });
    } catch (error) {
      setStage({ name: "error", message: errorMessage(error) });
    }
  }, [matchContacts]);

  // Already allowed: go straight to the list. Otherwise explain before asking.
  useEffect(() => {
    void (async () => {
      const permission = await Contacts.getPermissionsAsync();
      if (permission.granted) await load();
      else setStage(permission.canAskAgain ? { name: "ask" } : { name: "blocked" });
    })();
  }, [load]);

  async function allow() {
    const permission = await Contacts.requestPermissionsAsync();
    if (permission.granted) await load();
    else setStage(permission.canAskAgain ? { name: "ask" } : { name: "blocked" });
  }

  async function invite(entry: Entry) {
    try {
      const link =
        inviteLink ?? `${WEB_ORIGIN}/i/${await getInviteCode({})}`;
      setInviteLink(link);
      const text = `Join me on Oxformals!\n${link}`;
      const phone = entry.phones[0];
      if (phone) {
        const separator = Platform.OS === "ios" ? "&" : "?";
        await Linking.openURL(
          `sms:${phone.replace(/[^\d+]/g, "")}${separator}body=${encodeURIComponent(text)}`,
        );
      } else {
        await Share.share({ message: text });
      }
    } catch (error) {
      Alert.alert("Couldn't start your invite", errorMessage(error));
    }
  }

  const title = <Stack.Screen options={{ title: "Find friends", headerShown: true }} />;

  if (stage.name === "checking" || stage.name === "loading") {
    return (
      <>
        {title}
        <OxLoadingView fill />
      </>
    );
  }

  if (stage.name !== "ready") {
    return (
      <>
        {title}
        <View style={[styles.center, { backgroundColor: colors.bg }]}>
          <OxText style={[styles.heading, { color: colors.ink, fontFamily: FONT_DISPLAY }]}>
            {stage.name === "error" ? "That didn't work" : "Find friends"}
          </OxText>
          <OxText style={[styles.body, { color: colors.inkMuted }]}>
            {stage.name === "ask"
              ? "See who you know on Oxformals. Your contacts are checked, not stored."
              : stage.name === "blocked"
                ? "Allow Contacts for Oxformals in Settings."
                : stage.message}
          </OxText>
          {stage.name === "ask" ? (
            <OxButton title="Allow contacts" onPress={() => void allow()} />
          ) : stage.name === "blocked" ? (
            <OxButton title="Open Settings" onPress={() => void Linking.openSettings()} />
          ) : (
            <OxButton title="Try again" onPress={() => void load()} />
          )}
        </View>
      </>
    );
  }

  const sections = [
    {
      title: "On Oxformals",
      data: stage.members.map(
        (match): Row => ({ kind: "member", key: match.id, match }),
      ),
    },
    {
      title: "Invite",
      data: stage.others.map(
        (entry, index): Row => ({ kind: "invite", key: `${index}-${entry.name}`, entry }),
      ),
    },
  ].filter((section) => section.data.length > 0);

  return (
    <>
      {title}
      <SectionList
        sections={sections}
        keyExtractor={(row) => row.key}
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <OxText
            style={[styles.section, { color: colors.ink, fontFamily: FONT_DISPLAY }]}
          >
            {section.title}
          </OxText>
        )}
        renderItem={({ item }) =>
          item.kind === "member" ? (
            <View style={styles.row}>
              <Pressable
                style={styles.person}
                onPress={() => router.push(`/profile/${item.match.id}`)}
                accessibilityRole="button"
              >
                <Avatar avatar={item.match.avatar} name={item.match.name} size={38} />
                <View style={styles.text}>
                  <OxText numberOfLines={1} style={[styles.name, { color: colors.ink }]}>
                    {item.match.name}
                  </OxText>
                  {item.match.college ? (
                    <OxText style={[styles.note, { color: colors.inkMuted }]}>
                      {item.match.college}
                    </OxText>
                  ) : null}
                </View>
              </Pressable>
              {item.match.following !== "none" || followed.has(item.match.id) ? (
                <OxText style={[styles.note, { color: colors.inkMuted }]}>
                  {item.match.following === "active"
                    ? "Following"
                    : item.match.following === "pending"
                      ? "Requested"
                      : "Followed"}
                </OxText>
              ) : (
                <OxButton
                  title="Follow"
                  onPress={() => {
                    follow({ userId: item.match.id })
                      .then(() => setFollowed((ids) => new Set(ids).add(item.match.id)))
                      .catch((error) =>
                        Alert.alert("Couldn't follow them", errorMessage(error)),
                      );
                  }}
                />
              )}
            </View>
          ) : (
            <View style={styles.row}>
              <View style={styles.person}>
                <Avatar name={item.entry.name} size={38} />
                <OxText numberOfLines={1} style={[styles.name, { color: colors.ink, flex: 1 }]}>
                  {item.entry.name}
                </OxText>
              </View>
              <OxButton
                title="Invite"
                variant="secondary"
                onPress={() => void invite(item.entry)}
              />
            </View>
          )
        }
        ListEmptyComponent={
          <OxText style={[styles.body, { color: colors.inkMuted, paddingVertical: 48 }]}>
            No contacts with a number or email.
          </OxText>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 32,
  },
  heading: { fontSize: 28, textTransform: "uppercase" },
  body: { fontSize: 16, lineHeight: 22, textAlign: "center" },
  list: { padding: SCREEN_PADDING, paddingBottom: 48 },
  section: { fontSize: 20, textTransform: "uppercase", marginTop: 16, marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56 },
  person: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  text: { flex: 1 },
  name: { fontSize: 17 },
  note: { fontSize: 13 },
});
