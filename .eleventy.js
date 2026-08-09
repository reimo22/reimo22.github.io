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

  eleventyConfig.addPassthroughCopy("src/assets");

  eleventyConfig.addShortcode("ascii", function (name) {
    return fs.readFileSync(
      path.join("src/assets/ascii", `${name}.txt`),
      "utf8",
    );
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
