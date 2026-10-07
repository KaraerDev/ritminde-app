export type ActivityCategory = "reading" | "movement" | "study" | "work" | "meal" | "rest" | "health" | "errands" | "creative" | "general";

type ActivityMetadata = { label: string; icon: "book-outline" | "walk-outline" | "school-outline" | "briefcase-outline" | "restaurant-outline" | "leaf-outline" | "medkit-outline" | "cart-outline" | "color-palette-outline" | "sparkles-outline"; background: string; color: string };

export const activityMetadata: Record<ActivityCategory, ActivityMetadata> = {
  reading: { label: "Okuma", icon: "book-outline", background: "#F2E8D7", color: "#886743" },
  movement: { label: "Hareket", icon: "walk-outline", background: "#F8E7DC", color: "#B76F4D" },
  study: { label: "Ders", icon: "school-outline", background: "#E4EAF4", color: "#526D96" },
  work: { label: "İş", icon: "briefcase-outline", background: "#E4ECE8", color: "#3E6657" },
  meal: { label: "Yemek", icon: "restaurant-outline", background: "#F6EBDD", color: "#9B7451" },
  rest: { label: "Dinlenme", icon: "leaf-outline", background: "#E8EEE3", color: "#647A5A" },
  health: { label: "Sağlık", icon: "medkit-outline", background: "#F4E5E3", color: "#A45D59" },
  errands: { label: "İşler", icon: "cart-outline", background: "#EDE8F2", color: "#796692" },
  creative: { label: "Üretim", icon: "color-palette-outline", background: "#F0E5EF", color: "#946A8B" },
  general: { label: "Adım", icon: "sparkles-outline", background: "#E8EEE7", color: "#52705F" },
};

const terms: [ActivityCategory, string[]][] = [
  ["reading", ["kitap", "oku", "roman", "makale", "dergi", "okuma"]],
  ["movement", ["yürüy", "spor", "koş", "egzersiz", "yoga", "pilates", "fitness", "bisiklet", "antrenman", "hareket"]],
  ["study", ["ders", "sınav", "ödev", "çalış", "tekrar", "öğren", "kurs", "konu"]],
  ["work", ["toplantı", "rapor", "sunum", "iş", "mail", "müşteri", "proje", "mesai"]],
  ["meal", ["yemek", "kahvaltı", "öğle", "akşam yeme", "atıştır", "su iç", "pişir", "mutfak"]],
  ["rest", ["mola", "dinlen", "nefes", "meditasyon", "uyku", "rahatla", "şekerleme"]],
  ["health", ["doktor", "ilaç", "muayene", "randevu", "terapi", "eczane", "sağlık"]],
  ["errands", ["alışveriş", "market", "kargo", "fatura", "temizlik", "bankaya", "postane", "tamir"]],
  ["creative", ["gitar", "çiz", "resim", "müzik", "tasarım", "yazı yaz", "fotoğraf", "el işi"]],
];

export function classifyActivity(title: string): ActivityCategory {
  const normalized = title.toLocaleLowerCase("tr-TR").normalize("NFC");
  for (const [category, words] of terms) {
    if (words.some((word) => normalized.includes(word))) return category;
  }
  return "general";
}
