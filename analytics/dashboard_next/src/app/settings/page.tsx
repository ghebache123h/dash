import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPricing, updatePricing } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const pricing = await getPricing();

  async function savePricing(formData: FormData) {
    "use server";
    const input = Number(formData.get("inputPrice") || 0);
    const output = Number(formData.get("outputPrice") || 0);
    await updatePricing(input, output);
    revalidatePath("/");
    revalidatePath("/crm");
    revalidatePath("/settings");
    redirect("/");
  }

  return (
    <div style={{ maxWidth: "780px", margin: "0 auto" }}>
      <header style={{ marginBottom: "20px" }}>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: "var(--text-highlight)",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Pricing Settings
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "6px" }}>
          Set token pricing per 1M tokens used by dashboard cost calculations
        </p>
      </header>

      <div className="glass-card" style={{ padding: "26px" }}>
        <form action={savePricing} style={{ display: "grid", gap: "16px" }}>
          <div>
            <label className="small-label">Input price per 1M tokens</label>
            <input
              type="number"
              step="0.000001"
              min="0"
              name="inputPrice"
              className="input-dark"
              defaultValue={pricing.input_price_per_million}
              required
            />
          </div>
          <div>
            <label className="small-label">Output price per 1M tokens</label>
            <input
              type="number"
              step="0.000001"
              min="0"
              name="outputPrice"
              className="input-dark"
              defaultValue={pricing.output_price_per_million}
              required
            />
          </div>
          <button type="submit" className="btn-primary" style={{ justifyContent: "center", marginTop: "6px" }}>
            Save Pricing
          </button>
        </form>
      </div>
    </div>
  );
}
