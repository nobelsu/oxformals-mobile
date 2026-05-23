import {
  CollegePickerModal,
  FieldLabel,
  InterestsEditor,
  PickerField,
  RolePickerModal,
  profileFieldStyles,
} from "@/src/components/auth/SignupProfileForm";
import { useAuth } from "@/src/components/auth/useAuth";
import { Avatar, PRESET_AVATARS, PresetAvatarIcon } from "@/src/components/ui/Avatar";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxInput } from "@/src/components/ui/OxInput";
import { SketchCard } from "@/src/components/ui/SketchCard";
import { DISPLAY_SECTION } from "@/src/constants/layout";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { oxText } from "@/src/constants/oxText";
import { space } from "@/src/constants/spacing";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import type { AvatarSource } from "@/src/lib/auth/types";
import { pickAvatarImage } from "@/src/lib/avatar/pickAvatarImage";
import { normalizeCollegeName } from "@/src/lib/data/colleges";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  onDirtyChange?: (dirty: boolean) => void;
  registerSave?: (saveFn: () => Promise<void>) => void;
  registerCancel?: (cancelFn: () => void) => void;
};

export function ProfileEditor({
  onDirtyChange,
  registerSave,
  registerCancel,
}: Props) {
  const { user, updateProfile } = useAuth();
  const { colors } = useOxTheme();

  const [nameDraft, setNameDraft] = useState(user?.name ?? "");
  const [collegeDraft, setCollegeDraft] = useState(user?.college ?? "");
  const [yearDraft, setYearDraft] = useState(user?.year ?? "");
  const [roleDraft, setRoleDraft] = useState(user?.role ?? "");
  const [instagramHandleDraft, setInstagramHandleDraft] = useState(
    user?.instagramHandle ?? "",
  );
  const [whatsappPhoneDraft, setWhatsappPhoneDraft] = useState(
    user?.whatsappPhone ?? "",
  );
  const [dietaryRequirementsDraft, setDietaryRequirementsDraft] = useState(
    user?.dietaryRequirements ?? "",
  );
  const [subjectDraft, setSubjectDraft] = useState(user?.subject ?? "");
  const [interestsDraft, setInterestsDraft] = useState<string[]>(
    user?.interests ?? [],
  );
  const [avatarDraft, setAvatarDraft] = useState<AvatarSource | undefined>(
    user?.avatar,
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [collegeModalOpen, setCollegeModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);

  const resetDraftsFromUser = useCallback(() => {
    if (!user) return;
    setNameDraft(user.name);
    const normalizedCollege =
      normalizeCollegeName(user.college) || user.college.trim();
    setCollegeDraft(normalizedCollege);
    setYearDraft(user.year);
    setRoleDraft(user.role);
    setInstagramHandleDraft(user.instagramHandle ?? "");
    setWhatsappPhoneDraft(user.whatsappPhone ?? "");
    setDietaryRequirementsDraft(user.dietaryRequirements ?? "");
    setSubjectDraft(user.subject ?? "");
    setInterestsDraft(user.interests);
    setAvatarDraft(user.avatar);
    setCollegeModalOpen(false);
    setRoleModalOpen(false);
    setError(null);
  }, [user]);

  useEffect(() => {
    resetDraftsFromUser();
  }, [user, resetDraftsFromUser]);

  const normalizedName = nameDraft.trim();
  const normalizedCollege = normalizeCollegeName(collegeDraft);
  const normalizedYear = yearDraft.trim();
  const normalizedRole = roleDraft.trim();
  const initialName = user?.name.trim() ?? "";
  const initialCollege = user
    ? normalizeCollegeName(user.college) || user.college.trim()
    : "";
  const initialYear = user?.year.trim() ?? "";
  const initialRole = user?.role.trim() ?? "";
  const initialInstagramHandle = user?.instagramHandle?.trim() ?? "";
  const initialWhatsappPhone = user?.whatsappPhone?.trim() ?? "";
  const initialDietaryRequirements = user?.dietaryRequirements?.trim() ?? "";
  const initialSubject = user?.subject?.trim() ?? "";
  const initialInterests = user?.interests ?? [];
  const initialAvatar = user?.avatar;

  const profileDirty =
    normalizedName !== initialName ||
    normalizedCollege !== initialCollege ||
    normalizedYear !== initialYear ||
    normalizedRole !== initialRole ||
    instagramHandleDraft.trim() !== initialInstagramHandle ||
    whatsappPhoneDraft.trim() !== initialWhatsappPhone ||
    dietaryRequirementsDraft.trim() !== initialDietaryRequirements ||
    subjectDraft.trim() !== initialSubject ||
    JSON.stringify(interestsDraft) !== JSON.stringify(initialInterests) ||
    JSON.stringify(avatarDraft ?? null) !== JSON.stringify(initialAvatar ?? null);

  const save = useCallback(async () => {
    if (!user) return;
    setError(null);
    setBusy(true);
    try {
      const trimmedName = nameDraft.trim();
      if (!trimmedName) {
        setError("Name cannot be empty.");
        return;
      }
      const year = yearDraft.trim();
      if (!/^\d+$/.test(year)) {
        setError("Year must be a number, e.g. 2.");
        return;
      }
      await updateProfile({
        name: trimmedName,
        college: normalizeCollegeName(collegeDraft),
        year,
        role: roleDraft.trim(),
        instagramHandle: instagramHandleDraft.trim(),
        whatsappPhone: whatsappPhoneDraft.trim(),
        dietaryRequirements: dietaryRequirementsDraft.trim(),
        subject: subjectDraft.trim(),
        avatar: avatarDraft,
        interests: interestsDraft,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    } catch {
      setError("Could not save — try again.");
    } finally {
      setBusy(false);
    }
  }, [
    user,
    nameDraft,
    yearDraft,
    updateProfile,
    collegeDraft,
    roleDraft,
    instagramHandleDraft,
    whatsappPhoneDraft,
    dietaryRequirementsDraft,
    subjectDraft,
    avatarDraft,
    interestsDraft,
  ]);

  useEffect(() => {
    onDirtyChange?.(profileDirty);
  }, [profileDirty, onDirtyChange]);

  useEffect(() => {
    registerSave?.(async () => {
      if (!profileDirty || busy) return;
      await save();
    });
  }, [registerSave, profileDirty, busy, save]);

  useEffect(() => {
    registerCancel?.(() => {
      resetDraftsFromUser();
    });
  }, [registerCancel, resetDraftsFromUser]);

  if (!user) return null;

  const presetActiveId =
    avatarDraft?.kind === "preset" ? avatarDraft.id : null;

  async function handleUploadImage() {
    setError(null);
    setBusy(true);
    try {
      const result = await pickAvatarImage();
      if (!result.ok) {
        if (result.reason === "too_large") {
          setError("That image is too big — try a smaller one.");
        } else if (result.reason === "permission") {
          setError("Photo library access is required to upload an image.");
        } else if (result.reason === "failed") {
          setError("Could not read that image.");
        }
        return;
      }
      setAvatarDraft({ kind: "image", dataUrl: result.dataUrl });
    } catch {
      setError("Could not read that image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SketchCard seed={5} padding={space[4]}>
        <Text
          style={[
            styles.cardTitle,
            { color: colors.ink, fontFamily: FONT_DISPLAY },
          ]}
        >
          Your details
        </Text>
        <Text style={[styles.cardSubtitle, oxText, { color: colors.inkMuted }]}>
          College, year, and role are saved with each formal you list. Avatar and
          interests show on browse cards.
        </Text>

        <View style={styles.avatarSection}>
          <Avatar avatar={avatarDraft} name={user.name} size={72} />
          <View style={styles.avatarActions}>
            <OxButton
              title={busy ? "Loading…" : "Choose from photos"}
              variant="secondary"
              disabled={busy}
              onPress={() => void handleUploadImage()}
            />
            <OxButton
              title="Use initials"
              variant="secondary"
              onPress={() => setAvatarDraft(undefined)}
              style={{ marginTop: space[2] }}
            />
          </View>
        </View>

        <View style={styles.presetGrid}>
          {PRESET_AVATARS.map((p) => {
            const selected = presetActiveId === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => setAvatarDraft({ kind: "preset", id: p.id })}
                accessibilityRole="button"
                accessibilityLabel={`Use ${p.label} avatar`}
                accessibilityState={{ selected }}
                style={[
                  styles.presetBtn,
                  {
                    borderColor: colors.ink,
                    backgroundColor: selected ? colors.ink : colors.bg,
                  },
                ]}
              >
                <PresetAvatarIcon
                  id={p.id}
                  size={20}
                  color={selected ? colors.bg : colors.ink}
                />
              </Pressable>
            );
          })}
        </View>

        {error ? (
          <Text style={[styles.error, oxText, { color: colors.danger }]}>
            {error}
          </Text>
        ) : null}

        <View style={[styles.divider, { borderColor: colors.inkSoft }]} />

        <View style={profileFieldStyles.fields}>
          <View style={profileFieldStyles.field}>
            <FieldLabel>Name</FieldLabel>
            <OxInput
              placeholder="Your full name"
              value={nameDraft}
              onChangeText={setNameDraft}
              seed={1}
            />
          </View>

          <View style={profileFieldStyles.row}>
            <View style={[profileFieldStyles.field, profileFieldStyles.collegeCol]}>
              <PickerField
                label="College"
                value={collegeDraft}
                placeholder="Choose college"
                onPress={() => {
                  setRoleModalOpen(false);
                  setCollegeModalOpen(true);
                }}
                seed={2}
              />
            </View>
            <View style={[profileFieldStyles.field, profileFieldStyles.yearCol]}>
              <FieldLabel>Year</FieldLabel>
              <OxInput
                placeholder="2"
                value={yearDraft}
                onChangeText={(t) =>
                  setYearDraft(t.replace(/\D/g, "").slice(0, 2))
                }
                keyboardType="number-pad"
                seed={3}
              />
            </View>
          </View>

          <View style={profileFieldStyles.row}>
            <View style={[profileFieldStyles.field, profileFieldStyles.halfCol]}>
              <PickerField
                label="Role"
                value={roleDraft}
                placeholder="Choose role"
                onPress={() => {
                  setCollegeModalOpen(false);
                  setRoleModalOpen(true);
                }}
                seed={4}
              />
            </View>
            <View style={[profileFieldStyles.field, profileFieldStyles.halfCol]}>
              <FieldLabel>Instagram handle</FieldLabel>
              <OxInput
                placeholder="@yourhandle"
                value={instagramHandleDraft}
                onChangeText={setInstagramHandleDraft}
                autoCapitalize="none"
                seed={5}
              />
            </View>
          </View>

          <View style={profileFieldStyles.field}>
            <FieldLabel>WhatsApp phone</FieldLabel>
            <OxInput
              placeholder="+44 7..."
              value={whatsappPhoneDraft}
              onChangeText={setWhatsappPhoneDraft}
              keyboardType="phone-pad"
              seed={6}
            />
          </View>

          <View style={profileFieldStyles.row}>
            <View style={[profileFieldStyles.field, profileFieldStyles.halfCol]}>
              <FieldLabel>Allergens / Dietary requirements</FieldLabel>
              <OxInput
                placeholder="e.g. Vegetarian, nut allergy"
                value={dietaryRequirementsDraft}
                onChangeText={setDietaryRequirementsDraft}
                seed={7}
              />
            </View>
            <View style={[profileFieldStyles.field, profileFieldStyles.halfCol]}>
              <FieldLabel>Subject</FieldLabel>
              <OxInput
                placeholder="e.g. PPE, Engineering"
                value={subjectDraft}
                onChangeText={setSubjectDraft}
                seed={8}
              />
            </View>
          </View>
        </View>

        <View style={[styles.divider, styles.interestsDivider, { borderColor: colors.inkSoft }]} />

        <Text style={[styles.interestsLead, oxText, { color: colors.inkMuted }]}>
          Interests show up on your listings so people know what you&apos;re into.
        </Text>

        <View style={{ marginTop: space[3] }}>
          <InterestsEditor
            interests={interestsDraft}
            onInterestsChange={setInterestsDraft}
            boxSeed={9}
            inputSeed={10}
            addButtonSeed={24}
            fill="bg"
            showLabel={false}
          />
        </View>

        {saved ? (
          <Text style={[styles.savedHint, oxText, { color: colors.inkMuted }]}>
            Saved
          </Text>
        ) : null}
      </SketchCard>

      <CollegePickerModal
        visible={collegeModalOpen}
        onClose={() => setCollegeModalOpen(false)}
        value={collegeDraft}
        onChange={setCollegeDraft}
        searchSeed={11}
      />
      <RolePickerModal
        visible={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        value={roleDraft}
        onChange={setRoleDraft}
      />
    </>
  );
}

const styles = StyleSheet.create({
  cardTitle: {
    fontSize: DISPLAY_SECTION,
    lineHeight: DISPLAY_SECTION * 1.35,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    marginTop: space[1],
    fontSize: 16,
    lineHeight: 22,
  },
  avatarSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[4],
    marginTop: space[5],
  },
  avatarActions: {
    flex: 1,
  },
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space[1],
    marginTop: space[4],
    alignSelf: "center",
    maxWidth: 220,
    justifyContent: "center",
  },
  presetBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    marginTop: space[3],
    fontSize: 14,
    textAlign: "center",
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    marginTop: space[5],
    marginBottom: space[5],
  },
  interestsDivider: {
    marginTop: space[5],
    paddingBottom: 0,
  },
  interestsLead: {
    fontSize: 16,
    lineHeight: 22,
    marginTop: space[5],
  },
  savedHint: {
    marginTop: space[4],
    textAlign: "right",
    fontSize: 14,
  },
});
