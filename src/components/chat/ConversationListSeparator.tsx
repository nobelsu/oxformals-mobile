import { DoodleDivider } from "@/src/components/ui/DoodleDivider";
import { SCREEN_PADDING } from "@/src/constants/layout";
import { CONVERSATION_ROW_TEXT_INSET } from "@/src/components/chat/ConversationListRow";
import { StyleSheet, View } from "react-native";

type Props = {
  seed: number;
};

export function ConversationListSeparator({ seed }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.inset}>
        <DoodleDivider seed={seed} marginVertical={0} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: SCREEN_PADDING,
  },
  inset: {
    marginLeft: CONVERSATION_ROW_TEXT_INSET,
  },
});
