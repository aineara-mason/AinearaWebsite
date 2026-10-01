// Ascend screenshots and mark (D6). Originals are copied read-only from the Ascend repo:
//   /Users/masonstassi/Desktop/Ascend/docs/screenshots/<id>.png
//   /Users/masonstassi/Desktop/Ascend/Ascend/Assets.xcassets/AscendMark.imageset/AscendMark.png
// They live in src/_images/ (never published); the image shortcode writes resized WebP files.
// 05-training-load stays out until it is re-shot on current Ascend main (D6).
export default {
  items: {
    "01-today": { file: "src/_images/ascend/01-today.png", altId: "ascend.alt.01-today" },
    "04-nutrition": { file: "src/_images/ascend/04-nutrition.png", altId: "ascend.alt.04-nutrition" },
    "06-plans": { file: "src/_images/ascend/06-plans.png", altId: "ascend.alt.06-plans" },
    "07-weekly-report": { file: "src/_images/ascend/07-weekly-report.png", altId: "ascend.alt.07-weekly-report" },
  },
  rail: ["01-today", "04-nutrition", "06-plans", "07-weekly-report"],
  features: { train: "06-plans", eat: "04-nutrition", stay: "07-weekly-report" },
  mark: "src/_images/ascend/AscendMark.png",
};
