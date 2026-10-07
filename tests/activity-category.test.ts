import { describe, expect, it } from "vitest";
import { classifyActivity } from "../lib/planner/activity-category";

describe("Türkçe aktivite sınıflandırması", () => {
  it("kitap ve okuma ifadelerini okuma etkinliği olarak tanır", () => {
    expect(classifyActivity("Kitap okuyacağım")).toBe("reading");
  });

  it("spor, ders, toplantı ve dinlenme ifadelerini ayrı kategorilere ayırır", () => {
    expect(classifyActivity("Yürüyüşe çık")).toBe("movement");
    expect(classifyActivity("Yarın sınava çalış")).toBe("study");
    expect(classifyActivity("Proje toplantısı")).toBe("work");
    expect(classifyActivity("Kısa bir mola ver")).toBe("rest");
  });

  it("Türkçe küçük/büyük harfi doğru normalleştirir ve bilinmeyen aktiviteyi yedek kategoriye alır", () => {
    expect(classifyActivity("DOKTOR RANDEVUSU")).toBe("health");
    expect(classifyActivity("Bir şey planla")).toBe("general");
  });
});
