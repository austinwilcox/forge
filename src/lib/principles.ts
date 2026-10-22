import { dayOfYear, type ISODate } from "./dates";

export interface Quote {
	text: string;
	source: string;
}

/**
 * Short daily orders. Lines from the three source books are kept brief and
 * attributed; the rest are public-domain Stoics those books draw from.
 */
export const QUOTES: Quote[] = [
	{ text: "Discipline equals freedom.", source: "Jocko Willink" },
	{ text: "Good.", source: "Jocko Willink — the answer to every setback" },
	{
		text: "There are no bad teams, only bad leaders.",
		source: "Extreme Ownership",
	},
	{ text: "Default: aggressive.", source: "Jocko Willink" },
	{ text: "Prioritize and execute.", source: "Extreme Ownership" },
	{
		text: "It's not what you preach, it's what you tolerate.",
		source: "Extreme Ownership",
	},
	{ text: "Discipline is destiny.", source: "Ryan Holiday" },
	{
		text: "Every action you take is a vote for the type of person you wish to become.",
		source: "James Clear, Atomic Habits",
	},
	{
		text: "You do not rise to the level of your goals. You fall to the level of your systems.",
		source: "James Clear, Atomic Habits",
	},
	{ text: "Never miss twice.", source: "James Clear, Atomic Habits" },
	{
		text: "Make it obvious. Make it attractive. Make it easy. Make it satisfying.",
		source: "James Clear, Atomic Habits",
	},
	{
		text: "Waste no more time arguing what a good man should be. Be one.",
		source: "Marcus Aurelius",
	},
	{ text: "No man is free who is not master of himself.", source: "Epictetus" },
	{
		text: "We suffer more often in imagination than in reality.",
		source: "Seneca",
	},
	{
		text: "The impediment to action advances action. What stands in the way becomes the way.",
		source: "Marcus Aurelius",
	},
	{
		text: "First say to yourself what you would be; and then do what you have to do.",
		source: "Epictetus",
	},
	{
		text: "He who conquers himself is the mightiest warrior.",
		source: "Confucius",
	},
	{
		text: "Most powerful is he who has himself in his own power.",
		source: "Seneca",
	},
	{
		text: "At dawn, when you have trouble getting out of bed, tell yourself: I have to go to work — as a human being.",
		source: "Marcus Aurelius",
	},
	{ text: "Don't explain your philosophy. Embody it.", source: "Epictetus" },
	{ text: "Begin at once to live.", source: "Seneca" },
	{
		text: "If it is not right, do not do it; if it is not true, do not say it.",
		source: "Marcus Aurelius",
	},
];

export function quoteFor(date: ISODate): Quote {
	return QUOTES[dayOfYear(date) % QUOTES.length];
}

export interface ManualSection {
	id: string;
	title: string;
	source: string;
	summary: string;
	tenets: { title: string; body: string; inApp: string }[];
}

export const FIELD_MANUAL: ManualSection[] = [
	{
		id: "ownership",
		title: "Extreme Ownership",
		source:
			"Jocko Willink & Leif Babin — Extreme Ownership, Discipline Equals Freedom",
		summary:
			"You own everything in your world. No excuses, no blame. When something goes wrong you don't look outward — you ask what you could have done differently and you fix it.",
		tenets: [
			{
				title: "Own it all",
				body: "A missed day is not the calendar's fault, your boss's fault or your kids' fault. It's yours — and that is good news, because what you own you can fix.",
				inApp:
					"The evening Debrief has an Ownership field. Write what you own, not why it happened.",
			},
			{
				title: "Discipline equals freedom",
				body: "The discipline to wake early, train and do the work buys freedom: more time, better health, fewer emergencies.",
				inApp:
					"Your Daily Score is the scoreboard of how disciplined today was. Freedom is what it buys.",
			},
			{
				title: "Prioritize and execute",
				body: "When everything is on fire, pick the single highest priority, put everything into it, then move to the next.",
				inApp:
					"Each morning set today's Mission — the one thing that must happen.",
			},
			{
				title: "Good.",
				body: "Setback? Good. Now you get to adapt, learn and get stronger. The response to adversity is to move forward.",
				inApp:
					"Missed reps show a 'Good.' prompt instead of guilt — reset and attack the next rep.",
			},
			{
				title: "Debrief every operation",
				body: "After-action reviews strip away ego: what went right, what went wrong, what will we do differently.",
				inApp:
					"The Debrief page is a daily after-action review with a discipline rating.",
			},
		],
	},
	{
		id: "destiny",
		title: "Discipline is Destiny",
		source: "Ryan Holiday — Discipline Is Destiny: The Power of Self-Control",
		summary:
			"Temperance — self-command — is the virtue that makes the other virtues possible. It is practiced on three levels: the body, the mind and the soul you show to others.",
		tenets: [
			{
				title: "The exterior: master the body",
				body: "Get up early. Train. Eat and drink with moderation. Rest deliberately. Comfort is the enemy of strength.",
				inApp:
					"The Body pillar groups physical habits so you can see the exterior at a glance.",
			},
			{
				title: "The interior: govern the mind",
				body: "Focus deeply, slow down, manage your temper, do the work you said you'd do even when you don't feel like it.",
				inApp:
					"The Mind and Craft pillars track focus, study and deliberate practice.",
			},
			{
				title: "The superior: elevate others",
				body: "The highest discipline is being tolerant with others and strict with yourself — leading by example rather than by command.",
				inApp:
					"The Character pillar holds habits of service, honesty and restraint.",
			},
			{
				title: "Do the hard thing first",
				body: "Discipline is choosing the hard thing over the easy thing, every day, especially when no one is watching.",
				inApp: "Order habits so the hardest ones sit at the top of Today.",
			},
		],
	},
	{
		id: "atomic",
		title: "Atomic Habits",
		source: "James Clear — Atomic Habits",
		summary:
			"Small habits compound into remarkable results. Focus on systems instead of goals, and on who you want to become rather than what you want to achieve.",
		tenets: [
			{
				title: "Identity-based habits",
				body: "Every action is a vote for the person you want to become. Decide the identity first, then prove it with small wins.",
				inApp:
					"Every habit carries an identity statement: 'I am someone who…'.",
			},
			{
				title: "Make it obvious",
				body: "Implementation intentions (I will [behavior] at [time] in [location]) and habit stacking (after [current habit], I will [new habit]) make cues unmissable.",
				inApp:
					"Habits have a time, a location and a stack anchor shown on every card.",
			},
			{
				title: "Make it easy — the two-minute rule",
				body: "Scale any habit down until it takes two minutes. Master the art of showing up before optimizing the rep.",
				inApp:
					"Log the two-minute version on hard days. It keeps the chain alive at half credit.",
			},
			{
				title: "Make it satisfying — never miss twice",
				body: "Missing once is an accident. Missing twice is the start of a new habit. Track your streak and get back on the next day.",
				inApp:
					"Habits missed yesterday are flagged 'Never miss twice' and float to your attention.",
			},
			{
				title: "1% better every day",
				body: "Improve 1% a day for a year and you end up roughly 37 times better. Decline 1% a day and you approach zero.",
				inApp:
					"The Progress page plots your compounding curve against the ideal 1.01ⁿ line.",
			},
		],
	},
];

/** Ready-made habits for the empty state, one click to deploy. */
export const STARTER_PROTOCOL = [
	{
		name: "Wake up at 0500",
		identity: "I am someone who owns the morning.",
		pillar: "body",
		cueTime: "05:00",
		cueLocation: "Bedroom",
		stackAfter: null,
		twoMinute: "Feet on the floor when the alarm sounds",
		kind: "check",
		target: 1,
		unit: null,
		schedule: [0, 1, 2, 3, 4, 5, 6],
	},
	{
		name: "Train",
		identity: "I am an athlete.",
		pillar: "body",
		cueTime: "05:30",
		cueLocation: "Garage gym",
		stackAfter: "I make coffee",
		twoMinute: "20 push-ups",
		kind: "count",
		target: 45,
		unit: "min",
		schedule: [1, 2, 3, 4, 5, 6],
	},
	{
		name: "Read",
		identity: "I am a reader.",
		pillar: "mind",
		cueTime: "21:00",
		cueLocation: "Reading chair",
		stackAfter: "I put the phone on the charger",
		twoMinute: "Read one page",
		kind: "count",
		target: 20,
		unit: "pages",
		schedule: [0, 1, 2, 3, 4, 5, 6],
	},
	{
		name: "Deep work block",
		identity: "I am a craftsman.",
		pillar: "craft",
		cueTime: "08:00",
		cueLocation: "Desk",
		stackAfter: "I close email",
		twoMinute: "Open the project and write one line",
		kind: "count",
		target: 90,
		unit: "min",
		schedule: [1, 2, 3, 4, 5],
	},
	{
		name: "No alcohol",
		identity: "I am in command of my appetites.",
		pillar: "character",
		cueTime: null,
		cueLocation: null,
		stackAfter: null,
		twoMinute: null,
		kind: "check",
		target: 1,
		unit: null,
		schedule: [0, 1, 2, 3, 4, 5, 6],
	},
	{
		name: "Evening debrief",
		identity: "I own my results.",
		pillar: "character",
		cueTime: "21:30",
		cueLocation: "Kitchen table",
		stackAfter: "I finish reading",
		twoMinute: "Write one sentence: what I own today",
		kind: "check",
		target: 1,
		unit: null,
		schedule: [0, 1, 2, 3, 4, 5, 6],
	},
] as const;
