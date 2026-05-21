import { OxButton } from "@/src/components/ui/OxButton";
import { OxInput } from "@/src/components/ui/OxInput";
import { OxModal } from "@/src/components/ui/OxModal";
import { OxText } from "@/src/components/ui/OxText";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { formatListingDate, formatPrice } from "@/src/lib/data/format";
import type { Listing } from "@/src/lib/data/types";
import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";

type Props = {
  visible: boolean;
  target: Listing | null;
  onClose: () => void;
  onSend: (message: string) => Promise<void>;
};

export function RequestPayModal({ visible, target, onClose, onSend }: Props) {
  const { colors } = useOxTheme();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sheetVisible = visible && !!target;

  useEffect(() => {
    if (sheetVisible) {
      setMessage("");
      setError(null);
      setLoading(false);
    }
  }, [sheetVisible, target?.id]);

  return (
    <OxModal
      visible={sheetVisible}
      onClose={onClose}
      title="Request to join"
      scrollable={false}
    >
      {target ? (
        <>
          <OxText style={[styles.meta, { color: colors.inkMuted }]}>
            {target.college} · {formatListingDate(target.dateTime)}
            {target.price !== undefined ? ` · ${formatPrice(target.price)}` : ""}
          </OxText>
          <OxInput
            placeholder="Message (optional)"
            value={message}
            onChangeText={setMessage}
            multiline
            wrapperStyle={{ borderRadius: 16, minHeight: 80 }}
          />
          {error ? (
            <OxText style={[styles.error, { color: colors.danger }]}>
              {error}
            </OxText>
          ) : null}
          <OxButton
            title="Send request"
            loading={loading}
            style={{ marginTop: 16 }}
            onPress={async () => {
              setLoading(true);
              setError(null);
              try {
                await onSend(message);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not send.");
              } finally {
                setLoading(false);
              }
            }}
          />
        </>
      ) : null}
    </OxModal>
  );
}

const styles = StyleSheet.create({
  meta: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 12,
  },
  error: {
    fontSize: 14,
    lineHeight: 18,
    marginTop: 8,
  },
});
