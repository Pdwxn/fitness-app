import { useTranslations } from "next-intl";

import { useOnboardingStore } from "@/store/onboardingStore";

export function Step4Health() {
  const t = useTranslations("Onboarding.form.health");
  const injuries = useOnboardingStore((state) => state.data.health.injuries);
  const updateHealth = useOnboardingStore((state) => state.updateHealth);

  function updateInjury(index: number, field: "area" | "description", value: string) {
    updateHealth({
      injuries: injuries.map((injury, itemIndex) =>
        itemIndex === index ? { ...injury, [field]: value } : injury,
      ),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[#5c5349]">{t("hint")}</p>
      {injuries.map((injury, index) => (
        <div key={index} className="rounded-3xl border border-[#ded2bf] bg-white p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={injury.area}
              onChange={(event) => updateInjury(index, "area", event.target.value)}
              className="rounded-2xl border border-[#ded2bf] px-4 py-3 outline-none focus:border-[#8b5e34]"
              placeholder={t("areaPlaceholder")}
            />
            <input
              value={injury.description}
              onChange={(event) => updateInjury(index, "description", event.target.value)}
              className="rounded-2xl border border-[#ded2bf] px-4 py-3 outline-none focus:border-[#8b5e34]"
              placeholder={t("descriptionPlaceholder")}
            />
          </div>
          <button
            type="button"
            onClick={() => updateHealth({ injuries: injuries.filter((_, itemIndex) => itemIndex !== index) })}
            className="mt-3 text-sm font-bold text-[#8b5e34]"
          >
            {t("remove")}
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => updateHealth({ injuries: [...injuries, { area: "", description: "" }] })}
        className="rounded-full border border-[#17130f] px-5 py-3 text-sm font-bold"
      >
        {t("add")}
      </button>
    </div>
  );
}
