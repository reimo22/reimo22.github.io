// Cascades a layout and a per-slug permalink into every writeup README.md in
// the htb-writeups submodule. The permalink is built from the *parent* dir
// (filePathStem's second-to-last segment), not fileSlug, which reads "README".
//
// Deliberately no `tags` here: Eleventy 3 resolves collections from `tags`
// before computed data runs, so tags set via eleventyComputed never feed a
// collection. The writeups-box / writeups-ctf collections are instead built
// in `.eleventy.js` with addCollection + getFilteredByGlob.
export default {
  layout: "writeup.njk",
  eleventyComputed: {
    permalink: (data) =>
      `/writeups/${data.page.filePathStem.split("/").at(-2)}/`,
  },
};
