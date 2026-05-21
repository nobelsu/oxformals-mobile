import { useAuth } from "@/src/components/auth/useAuth";
import { ProfileInfoCard } from "@/src/components/profile/ProfileInfoCard";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxLoadingView } from "@/src/components/ui/OxLoadingView";
import { space } from "@/src/constants/spacing";
import { StyleSheet, View } from "react-native";

type Props = {
  onEditPress: () => void;
  onSettingsPress: () => void;
};

export function MyProfileView({ onEditPress, onSettingsPress }: Props) {
  const { user } = useAuth();

  if (!user) {
    return <OxLoadingView fill />;
  }

  return (
    <>
      <ProfileInfoCard
        profile={{
          id: user.id,
          name: user.name,
          college: user.college,
          year: user.year,
          role: user.role,
          subject: user.subject,
          interests: user.interests,
          dietaryRequirements: user.dietaryRequirements,
          instagramHandle: user.instagramHandle,
          whatsappPhone: user.whatsappPhone,
          avatar: user.avatar,
        }}
      />

      <View style={styles.actions}>
        <OxButton
          title="Edit profile"
          onPress={onEditPress}
          style={styles.actionButton}
        />
        <OxButton
          title="Settings"
          variant="secondary"
          onPress={onSettingsPress}
          style={styles.actionButton}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    gap: space[3],
    marginTop: space[5],
  },
  actionButton: {
    flex: 1,
  },
});
