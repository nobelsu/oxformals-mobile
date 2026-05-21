import Svg, { Path } from "react-native-svg";

const CALENDAR_PATH =
  "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z";

type Props = {
  size?: number;
  color: string;
};

/** Matches oxformals web BrowseTab calendar icon (Lucide-style outline). */
export function CalendarIcon({ size = 20, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={CALENDAR_PATH}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
