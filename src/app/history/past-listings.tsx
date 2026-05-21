import { useAuth } from "@/src/components/auth/useAuth";
import { useData } from "@/src/components/data/useData";
import { usePastListings } from "@/src/components/swap/history/usePastListings";
import { MyListingCard } from "@/src/components/swap/MyListingCard";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { oxText } from "@/src/constants/oxText";
import {
  CARD_GAP,
  SCREEN_PADDING,
  TAB_SCROLL_EXTRA_BOTTOM,
} from "@/src/constants/layout";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

function PastListingsHeaderTitle() {
  const { colors } = useOxTheme();

  return (
    <View style={headerTitleStyles.row}>
      <Ionicons name="time-outline" size={22} color={colors.ink} />
      <Text style={[headerTitleStyles.title, { color: colors.ink }]}>
        Past listings
      </Text>
    </View>
  );
}

const headerTitleStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontFamily: FONT_DISPLAY, fontSize: 20 },
});

export default function PastListingsScreen() {
  const router = useRouter();
  const { colors } = useOxTheme();
  const { user } = useAuth();
  const { getUser } = useData();
  const pastListings = usePastListings();

  if (!user) return null;

  const profile = { year: user.year, role: user.role };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: () => <PastListingsHeaderTitle />,
        }}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { backgroundColor: colors.bg },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {pastListings.length === 0 ? (
          <Text style={[oxText, { color: colors.inkMuted }]}>
            No past listings yet.
          </Text>
        ) : (
          <View style={styles.cardList}>
            {pastListings.map((listing) => {
              const members = listing.members
                .map(getUser)
                .filter((u): u is NonNullable<typeof u> => !!u);
              return (
                <MyListingCard
                  key={listing.id}
                  listing={listing}
                  pendingRequestCount={0}
                  profile={profile}
                  memberUsers={members}
                  compact
                  onViewRequests={() =>
                    router.push(`/listing/${listing.id}`)
                  }
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: SCREEN_PADDING,
    paddingBottom: TAB_SCROLL_EXTRA_BOTTOM + 32,
    flexGrow: 1,
  },
  cardList: { gap: CARD_GAP },
});
