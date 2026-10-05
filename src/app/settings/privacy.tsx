import { PrivacySection } from "@/src/components/settings/SettingsSections";
import { SettingsScreen } from "@/src/components/settings/SettingsUi";

export default function PrivacySettingsScreen() {
  return (
    <SettingsScreen title="Privacy">
      <PrivacySection />
    </SettingsScreen>
  );
}
