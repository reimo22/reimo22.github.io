// Cascades a layout into every post in src/blog/*.md. Permalink is left to
// Eleventy's default (/blog/<slug>/ from the file's own path) — unlike the
// writeups cascade, there's no submodule parent-dir indirection here.
export default {
  layout: "post.njk",
};
