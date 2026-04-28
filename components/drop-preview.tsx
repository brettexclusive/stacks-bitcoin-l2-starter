import { Sparkles } from "lucide-react";
import styles from "./drop-preview.module.css";

export function DropPreview() {
  const imageUrl = process.env.NEXT_PUBLIC_APP_IMAGE_URL;
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "sBTC Access Pass";
  const symbol = process.env.NEXT_PUBLIC_APP_SYMBOL ?? "SBTC";

  return (
    <div className={styles.preview} aria-label={`${appName} preview`}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" />
      ) : (
        <div className={styles.generatedArt}>
          <Sparkles size={48} aria-hidden />
        </div>
      )}
      <div className={styles.previewMeta}>
        <span>{symbol}</span>
        <strong>{appName}</strong>
      </div>
    </div>
  );
}
