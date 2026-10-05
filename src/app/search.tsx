import { api } from "@/convex/_generated/api";
import { Avatar } from "@/src/components/ui/Avatar";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxInput } from "@/src/components/ui/OxInput";
import { OxSpinner } from "@/src/components/ui/OxSpinner";
import { OxText } from "@/src/components/ui/OxText";
import { SCREEN_PADDING } from "@/src/constants/layout";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { useQuery } from "convex/react";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

const MIN_QUERY_LENGTH = 2;

/** Find anyone on Oxformals by name. */
export default function SearchScreen() {
  const { colors } = useOxTheme();
  const router = useRouter();
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");

  // Wait for a pause in typing before asking the server.
  useEffect(() => {
    const id = setTimeout(() => setQuery(text.trim()), 250);
    return () => clearTimeout(id);
  }, [text]);

  const active = query.length >= MIN_QUERY_LENGTH;
  const people = useQuery(api.peopleSearch.searchPeople, active ? { query } : "skip");

  return (
    <>
      <Stack.Screen options={{ title: "Find people", headerShown: true }} />
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <OxInput
          value={text}
          onChangeText={setText}
          placeholder="Search by name"
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          seed={23}
        />
        {!active ? (
          <OxButton
            title="Find friends from your contacts"
            variant="secondary"
            onPress={() => router.push("/contacts")}
            style={styles.contacts}
          />
        ) : people === undefined ? (
          <View style={styles.center}>
            <OxSpinner />
          </View>
        ) : (
          <FlatList
            data={people}
            keyExtractor={(p) => p.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => router.push(`/profile/${item.id}`)}
                style={styles.row}
                accessibilityRole="button"
              >
                <Avatar avatar={item.avatar} name={item.name} size={40} />
                <View style={styles.text}>
                  <OxText style={[styles.name, { color: colors.ink }]}>{item.name}</OxText>
                  {item.college ? (
                    <OxText style={[styles.college, { color: colors.inkMuted }]}>
                      {item.college}
                    </OxText>
                  ) : null}
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              <OxText style={[styles.note, { color: colors.inkMuted }]}>
                No one by that name.
              </OxText>
            }
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: SCREEN_PADDING },
  list: { paddingTop: 8, paddingBottom: 48 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56 },
  text: { flex: 1 },
  name: { fontSize: 17 },
  college: { fontSize: 14 },
  contacts: { marginTop: 16 },
  note: { fontSize: 15, textAlign: "center", paddingVertical: 32 },
  center: { paddingVertical: 32, alignItems: "center" },
});
