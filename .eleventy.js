import fs from "node:fs";
import path from "node:path";
import markdownIt from "markdown-it";

export default function (eleventyConfig) {
  eleventyConfig.setLibrary(
    "md",
    markdownIt({
      html: true,
      breaks: false,
      linkify: true,
    }),
  );

  eleventyConfig.addPassthroughCopy("src/assets/css");

  eleventyConfig.addShortcode("ascii", function (name) {
    const filePath = path.join("src/assets/ascii", `${name}.txt`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`ascii shortcode: no such file ${filePath}`);
    }
    const raw = fs.readFileSync(filePath, "utf8");
    return raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
  };
}
