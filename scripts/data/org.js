/* The facts about Savor Scout as a business, in one place.
 *
 * Every trust page (/about, /contact, /privacy, /terms) and the Organization
 * schema read from here. These are statements a reader, a regulator or Google
 * can check, so nothing in this file is guessed: a field is either a real fact
 * the owner supplied or null.
 *
 * `null` in a REQUIRED field is allowed in development and preview builds,
 * where the pages render a visible placeholder so the copy can be reviewed. A
 * production build (VERCEL_ENV=production) refuses to ship a placeholder and
 * stops instead — a privacy policy with "[email]" in it is worse than none.
 */
module.exports = {
  /* REQUIRED. Where readers, users and rights requests go. Must be an inbox
     somebody reads: the privacy policy promises a reply. */
  email: null,

  /* REQUIRED. Who operates the service, as it should appear in the privacy
     policy and terms: a person's name, or a company name if one exists. */
  operator: null,

  /* Optional. The person (or people) behind the product, for the About page.
     Omitted from the page when null. */
  founder: null,

  /* Optional. US state whose law governs the Terms, e.g. "Texas". The clause
     is left out when null. */
  governingState: null,

  /* Optional. Year the product launched, for the About page and schema. */
  foundingYear: null,

  /* Optional. Full URLs of profiles the product itself owns: X, Instagram,
     TikTok, LinkedIn, Product Hunt, a Crunchbase entry. These become `sameAs`
     in the Organization schema, which is how Google ties those profiles to
     this site as one entity. Only list accounts that are actually ours. */
  sameAs: [],
};
