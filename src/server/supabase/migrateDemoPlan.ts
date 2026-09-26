/**
 * Optional helper: maps legacy demo-json shapes → Supabase insert payloads.
 * Does NOT write to the database. Use after exporting data/localmate-db.json.
 * Mark all imported rows with is_demo: true.
 */
import type { AppState } from "@/lib/types";

export function planDemoMigration(state: AppState) {
  return {
    warning:
      "Demo IDs (maya, rahul, …) are strings, not UUIDs. Create auth.users first, then remap IDs.",
    profiles: state.users.map((u) => ({
      // id must become auth.users uuid — cannot insert string demo ids into uuid PK
      legacyId: u.id,
      full_name: u.name,
      phone: u.phone,
      email: u.email,
      preferred_language: u.language,
      city: u.city,
      area: u.area,
      role: u.role,
      phone_verified: u.phoneVerified,
      identity_verified: u.identityVerified,
      identity_review_status: u.identityReviewStatus ?? (u.identityVerified ? "cleared" : "none"),
      conduct_accepted: Boolean(u.conductAccepted),
      categories: u.categories ?? [],
      bio_en: u.bioEn,
      bio_hi: u.bioHi,
      rating: u.rating,
      tasks_completed: u.tasksCompleted,
      is_demo: true,
    })),
    tasks: state.tasks.map((t) => ({
      legacyId: t.id,
      legacyCustomerId: t.customerId,
      legacyHelperId: t.helperId,
      category: t.category,
      title: t.title,
      description: t.details,
      location_area: t.area,
      to_area: t.toArea,
      when_id: t.whenId,
      when_label: t.whenLabel,
      price_mode: t.priceMode,
      budget: t.budget,
      status: t.status,
      agreed_amount: t.agreedAmount,
      is_demo: true,
    })),
    note: "Run only against a development Supabase project. Never delete localmate-db.json until verified.",
  };
}
