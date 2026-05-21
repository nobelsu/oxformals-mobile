import { AvatarPreviewModal } from "@/src/components/profile/AvatarPreviewModal";
import { Avatar } from "@/src/components/ui/Avatar";
import { Chip } from "@/src/components/ui/Chip";
import { SketchCard } from "@/src/components/ui/SketchCard";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { DISPLAY_SECTION } from "@/src/constants/layout";
import { oxText } from "@/src/constants/oxText";
import { space } from "@/src/constants/spacing";
import { formatYearLabel } from "@/src/lib/data/format";
import type { AvatarSource } from "@/src/lib/auth/types";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export type ProfileInfo = {
  id: string;
  name: string;
  college?: string;
  year?: string;
  role?: string;
  subject?: string;
  interests?: string[];
  dietaryRequirements?: string;
  instagramHandle?: string;
  whatsappPhone?: string;
  avatar?: AvatarSource;
};

type Props = {
  profile: ProfileInfo;
};

function instagramUrl(handle: string): string {
  const clean = handle.replace(/^@/, "").trim();
  return `https://instagram.com/${encodeURIComponent(clean)}`;
}

function whatsappUrl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

type ContactRowProps = {
  icon: "logo-instagram" | "logo-whatsapp";
  label: string;
  url: string;
  color: string;
};

function ContactRow({ icon, label, url, color }: ContactRowProps) {
  return (
    <Pressable
      onPress={() => void Linking.openURL(url)}
      accessibilityRole="link"
      style={styles.contactRow}
    >
      <View style={styles.iconSlot}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[oxText, styles.contactLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

export function ProfileInfoCard({ profile }: Props) {
  const { colors } = useOxTheme();
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);

  const metaLine = [
    profile.college,
    formatYearLabel(profile.year) || profile.year,
    profile.role,
  ]
    .filter(Boolean)
    .join(" · ");
  const interests = profile.interests ?? [];
  const hasInterests = interests.length > 0;
  const revealContact = !!(profile.instagramHandle || profile.whatsappPhone);

  return (
    <>
    <SketchCard seed={profile.id.length} padding={14}>
      <View style={styles.header}>
        <Pressable
          onPress={() => setAvatarPreviewOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="View profile photo"
          style={styles.avatarPress}
        >
          <Avatar avatar={profile.avatar} name={profile.name} size={60} />
        </Pressable>
        <Text
          style={[
            styles.name,
            oxText,
            { color: colors.ink },
          ]}
        >
          {profile.name || "User"}
        </Text>
        {metaLine ? (
          <Text
            style={[oxText, { color: colors.inkMuted, textAlign: "center" }]}
          >
            {metaLine}
          </Text>
        ) : null}
      </View>

      {profile.subject ? (
        <Text style={[styles.detail, oxText, { color: colors.inkMuted }]}>
          {profile.subject}
        </Text>
      ) : null}

      {hasInterests ? (
        <View style={styles.interests}>
          {interests.map((interest) => (
            <Chip key={interest} label={interest} />
          ))}
        </View>
      ) : null}

      {profile.dietaryRequirements ? (
        <Text style={[styles.detail, oxText, { color: colors.inkMuted }]}>
          Dietary: {profile.dietaryRequirements}
        </Text>
      ) : null}

      {revealContact ? (
        <View style={[styles.contact, { borderColor: `${colors.ink}33` }]}>
          <View style={styles.contactList}>
            {profile.instagramHandle ? (
              <ContactRow
                icon="logo-instagram"
                label={`@${profile.instagramHandle.replace(/^@/, "")}`}
                url={instagramUrl(profile.instagramHandle)}
                color={colors.ink}
              />
            ) : null}
            {profile.whatsappPhone ? (
              <ContactRow
                icon="logo-whatsapp"
                label={profile.whatsappPhone}
                url={whatsappUrl(profile.whatsappPhone)}
                color={colors.ink}
              />
            ) : null}
          </View>
        </View>
      ) : null}
    </SketchCard>
    <AvatarPreviewModal
      visible={avatarPreviewOpen}
      onClose={() => setAvatarPreviewOpen(false)}
      avatar={profile.avatar}
      name={profile.name || "User"}
    />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
  },
  avatarPress: {
    alignItems: "center",
  },
  name: {
    fontSize: DISPLAY_SECTION,
    textTransform: "uppercase",
    marginTop: space[2],
    textAlign: "center",
  },
  detail: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
    marginTop: space[2],
  },
  interests: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: space[2],
  },
  contact: {
    marginTop: space[3],
    paddingTop: space[2],
    borderTopWidth: 1,
    alignItems: "center",
  },
  contactList: {
    gap: 6,
    alignItems: "flex-start",
    alignSelf: "center",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
  },
  iconSlot: {
    width: 20,
    alignItems: "center",
  },
  contactLabel: {
    fontSize: 16,
    lineHeight: 20,
    includeFontPadding: false,
    flexShrink: 1,
  },
});
