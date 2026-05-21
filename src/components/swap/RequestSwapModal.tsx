import { OxButton } from "@/src/components/ui/OxButton";
import { OxInput } from "@/src/components/ui/OxInput";
import { OxModal } from "@/src/components/ui/OxModal";
import { OxText } from "@/src/components/ui/OxText";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { formatListingDate } from "@/src/lib/data/format";
import type { Listing } from "@/src/lib/data/types";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet } from "react-native";

type Props = {
  visible: boolean;
  target: Listing | null;
  myListings: Listing[];
  onClose: () => void;
  onSend: (offeringListingId: string, message: string) => Promise<void>;
};

export function RequestSwapModal({
  visible,
  target,
  myListings,
  onClose,
  onSend,
}: Props) {
  const { colors } = useOxTheme();
  const [offeringId, setOfferingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sheetVisible = visible && !!target;

  useEffect(() => {
    if (sheetVisible) {
      setOfferingId(null);
      setMessage("");
      setError(null);
      setLoading(false);
    }
  }, [sheetVisible, target?.id]);

  return (
    <OxModal visible={sheetVisible} onClose={onClose} title="Request swap">
      {target ? (
        <>
          <OxText style={[styles.meta, { color: colors.inkMuted }]}>
            Target: {target.college} · {formatListingDate(target.dateTime)}
          </OxText>
          <OxText style={[styles.sectionLabel, { color: colors.ink }]}>
            Your offering listing
          </OxText>
          {myListings.map((l) => (
            <Pressable
              key={l.id}
              onPress={() => setOfferingId(l.id)}
              style={{
                padding: 12,
                marginBottom: 8,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: offeringId === l.id ? colors.accent : colors.ink,
                backgroundColor: offeringId === l.id ? colors.accent : colors.bg,
              }}
            >
              <OxText style={{ color: colors.ink }}>
                {l.college} · {formatListingDate(l.dateTime)}
              </OxText>
            </Pressable>
          ))}
          <OxInput
            placeholder="Message (optional)"
            value={message}
            onChangeText={setMessage}
            multiline
            wrapperStyle={{ marginTop: 12, borderRadius: 16, minHeight: 80 }}
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
              if (!offeringId) {
                setError("Select a listing to offer.");
                return;
              }
              setLoading(true);
              setError(null);
              try {
                await onSend(offeringId, message);
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
  sectionLabel: {
    marginBottom: 8,
    fontSize: 16,
    lineHeight: 22,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  error: {
    fontSize: 14,
    lineHeight: 18,
    marginTop: 8,
  },
});
