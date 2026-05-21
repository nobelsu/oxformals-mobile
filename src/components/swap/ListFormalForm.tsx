import { useAuth } from "@/src/components/auth/useAuth";
import { MenuAttachChooserModal } from "@/src/components/swap/MenuAttachChooserModal";
import { Chip } from "@/src/components/ui/Chip";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxInput } from "@/src/components/ui/OxInput";
import {
  defaultListFormalDateTime,
  OxDateTimeField,
} from "@/src/components/ui/OxDateTimeField";
import { oxText } from "@/src/constants/oxText";
import { DISPLAY_SECTION } from "@/src/constants/layout";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { api } from "@/convex/_generated/api";
import { normalizeCollegeName } from "@/src/lib/data/colleges";
import type { NewListingInput } from "@/src/lib/data/dataClient";
import { GROUP_SIZES, type GroupSize, type ListingType } from "@/src/lib/data/types";
import { runAfterUIReady } from "@/src/lib/media/openPhotoLibrary";
import { pickMenuImageFromLibrary } from "@/src/lib/upload/pickMenuImageFromLibrary";
import { uploadMenuFileMobile, type MenuFileAsset } from "@/src/lib/upload/menuFileMobile";
import { useMutation } from "convex/react";
import * as DocumentPicker from "expo-document-picker";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

const LISTING_TYPES: { value: ListingType; label: string }[] = [
  { value: "swap", label: "Swap" },
  { value: "pay", label: "Pay" },
  { value: "both", label: "Swap or pay" },
];

type Props = {
  onSubmit: (input: NewListingInput) => void;
  onCancel?: () => void;
};

export function ListFormalForm({ onSubmit, onCancel }: Props) {
  const { user } = useAuth();
  const { colors } = useOxTheme();
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

  const [dateTime, setDateTime] = useState(defaultListFormalDateTime);
  const [groupSize, setGroupSize] = useState<GroupSize>(2);
  const [message, setMessage] = useState("");
  const [menu, setMenu] = useState("");
  const [listingType, setListingType] = useState<ListingType>("swap");
  const [price, setPrice] = useState("");
  const [menuAsset, setMenuAsset] = useState<MenuFileAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);

  async function pickMenuFromLibrary() {
    setError(null);
    const result = await pickMenuImageFromLibrary();
    if (result.ok) {
      setMenuAsset(result.asset);
      return;
    }
    if (result.reason === "permission") {
      setError("Photo library access is required to choose a menu image.");
    } else if (result.reason === "invalid") {
      setError(result.message ?? "That image is not supported.");
    } else if (result.reason === "failed") {
      setError("Could not read that image.");
    }
  }

  async function pickMenuFromFiles() {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setMenuAsset({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? "application/octet-stream",
      size: asset.size ?? 0,
    });
  }

  function pickMenu() {
    setAttachMenuOpen(true);
  }

  async function handleSubmit() {
    if (!user) return;
    const college = normalizeCollegeName(user.college);
    if (!college || !user.year.trim() || !user.role.trim()) {
      setError("Complete your profile (college, year, role) first.");
      return;
    }
    const iso = dateTime.toISOString();
    const needsPrice = listingType === "pay" || listingType === "both";
    const priceNum = needsPrice ? parseInt(price, 10) : undefined;
    if (needsPrice && (!priceNum || priceNum < 1)) {
      setError("Enter a price of at least £1.");
      return;
    }

    setError(null);
    setUploading(true);
    try {
      let menuPdfId: string | undefined;
      if (menuAsset) {
        menuPdfId = await uploadMenuFileMobile(menuAsset, () =>
          generateUploadUrl(),
        );
      }
      onSubmit({
        dateTime: iso,
        groupSize,
        message: message.trim(),
        menu: menu.trim(),
        listingType,
        ...(menuPdfId ? { menuPdfId } : {}),
        ...(priceNum !== undefined ? { price: priceNum } : {}),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not post listing.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <View>
      <OxDateTimeField value={dateTime} onChange={setDateTime} />
      <Text style={[styles.sectionLabel, oxText, { color: colors.ink }]}>
        Group size
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
        {GROUP_SIZES.map((s) => (
          <Chip
            key={s}
            label={String(s)}
            selected={groupSize === s}
            onPress={() => setGroupSize(s)}
          />
        ))}
      </View>
      <Text style={[styles.sectionLabel, oxText, { color: colors.ink }]}>
        Listing type
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
        {LISTING_TYPES.map((t) => (
          <Chip
            key={t.value}
            label={t.label}
            selected={listingType === t.value}
            onPress={() => setListingType(t.value)}
          />
        ))}
      </View>
      {(listingType === "pay" || listingType === "both") && (
        <OxInput
          placeholder="Price (£)"
          value={price}
          onChangeText={setPrice}
          keyboardType="number-pad"
          wrapperStyle={{ marginTop: 12 }}
        />
      )}
      <OxInput
        placeholder="Message for guests"
        value={message}
        onChangeText={setMessage}
        multiline
        wrapperStyle={{ marginTop: 12, borderRadius: 16, minHeight: 72 }}
      />
      <OxInput
        placeholder="Menu (text)"
        value={menu}
        onChangeText={setMenu}
        multiline
        wrapperStyle={{ marginTop: 12, borderRadius: 16, minHeight: 72 }}
      />
      <OxButton
        title={menuAsset ? `Menu: ${menuAsset.name}` : "Attach menu PDF/image"}
        variant="secondary"
        onPress={pickMenu}
        style={{ marginTop: 12 }}
      />
      {error ? (
        <Text style={{ color: colors.danger, marginTop: 8 }}>{error}</Text>
      ) : null}
      <OxButton
        title="Post listing"
        loading={uploading}
        onPress={handleSubmit}
        style={{ marginTop: 16 }}
      />
      {onCancel ? (
        <OxButton
          title="Cancel"
          variant="ghost"
          onPress={onCancel}
          style={{ marginTop: 8 }}
        />
      ) : null}
      <MenuAttachChooserModal
        visible={attachMenuOpen}
        onClose={() => setAttachMenuOpen(false)}
        onPhotoLibrary={() =>
          runAfterUIReady(() => void pickMenuFromLibrary())
        }
        onBrowseFiles={() => void pickMenuFromFiles()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    marginTop: 16,
    fontSize: DISPLAY_SECTION,
    lineHeight: DISPLAY_SECTION * 1.35,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
