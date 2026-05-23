import { DoodleAddButton } from "@/src/components/ui/DoodleAddButton";
import { DoodleCloseButton } from "@/src/components/ui/DoodleCloseButton";
import { DoodleOutline } from "@/src/components/ui/DoodleOutline";
import { OxInput } from "@/src/components/ui/OxInput";
import { OxModal } from "@/src/components/ui/OxModal";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { space } from "@/src/constants/spacing";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { focusInputAfter, focusInputSoon } from "@/src/components/auth/profileFieldFocus";
import { OXFORD_COLLEGES } from "@/src/lib/data/colleges";
import { useMemo, useRef, useState } from "react";
import {
  InputAccessoryView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type RefObject,
  type TextInputKeyPressEventData,
} from "react-native";

const YEAR_ACCESSORY_ID = "signup-profile-year-next";
const PHONE_ACCESSORY_ID = "signup-profile-phone-next";

export const ROLE_OPTIONS = ["Undergrad", "Masters", "DPhil"] as const;
export const MAX_INTEREST_LENGTH = 40;

export function normalizeInterest(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, MAX_INTEREST_LENGTH);
}

export function useCollegeOptions(college: string) {
  return useMemo(() => {
    const c = college.trim();
    if (c && !(OXFORD_COLLEGES as readonly string[]).includes(c)) {
      return [c, ...OXFORD_COLLEGES];
    }
    return [...OXFORD_COLLEGES];
  }, [college]);
}

export function useRoleOptions(role: string) {
  return useMemo(() => {
    const trimmed = role.trim();
    if (
      trimmed &&
      !ROLE_OPTIONS.includes(trimmed as (typeof ROLE_OPTIONS)[number])
    ) {
      return [trimmed, ...ROLE_OPTIONS];
    }
    return [...ROLE_OPTIONS];
  }, [role]);
}

export function FieldLabel({ children }: { children: string }) {
  const { colors } = useOxTheme();
  return (
    <Text
      style={[
        profileFieldStyles.label,
        { color: colors.inkMuted, fontFamily: FONT_DISPLAY },
      ]}
    >
      {children}
    </Text>
  );
}

export function PickerField({
  label,
  value,
  placeholder,
  onPress,
  seed,
}: {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
  seed: number;
}) {
  const { colors } = useOxTheme();
  return (
    <>
      <FieldLabel>{label}</FieldLabel>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <DoodleOutline
          seed={seed}
          fill={colors.paper}
          stroke={colors.ink}
          contentStyle={profileFieldStyles.pickerInner}
        >
          <Text
            style={{
              color: value ? colors.ink : colors.inkSoft,
              fontFamily: FONT_DISPLAY,
              fontSize: 17,
            }}
            numberOfLines={1}
          >
            {value || placeholder}
          </Text>
        </DoodleOutline>
      </Pressable>
    </>
  );
}

function FieldAccessory({
  nativeID,
  onNext,
}: {
  nativeID: string;
  onNext: () => void;
}) {
  const { colors } = useOxTheme();
  if (Platform.OS !== "ios") return null;
  return (
    <InputAccessoryView nativeID={nativeID}>
      <View
        style={[
          profileFieldStyles.accessoryBar,
          { borderTopColor: colors.inkSoft, backgroundColor: colors.paper },
        ]}
      >
        <Pressable
          onPress={onNext}
          style={profileFieldStyles.accessoryBtn}
          accessibilityRole="button"
          accessibilityLabel="Next field"
        >
          <Text
            style={{
              color: colors.accent,
              fontFamily: FONT_DISPLAY,
              fontSize: 17,
            }}
          >
            Next
          </Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

type CollegePickerModalProps = {
  visible: boolean;
  onClose: () => void;
  value: string;
  onChange: (college: string) => void;
  searchSeed?: number;
  onAfterSelect?: () => void;
};

export function CollegePickerModal({
  visible,
  onClose,
  value,
  onChange,
  searchSeed = 11,
  onAfterSelect,
}: CollegePickerModalProps) {
  const { colors } = useOxTheme();
  const [collegeSearch, setCollegeSearch] = useState("");
  const collegeOptions = useCollegeOptions(value);

  const filteredColleges = useMemo(() => {
    const q = collegeSearch.trim().toLowerCase();
    if (!q) return collegeOptions;
    return collegeOptions.filter((c) => c.toLowerCase().includes(q));
  }, [collegeOptions, collegeSearch]);

  function handleClose() {
    setCollegeSearch("");
    onClose();
  }

  return (
    <OxModal
      visible={visible}
      onClose={handleClose}
      title="Choose college"
      scrollable={false}
    >
      <OxInput
        placeholder="Search colleges"
        value={collegeSearch}
        onChangeText={setCollegeSearch}
        autoCapitalize="words"
        seed={searchSeed}
      />
      <ScrollView style={{ maxHeight: 360, marginTop: space[3] }}>
        {filteredColleges.map((c) => (
          <Pressable
            key={c}
            onPress={() => {
              onChange(c);
              handleClose();
              onAfterSelect?.();
            }}
            style={({ pressed }) => [
              profileFieldStyles.modalOption,
              {
                backgroundColor:
                  c === value
                    ? colors.ink
                    : pressed
                      ? colors.paper
                      : "transparent",
              },
            ]}
          >
            <Text
              style={{
                color: c === value ? colors.bg : colors.ink,
                fontFamily: FONT_DISPLAY,
                fontSize: 16,
              }}
            >
              {c}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </OxModal>
  );
}

type RolePickerModalProps = {
  visible: boolean;
  onClose: () => void;
  value: string;
  onChange: (role: string) => void;
  onAfterSelect?: () => void;
};

export function RolePickerModal({
  visible,
  onClose,
  value,
  onChange,
  onAfterSelect,
}: RolePickerModalProps) {
  const { colors } = useOxTheme();
  const roleOptions = useRoleOptions(value);

  return (
    <OxModal
      visible={visible}
      onClose={onClose}
      title="Choose role"
      scrollable={false}
    >
      {roleOptions.map((option) => (
        <Pressable
          key={option}
          onPress={() => {
            onChange(option);
            onClose();
            onAfterSelect?.();
          }}
          style={({ pressed }) => [
            profileFieldStyles.modalOption,
            {
              backgroundColor:
                option === value
                  ? colors.ink
                  : pressed
                    ? colors.paper
                    : "transparent",
            },
          ]}
        >
          <Text
            style={{
              color: option === value ? colors.bg : colors.ink,
              fontFamily: FONT_DISPLAY,
              fontSize: 16,
            }}
          >
            {option}
          </Text>
        </Pressable>
      ))}
    </OxModal>
  );
}

type InterestsEditorProps = {
  interests: string[];
  onInterestsChange: (interests: string[]) => void;
  /** DoodleOutline seed for the interests container. */
  boxSeed?: number;
  /** OxInput seed for the interest text field. */
  inputSeed?: number;
  /** DoodleAddButton seed. */
  addButtonSeed?: number;
  fill?: "bg" | "paper";
  showLabel?: boolean;
  /** Parent can focus this field after the previous input (e.g. phone). */
  inputRef?: RefObject<TextInput | null>;
};

function refocusInterestInput(ref: RefObject<TextInput | null>) {
  focusInputSoon(ref);
}

export function InterestsEditor({
  interests,
  onInterestsChange,
  boxSeed = 9,
  inputSeed = 10,
  addButtonSeed = 24,
  fill = "bg",
  showLabel = true,
  inputRef: inputRefProp,
}: InterestsEditorProps) {
  const { colors } = useOxTheme();
  const [interestInput, setInterestInput] = useState("");
  const localInputRef = useRef<TextInput>(null);
  const inputRef = inputRefProp ?? localInputRef;

  function addInterest(raw: string) {
    const next = normalizeInterest(raw);
    if (!next) return;
    if (
      interests.some(
        (interest) => interest.toLowerCase() === next.toLowerCase(),
      )
    ) {
      refocusInterestInput(inputRef);
      return;
    }
    onInterestsChange([...interests, next]);
    setInterestInput("");
    refocusInterestInput(inputRef);
  }

  function removeInterest(index: number) {
    onInterestsChange(interests.filter((_, i) => i !== index));
    refocusInterestInput(inputRef);
  }

  function onInterestKeyPress(
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ) {
    if (e.nativeEvent.key !== "Enter") return;
    addInterest(interestInput);
  }

  return (
    <>
      {showLabel ? <FieldLabel>Interests</FieldLabel> : null}
      <DoodleOutline
        seed={boxSeed}
        fill={fill === "paper" ? colors.paper : colors.bg}
        stroke={colors.ink}
        dashed={false}
        contentStyle={profileFieldStyles.interestsBox}
      >
        {interests.length > 0 ? (
          <View style={profileFieldStyles.interestChips}>
            {interests.map((interest, index) => (
              <View
                key={`${interest}-${index}`}
                style={[
                  profileFieldStyles.interestTag,
                  {
                    borderColor: colors.ink,
                    backgroundColor: colors.paper,
                  },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    color: colors.ink,
                    fontFamily: FONT_DISPLAY,
                    fontSize: 14,
                    flexShrink: 1,
                  }}
                >
                  {interest}
                </Text>
                <DoodleCloseButton
                  variant="iconOnly"
                  onPress={() => removeInterest(index)}
                  accessibilityLabel={`Remove ${interest}`}
                  seed={index + 20}
                  size={18}
                />
              </View>
            ))}
          </View>
        ) : null}
        <View style={profileFieldStyles.interestInputRow}>
          <View style={profileFieldStyles.interestInputFlex}>
            <OxInput
              ref={inputRef}
              bare
              placeholder="Type an interest…"
              value={interestInput}
              onChangeText={(t) =>
                setInterestInput(t.slice(0, MAX_INTEREST_LENGTH))
              }
              onKeyPress={onInterestKeyPress}
              maxLength={MAX_INTEREST_LENGTH}
              returnKeyType="done"
              blurOnSubmit={false}
              onSubmitEditing={() => addInterest(interestInput)}
              seed={inputSeed}
            />
          </View>
          <View style={profileFieldStyles.addInterestWrap}>
            <DoodleAddButton
              seed={addButtonSeed}
              size={32}
              accessibilityLabel="Add interest"
              disabled={!normalizeInterest(interestInput)}
              onPress={() => addInterest(interestInput)}
            />
          </View>
        </View>
      </DoodleOutline>
    </>
  );
}

export type SignupProfileFormValues = {
  name: string;
  college: string;
  year: string;
  role: string;
  interests: string[];
  whatsappPhone: string;
  instagramHandle: string;
};

type SignupProfileFormProps = {
  values: SignupProfileFormValues;
  onChange: <K extends keyof SignupProfileFormValues>(
    key: K,
    value: SignupProfileFormValues[K],
  ) => void;
  /** Base seed offset for doodle inputs (login vs profile editor). */
  seedOffset?: number;
};

export function SignupProfileForm({
  values,
  onChange,
  seedOffset = 0,
}: SignupProfileFormProps) {
  const s = (n: number) => seedOffset + n;
  const [collegeModalOpen, setCollegeModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);

  const nameRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);
  const instagramRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const interestsRef = useRef<TextInput>(null);

  function openCollegePicker() {
    setRoleModalOpen(false);
    setCollegeModalOpen(true);
  }

  function openRolePicker() {
    setCollegeModalOpen(false);
    setRoleModalOpen(true);
  }

  function advanceFromName() {
    nameRef.current?.blur();
    openCollegePicker();
  }

  function advanceFromYear() {
    yearRef.current?.blur();
    openRolePicker();
  }

  function advanceFromInstagram() {
    focusInputSoon(phoneRef);
  }

  function advanceFromPhone() {
    focusInputSoon(interestsRef);
  }

  function afterCollegeSelected() {
    focusInputAfter(yearRef, 500);
  }

  function afterRoleSelected() {
    focusInputAfter(instagramRef, 500);
  }

  return (
    <>
      <View style={profileFieldStyles.fields}>
        <View style={profileFieldStyles.field}>
          <FieldLabel>Name</FieldLabel>
          <OxInput
            ref={nameRef}
            placeholder="Ada Lovelace"
            value={values.name}
            onChangeText={(v) => onChange("name", v)}
            autoComplete="name"
            autoFocus
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={advanceFromName}
            seed={s(1)}
          />
        </View>

        <View style={profileFieldStyles.row}>
          <View style={[profileFieldStyles.field, profileFieldStyles.collegeCol]}>
            <PickerField
              label="College"
              value={values.college}
              placeholder="Choose college"
              onPress={openCollegePicker}
              seed={s(2)}
            />
          </View>
          <View style={[profileFieldStyles.field, profileFieldStyles.yearCol]}>
            <FieldLabel>Year</FieldLabel>
            <OxInput
              ref={yearRef}
              placeholder="2"
              value={values.year}
              onChangeText={(t) =>
                onChange("year", t.replace(/\D/g, "").slice(0, 2))
              }
              keyboardType={
                Platform.OS === "ios" ? "number-pad" : "numeric"
              }
              inputAccessoryViewID={
                Platform.OS === "ios" ? YEAR_ACCESSORY_ID : undefined
              }
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={advanceFromYear}
              seed={s(3)}
            />
          </View>
        </View>

        <View style={profileFieldStyles.row}>
          <View style={[profileFieldStyles.field, profileFieldStyles.halfCol]}>
            <PickerField
              label="Role"
              value={values.role}
              placeholder="Choose role"
              onPress={openRolePicker}
              seed={s(4)}
            />
          </View>
          <View style={[profileFieldStyles.field, profileFieldStyles.halfCol]}>
            <FieldLabel>Instagram (optional)</FieldLabel>
            <OxInput
              ref={instagramRef}
              placeholder="your_handle"
              value={values.instagramHandle}
              onChangeText={(v) => onChange("instagramHandle", v)}
              autoCapitalize="none"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={advanceFromInstagram}
              seed={s(5)}
            />
          </View>
        </View>

        <View style={profileFieldStyles.field}>
          <FieldLabel>Phone number</FieldLabel>
          <OxInput
            ref={phoneRef}
            placeholder="+44 7..."
            value={values.whatsappPhone}
            onChangeText={(v) => onChange("whatsappPhone", v)}
            keyboardType={Platform.OS === "ios" ? "phone-pad" : "numeric"}
            inputAccessoryViewID={
              Platform.OS === "ios" ? PHONE_ACCESSORY_ID : undefined
            }
            textContentType="telephoneNumber"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={advanceFromPhone}
            seed={s(6)}
          />
        </View>

        <InterestsEditor
          interests={values.interests}
          onInterestsChange={(v) => onChange("interests", v)}
          boxSeed={s(9)}
          inputSeed={s(10)}
          addButtonSeed={s(24)}
          inputRef={interestsRef}
        />
      </View>

      <CollegePickerModal
        visible={collegeModalOpen}
        onClose={() => setCollegeModalOpen(false)}
        value={values.college}
        onChange={(v) => onChange("college", v)}
        searchSeed={s(11)}
        onAfterSelect={afterCollegeSelected}
      />
      <RolePickerModal
        visible={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        value={values.role}
        onChange={(v) => onChange("role", v)}
        onAfterSelect={afterRoleSelected}
      />

      <FieldAccessory nativeID={YEAR_ACCESSORY_ID} onNext={advanceFromYear} />
      <FieldAccessory nativeID={PHONE_ACCESSORY_ID} onNext={advanceFromPhone} />
    </>
  );
}

export const profileFieldStyles = StyleSheet.create({
  fields: {
    gap: space[4],
  },
  field: {
    gap: space[2],
  },
  label: {
    fontSize: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space[3],
  },
  collegeCol: {
    flex: 2,
  },
  yearCol: {
    flex: 1,
  },
  halfCol: {
    flex: 1,
    minWidth: 0,
  },
  pickerInner: {
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    minHeight: 48,
    justifyContent: "center",
  },
  accessoryBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
  },
  accessoryBtn: {
    paddingHorizontal: space[2],
    paddingVertical: space[1],
  },
  interestsBox: {
    padding: space[3],
  },
  interestChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: space[2],
    gap: space[1],
  },
  interestTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: space[3],
    paddingVertical: space[1],
    maxWidth: "100%",
  },
  interestInputRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    gap: space[2],
  },
  interestInputFlex: {
    flex: 1,
    minWidth: 0,
  },
  addInterestWrap: {
    flexShrink: 0,
  },
  modalOption: {
    paddingVertical: space[3],
    paddingHorizontal: space[2],
    borderRadius: space[2],
    marginBottom: space[1],
  },
});
