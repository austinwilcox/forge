import { z } from "zod";

/** Shared validation used by forms (client) and server functions (server). */

export const isoDate = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const PILLARS = ["body", "mind", "character", "craft"] as const;
export type Pillar = (typeof PILLARS)[number];

export const PILLAR_META: Record<Pillar, { label: string; blurb: string }> = {
	body: {
		label: "Body",
		blurb: "Train, sleep, eat clean. The exterior is the first battlefield.",
	},
	mind: {
		label: "Mind",
		blurb: "Read, study, reflect. Govern the interior.",
	},
	character: {
		label: "Character",
		blurb: "Temperance, honesty, service. Who you are when no one is watching.",
	},
	craft: {
		label: "Craft",
		blurb: "Deliberate practice on the skills you are building.",
	},
};

export const habitKind = z.enum(["check", "count"]);

const optionalText = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.transform((v) => (v === "" ? null : v));

export const habitInput = z
	.object({
		name: z.string().trim().min(1, "Name the habit").max(80),
		identity: optionalText(160),
		pillar: z.enum(PILLARS),
		cueTime: optionalText(40),
		cueLocation: optionalText(80),
		stackAfter: optionalText(120),
		twoMinute: optionalText(120),
		kind: habitKind,
		target: z.number().int().min(1, "Target must be at least 1").max(100_000),
		unit: optionalText(24),
		schedule: z
			.array(z.number().int().min(0).max(6))
			.min(1, "Pick at least one day")
			.max(7),
	})
	.refine((h) => h.kind === "count" || h.target === 1, {
		message: "Check habits have a target of 1",
		path: ["target"],
	});

export type HabitInput = z.input<typeof habitInput>;

export const habitUpdateInput = z.object({
	id: z.string().min(1),
	habit: habitInput,
});

export const logInput = z.object({
	habitId: z.string().min(1),
	date: isoDate,
	value: z.number().int().min(0).max(100_000),
	minimum: z.boolean().default(false),
	note: z.string().max(280).nullable().optional(),
	/** When the change was made on the device; the newest write wins on sync. */
	updatedAt: z.iso.datetime(),
});
export type LogInput = z.input<typeof logInput>;

export const debriefInput = z.object({
	date: isoDate,
	mission: optionalText(280).optional(),
	wins: optionalText(2000).optional(),
	losses: optionalText(2000).optional(),
	ownership: optionalText(2000).optional(),
	adjust: optionalText(2000).optional(),
	rating: z.number().int().min(1).max(10).nullable().optional(),
	updatedAt: z.iso.datetime(),
});
export type DebriefInput = z.input<typeof debriefInput>;

export const profileInput = z.object({
	name: optionalText(60),
	creed: optionalText(400),
});
export type Profile = { name: string | null; creed: string | null };

export type StatsRange = 30 | 90 | 365;
