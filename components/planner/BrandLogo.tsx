import { Image } from "react-native";
import type { ImageSourcePropType } from "react-native";

const logoMark = require("@/assets/images/gun-akisi-logo-mark.png") as ImageSourcePropType;

type BrandLogoProps = {
  size?: number;
  label?: string;
};

export function BrandLogo({ size = 36, label = "Ritminde logosu" }: BrandLogoProps) {
  return (
    <Image
      source={logoMark}
      resizeMode="contain"
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{ width: size, height: size }}
    />
  );
}
