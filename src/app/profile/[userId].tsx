import { useAuth } from "@/src/components/auth/useAuth";
import { ProfileInfoCard } from "@/src/components/profile/ProfileInfoCard";
import { ListingCard } from "@/src/components/swap/ListingCard";
import { DoodleDivider } from "@/src/components/ui/DoodleDivider";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxLoadingView } from "@/src/components/ui/OxLoadingView";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { DISPLAY_SECTION, SCREEN_PADDING } from "@/src/constants/layout";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useData } from "@/src/components/data/useData";
import { chatConversationHref } from "@/src/lib/chat/navigation";
import { oxText } from "@/src/constants/oxText";
import { useMutation, useQuery } from "convex/react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function ProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const { colors } = useOxTheme();
  const { user: currentUser } = useAuth();
  const { getUser } = useData();
  const getOrCreateConversation = useMutation(api.chat.getOrCreateConversation);

  const isOwnProfile = !!(currentUser && userId === currentUser.id);

  const profile = useQuery(
    api.users.getPublicProfile,
    userId && !isOwnProfile ? { userId: userId as Id<"users"> } : "skip",
  );

  useEffect(() => {
    if (isOwnProfile) {
      router.dismissTo("/(tabs)/mine");
    }
  }, [isOwnProfile, router]);

  if (isOwnProfile || profile === undefined) {
    return (
      <>
        <Stack.Screen options={{ title: "Profile" }} />
        <OxLoadingView fill />
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <Stack.Screen options={{ title: "Profile" }} />
        <View style={{ flex: 1, padding: SCREEN_PADDING }}>
          <Text style={[oxText, { color: colors.inkMuted }]}>
            Profile not found.
          </Text>
        </View>
      </>
    );
  }

  const uid = profile.user._id;
  const owner = getUser(uid) ?? {
    id: uid,
    email: "",
    name: profile.user.name ?? "",
    college: profile.user.college ?? "",
    year: profile.user.year ?? "",
    role: profile.user.role ?? "",
    interests: profile.user.interests ?? [],
    subject: profile.user.subject ?? "",
    uiFont: profile.user.uiFont ?? "schoolbell",
    ...(profile.user.instagramHandle
      ? { instagramHandle: profile.user.instagramHandle }
      : {}),
    ...(profile.user.whatsappPhone
      ? { whatsappPhone: profile.user.whatsappPhone }
      : {}),
    ...(profile.user.avatar ? { avatar: profile.user.avatar } : {}),
  };

  return (
    <>
      <Stack.Screen options={{ title: "Profile" }} />
      <ScrollView
        style={[styles.root, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.content}
      >
        <ProfileInfoCard
          profile={{
            id: uid,
            name: profile.user.name ?? "User",
            college: profile.user.college,
            year: profile.user.year,
            role: profile.user.role,
            subject: profile.user.subject,
            interests: profile.user.interests,
            dietaryRequirements: profile.user.dietaryRequirements,
            instagramHandle: profile.user.instagramHandle,
            whatsappPhone: profile.user.whatsappPhone,
            avatar: profile.user.avatar,
          }}
        />

        <OxButton
          title="Message"
          onPress={async () => {
            const id = await getOrCreateConversation({
              otherUserId: userId as Id<"users">,
            });
            router.push(chatConversationHref(id));
          }}
          style={{ marginTop: 20, marginBottom: 8 }}
        />

        <DoodleDivider seed={31} />
        <Text style={[styles.heading, oxText, { color: colors.ink }]}>
          Active listings
        </Text>
        {profile.listings.length === 0 ? (
          <Text style={[oxText, { color: colors.inkMuted }]}>
            No active listings right now.
          </Text>
        ) : (
          profile.listings.map((l) => {
            const listing = {
              id: l._id,
              ownerUserId: l.ownerUserId,
              college: l.college,
              dateTime: l.dateTime,
              groupSize: l.groupSize,
              seatsAvailable: l.seatsAvailable,
              members: l.members,
              year: l.year,
              role: l.role,
              message: l.message ?? "",
              menu: "",
              listingType: l.listingType ?? "swap",
              ...(l.price !== undefined ? { price: l.price } : {}),
              status: l.status,
              createdAt: Date.now(),
            };
            return (
              <View key={l._id} style={{ marginBottom: 12 }}>
                <ListingCard
                  listing={listing}
                  owner={owner}
                  variant="compact"
                  onPress={() => router.push(`/listing/${l._id}`)}
                />
              </View>
            );
          })
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: SCREEN_PADDING, paddingBottom: 40 },
  heading: {
    fontSize: DISPLAY_SECTION,
    textTransform: "uppercase",
    marginBottom: 12,
    marginTop: 8,
  },
});
