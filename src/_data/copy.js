// Every user-facing string on aineara.com, keyed by id (plan Shared
// Definitions §10). Most entries were checked claim by claim against the
// Ascend code on 2026-09-30: publish them verbatim, never paraphrase them,
// and never add claims. Straight apostrophes; "…" is U+2026 and "—" is
// U+2014. tests/copy.test.js maps every id to the page that shows it.
export default {
  // Nav, footer and accessibility labels (every page)
  "nav.apps": "Apps",
  "nav.about": "About",
  "nav.cta": "Get Ascend",
  "a11y.nav.main": "Main",
  "a11y.nav.footer": "Footer",
  "a11y.skip": "Skip to content",
  "a11y.menu": "Menu",
  "a11y.theme.toLight": "Switch to light theme",
  "a11y.theme.toDark": "Switch to dark theme",
  "a11y.rail": "Ascend screenshots",
  "footer.copy": "© Aineara LLC",
  "footer.privacy": "Privacy",
  "footer.terms": "Terms",
  "footer.support": "Support",

  // Page titles
  "title.home": "Aineara — Apps built with intention",
  "title.ascend": "Ascend — Train smarter. Eat better. Go further.",
  "title.sillage": "Sillage — Aineara",
  "title.privacy": "Privacy Policy — Aineara",
  "title.terms": "Terms of Service — Aineara",
  "title.support": "Support — Aineara",

  // Meta descriptions
  "meta.home.description": "Aineara is a software studio in New York making iPhone apps. Ascend, for training and nutrition, launches first.",
  "meta.home.description.live": "Aineara is a software studio in New York making iPhone apps. Ascend, for training and nutrition, is on the App Store.",
  "meta.ascend.description.waitlist": "Ascend is an iPhone app for training and nutrition, from Aineara. Join the waitlist.",
  "meta.ascend.description.live": "Ascend is an iPhone app for training and nutrition, from Aineara. Download it on the App Store.",
  "meta.sillage.description": "Sillage is an app for fragrance collectors, in development at Aineara. Join the waitlist.",
  "meta.privacy.description": "How Aineara LLC collects, uses and protects personal information in Ascend, on aineara.com and on our waitlists.",
  "meta.terms.description": "Terms of Service — Aineara",
  "meta.support.description": "Help with Ascend: contact support, subscriptions, your data, privacy settings and safety.",
  "meta.404.description": "Page not found — Aineara.",

  // Link-preview image text (used by scripts/make-static-images.js and og:image:alt)
  "og.home": "Apps built with intention.",
  "og.ascend": "Train smarter. Eat better. Go further.",
  "og.sillage": "Sillage. In development.",

  // Homepage
  "home.hero.label": "A software studio",
  "home.hero.heading": "Apps built with intention.",
  "home.hero.line": "We make iPhone apps for the things that matter to you. Ascend, for training and nutrition, launches first.",
  "home.hero.line.live": "We make iPhone apps for the things that matter to you. Ascend, for training and nutrition, is on the App Store.",
  "home.hero.button": "Meet Ascend",
  "home.apps.label": "Apps",
  "home.cards.ascend.name": "Ascend",
  "home.cards.ascend.label": "Launching first",
  "home.cards.ascend.label.live": "On the App Store",
  "home.cards.ascend.tagline": "Train smarter. Eat better. Go further.",
  "home.cards.ascend.line": "Training and nutrition in one iPhone app.",
  "home.cards.ascend.link": "Explore Ascend",
  "home.cards.sillage.name": "Sillage",
  "home.cards.sillage.label": "In development",
  "home.cards.sillage.line": "An app for fragrance collectors.",
  "home.cards.sillage.link": "About Sillage",
  "home.principles.label": "Principles",
  "home.principles.1.title": "Intelligence, not complexity",
  "home.principles.1.body": "AI should reduce friction, not add it. Every intelligent feature we build earns its place by making the experience simpler — never more complicated.",
  "home.principles.2.title": "Precision over abundance",
  "home.principles.2.body": "We'd rather ship fewer features and get each one right. Restraint is a design principle, not a limitation.",
  "home.principles.3.title": "Built for people, not personas",
  "home.principles.3.body": "Every Aineara product starts with a specific human need — not a market segment. We build for enthusiasts who care deeply, and feel it when something is made with equal care.",
  "home.about.label": "About",
  "home.about.heading": "A software studio in New York.",
  "home.about": "We make iPhone apps and take our time with each one. Ascend, for training and nutrition, is the first to launch. Sillage, for fragrance collectors, is in development. We use AI where it saves you effort, such as estimating a meal from a photo, and Ascend asks before it sends anything to our AI provider.",
  "home.waitlist.heading": "Get notified when Ascend launches.",
  "home.waitlist.live.heading": "Ascend is on the App Store.",

  // Signup form (Task 5)
  "signup.label": "Email address",
  "signup.placeholder": "you@example.com",
  "signup.button": "Join the Waitlist",
  "signup.sending": "Sending…",
  "signup.note.ascend": "One email to confirm, and one when Ascend launches. Nothing else.",
  "signup.note.sillage": "One email to confirm, and one when Sillage launches. Nothing else.",
  "signup.success.ascend": "You're on the list. We'll email you when Ascend launches.",
  "signup.success.sillage": "You're on the list. We'll email you when Sillage launches.",
  "signup.already.ascend": "You're on the list. We'll email you when Ascend launches.",
  "signup.already.sillage": "You're on the list. We'll email you when Sillage launches.",
  "signup.invalid": "Enter a valid email address, like name@example.com.",
  "signup.error": "Something went wrong. Please try again, or email hello@aineara.com.",
  "signup.nojs.ascend": "JavaScript is off, so this form can't send. To join the Ascend waitlist, email hello@aineara.com.",
  "signup.nojs.sillage": "JavaScript is off, so this form can't send. To join the Sillage waitlist, email hello@aineara.com.",

  // Ascend: hero
  "ascend.hero.label": "Ascend by Aineara",
  "ascend.hero.heading": "Train smarter. Eat better. Go further.",
  "ascend.hero.subhead": "Training and nutrition in one app, with calorie targets that can adapt to your progress.",

  // Ascend: Train
  "ascend.train.label": "Train",
  "ascend.train.heading": "Log every set. Follow a plan.",
  "ascend.train.1": "Log workouts set by set, with a rest timer and your personal records.",
  "ascend.train.2": "Start a four-week plan of training and rest days, built around how many days a week you can train.",
  "ascend.train.3": "Save a workout as a template and start from it next time.",
  "ascend.train.4": "See which muscles you've worked, and how this week's training compares with your recent weeks.",

  // Ascend: Eat
  "ascend.eat.label": "Eat",
  "ascend.eat.heading": "Log food your way.",
  "ascend.eat.1": "Search for a food, or scan its barcode or nutrition label.",
  "ascend.eat.2": "Describe a meal out loud or choose a photo of it, and check the AI estimate before you log it.",
  "ascend.eat.3": "Save your recipes and log them by the serving.",
  "ascend.eat.4": "Calorie and macro targets if you're 18 or over, with suggested updates from your weight trend and what you log. You decide whether to apply them.",

  // Ascend: Stay with it
  "ascend.stay.label": "Stay with it",
  "ascend.stay.heading": "Keep showing up.",
  "ascend.stay.1": "Track daily habits and keep your workout streak going.",
  "ascend.stay.2": "Share workouts with followers, give kudos and join challenges. Sharing with followers is off until you turn it on for a workout.",
  "ascend.stay.3": "A weekly report on your workouts, sleep, protein and weight, with a short AI summary if you allow it.",
  "ascend.stay.4": "Connect Apple Health to see your steps and sleep in Ascend.",

  // Ascend: Your data
  "ascend.data.heading": "Your data.",
  "ascend.data.1": "Ascend has no ads, and no advertising, analytics or tracking software from other companies.",
  "ascend.data.2": "Ascend reads from Apple Health and never writes to it.",
  "ascend.data.3": "Ascend's AI features send data to Anthropic only after you allow it. What we send never includes your name, email address or account ID.",
  "ascend.data.4": "Export your workouts and meals, or delete your account, from inside Ascend.",
  "ascend.data.link": "Read the privacy policy",

  // Ascend: pricing and final call to action
  "ascend.pricing.label": "Pricing",
  "ascend.pricing": "Free to start. Optional Plus, Pro and Elite subscriptions. Prices are in the App Store.",
  "ascend.pricing.waitlist": "Free to start. Optional Plus, Pro and Elite subscriptions. Prices will be in the App Store at launch.",
  "ascend.pricing.note": "Some features on this page need a subscription.",
  "ascend.cta.heading.waitlist": "Hear when Ascend launches.",
  "ascend.cta.heading.live": "Get Ascend on the App Store.",
  "ascend.cta.disclaimer": "Ascend is a general wellness app, not medical advice.",

  // Ascend: image alt text
  "ascend.alt.01-today": "Ascend's Today screen: today's Upper Body workout marked as logged, a reminder that 0.8 liters of water are left for the day, a readiness score of 72 out of 100 rated Good with the factors behind it, and tiles for calories, protein and a two-day streak.",
  "ascend.alt.04-nutrition": "Ascend's Nutrition screen: the day's calories, protein, carbs and fat against their targets, a note that targets are general wellness estimates, a hydration tracker, and a breakfast of Greek yogurt, blueberries and rolled oats.",
  "ascend.alt.05-training-load": "Ascend's Training Load screen: average daily volume for the last 7 and 28 days, the ratio between them, and a bar chart of daily volume load over 28 days.",
  "ascend.alt.06-plans": "Ascend's Plans screen: one week of a muscle-building plan with upper-body, lower-body and rest days, finished days ticked, and the week's calorie, protein, carb and fat targets.",
  "ascend.alt.07-weekly-report": "Ascend's Weekly Report: five workouts, 149 g average daily protein and weight down 0.8 lb over seven days, with a short AI-written summary of the week and a list of insights.",
  "ascend.alt.mark": "",
  "ascend.alt.badge": "Download on the App Store",

  // Sillage
  "sillage.label": "In development",
  "sillage.name": "Sillage",
  "sillage.line.1": "An app for fragrance collectors.",
  "sillage.line.2": "Keep track of your collection and log what you wear.",
  "sillage.back": "Back to Aineara",

  // 404
  "404.title": "Page not found — Aineara",
  "404.label": "Error 404",
  "404.heading": "This page doesn't exist.",
  "404.line": "The link may be broken, or the page may have moved.",
  "404.button": "Return Home",
};
