import { NewChatPicker } from "@/src/components/chat/NewChatPicker";
import { Stack } from "expo-router";

export default function NewChatScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "New chat" }} />
      <NewChatPicker />
    </>
  );
}
