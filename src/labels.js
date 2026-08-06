/* ===========================================================================
   PLAIN ENGLISH

   The deck's family names are an internal taxonomy, not user language.
   "Handheld" is tacos and sandwiches. "Feel" is the vibe. "Constraint" is
   price and timing. "Room" is the room. Nobody outside this codebase can
   decode those, and a map covered in words the reader has to decipher is not
   a map — it is a quiz.

   So the storage name stays as it is (it keys the deck, the nodes and the
   axes), and every user-facing surface asks here for the words a person would
   actually use. One table, so the map, the collection strip and the "still
   measuring" line can never disagree with each other.
   =========================================================================== */

const FAMILY_LABELS = {
  // --- what you eat ---
  "Soup & Stew": "Soups & stews",
  Handheld: "Tacos & sandwiches",
  Noodles: "Noodles",
  Rice: "Rice dishes",
  Pizza: "Pizza",
  "Grill & Smoke": "BBQ & grilled",
  Fried: "Fried food",
  "Raw & Cold": "Sushi & raw",
  "Small Plates": "Small plates",
  Breakfast: "Breakfast",
  Sweet: "Desserts",
  Drinks: "Coffee & drinks",

  // --- how it tastes ---
  Heat: "How spicy you go",
  Texture: "Crispy or creamy",
  Flavor: "Flavours you chase",
  Portion: "How much food",
  Diet: "Dietary needs",

  // --- where you eat it ---
  Feel: "The vibe",
  Room: "The room",
  Service: "How it's served",
  Ownership: "Who runs it",

  // --- when and why ---
  Occasion: "The occasion",
  Company: "Who you're with",
  Time: "When you eat",
  Constraint: "Price & timing",

  // --- where it's from ---
  "East Asian": "East Asian",
  "Southeast Asian": "Southeast Asian",
  "South Asian": "South Asian",
  European: "European",
  Mediterranean: "Mediterranean",
  Latin: "Latin American",
  Caribbean: "Caribbean",
  "African & Middle Eastern": "African & Mid-East",
};

/* Unmapped families fall through unchanged rather than being hidden — a new
   family added to the deck should look slightly raw here, which is a visible
   prompt to name it, instead of silently vanishing from the map. */
export function familyLabel(name) {
  return FAMILY_LABELS[name] || name || "";
}

export default FAMILY_LABELS;
