import { chatText } from "@/src/components/chat/chatText";
import { Avatar } from "@/src/components/ui/Avatar";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import type { GroupMemberPreview } from "@/src/lib/chat/types";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  members: GroupMemberPreview[];
  memberCount: number;
  size?: number;
};

type SlotLayout = {
  avatarSize: number;
  positions: Array<{ left: number; top: number; zIndex: number }>;
};

/** Diagonal / triangular overlap (iMessage-style), not side-by-side. */
function slotLayout(slotCount: number, size: number): SlotLayout {
  if (slotCount <= 1) {
    return {
      avatarSize: size,
      positions: [{ left: 0, top: 0, zIndex: 1 }],
    };
  }

  if (slotCount === 2) {
    const avatarSize = Math.max(20, Math.round(size * 0.62));
    return {
      avatarSize,
      positions: [
        { left: 0, top: 0, zIndex: 2 },
        { left: size - avatarSize, top: size - avatarSize, zIndex: 1 },
      ],
    };
  }

  if (slotCount === 3) {
    const avatarSize = Math.max(18, Math.round(size * 0.5));
    const bottom = size - avatarSize;
    const center = (size - avatarSize) / 2;
    return {
      avatarSize,
      positions: [
        { left: 0, top: 0, zIndex: 3 },
        { left: size - avatarSize, top: 0, zIndex: 2 },
        { left: center, top: bottom, zIndex: 1 },
      ],
    };
  }

  const avatarSize = Math.max(16, Math.round(size * 0.44));
  const inset = size - avatarSize;
  return {
    avatarSize,
    positions: [
      { left: 0, top: 0, zIndex: 4 },
      { left: inset, top: 0, zIndex: 3 },
      { left: 0, top: inset, zIndex: 2 },
      { left: inset, top: inset, zIndex: 1 },
    ],
  };
}

/** Overlapping avatars for group chats (others only, max 3 shown). */
export function GroupAvatarStack({ members, memberCount, size = 44 }: Props) {
  const { colors } = useOxTheme();
  const overflow = Math.max(0, memberCount - 1 - members.length);
  const slotCount = members.length + (overflow > 0 ? 1 : 0);
  const { avatarSize, positions } = slotLayout(slotCount, size);

  if (members.length === 0) {
    return (
      <View style={{ width: size, height: size }}>
        <Avatar name="Group" size={size} />
      </View>
    );
  }

  if (members.length === 1 && overflow === 0) {
    const m = members[0];
    return (
      <View style={{ width: size, height: size }}>
        <Avatar name={m.name} avatar={m.avatar} size={size} />
      </View>
    );
  }

  const slots: Array<
    | { kind: "member"; member: GroupMemberPreview }
    | { kind: "overflow"; count: number }
  > = members.map((member) => ({ kind: "member", member }));
  if (overflow > 0) {
    slots.push({ kind: "overflow", count: overflow });
  }

  return (
    <View style={[styles.stack, { width: size, height: size }]}>
      {slots.map((slot, index) => {
        const pos = positions[index] ?? positions[positions.length - 1];
        const wrapStyle = {
          width: avatarSize,
          height: avatarSize,
          left: pos.left,
          top: pos.top,
          zIndex: pos.zIndex,
          borderColor: colors.ink,
          backgroundColor: colors.paper,
        };

        if (slot.kind === "overflow") {
          return (
            <View key="overflow" style={[styles.avatarWrap, wrapStyle]}>
              <Text
                style={[
                  chatText,
                  { color: colors.ink, fontSize: Math.max(10, avatarSize * 0.28) },
                ]}
              >
                +{slot.count}
              </Text>
            </View>
          );
        }

        const m = slot.member;
        return (
          <View key={m.id} style={[styles.avatarWrap, wrapStyle]}>
            <Avatar name={m.name} avatar={m.avatar} size={avatarSize} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    position: "relative",
    flexShrink: 0,
  },
  avatarWrap: {
    position: "absolute",
    borderWidth: 2,
    borderRadius: 999,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
});
