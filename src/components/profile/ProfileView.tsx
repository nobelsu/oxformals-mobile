import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { collegeToSlug } from "@/lib/data/collegeSlug";
import { useAuth } from "@/src/components/auth/useAuth";
import { useData } from "@/src/components/data/useData";
import { ActiveListingsSection } from "@/src/components/profile/ActiveListingsSection";
import { AvatarPreviewModal } from "@/src/components/profile/AvatarPreviewModal";
import { BadgeCase } from "@/src/components/profile/BadgeCase";
import { FollowRequests } from "@/src/components/profile/FollowRequests";
import { ProfileActivity } from "@/src/components/profile/ProfileActivity";
import { ProfileCounts } from "@/src/components/profile/ProfileCounts";
import { ProfileSocialBar } from "@/src/components/profile/ProfileSocialBar";
import { ListingCard } from "@/src/components/swap/ListingCard";
import { Avatar } from "@/src/components/ui/Avatar";
import { Chip } from "@/src/components/ui/Chip";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxLoadingView } from "@/src/components/ui/OxLoadingView";
import { OxText } from "@/src/components/ui/OxText";
import { CARD_GAP } from "@/src/constants/layout";
import { space, TAP_MIN } from "@/src/constants/spacing";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import type { User } from "@/src/lib/auth/types";
import { mapListing } from "@/src/lib/data/mapConvex";
import { formatYearRole } from "@/src/lib/data/roles";
import { errorMessage } from "@/src/lib/errorMessage";
import { WEB_ORIGIN } from "@/src/lib/webOrigin";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from "react-native";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const TABS = [
  { id: "activity", label: "Activity" },
  { id: "badges", label: "Badges" },
  { id: "listings", label: "Listings" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function InfoItem({
  icon,
  label,
  url,
}: {
  icon: IconName;
  label: string;
  url?: string;
}) {
  const { colors } = useOxTheme();
  return (
    <Pressable
      style={styles.infoItem}
      disabled={!url}
      onPress={() => (url ? void Linking.openURL(url) : undefined)}
      accessibilityRole={url ? "link" : "text"}
    >
      <Ionicons name={icon} size={16} color={colors.inkMuted} />
      <OxText style={[styles.infoLabel, { color: colors.inkMuted }]}>{label}</OxText>
    </Pressable>
  );
}

/** A profile, yours or someone else's: header, counts, actions and tabs. */
export function ProfileView({ userId }: { userId: Id<"users"> }) {
  const { colors } = useOxTheme();
  const router = useRouter();
  const { user: me } = useAuth();
  const { getUser } = useData();
  const isSelf = me?.id === userId;

  const profile = useQuery(api.users.getPublicProfile, { userId });
  const followState = useQuery(api.follows.getFollowState, { userId });
  const activity = useQuery(api.profileActivity.getProfileActivity, { userId });
  const credits = useQuery(api.credits.getMyCredits, isSelf ? {} : "skip");
  const getInviteCode = useMutation(api.invites.getOrCreateMyInviteCode);

  const [tab, setTab] = useState<TabId>("activity");
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [inviting, setInviting] = useState(false);

  if (profile === undefined) return <OxLoadingView style={styles.loading} />;

  if (!profile) {
    return (
      <OxText style={[styles.missing, { color: colors.inkMuted }]}>Profile not found</OxText>
    );
  }

  const u = profile.user;
  const name = u.name || "User";
  const meta = [u.college, formatYearRole(u.year, u.role)].filter(Boolean).join(" · ");
  const instagram = (u.instagramHandle ?? "").replace(/^@+/, "").trim();
  const whatsapp = (u.whatsappPhone ?? "").trim();
  const dietary = (u.dietaryRequirements ?? "").trim();
  const wishlist = u.wishlistColleges;
  const hidden = activity?.hidden === true;
  const stats = activity && !hidden ? activity.stats : null;

  const owner: User = getUser(userId) ?? {
    id: userId,
    email: "",
    name,
    college: u.college ?? "",
    year: u.year ?? "",
    role: u.role ?? "",
    interests: u.interests ?? [],
    subject: u.subject ?? "",
    uiFont: u.uiFont ?? "schoolbell",
    ...(u.avatar ? { avatar: u.avatar } : {}),
  };

  async function invite() {
    if (inviting) return;
    setInviting(true);
    try {
      const code = await getInviteCode({});
      await Share.share({ message: `Join me on Oxformals!\n${WEB_ORIGIN}/i/${code}` });
    } catch (error) {
      Alert.alert("Couldn't make your invite link", errorMessage(error));
    } finally {
      setInviting(false);
    }
  }

  function shareProfile() {
    Share.share({
      message: `${name} on Oxformals\n${WEB_ORIGIN}/profile/${userId}`,
    }).catch(() => {});
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable
          onPress={() => setAvatarOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="View profile photo"
        >
          <Avatar avatar={u.avatar} name={name} size={46} />
        </Pressable>
        <View style={styles.headerText}>
          <OxText numberOfLines={1} style={[styles.name, { color: colors.ink }]}>
            {name}
          </OxText>
          {meta ? (
            <OxText numberOfLines={1} style={[styles.meta, { color: colors.inkMuted }]}>
              {meta}
            </OxText>
          ) : null}
          {!isSelf && followState?.followsYou ? (
            <OxText style={[styles.tag, { color: colors.inkSoft }]}>Follows you</OxText>
          ) : null}
        </View>
        {isSelf ? (
          <Pressable
            onPress={() => router.push("/settings")}
            hitSlop={8}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={24} color={colors.ink} />
          </Pressable>
        ) : null}
      </View>

      {u.bio ? <OxText style={[styles.bio, { color: colors.ink }]}>{u.bio}</OxText> : null}

      {instagram || whatsapp || dietary ? (
        <View style={styles.info}>
          {instagram ? (
            <InfoItem
              icon="logo-instagram"
              label={`@${instagram}`}
              url={`https://instagram.com/${encodeURIComponent(instagram)}`}
            />
          ) : null}
          {whatsapp ? (
            <InfoItem
              icon="logo-whatsapp"
              label={whatsapp}
              url={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
            />
          ) : null}
          {dietary ? <InfoItem icon="restaurant-outline" label={dietary} /> : null}
        </View>
      ) : null}

      <ProfileCounts
        userId={userId}
        formals={stats ? stats.attendedCount : null}
        reviews={stats ? stats.reviewCount : null}
        followers={followState ? followState.followers : null}
        following={followState ? followState.followingCount : null}
        canOpenLists={followState?.canSeeActivity === true}
        isSelf={isSelf}
        viewerId={me?.id}
      />

      {isSelf ? (
        <View style={styles.actions}>
          <OxButton
            title="Edit profile"
            style={styles.grow}
            onPress={() => router.push("/profile/edit")}
          />
          <OxButton
            title="Invite"
            variant="secondary"
            loading={inviting}
            style={styles.grow}
            onPress={() => void invite()}
          />
          <Pressable
            onPress={shareProfile}
            hitSlop={8}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel="Share profile"
          >
            <Ionicons name="share-outline" size={24} color={colors.ink} />
          </Pressable>
        </View>
      ) : (
        <ProfileSocialBar userId={userId} name={name} />
      )}

      {isSelf ? <FollowRequests /> : null}

      {isSelf || wishlist.length > 0 ? (
        <View>
          <View style={styles.wishHead}>
            <OxText style={[styles.wishTitle, { color: colors.inkMuted }]}>Wants to go</OxText>
            {isSelf ? (
              <Pressable
                onPress={() => router.push("/profile/edit")}
                hitSlop={8}
                accessibilityRole="button"
              >
                <OxText style={[styles.link, { color: colors.ink }]}>
                  {wishlist.length > 0 ? "Edit" : "Add"}
                </OxText>
              </Pressable>
            ) : null}
          </View>
          {wishlist.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.wishScroll}
              contentContainerStyle={styles.wishChips}
            >
              {wishlist.map((college) => (
                <Chip
                  key={college}
                  label={college}
                  onPress={() =>
                    router.push(`/college/${collegeToSlug(college)}` as Href)
                  }
                />
              ))}
            </ScrollView>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.tabs, { borderBottomColor: colors.inkSoft }]}>
        {TABS.map(({ id, label }) => {
          const selected = tab === id;
          return (
            <Pressable
              key={id}
              onPress={() => setTab(id)}
              style={[
                styles.tab,
                { borderBottomColor: selected ? colors.ink : "transparent" },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
            >
              <OxText
                style={[styles.tabLabel, { color: selected ? colors.ink : colors.inkMuted }]}
              >
                {label}
              </OxText>
            </Pressable>
          );
        })}
        {isSelf && credits ? (
          <View style={styles.credits}>
            <MaterialCommunityIcons name="silverware-spoon" size={16} color={colors.inkMuted} />
            <OxText style={[styles.creditsText, { color: colors.inkMuted }]}>
              {credits.balance} spoon{credits.balance === 1 ? "" : "s"}
            </OxText>
          </View>
        ) : null}
      </View>

      {tab === "activity" ? (
        <ProfileActivity activity={activity} />
      ) : tab === "badges" ? (
        hidden ? (
          <ProfileActivity activity={activity} />
        ) : (
          <BadgeCase userId={userId} />
        )
      ) : isSelf ? (
        <ActiveListingsSection />
      ) : profile.listings.length === 0 ? (
        <OxText style={[styles.missing, { color: colors.inkMuted }]}>No active listings</OxText>
      ) : (
        <View style={styles.listings}>
          {profile.listings.map((doc) => (
            <ListingCard
              key={doc._id}
              listing={mapListing(doc)}
              owner={owner}
              variant="compact"
              onPress={() => router.push(`/listing/${doc._id}`)}
            />
          ))}
        </View>
      )}

      <AvatarPreviewModal
        visible={avatarOpen}
        onClose={() => setAvatarOpen(false)}
        avatar={u.avatar}
        name={name}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[4] },
  loading: { paddingVertical: space[8] },
  missing: { fontSize: 16, textAlign: "center", paddingVertical: space[6] },
  header: { flexDirection: "row", alignItems: "center", gap: space[3] },
  headerText: { flex: 1, minWidth: 0 },
  name: { fontSize: 24, lineHeight: 28 },
  meta: { fontSize: 15, lineHeight: 20 },
  tag: { fontSize: 13, lineHeight: 17 },
  iconButton: {
    width: 40,
    height: TAP_MIN,
    alignItems: "center",
    justifyContent: "center",
  },
  bio: { fontSize: 16, lineHeight: 21 },
  info: { flexDirection: "row", flexWrap: "wrap", columnGap: space[4], rowGap: space[1] },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoLabel: { fontSize: 15 },
  actions: { flexDirection: "row", alignItems: "center", gap: 10 },
  grow: { flex: 1 },
  wishHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  wishTitle: { fontSize: 15 },
  link: { fontSize: 15, textDecorationLine: "underline" },
  wishScroll: { marginTop: space[2] },
  // Chips carry their own bottom margin; cancel it so the row sits tight.
  wishChips: { marginBottom: -8 },
  tabs: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[5],
    borderBottomWidth: 1,
  },
  tab: { paddingVertical: space[2], borderBottomWidth: 2.5, marginBottom: -1 },
  tabLabel: { fontSize: 18 },
  credits: { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: "auto" },
  creditsText: { fontSize: 15 },
  listings: { gap: CARD_GAP },
});
