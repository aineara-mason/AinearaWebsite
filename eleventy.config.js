export const config = { dir: { input: "src", output: "_site", includes: "_includes", data: "_data" }, templateFormats: ["njk"], htmlTemplateEngine: "njk" };
export default function (eleventyConfig) {
  if (process.versions.bun) throw new Error("Run Eleventy with real Node: PATH=\"/opt/homebrew/bin:$PATH\"");
  // D1: Part A publishes public/ byte for byte into the root of _site/.
  // Task 11 removes this line once every page is a template.
  eleventyConfig.addPassthroughCopy({ public: "/" });
}
