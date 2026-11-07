/* What the search knows about food without asking a model.

   Three jobs:
   1. Recall. A search for "ramen" should also look at places whose name or
      Google category says "noodle bar" or "izakaya", and should send Google a
      second query worded the way restaurants describe themselves.
   2. A fallback. If the intent model is down or slow, the search still knows
      that "cheap tacos" means tacos, at a low price, probably at a taqueria.
   3. Reading evidence. Synonyms for the vibes people ask for, and the words
      reviewers use when food is good or bad.

   Every entry is ordinary food knowledge. Keep entries short: the related
   terms are matched against restaurant names and categories, so a term that
   appears everywhere ("food", "grill") would make every place look relevant. */

/* craving -> { match: words that name it in a query, related: words a fitting
   restaurant's name or category tends to contain, cuisine, query: how to ask
   Google for this kind of place } */
const CRAVINGS = {
  pizza: { match: ["pizza", "pizzeria", "slice"], related: ["pizza", "pizzeria", "italian"], cuisine: "Italian", query: "pizza restaurant" },
  "new york pizza": { match: ["new york pizza", "ny pizza", "ny style"], related: ["pizza", "pizzeria", "slice"], cuisine: "Italian", query: "new york style pizza" },
  "deep dish": { match: ["deep dish", "chicago pizza"], related: ["pizza", "deep dish", "pizzeria"], cuisine: "Italian", query: "deep dish pizza" },
  burger: { match: ["burger", "burgers", "cheeseburger", "smash burger"], related: ["burger", "hamburger", "burgers", "diner"], cuisine: "American", query: "burger restaurant" },
  tacos: { match: ["taco", "tacos", "al pastor", "birria", "carnitas"], related: ["taco", "taqueria", "mexican", "tacos"], cuisine: "Mexican", query: "taqueria tacos" },
  burrito: { match: ["burrito", "burritos"], related: ["burrito", "mexican", "taqueria", "cantina"], cuisine: "Mexican", query: "burrito restaurant" },
  mexican: { match: ["mexican", "enchilada", "quesadilla", "tamale", "mole", "pozole"], related: ["mexican", "taqueria", "cantina", "cocina"], cuisine: "Mexican", query: "mexican restaurant" },
  "tex-mex": { match: ["tex-mex", "tex mex", "fajita", "fajitas", "queso"], related: ["tex-mex", "mexican", "cantina"], cuisine: "Tex-Mex", query: "tex-mex restaurant" },
  sushi: { match: ["sushi", "sashimi", "nigiri", "maki", "omakase", "hand roll"], related: ["sushi", "japanese", "omakase", "sashimi"], cuisine: "Japanese", query: "sushi restaurant" },
  ramen: { match: ["ramen", "tonkotsu", "shoyu", "miso ramen", "tsukemen"], related: ["ramen", "noodle", "japanese", "izakaya"], cuisine: "Japanese", query: "ramen shop" },
  japanese: { match: ["japanese", "izakaya", "udon", "tempura", "katsu", "donburi", "yakitori"], related: ["japanese", "izakaya", "sushi", "ramen", "udon"], cuisine: "Japanese", query: "japanese restaurant" },
  pho: { match: ["pho"], related: ["pho", "vietnamese", "noodle"], cuisine: "Vietnamese", query: "pho restaurant" },
  "banh mi": { match: ["banh mi", "bánh mì"], related: ["banh mi", "vietnamese", "sandwich", "bakery"], cuisine: "Vietnamese", query: "banh mi sandwich shop" },
  vietnamese: { match: ["vietnamese", "bun bo", "bun cha", "com tam", "vermicelli"], related: ["vietnamese", "pho", "banh mi"], cuisine: "Vietnamese", query: "vietnamese restaurant" },
  thai: { match: ["thai", "pad thai", "pad see ew", "green curry", "red curry", "khao soi", "tom yum", "larb"], related: ["thai", "siam", "bangkok"], cuisine: "Thai", query: "thai restaurant" },
  chinese: { match: ["chinese", "lo mein", "fried rice", "general tso", "orange chicken", "kung pao", "chow mein", "szechuan", "sichuan", "cantonese", "hunan"], related: ["chinese", "szechuan", "sichuan", "wok", "dumpling", "kitchen"], cuisine: "Chinese", query: "chinese restaurant" },
  dumplings: { match: ["dumpling", "dumplings", "xiao long bao", "soup dumplings", "gyoza", "potstickers", "momo", "mandu"], related: ["dumpling", "dim sum", "chinese", "noodle"], cuisine: "Chinese", query: "dumpling restaurant" },
  "dim sum": { match: ["dim sum", "har gow", "siu mai", "shumai", "char siu bao"], related: ["dim sum", "chinese", "cantonese", "dumpling"], cuisine: "Chinese", query: "dim sum restaurant" },
  "hot pot": { match: ["hot pot", "hotpot", "shabu", "shabu shabu"], related: ["hot pot", "hotpot", "shabu"], cuisine: "Chinese", query: "hot pot restaurant" },
  noodles: { match: ["noodles", "noodle", "hand pulled", "biang biang", "dan dan"], related: ["noodle", "noodles", "ramen", "pho"], cuisine: "", query: "noodle restaurant" },
  korean: { match: ["korean", "bibimbap", "bulgogi", "galbi", "kimchi", "tteokbokki", "japchae", "sundubu", "jjigae"], related: ["korean", "seoul", "bbq"], cuisine: "Korean", query: "korean restaurant" },
  "korean bbq": { match: ["korean bbq", "kbbq", "korean barbecue", "samgyeopsal"], related: ["korean", "bbq", "barbecue", "grill"], cuisine: "Korean", query: "korean bbq restaurant" },
  "korean fried chicken": { match: ["korean fried chicken", "kfc korean", "yangnyeom"], related: ["korean", "chicken", "fried chicken"], cuisine: "Korean", query: "korean fried chicken" },
  indian: { match: ["indian", "curry", "tikka masala", "butter chicken", "biryani", "naan", "tandoori", "dosa", "samosa", "saag", "vindaloo", "korma", "chaat"], related: ["indian", "curry", "tandoor", "masala", "biryani", "punjabi"], cuisine: "Indian", query: "indian restaurant" },
  nepalese: { match: ["nepali", "nepalese", "himalayan", "momo"], related: ["nepal", "himalayan", "momo"], cuisine: "Nepalese", query: "nepalese restaurant" },
  mediterranean: { match: ["mediterranean", "falafel", "shawarma", "hummus", "gyro", "gyros", "kebab", "kabob", "pita", "shawerma"], related: ["mediterranean", "falafel", "shawarma", "kabob", "kebab", "gyro", "grill", "greek", "lebanese"], cuisine: "Mediterranean", query: "mediterranean restaurant" },
  greek: { match: ["greek", "souvlaki", "spanakopita", "moussaka"], related: ["greek", "gyro", "mediterranean", "taverna"], cuisine: "Greek", query: "greek restaurant" },
  "middle eastern": { match: ["middle eastern", "lebanese", "persian", "turkish", "shawarma"], related: ["lebanese", "persian", "turkish", "middle eastern", "kabob"], cuisine: "Middle Eastern", query: "middle eastern restaurant" },
  halal: { match: ["halal"], related: ["halal", "gyro", "grill", "kabob"], cuisine: "", query: "halal food" },
  italian: { match: ["italian", "pasta", "lasagna", "carbonara", "risotto", "gnocchi", "chicken parm", "parmesan"], related: ["italian", "trattoria", "osteria", "pasta", "ristorante"], cuisine: "Italian", query: "italian restaurant" },
  bbq: { match: ["bbq", "barbecue", "brisket", "ribs", "pulled pork", "burnt ends", "smokehouse"], related: ["bbq", "barbecue", "smokehouse", "brisket"], cuisine: "American", query: "bbq restaurant" },
  wings: { match: ["wings", "chicken wings", "buffalo wings", "hot wings"], related: ["wings", "wing", "chicken"], cuisine: "American", query: "chicken wings restaurant" },
  "fried chicken": { match: ["fried chicken", "chicken tenders", "chicken strips"], related: ["chicken", "fried chicken"], cuisine: "American", query: "fried chicken restaurant" },
  "hot chicken": { match: ["hot chicken", "nashville hot"], related: ["hot chicken", "chicken", "nashville"], cuisine: "American", query: "nashville hot chicken" },
  "chicken sandwich": { match: ["chicken sandwich"], related: ["chicken", "sandwich"], cuisine: "American", query: "chicken sandwich" },
  sandwich: { match: ["sandwich", "sandwiches", "sub", "subs", "hoagie", "hero", "panini", "cheesesteak", "philly"], related: ["sandwich", "deli", "subs", "hoagie", "cheesesteak"], cuisine: "", query: "sandwich shop" },
  deli: { match: ["deli", "pastrami", "reuben", "corned beef"], related: ["deli", "delicatessen", "sandwich"], cuisine: "", query: "deli" },
  bagels: { match: ["bagel", "bagels"], related: ["bagel", "bagels", "bakery"], cuisine: "", query: "bagel shop" },
  breakfast: { match: ["breakfast", "pancakes", "waffles", "eggs benedict", "omelet", "omelette", "french toast", "hash browns"], related: ["breakfast", "brunch", "diner", "pancake", "cafe", "waffle"], cuisine: "", query: "breakfast restaurant" },
  brunch: { match: ["brunch", "mimosa", "mimosas"], related: ["brunch", "breakfast", "cafe", "bistro"], cuisine: "", query: "brunch restaurant" },
  diner: { match: ["diner"], related: ["diner", "breakfast"], cuisine: "American", query: "diner" },
  steak: { match: ["steak", "steakhouse", "ribeye", "filet", "prime rib"], related: ["steak", "steakhouse", "chophouse", "grill"], cuisine: "American", query: "steakhouse" },
  seafood: { match: ["seafood", "fish", "shrimp", "lobster", "crab", "oysters", "clams", "scallops", "crawfish", "seafood boil"], related: ["seafood", "fish", "oyster", "crab", "lobster", "shrimp"], cuisine: "", query: "seafood restaurant" },
  poke: { match: ["poke", "poke bowl"], related: ["poke", "hawaiian", "bowl"], cuisine: "Hawaiian", query: "poke bowl" },
  salad: { match: ["salad", "salads"], related: ["salad", "greens", "bowl", "fresh"], cuisine: "", query: "salad restaurant" },
  healthy: { match: ["healthy", "light", "clean eating", "grain bowl", "acai", "açaí"], related: ["salad", "bowl", "fresh", "juice", "health", "acai"], cuisine: "", query: "healthy restaurant" },
  vegan: { match: ["vegan", "plant based", "plant-based"], related: ["vegan", "plant", "vegetarian"], cuisine: "", query: "vegan restaurant" },
  vegetarian: { match: ["vegetarian", "veggie"], related: ["vegetarian", "vegan", "veggie"], cuisine: "", query: "vegetarian restaurant" },
  soup: { match: ["soup", "soups", "chowder", "bisque"], related: ["soup", "noodle", "pho", "ramen"], cuisine: "", query: "soup restaurant" },
  "mac and cheese": { match: ["mac and cheese", "mac n cheese", "mac & cheese"], related: ["mac", "cheese", "southern", "comfort"], cuisine: "American", query: "mac and cheese" },
  southern: { match: ["southern", "soul food", "collard", "cornbread", "shrimp and grits", "chicken and waffles"], related: ["southern", "soul", "kitchen", "comfort"], cuisine: "Southern", query: "soul food restaurant" },
  cajun: { match: ["cajun", "creole", "gumbo", "jambalaya", "po boy", "po' boy", "etouffee", "beignet"], related: ["cajun", "creole", "louisiana", "seafood"], cuisine: "Cajun", query: "cajun restaurant" },
  caribbean: { match: ["caribbean", "jamaican", "jerk chicken", "jerk", "oxtail", "roti", "plantains"], related: ["caribbean", "jamaican", "jerk", "island"], cuisine: "Caribbean", query: "caribbean restaurant" },
  cuban: { match: ["cuban", "cubano", "ropa vieja"], related: ["cuban", "cafe", "latin"], cuisine: "Cuban", query: "cuban restaurant" },
  "latin american": { match: ["peruvian", "colombian", "venezuelan", "salvadoran", "pupusa", "pupusas", "arepa", "arepas", "empanada", "empanadas", "ceviche", "lomo saltado", "brazilian"], related: ["peruvian", "colombian", "venezuelan", "salvadoran", "latin", "arepa", "pupusa", "empanada", "brazilian"], cuisine: "Latin American", query: "latin american restaurant" },
  ethiopian: { match: ["ethiopian", "injera", "eritrean"], related: ["ethiopian", "eritrean", "injera"], cuisine: "Ethiopian", query: "ethiopian restaurant" },
  african: { match: ["african", "nigerian", "jollof", "ghanaian", "senegalese", "somali"], related: ["african", "nigerian", "jollof", "ghanaian", "somali"], cuisine: "African", query: "african restaurant" },
  filipino: { match: ["filipino", "adobo", "lumpia", "sisig", "pancit"], related: ["filipino", "lumpia", "manila"], cuisine: "Filipino", query: "filipino restaurant" },
  hawaiian: { match: ["hawaiian", "loco moco", "spam musubi", "plate lunch"], related: ["hawaiian", "poke", "island"], cuisine: "Hawaiian", query: "hawaiian restaurant" },
  french: { match: ["french", "croissant", "crepe", "crepes", "bistro", "croque"], related: ["french", "bistro", "brasserie", "creperie", "boulangerie"], cuisine: "French", query: "french restaurant" },
  spanish: { match: ["spanish", "tapas", "paella"], related: ["spanish", "tapas", "paella"], cuisine: "Spanish", query: "tapas restaurant" },
  german: { match: ["german", "schnitzel", "bratwurst", "pretzel"], related: ["german", "biergarten", "haus"], cuisine: "German", query: "german restaurant" },
  polish: { match: ["polish", "pierogi", "pierogies"], related: ["polish", "pierogi"], cuisine: "Polish", query: "polish restaurant" },
  "fish and chips": { match: ["fish and chips", "fish & chips"], related: ["fish", "chips", "seafood", "pub"], cuisine: "British", query: "fish and chips" },
  "hot dog": { match: ["hot dog", "hot dogs", "chicago dog"], related: ["hot dog", "dogs", "frank"], cuisine: "American", query: "hot dog stand" },
  coffee: { match: ["coffee", "espresso", "latte", "cappuccino", "cold brew", "cafe", "café"], related: ["coffee", "cafe", "espresso", "roasters", "roastery"], cuisine: "", query: "coffee shop" },
  tea: { match: ["tea", "matcha"], related: ["tea", "matcha", "cafe"], cuisine: "", query: "tea house" },
  boba: { match: ["boba", "bubble tea", "milk tea", "tapioca"], related: ["boba", "tea", "bubble"], cuisine: "", query: "boba tea shop" },
  dessert: { match: ["dessert", "desserts", "sweets", "cake", "cheesecake", "pastry", "pastries"], related: ["dessert", "bakery", "cake", "sweets", "patisserie"], cuisine: "", query: "dessert shop" },
  "ice cream": { match: ["ice cream", "gelato", "frozen custard", "soft serve", "frozen yogurt", "froyo"], related: ["ice cream", "gelato", "creamery", "custard", "frozen yogurt"], cuisine: "", query: "ice cream shop" },
  donuts: { match: ["donut", "donuts", "doughnut", "doughnuts"], related: ["donut", "doughnut", "bakery"], cuisine: "", query: "donut shop" },
  bakery: { match: ["bakery", "bread", "croissants", "cookies", "cupcakes"], related: ["bakery", "bakehouse", "patisserie", "bread"], cuisine: "", query: "bakery" },
  crepes: { match: ["crepe", "crepes", "crêpes"], related: ["crepe", "creperie", "french"], cuisine: "French", query: "crepe restaurant" },
  smoothie: { match: ["smoothie", "smoothies", "juice", "acai bowl"], related: ["smoothie", "juice", "acai", "bowl"], cuisine: "", query: "smoothie bar" },
  "chicken and rice": { match: ["chicken over rice", "chicken and rice"], related: ["halal", "chicken", "rice", "gyro"], cuisine: "", query: "halal chicken over rice" },
  buffet: { match: ["buffet", "all you can eat", "ayce"], related: ["buffet", "all you can eat"], cuisine: "", query: "buffet restaurant" },
  "late night": { match: ["late night", "after midnight", "open late", "2am", "3am"], related: [], cuisine: "", query: "restaurants open late" },
  pub: { match: ["pub", "bar food", "gastropub", "brewery", "pub food"], related: ["pub", "tavern", "brewery", "taproom", "gastropub", "bar"], cuisine: "American", query: "gastropub" },
};

/* Words in a craving that carry no information about the food. Used by the
   fallback parser and to keep generic searches ("good food near me") from
   matching every place with "food" in its name. */
const FILLER = new Set([
  "a", "an", "the", "some", "any", "good", "great", "best", "nice", "decent", "tasty", "yummy", "delicious",
  "place", "places", "spot", "spots", "restaurant", "restaurants", "food", "foods", "eat", "eats", "eating",
  "meal", "meals", "near", "nearby", "me", "around", "here", "close", "closest", "want", "wanna", "craving",
  "something", "somewhere", "get", "grab", "find", "for", "to", "with", "and", "or", "of", "in", "on", "at",
  "i", "im", "i'm", "we", "us", "our", "my", "really", "very", "super", "pretty", "quick", "fast", "today",
  "tonight", "now", "right", "please", "like", "kind", "type", "sort", "local", "open", "that", "is", "has",
  "cheap", "affordable", "budget", "inexpensive", "expensive", "fancy", "upscale",
  "dinner", "lunch", "supper", "tonight", "hungry", "starving",
]);

/* Words that describe the food rather than the place: folded into the dish
   (mirrors TASTE_WORDS in server.js, kept separate so this module stands alone). */
const TASTE_WORDS = /^(?:spicy|hot|mild|crispy|crunchy|fresh|authentic|greasy|sweet|savou?ry|salty|tangy|smoky|juicy|tender|creamy|rich|light|healthy|filling|cheesy|garlicky|traditional|homemade|fried|grilled|baked|raw|organic|vegan|vegetarian|gluten[- ]free)$/i;

/* What people mean by the vibes they ask for, as they show up in reviews.
   Matching only the literal word scored "quiet" at zero for every place whose
   reviewers wrote "calm" or "you can actually talk". */
const VIBE_SYNONYMS = {
  quiet: ["quiet", "calm", "peaceful", "relaxed", "not loud", "can hear each other", "low key", "low-key", "tranquil"],
  cozy: ["cozy", "cosy", "intimate", "warm", "homey", "charming", "snug"],
  romantic: ["romantic", "date night", "date", "intimate", "candlelit", "anniversary"],
  "good for groups": ["groups", "group", "large party", "big party", "big tables", "large tables", "parties", "family style"],
  "family friendly": ["family", "kids", "kid friendly", "children", "high chair", "family-friendly"],
  "late night": ["late night", "open late", "late-night", "after midnight", "night owl"],
  lively: ["lively", "fun", "energetic", "vibrant", "buzzing", "great atmosphere"],
  outdoor: ["outdoor", "patio", "terrace", "rooftop", "outside seating", "al fresco"],
  "study spot": ["study", "studying", "laptop", "wifi", "wi-fi", "outlets", "work from"],
  fast: ["quick", "fast", "fast service", "in and out", "speedy"],
  "date night": ["date night", "date", "romantic", "intimate"],
  casual: ["casual", "laid back", "laid-back", "relaxed", "no frills"],
  "fine dining": ["fine dining", "upscale", "elegant", "tasting menu", "white tablecloth"],
  "good service": ["service", "friendly", "attentive", "staff"],
};

/* How reviewers sound when food is good or bad. Counted only near the dish
   words, so "the wings were amazing" counts for a wings search and "parking is
   terrible" does not count against it. */
const POSITIVE = [
  "best", "amazing", "incredible", "delicious", "fantastic", "excellent", "perfect", "perfectly", "favorite", "favourite",
  "outstanding", "must try", "must-try", "fresh", "authentic", "flavorful", "flavourful", "tender", "crispy", "juicy",
  "phenomenal", "addictive", "to die for", "hits the spot", "love", "loved", "great", "generous", "worth",
];
const NEGATIVE = [
  "bland", "soggy", "cold", "stale", "overpriced", "rude", "slow", "dirty", "worst", "disappointing", "disappointed",
  "greasy", "salty", "dry", "undercooked", "overcooked", "burnt", "tasteless", "mediocre", "gross", "food poisoning",
  "sick", "inedible", "terrible", "awful", "horrible", "meh", "not worth", "rubbery", "frozen",
];

/* Places a restaurant search should never return as the answer. Matched
   against the Google category (and the name, for the unambiguous ones). */
const NON_FOOD = /\b(?:gas station|fuel|convenience store|grocery|supermarket|market(?:place)?$|liquor store|wine store|beer store|hotel|motel|inn$|lodging|apartment|real estate|bank|atm|pharmacy|drugstore|gym|fitness|car wash|auto |dealership|school|university|church|hospital|clinic|dentist|salon|barber|spa$|laundromat|storage|parking|gift shop|tobacco|vape|smoke shop|cannabis|dispensary|catering service|caterer|food distributor|wholesale|warehouse|vending|event venue|banquet hall|night club|nightclub|hookah)\b/i;

/* Fast food, for "no fast food" and as a soft signal. Google uses these exact
   category names. */
const FAST_FOOD = /\b(?:fast food|drive[- ]thru|drive[- ]in)\b/i;

module.exports = { CRAVINGS, FILLER, TASTE_WORDS, VIBE_SYNONYMS, POSITIVE, NEGATIVE, NON_FOOD, FAST_FOOD };
