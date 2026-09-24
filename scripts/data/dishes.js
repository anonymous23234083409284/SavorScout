/* Content for the /food/<dish> pages.
 *
 * WHY THESE EXIST AT ALL
 * The city pages already link to sixteen cravings each, but every one of those
 * links went to `/?near=…&craving=…` — the homepage with a query string, which
 * is not a page and cannot rank for anything. A thousand pages were pointing at
 * a URL that declares the homepage as its canonical. These give those links a
 * real destination and turn a flat set of city pages into an actual link graph:
 * city -> dish -> city.
 *
 * WHAT MAKES EACH ONE DIFFERENT
 * `good` is the part that carries the page, and it is written per dish because
 * the answer genuinely differs: what separates good tacos from bad tacos has
 * nothing in common with what separates good ramen from bad ramen. If two of
 * these sections could be swapped without anyone noticing, one of them is not
 * finished.
 *
 * `signals` documents what the matcher actually reads out of menus and reviews
 * for this dish. It is the one section no competitor can copy, because it is a
 * description of our own software rather than of the food.
 *
 * NOTHING NAMES A RESTAURANT. There are no "best taco places" lists here. We do
 * not hold a restaurant database, and inventing one is both a licensing problem
 * and the fastest way to be wrong in public. The pages teach you what to look
 * for and then hand you a working search.
 */

module.exports = [
  {
    s: "tacos",
    n: "tacos",
    h1: "How to find genuinely good tacos",
    title: "How to Find Good Tacos Near You — What to Look For",
    desc:
      "What separates a real taco from a bad one, which styles to order, and how to find the good places near you instead of the ones with the biggest sign.",
    lede:
      "A taco is four components and nowhere to hide. There is no sauce covering a mistake and no long cook disguising cheap meat, which is why the gap between a good taqueria and a bad one is wider than in almost any other food.",
    good: [
      ["The tortilla is the whole argument", "Fresh corn tortillas, pressed and griddled to order, are the single biggest difference between a good taco and a forgettable one. A cold, damp, packet tortilla cannot be rescued by anything on top of it. If the kitchen is pressing masa, you are almost certainly in the right place."],
      ["Two tortillas mean a wet filling", "The double tortilla is structural, not generosity. It is there because the filling is juicy enough to blow through one, which is a good sign. A single dry tortilla holding dry meat is a different, lesser thing."],
      ["Salsa made there", "A salsa bar with three or four house salsas at different heats says the kitchen cares. A squeeze bottle of one commercial hot sauce says it does not."],
      ["A short menu", "The best taquerias sell five or six fillings. A menu with forty items including burgers is telling you the kitchen is not built around this."],
      ["Onion, cilantro, lime and nothing else", "Traditional taqueria tacos are garnished minimally because the filling is supposed to carry it. Lettuce, sour cream and shredded yellow cheese are a different, Americanised tradition — fine on its own terms, but not what you are looking for when you search for tacos."],
    ],
    order: [
      ["Al pastor", "Pork marinated in chilli and achiote, stacked on a vertical spit with pineapple, shaved to order. If a place has a working trompo in view, order this — it is the hardest thing on the menu to fake and the best test of the kitchen."],
      ["Carnitas", "Pork slow-cooked in its own fat until it is soft, then crisped. Good carnitas have both textures in the same bite. If it is uniformly soft, it was finished early."],
      ["Barbacoa", "Slow-steamed, traditionally lamb or goat, often only on weekends. The weekend-only detail is a good sign rather than an inconvenience."],
      ["Suadero, lengua, cabeza", "The cuts that tell you the kitchen is cooking for people who know the difference. Suadero in particular is an excellent signal."],
      ["Birria", "Braised, chilli-rich, served with a cup of consommé for dipping. The version that got famous is the quesabirria — griddled with cheese — which is genuinely good and not traditional."],
      ["Fish tacos", "A Baja tradition, battered and fried with cabbage and crema. Judge these by whether the batter is still crisp when it reaches you."],
    ],
    signals:
      "When you search for tacos, Savor Scout reads menus and reviews for the specific things above rather than sorting by star rating. Mentions of handmade or fresh tortillas, a trompo, house salsas, and named cuts like suadero or lengua all push a place up. Reviews describing soft, soggy shells or a huge unfocused menu push it down. The score you see on the card is built from those matches, and the card shows you which ones it found.",
    related: ["mexican-food", "burgers", "sandwiches"],
    situations: ["late-night", "on-a-budget", "hungover", "with-picky-eaters"],
  },

  {
    s: "pizza",
    n: "pizza",
    h1: "How to find good pizza",
    title: "How to Find Good Pizza Near You — Styles and What to Look For",
    desc:
      "Neapolitan, New York, Detroit, tavern-style: which is which, what a good one actually looks like, and how to find the right one near you.",
    lede:
      "Most disagreements about pizza are actually disagreements about which pizza. A Neapolitan pie judged by New York standards is soggy and too small; a New York slice judged by Neapolitan standards is overcooked and underdressed. Decide which you want first and the question gets much easier.",
    good: [
      ["The crust edge tells you the oven", "Leoparding — irregular dark blisters on the rim — means a very hot oven and a properly fermented dough, and it is the signature of good Neapolitan. An even golden-brown rim means a cooler deck oven, which is what New York style wants. Uniform pale crust with no colour variation usually means a conveyor oven."],
      ["Dough that was fermented, not just mixed", "Long-fermented dough tastes of something on its own and has an open, irregular crumb when you tear the rim. Dough made that morning tastes of flour and is uniformly dense. Places that mention 48- or 72-hour dough are telling you something real."],
      ["Restraint with the toppings", "Overloading is the most common failure, because moisture from too many toppings steams the base. Good pizzerias put three things on a pie, not nine."],
      ["Sauce that tastes of tomato", "Simple, bright, barely cooked. Sweet, thick sauce is covering for tomatoes that were not worth tasting."],
      ["It should not be greasy underneath", "A little oil on top is fine. A slice that leaves a pool when you lift it has too much low-quality cheese and an under-heated base."],
    ],
    order: [
      ["Neapolitan", "Soft, fast-baked at around 900°F, eaten with a knife and fork, centre deliberately wet. Margherita is the test — nothing to hide behind."],
      ["New York", "Large, thin, foldable, sold by the slice. Judge it by the fold: it should bend without cracking and hold without flopping."],
      ["Detroit", "Rectangular, thick, baked in a steel pan with cheese to the edges so it caramelises into a crust against the wall of the pan. That edge is the entire point."],
      ["Tavern / Chicago thin", "Cracker-thin, cut into squares, a Midwestern tradition largely unknown elsewhere and excellent."],
      ["Sicilian / grandma", "Thick, airy, rectangular, sauce often on top of the cheese. Different from Detroit despite the shape."],
      ["Deep dish", "Chicago's most famous and least representative pizza. Genuinely good, essentially a different dish, and not what locals eat most often."],
    ],
    signals:
      "Searching for pizza, the matcher looks for the vocabulary that separates these styles — wood-fired, coal oven, 00 flour, long-fermented, Detroit-style, by the slice — and weighs reviews mentioning crust texture far more heavily than overall rating. If you name a style in your search, it prioritises places whose menus and reviews actually use that style's language rather than places that merely sell pizza.",
    related: ["italian-food", "sandwiches", "brunch"],
    situations: ["with-a-toddler", "moving-day", "big-group", "with-picky-eaters"],
  },

  {
    s: "sushi",
    qa: ["How do you order sushi?","Start with nigiri rather than rolls — fish over rice is where the skill shows. At a counter, ask what's good today; it's a real question, not a test. Order omakase if you'd rather the chef choose, eat each piece as it arrives, and if the chef hasn't already seasoned it, dip the fish side in soy, not the rice."],
    n: "sushi",
    h1: "How to find good sushi",
    title: "How to Find Good Sushi Near You — What Actually Matters",
    desc:
      "How to tell a serious sushi restaurant from an average one, what to order, and why the rice matters more than the fish.",
    lede:
      "The single most reliable indicator of a good sushi restaurant is the thing nobody photographs. It is the rice — its temperature, its seasoning, and whether it holds together until it reaches your mouth and then falls apart.",
    good: [
      ["Rice at body temperature, not cold", "Shari should be just warm, lightly seasoned with vinegar, and loosely packed. Cold, dense, unseasoned rice is the clearest sign that the kitchen is treating sushi as an assembly job."],
      ["A short, changing selection", "A menu listing sixty kinds of fish year-round is buying frozen commodity product. A board with a dozen things that change is buying what is good."],
      ["The rolls are not the point", "Nothing is wrong with a dressed roll, but a restaurant whose menu is mostly elaborate rolls with three sauces is selling something other than sushi. Look at how much space nigiri and sashimi get."],
      ["A counter, and someone working it", "A sushi counter changes what you can order and how it arrives — piece by piece, at the right temperature. It is also the only way to ask what is good today and get a real answer."],
      ["Wasabi already between fish and rice", "At a serious place the chef seasons each piece. If you are handed a lump of green paste and a dish for soy, that tells you the format the kitchen is working in."],
    ],
    order: [
      ["Omakase", "Chef's choice, in sequence. The best way to eat at a good sushi restaurant and usually better value than ordering the same number of pieces yourself."],
      ["Nigiri over rolls", "Fish and rice, nothing else. It is where the skill is visible."],
      ["Whatever is on the specials board", "Seasonal fish is the whole reason to eat here rather than somewhere else."],
      ["Ask what is good today", "At a counter this is a normal question with a real answer, not a test."],
      ["Chirashi, at lunch", "A bowl of assorted sashimi over rice, usually far better value than the equivalent in nigiri."],
    ],
    signals:
      "A sushi search weights mentions of omakase, counter seating, named chefs, seasonal fish and rice quality much more heavily than a five-star average, because a strip-mall place with fifty five-star reviews for its Dragon Roll is answering a different question than the one you asked. If you search for omakase specifically, places without a counter drop out.",
    related: ["japanese-food", "ramen", "seafood"],
    situations: ["eating-alone", "first-date", "celebrating", "hot-day"],
  },

  {
    s: "ramen",
    n: "ramen",
    h1: "How to find good ramen",
    title: "How to Find Good Ramen Near You — Broth Styles Explained",
    desc:
      "Tonkotsu, shoyu, miso, shio: what the styles actually are, what a good bowl looks like, and how to find a serious ramen shop near you.",
    lede:
      "Ramen is a broth dish with noodles in it, not a noodle dish with broth around it. Almost everything that separates a great bowl from an average one happens in a stockpot hours before you arrive.",
    good: [
      ["The broth should coat the spoon", "A good tonkotsu has body from long-rendered collagen — it clings slightly and leaves a film. Thin, watery broth that runs straight off is the most common failure and cannot be fixed with more seasoning."],
      ["Noodles cooked to order, with bite", "Ramen noodles are alkaline, which is what gives them their springiness and yellow colour. They should still have resistance. Soft noodles mean they sat."],
      ["A shop that mostly sells ramen", "A restaurant with ramen alongside forty other dishes is not simmering pork bones for twelve hours. Specialisation matters more here than in almost any other category."],
      ["Chashu with texture", "The pork should hold together and have some chew, not dissolve into threads. A blowtorched edge is a good sign someone is finishing it to order."],
      ["The egg", "A properly cured ajitama has a jammy, liquid centre and is seasoned all the way through. A hard-boiled egg in a bowl of ramen tells you what kind of kitchen this is."],
    ],
    order: [
      ["Tonkotsu", "Pork bone, simmered until opaque and rich. The heaviest and most famous style, from Kyushu."],
      ["Shoyu", "Soy-based tare in a clearer chicken or pork stock. The Tokyo classic — lighter, more savoury, easier to judge because there is less fat to hide behind."],
      ["Miso", "Hokkaido style, fermented soybean paste in the tare. Sweeter and nuttier, usually with corn and butter."],
      ["Shio", "Salt-based, the lightest and most delicate. The hardest to make well and the best test of a serious shop."],
      ["Tsukemen", "Noodles served separately from a concentrated dipping broth. Excellent, and better in warm weather than a full bowl."],
      ["Mazemen / abura soba", "Broth-less, dressed with tare and fat. Worth ordering if the shop is confident enough to offer it."],
    ],
    signals:
      "Ramen searches weight specialisation heavily: a menu that is mostly ramen outranks a broad Japanese menu with one ramen item, regardless of rating. Named broth styles, mentions of house-made noodles, ajitama and counter seating all count. The card will tell you which of those it found rather than just handing you a number.",
    related: ["japanese-food", "noodles", "pho"],
    situations: ["hungover", "eating-alone", "cold-rainy-night", "sad"],
  },

  {
    s: "pho",
    n: "pho",
    h1: "How to find good pho",
    title: "How to Find Good Pho Near You — What Makes a Good Bowl",
    desc:
      "What separates real pho from brown noodle soup, the northern and southern styles, and how to order it properly.",
    lede:
      "Pho is a clear broth, and clarity is unforgiving. Everything in the bowl is visible and nothing is emulsified, so a stock that was rushed announces itself immediately.",
    good: [
      ["Clear broth that still tastes of beef", "This is the whole craft: a stock simmered gently for many hours, skimmed constantly, never boiled hard. Cloudy broth means it was boiled, and boiled broth tastes muddy no matter how long it cooked."],
      ["Charred ginger and onion, and whole spices", "Star anise, cassia, clove, coriander seed, black cardamom. You should be able to smell the spice before you taste it. A broth that smells of nothing but salt is a stock cube with ambitions."],
      ["Herbs arriving separately", "Thai basil, bean sprouts, lime, chilli on a side plate, added by you. A bowl that arrives fully garnished has made the decision for you and the herbs have already wilted."],
      ["Noodles that are not gluey", "Flat rice noodles, cooked to order, loose in the bowl. Clumped noodles mean they were cooked in advance."],
      ["A place that sells mostly pho", "Same rule as ramen. Broth this slow is not a side project."],
    ],
    order: [
      ["Pho tai", "Rare beef, sliced thin and cooked by the broth at the table. The default, and the best test of how hot the broth actually is."],
      ["Pho dac biet", "The combination — rare beef, brisket, tendon, tripe, meatball. What to order if you want to know what the kitchen can do."],
      ["Pho ga", "Chicken. Lighter, and in many shops quietly better than the beef."],
      ["Northern vs southern", "Northern (Hanoi) pho is spare — wider noodles, just spring onion, no garnish plate. Southern (Saigon) is sweeter, with the full herb plate and hoisin and sriracha on the side. Most American pho is southern."],
      ["Add hoisin to the dish, not the bowl", "Squeezing sauce into the broth means the next spoonful of a stock somebody simmered for eight hours tastes of hoisin. Dip the meat instead."],
    ],
    signals:
      "Searching pho, the matcher looks for reviews describing the broth specifically — clear, rich, fragrant, star anise — because broth quality is what people actually comment on when a place is good, and it never shows up in a star rating. Places whose reviews mention the herb plate and fresh noodles rank higher than places with a higher average and no such detail.",
    related: ["vietnamese-food", "ramen", "soup", "noodles"],
    situations: ["hungover", "sick-with-a-cold", "on-a-budget", "after-a-shift"],
  },

  {
    s: "burgers",
    n: "burgers",
    h1: "How to find a genuinely good burger",
    title: "How to Find a Good Burger Near You — Smash, Pub and Diner Styles",
    desc:
      "What makes a burger good rather than merely large, the difference between a smash patty and a pub patty, and how to find the right one.",
    lede:
      "Burgers fail in a predictable direction: they get bigger. Height is the easiest thing to add and the least related to whether the thing is good, and a burger you cannot compress to mouth height has been designed for a photograph.",
    good: [
      ["The crust on the patty", "Browning is flavour. A smash patty pressed hard onto a hot flat-top develops a dark, craggy crust across its whole surface, and that crust is most of why it tastes better than a thicker, paler patty of the same meat."],
      ["Meat ground close to service, at the right fat ratio", "Around 20% fat is the target. Places that grind in-house say so, and it is worth paying attention to."],
      ["A bun in proportion", "The bun should be soft, lightly toasted, and just big enough. A brioche bun twice the height of the patty is the most common single fault in a modern burger."],
      ["Restraint", "Three or four things. A burger with bacon, two cheeses, onion rings, jalapeños and a fried egg is not a better burger, it is a worse one that costs more."],
      ["Cooked to temperature, if it is thick", "A pub-style burger should be ordered and served at a stated temperature. A smash patty is always cooked through by design, and that is correct rather than a failure."],
    ],
    order: [
      ["Smash", "Thin patties pressed on a flat-top, maximum crust, usually doubled. American cheese, which melts properly, is not a compromise here — it is the right choice."],
      ["Pub / steakhouse", "Thick, medium-rare, on a sturdier bun. A different dish, judged on the meat rather than the crust."],
      ["Diner", "Griddled, simple, with a sliced onion cooked into the patty if you are lucky. The oldest and frequently the best version."],
      ["Green chile, Juicy Lucy, slugburger, butter burger", "Regional versions worth going out of your way for when you are in the right part of the country."],
      ["The plain one, first visit", "Cheeseburger, nothing else. It is the only way to judge the kitchen."],
    ],
    signals:
      "Burger searches read reviews for patty vocabulary — smashed, crusty, griddled, ground in house, cooked to temp — rather than ranking by rating, because the highest-rated burger in a given area is frequently the largest one. If you search for a smash burger specifically, thick pub patties are pushed down even where they score better overall.",
    related: ["sandwiches", "fried-chicken", "bbq"],
    situations: ["hungover", "late-night", "road-trip", "with-picky-eaters"],
  },

  {
    s: "bbq",
    n: "barbecue",
    h1: "How to find good barbecue",
    title: "How to Find Good Barbecue Near You — Regional Styles Explained",
    desc:
      "Texas, Carolina, Memphis, Kansas City and Alabama barbecue are different foods. What each one is, what a good one looks like, and how to find it.",
    lede:
      "Barbecue is regional in a way almost no other American food is, and most disappointment comes from arriving with the wrong region's expectations. Sauce-forward Kansas City ribs and unsauced Central Texas brisket are not competing versions of one dish.",
    good: [
      ["Smoke you can see in the meat", "A pink smoke ring under the bark is evidence of real smoke over a long cook. It is not a guarantee, but its absence on brisket or ribs is close to conclusive."],
      ["Bark", "The dark, dense crust on brisket or pork shoulder, formed over many hours. It should be firm and heavily seasoned, not soft or wet."],
      ["Ribs that do not fall off the bone", "The single most misunderstood point. Properly cooked ribs pull away cleanly with a little resistance. Meat that falls off on its own was steamed or boiled past the point."],
      ["They run out", "A place that sells out by two in the afternoon is cooking a fixed amount overnight. A place with full trays at nine in the evening is holding it or reheating it."],
      ["Sauce on the side, or none", "The best barbecue is served with sauce available rather than applied. Sauce arriving already on the meat is frequently covering for it."],
    ],
    order: [
      ["Central Texas", "Brisket, beef ribs, sausage. Salt and pepper only, post oak, no sauce. Order the fatty brisket — lean is the safer-sounding choice and the worse one."],
      ["North Carolina", "Whole hog, chopped, dressed with vinegar and pepper. Eastern style is vinegar-based; Lexington style adds a little tomato."],
      ["South Carolina", "The mustard belt. Yellow, tangy, and unlike anything else in American barbecue."],
      ["Memphis", "Pork ribs, dry-rubbed or wet, and the pulled pork sandwich with slaw on top."],
      ["Kansas City", "Everything, with a thick sweet tomato-molasses sauce. Burnt ends are the thing to order and a Kansas City invention."],
      ["Alabama", "White sauce — mayonnaise, vinegar, black pepper — on smoked chicken. Regional, strange-sounding, and excellent."],
    ],
    signals:
      "Barbecue searches read for wood type, cook times, named cuts and regional vocabulary, and treat reviews mentioning selling out early as a positive signal rather than a complaint. If you name a region, places whose menus use a different region's language drop down the list even when their rating is higher.",
    related: ["burgers", "fried-chicken", "steak"],
    situations: ["big-group", "friends-visiting", "road-trip", "birthday-dinner"],
  },

  {
    s: "fried-chicken",
    n: "fried chicken",
    h1: "How to find good fried chicken",
    title: "How to Find Good Fried Chicken Near You",
    desc:
      "What makes fried chicken good, the difference between Southern, Nashville hot and Korean styles, and what to look for before you order.",
    lede:
      "Fried chicken is judged in the first second — the sound. A crust that shatters audibly has been fried correctly. One that gives softly has either sat too long or went into oil that was not hot enough.",
    good: [
      ["Fried to order", "Twelve to eighteen minutes, and worth the wait every time. A place that hands you chicken instantly is handing you chicken that has been under a heat lamp."],
      ["Crust that separates from the meat cleanly", "Craggy, blistered, and attached — but not fused into a soggy layer. Wet dough at the interface means the oil was too cool going in."],
      ["Seasoning in the meat, not just on the crust", "Brined or buttermilk-marinated overnight. The test is the last bite of a plain piece: if it tastes of nothing once the crust is gone, only the coating was seasoned."],
      ["Dark meat available", "Thighs are better fried than breasts and a kitchen that pushes them knows what it is doing."],
      ["Oil that smells clean", "A shop that smells acrid rather than nutty is frying in old oil, and you will taste it."],
    ],
    order: [
      ["Southern", "Buttermilk-brined, seasoned flour, cast iron or pressure-fried. The baseline."],
      ["Nashville hot", "Fried, then painted with a cayenne-and-lard paste, served on white bread with pickles. The bread is not a garnish — it is there to absorb the fat and it is the best part."],
      ["Korean", "Twice-fried for a thin, glassy, shatteringly crisp crust, then glazed — soy garlic or gochujang. Lighter than American styles and holds its crunch longer, which is why it travels well."],
      ["Chicken and waffles", "A real tradition rather than a novelty, and a good test of whether a kitchen can balance salt and sweet."],
      ["The sandwich", "Judge it on whether the crust survives contact with the sauce and the bun."],
    ],
    signals:
      "Searching fried chicken, the matcher looks for fried-to-order mentions, named styles, wait times described positively, and specific crust language in reviews. A twenty-minute wait showing up repeatedly in reviews raises a place's score here rather than lowering it, which is the opposite of how a generic ranking treats it.",
    related: ["burgers", "korean-food", "bbq", "sandwiches"],
    situations: ["sad", "on-a-budget", "with-picky-eaters", "moving-day"],
  },

  {
    s: "sandwiches",
    n: "sandwiches",
    h1: "How to find a great sandwich",
    title: "How to Find a Great Sandwich Near You",
    desc:
      "What separates a good sandwich shop from a bad one, the regional sandwiches worth seeking out, and how to spot the difference before you order.",
    lede:
      "A sandwich is the most falsifiable food there is. The ingredients are all visible, nothing is transformed by cooking, and the whole thing stands or falls on bread — which is the component most shops buy in and stop thinking about.",
    good: [
      ["Bread that does the work", "It has to hold structure without shredding the roof of your mouth, and it has to taste of something. A shop that names its bakery is telling you it thought about this."],
      ["Meat sliced to order", "Pre-sliced deli meat oxidises and goes leathery within hours. A slicer running behind the counter is one of the most reliable quality signals in any food category."],
      ["Something acidic", "Pickles, vinegar, giardiniera, pickled onion, a sharp dressing. The most common fault in a mediocre sandwich is that it is all fat and starch with nothing cutting through."],
      ["Built to be eaten, not photographed", "A sandwich stacked six inches high cannot be bitten and will collapse. Proportion beats volume."],
      ["A queue at lunch", "Sandwich shops live on turnover. A busy counter means fresh bread and fast-moving meat; an empty one at 12:30 means neither."],
    ],
    order: [
      ["Italian sub / hoagie / hero / grinder", "Same sandwich, different city. Judge it on the bread and whether there is enough vinegar and oregano."],
      ["Banh mi", "Vietnamese, on a rice-flour baguette, with pâté, pickled daikon and carrot, cilantro and chilli. Among the best value food available anywhere."],
      ["Cheesesteak", "Philadelphia. The argument is about cheese; the actual variable is whether the meat is chopped fine and cooked on the same surface as the onions."],
      ["Italian beef", "Chicago. Ordered dipped, with giardiniera. Structurally unsound by design."],
      ["Cubano, muffuletta, po'boy, French dip", "Regional sandwiches worth seeking out where they belong, all judged on bread first."],
      ["Katsu sando, torta, shawarma wrap", "The same principles in other traditions, and frequently the best sandwich in a given neighbourhood."],
    ],
    signals:
      "Sandwich searches weight bread mentions, house-baked and sliced-to-order language, and named regional styles. Because a sandwich shop's rating is heavily influenced by speed and price, the matcher discounts those and reads for what people actually say about the bread and the filling.",
    related: ["burgers", "vietnamese-food", "brunch"],
    situations: ["work-team-lunch", "on-a-budget", "before-a-flight", "moving-day"],
  },

  {
    s: "dumplings",
    n: "dumplings",
    h1: "How to find good dumplings",
    title: "How to Find Good Dumplings Near You — Styles and What to Order",
    desc:
      "Xiao long bao, potstickers, gyoza, momo, pierogi: what the styles are, what a good one looks like, and how to find them.",
    lede:
      "Dumplings are a texture problem. The filling is usually the easy part; the wrapper — its thickness, its elasticity, whether it tears — is what separates a shop that makes them from a shop that defrosts them.",
    good: [
      ["Wrappers made there", "Hand-rolled wrappers are slightly uneven in thickness, thicker at the pleat and thin at the centre. Machine wrappers are perfectly uniform and usually thicker overall. You can see this before you taste it."],
      ["They hold their shape and their juice", "A soup dumpling that has leaked into the steamer was either overfilled or rested too long. One or two in a basket is normal; all of them is not."],
      ["A crisp base with a soft top", "For potstickers and gyoza, both textures should be present. Uniformly soft means they were steamed only; uniformly hard means they were fried from frozen."],
      ["A short menu, or an enormous specialised one", "Either a shop doing four kinds properly, or a dim sum house with a full kitchen. The dangerous middle is a general restaurant with dumplings as one section."],
      ["People folding them in the window", "The most direct possible evidence, and common enough that it is worth looking for."],
    ],
    order: [
      ["Xiao long bao", "Shanghai soup dumplings. Thin-skinned, filled with aspic that melts into broth. The measure is the number of pleats and whether the skin survives the lift."],
      ["Potstickers / guotie", "Pan-fried on one side, steamed on the other. Often with a lacy starch skirt connecting them, which is a sign of care."],
      ["Har gow and siu mai", "The two dim sum benchmarks. Har gow's translucent shrimp dumpling is the hardest thing on a dim sum cart to make well."],
      ["Gyoza", "Japanese, thinner-skinned and more garlicky than Chinese jiaozi, almost always pan-fried."],
      ["Momo", "Nepali and Tibetan, steamed or fried, served with a tomato-and-chilli sauce that is half the dish."],
      ["Pierogi, manti, khinkali, mandu", "The same idea across Poland, Turkey, Georgia and Korea. Khinkali in particular are worth going out of your way for."],
    ],
    signals:
      "A dumpling search reads for hand-made and hand-folded language, named styles, and reviews describing the wrapper rather than the filling. Dim sum service style is treated as a separate signal, so searching for dim sum prioritises places doing cart or made-to-order service over places that merely list dumplings.",
    related: ["chinese-food", "japanese-food", "korean-food", "noodles"],
    situations: ["nothing-sounds-good", "with-a-toddler", "big-group"],
  },

  {
    s: "noodles",
    n: "noodles",
    h1: "How to find good noodles",
    title: "How to Find Good Noodles Near You — Beyond Ramen and Pho",
    desc:
      "Hand-pulled, knife-cut, dan dan, pad see ew, japchae, bun cha: the noodle dishes worth knowing and how to spot a kitchen that makes them properly.",
    lede:
      "Noodles are the largest food category in the world and the one most flattened by a search box. Typing “noodles” into a map application returns whatever restaurant happens to have the word, which is a poor proxy for a kitchen that can actually pull, cut or fry them properly.",
    good: [
      ["Made on site, where the tradition calls for it", "Hand-pulled lamian and knife-cut daoxiaomian are performances as much as techniques, and shops that do them show it. An uneven noodle is the sign of a good one, not a flaw."],
      ["Wok hei, where it applies", "For fried noodles — pad see ew, char kway teow, chow fun, lo mein — the distinct smoky char from a very hot wok is the whole point. Its absence means an underpowered burner, and no amount of sauce replaces it."],
      ["Texture appropriate to the dish", "Chewy for lamian, springy for ramen, soft and slippery for fresh rice noodle, firm for soba. Uniform softness across every noodle on a menu means one pot of water and no attention."],
      ["Sauce that clings rather than pools", "A properly finished noodle dish has the sauce emulsified onto the noodles. A puddle at the bottom of the bowl means it was poured over at the end."],
      ["Regional specificity on the menu", "A menu that says Lanzhou, Chongqing, Isaan or Chaozhou is making a claim it can be judged on. One that says “Asian noodles” is not."],
    ],
    order: [
      ["Hand-pulled / Lanzhou beef noodle", "Clear beef broth, hand-pulled noodles, radish, chilli oil. Order the noodle thickness you want — most shops offer several."],
      ["Dan dan mian", "Sichuan, sesame and chilli oil, preserved vegetable, minced pork. Should be numbing, not merely spicy."],
      ["Biang biang / knife-cut", "Wide, thick, chewy, from Shaanxi. A completely different texture experience from anything else on this list."],
      ["Pad see ew and pad kee mao", "Thai wide rice noodles, fried hard. Judge on char, not sweetness."],
      ["Japchae", "Korean sweet potato starch noodles, bouncy and translucent, dressed rather than sauced."],
      ["Bun cha and bun bo Hue", "Vietnamese. The first is grilled pork with cold noodles and dipping broth; the second a lemongrass-and-chilli beef soup that deserves to be as famous as pho."],
    ],
    signals:
      "Noodle searches key off the specific dish name rather than the category, because “noodles” is close to meaningless as a filter. Naming hand-pulled, dan dan or pad see ew makes the matcher look for that dish on menus and in reviews, and a place that serves it well but rates lower overall will beat a higher-rated restaurant that merely has a noodle section.",
    related: ["ramen", "pho", "chinese-food", "thai-food"],
    situations: ["on-a-budget", "eating-alone", "nothing-sounds-good", "finals-week"],
  },

  {
    s: "soup",
    n: "soup",
    h1: "Where to find genuinely good soup",
    title: "Where to Find Good Soup Near You",
    desc:
      "Soup is the most-faked thing on a menu. How to find kitchens that actually make it, which soups are worth travelling for, and which ones survive being taken to go.",
    lede:
      "Soup is the single easiest thing on a menu to buy in a bag and reheat, which is why so much restaurant soup tastes broadly the same. The places that make it properly are usually making it as the centre of the business rather than as a starter.",
    good: [
      ["Soup as the main event", "Pho shops, ramen shops, Polish milk bars, Jewish delis, Mexican birrierias and menudo places, Thai boat noodle shops. When the soup is the reason the restaurant exists, it is made properly."],
      ["It changes", "A daily soup that rotates is made in the kitchen. A soup list of eight, available year-round, is being reheated."],
      ["Depth without heaviness", "Good stock tastes of what it was made from and coats the mouth slightly. Bouillon-based soup is salty on the front and disappears immediately afterwards."],
      ["Whole aromatics visible", "Herb stems, a bone, a charred onion, whole spices. Evidence somebody built it rather than reconstituted it."],
      ["Served hot enough", "Genuinely hot, not warm. Soup arriving lukewarm has been sitting in a bain-marie all afternoon."],
    ],
    order: [
      ["Tortilla soup, pozole, menudo, birria consommé", "Mexican soup traditions, often weekend-only, and among the best soup available in the United States."],
      ["Hot and sour, wonton, and Chinese herbal soups", "The hot and sour test is whether it is genuinely both, or just thick and vaguely sweet."],
      ["Tom yum and tom kha", "Thai. Lemongrass, galangal, lime leaf, chilli. Should be aggressive rather than comforting."],
      ["Matzo ball, chicken noodle, avgolemono", "The three great restorative chicken soups, from three traditions."],
      ["Borscht, żurek, solyanka", "Eastern European, sour-forward, and deeply underrated in most American cities."],
      ["Sinigang and bun bo Hue", "Filipino tamarind sour soup and Vietnamese lemongrass beef. Both worth seeking out specifically."],
    ],
    signals:
      "Soup searches deliberately favour restaurants whose menus are built around a soup rather than restaurants that list one. The matcher reads for named soups and for reviews describing the broth, and it treats weekend-only availability — common for menudo, pozole and birria — as a signal of a kitchen making it properly rather than as a limitation.",
    related: ["pho", "ramen", "chinese-food", "thai-food"],
    situations: ["sick-with-a-cold", "cold-rainy-night", "hungover", "sad"],
  },

  {
    s: "seafood",
    n: "seafood",
    h1: "How to find good seafood",
    title: "How to Find Good Seafood Near You — What to Look For",
    desc:
      "How to judge a seafood restaurant, what to order inland versus on the coast, and the signals that separate fresh from thawed.",
    lede:
      "The most useful question at a seafood restaurant is not what is best on the menu. It is what came in today — and whether the staff can answer that without checking.",
    good: [
      ["A short menu that changes", "Fish is seasonal and supply-dependent. A laminated menu with twenty species available all year is serving frozen product, which is not automatically bad but is not what you came for."],
      ["Staff who know the boat or the supplier", "At a good place this is a normal conversation. Vagueness in answer to a direct question is informative."],
      ["Whole fish on the menu", "Hard to fake and hard to hold. A kitchen offering whole roasted or grilled fish is confident in what it is buying."],
      ["It should not smell fishy", "A clean seafood counter or dining room smells of salt water and almost nothing else. A strong fishy smell means age."],
      ["Simple preparations available", "Grilled or roasted with lemon. Heavy sauces and blackening are legitimate techniques and also the standard way to cover for fish that is past its best."],
    ],
    order: [
      ["Whatever is local", "The single best rule. Gulf shrimp on the Gulf, Dungeness on the Pacific Northwest coast, lobster in New England, catfish in the Mississippi delta."],
      ["Raw bar, if the turnover supports it", "Oysters should be shucked to order and listed by name and origin. A generic “oysters” listing is a bad sign."],
      ["Whole grilled fish", "Better value and better eating than fillets almost everywhere, and the best test of the kitchen."],
      ["Inland: go for the preparations that suit frozen", "Fried, cured, smoked, or in a stew. Excellent fried catfish a thousand miles from the sea is far more likely than excellent crudo."],
      ["Chowder, cioppino, bouillabaisse, gumbo", "Seafood stews where the stock is the skill and freshness is less exposed."],
    ],
    signals:
      "Seafood searches read menus for species names and seasonality language, and weight reviews mentioning freshness and daily specials heavily. Distance from the coast is factored in: inland, the matcher gives more weight to preparations that are genuinely good with frozen fish rather than pushing you toward raw preparations that are unlikely to be at their best.",
    related: ["japanese-food", "steak", "greek-food"],
    situations: ["celebrating", "meeting-the-parents", "friends-visiting", "business-dinner"],
  },

  {
    s: "steak",
    n: "steak",
    h1: "How to find a good steakhouse",
    title: "How to Find a Good Steak Near You — What Actually Matters",
    desc:
      "Judging a steakhouse: the grades, the cuts, the crust, and the questions worth asking before you spend a lot of money on beef.",
    lede:
      "Steak is the most expensive thing most people order in a restaurant and the dish where the gap between price and quality is widest. A great deal of what you pay for at a steakhouse is the room.",
    good: [
      ["A crust that is genuinely dark", "The Maillard crust is where steak flavour lives, and it requires far more heat than most home cooking. A grey, evenly cooked steak with no crust has been cooked slowly, which is the most common expensive failure."],
      ["Dry-aging, if they claim it", "Real dry-aging concentrates flavour and produces a distinct nuttiness. Places that dry-age say how long, and 28 to 45 days is the usual range. A vague reference to aged beef usually means wet-aged in a bag, which every piece of beef is."],
      ["Rested, and served hot", "A steak needs several minutes off the heat before it is cut, and a plate hot enough that it does not cool while resting on it."],
      ["A short list of cuts, described properly", "Named cuts with weights and a stated grade. A menu that just says steak is not a steakhouse."],
      ["Sides that someone cares about", "The tell at an expensive steakhouse. If the creamed spinach and the potatoes are an afterthought, the kitchen is coasting on the protein."],
    ],
    order: [
      ["Ribeye", "The most forgiving and most flavourful, because of the intramuscular fat. The default choice if you are unsure."],
      ["Strip / New York strip", "Firmer, beefier, less fat. What to order if you find ribeye too rich."],
      ["Filet", "Tenderest and least flavourful. Genuinely the right answer for some people and worth knowing that the trade is real."],
      ["Hanger, skirt, bavette, flat iron", "The cuts with the most flavour per dollar, common on bistro menus rather than steakhouse ones, and frequently the best value beef in town."],
      ["Medium rare, unless you know otherwise", "And for the fattier cuts, medium is a defensible choice rather than a mistake — ribeye fat needs a little more heat to render."],
      ["Tomahawk, with caution", "A ribeye with a long bone, sold at a premium for the bone. The beef is the same."],
    ],
    signals:
      "Steakhouse searches read for grade and aging language, named cuts, and reviews that describe the crust and the temperature accuracy. Because steakhouses attract high ratings on atmosphere and service, the matcher discounts that portion of the signal and looks specifically for what people say about the beef.",
    related: ["bbq", "seafood", "italian-food"],
    situations: ["business-dinner", "meeting-the-parents", "celebrating", "first-date"],
  },

  {
    s: "brunch",
    n: "brunch",
    h1: "How to find good brunch",
    title: "How to Find Good Brunch Near You — Without the 90-Minute Wait",
    desc:
      "Brunch has a wait problem and a quality problem. How to find places that are good rather than merely popular, and how to avoid the queue.",
    lede:
      "Brunch is the meal most distorted by popularity. It is the highest-margin service of the week, which means a great many restaurants do it without wanting to, and the queue outside a place is frequently a function of its photographs rather than its kitchen.",
    good: [
      ["Eggs cooked properly", "The entire test. Soft scrambled eggs that are still glossy, or a poached egg with a liquid yolk and no rubbery skin. Eggs are cheap, quick and unforgiving, and a kitchen that cannot cook them well is not going to surprise you with anything else."],
      ["Bread and pastry made there", "The other half of the test. Brunch leans heavily on bread, and a place baking its own is doing something that most of its competitors are not."],
      ["A short menu", "Twelve dishes cooked well beats forty. Brunch menus bloat because everyone wants something different, and the kitchen cannot execute all of it at volume."],
      ["Somewhere that serves it on a weekday", "A strong signal. Weekday brunch means a kitchen set up for this food rather than a restaurant renting out its Sunday."],
      ["Coffee that someone thought about", "Not decisive, but a real correlation. Places that take the coffee seriously usually take the rest seriously."],
    ],
    order: [
      ["The egg dish with the fewest components", "Fried eggs, an omelette, eggs on toast. It exposes the kitchen and it is what you actually want."],
      ["Whatever is baked in-house", "The reason to be there rather than at home."],
      ["Savoury over sweet, first visit", "Pancakes and French toast are hard to get wrong and hard to get right, and they tell you less about the kitchen."],
      ["The non-Western versions", "Dim sum, a full Turkish kahvaltı, Mexican chilaquiles and huevos rancheros, Israeli shakshuka, a Vietnamese breakfast pho. All brunch, all generally shorter queues, all frequently better."],
      ["Go at 9am or 2pm", "The queue is a function of the hour more than the restaurant. The same kitchen at 9am is a completely different experience."],
    ],
    signals:
      "Brunch searches specifically discount popularity signals that correlate with waiting rather than quality, and read for house-baked goods, egg preparation mentions, and weekday service. If you include a constraint like no wait, the matcher prioritises places with consistent reviews about being seated quickly over the ones with the longest queues and the highest ratings.",
    related: ["breakfast", "pizza", "sandwiches"],
    situations: ["hungover", "sunday-night", "friends-visiting"],
  },

  {
    s: "breakfast",
    n: "breakfast",
    h1: "How to find a good breakfast",
    title: "How to Find a Good Breakfast Near You — Diners and Beyond",
    desc:
      "Where to get a proper breakfast: what makes a good diner, and the breakfast traditions worth trying instead.",
    lede:
      "Breakfast is the cheapest good meal available in most American towns, and the one where an unremarkable-looking place is most likely to be excellent. The signal is almost entirely about who is inside at seven in the morning.",
    good: [
      ["A full counter at 7am", "Regulars eating alone at a counter on a weekday is the strongest signal in this entire category. It cannot be manufactured and it does not show up in a rating."],
      ["A flat-top that has been running for decades", "A well-seasoned griddle cooks eggs and hash browns differently, and the people who have been working it for years are the reason to be there."],
      ["Home fries or hash browns done properly", "The component most often phoned in. Crisp on the outside, cooked through, seasoned. A pale, steamed pile is a bad sign about everything else."],
      ["Coffee that keeps coming", "Not necessarily good coffee. A diner where the pot comes round without being asked is operating the way it should."],
      ["Cash-only, no website, hand-written specials", "Not a guarantee of anything, but these correlate with places that have not needed to market themselves in forty years."],
    ],
    order: [
      ["Eggs, however you like them, and judge them", "The whole test. If they arrive exactly as ordered, everything else on the menu is probably fine."],
      ["Regional breakfasts", "Biscuits and gravy in the South, scrapple in Philadelphia, loco moco in Hawaii, migas in Texas, a bagel with lox where the bagels are boiled."],
      ["The non-American traditions", "Turkish kahvaltı, Chinese youtiao and soy milk, Japanese teishoku, Mexican chilaquiles, an Indian dosa or idli breakfast. All widely available and all under-ordered at breakfast."],
      ["Whatever is on the hand-written board", "It is there because they have it and they want to sell it today."],
    ],
    signals:
      "Breakfast searches weight early opening hours, counter service and reviews that mention regulars or long-running ownership. The matcher treats an absence of a website as neutral rather than negative, which sounds like a small thing and is the difference between finding the diner and finding the place with the best food photography.",
    related: ["brunch", "sandwiches", "soup"],
    situations: ["hungover", "road-trip", "after-a-shift", "before-a-flight"],
  },

  {
    s: "salad",
    n: "salads",
    h1: "Where to find a salad worth eating",
    title: "Where to Find a Good Salad Near You",
    desc:
      "Most restaurant salads are bad on purpose. How to find the ones that aren't, and the traditions that treat vegetables as the main event.",
    lede:
      "The reason most restaurant salads are disappointing is that they are on the menu as an obligation. Somewhere on the list there has to be something for the person who does not want a main course, and that dish gets no attention from anyone.",
    good: [
      ["Dressing that was made there", "The single biggest variable. A proper vinaigrette or a real Caesar dressing transforms the same leaves. Bottled dressing tastes of sugar and emulsifier and is what most salads are wearing."],
      ["Something substantial in it", "Grains, beans, cheese, nuts, a proper amount of protein. A salad with nothing but leaves and a garnish is a side dish being sold as a meal."],
      ["Acid, salt and fat in balance", "Under-dressed and under-salted is the most common fault. A good salad is seasoned as carefully as anything else on the menu."],
      ["Texture contrast", "Something crunchy against something soft. Uniform texture is why a salad becomes boring four bites in."],
      ["Vegetables that are in season", "A tomato salad in February is a bad idea in any restaurant, at any price."],
    ],
    order: [
      ["Middle Eastern and Levantine", "Fattoush, tabbouleh, and the full mezze spread. Vegetable cooking taken seriously as a tradition rather than as a concession."],
      ["Thai and Lao", "Som tam, larb, yum woon sen. Sharp, hot, salty and sour — the opposite of the limp side salad."],
      ["Italian", "Panzanella, puntarelle, a proper insalata mista dressed at the table."],
      ["Korean banchan", "An entire category of seasoned vegetable dishes, arriving free with the meal."],
      ["A composed salad at a good bistro", "Frisée aux lardons, salade niçoise. Dishes where the salad is the point rather than the alternative."],
    ],
    signals:
      "Salad searches deliberately avoid ranking by restaurants that sell salad as a category and instead read for cuisines and dishes where vegetables are the tradition. If you search for a salad, the matcher will happily return a Lebanese or Thai restaurant over a salad chain, because that is the honest answer to the question.",
    related: ["mediterranean-food", "thai-food", "greek-food"],
    situations: ["hot-day", "work-team-lunch", "before-a-flight", "nothing-sounds-good"],
  },

  {
    s: "curry",
    n: "curry",
    h1: "How to find good curry",
    title: "How to Find Good Curry Near You — Indian, Thai, Japanese and More",
    desc:
      "Curry means a dozen different things across a dozen cuisines. What each one actually is, and how to find a kitchen that does yours properly.",
    lede:
      "Curry is not a dish and barely a category. It is a word colonial administrators applied to everything with a sauce across an entire subcontinent, and using it as a search term is why people end up disappointed.",
    good: [
      ["Whole spices, toasted and ground there", "The clearest divide in Indian cooking. Freshly ground and bloomed spice smells layered and specific; pre-mixed curry powder smells the same in every dish. You can detect this from the doorway."],
      ["Regional specificity on the menu", "A menu that names Kerala, Hyderabad, Goa, Chettinad or Bengal is telling you the kitchen cooks something in particular. A menu with the same twelve dishes in eight protein variants is a template used by thousands of restaurants."],
      ["Different dishes look different", "The most damning fault in a mediocre Indian restaurant is that every curry is the same orange-brown sauce with a different protein. A kitchen cooking properly produces visibly and aromatically distinct dishes."],
      ["Heat that is available, not automatic", "A kitchen confident enough to cook to actual regional heat levels when asked, rather than one mild base sauce with chilli added at the end."],
      ["Rice and bread taken seriously", "Basmati cooked properly, and bread made to order. A tandoor in use is a very good sign."],
    ],
    order: [
      ["South Indian", "Dosa, idli, sambar, rasam, Chettinad and Kerala curries. Coconut, curry leaf, tamarind, mustard seed — a completely different palette from the northern food most people know."],
      ["North Indian and Punjabi", "The tandoor and dairy tradition. Butter chicken, dal makhani, rogan josh."],
      ["Thai", "Green, red, massaman, panang. Coconut, fresh paste pounded rather than jarred, fish sauce. Should be sharp and aromatic rather than sweet."],
      ["Japanese kare", "Thick, mild, sweet, served with rice and a katsu cutlet. Barely related to anything else on this list and excellent on its own terms."],
      ["Malaysian, Burmese and Sri Lankan", "Laksa, ohn no khao swè, Sri Lankan rice and curry. Underrepresented in most American cities and worth finding."],
      ["The thali or rice-and-curry plate", "Several small curries at once. The best possible introduction to a kitchen you do not know."],
    ],
    signals:
      "Searching for curry, the matcher asks which one, because the honest answer depends entirely on the cuisine. It reads menus for regional names and for dish-level vocabulary, and weights reviews that mention specific dishes over reviews that praise the buffet. Naming a region in your search is the single biggest improvement you can make to the result.",
    related: ["indian-food", "thai-food", "japanese-food"],
    situations: ["cold-rainy-night", "stressed", "vegetarians-and-meat-eaters", "finals-week"],
  },

  {
    s: "wings",
    n: "wings",
    h1: "How to find good wings",
    title: "How to Find Good Chicken Wings Near You",
    desc:
      "What makes a wing good, the difference between fried, smoked and baked, and the regional styles worth knowing.",
    lede:
      "A wing is judged on skin. Everything else — the sauce, the heat, the dip — is a variable you can choose, but a soft, pale, flabby skin cannot be rescued by any of them.",
    good: [
      ["Skin that is rendered and crisp", "This takes either a double-fry, a long rest, or a dry brine in the fridge overnight. Places that do one of those produce a fundamentally different wing, and it stays crisp under sauce for a few minutes rather than collapsing on contact."],
      ["Sauced to order", "Tossed when you order, not held in a warmer in sauce. Wings sitting in liquid go soft within minutes, and that is what most disappointing wings are."],
      ["Real Buffalo sauce, if that is what is claimed", "Cayenne hot sauce and butter, emulsified. Thick, sweet, ketchup-based sauce labelled buffalo is a different thing."],
      ["Fresh, not frozen", "Frozen wings release water into the fryer and steam themselves. Menus that say fresh, never frozen are making a claim that matters here more than in most categories."],
      ["A fryer that is not doing everything", "A kitchen frying wings in the same tired oil as everything else produces wings that taste of everything else."],
    ],
    order: [
      ["Buffalo", "The original, from Buffalo, New York. Fried naked — no breading — then tossed in cayenne and butter, with blue cheese and celery."],
      ["Korean", "Twice-fried, thin glassy crust, soy-garlic or gochujang glaze. Stays crisp longer than any other style."],
      ["Smoked then fried", "Barbecue crossover. Smoke flavour with a crisp finish, and increasingly common at good barbecue places."],
      ["Salt and pepper, Cantonese style", "Fried with garlic, chilli and spring onion, unsauced. Frequently the best wings in a given town and almost never on a wings list."],
      ["Jamaican jerk and Thai fish sauce wings", "Two regional preparations that are worth ordering over the default whenever you see them."],
      ["Whole wings over split", "Where available. More skin, more rendering, better eating."],
    ],
    signals:
      "Wing searches read for frying technique and skin language in reviews — crispy, double-fried, never frozen, sauced to order — and treat sports-bar ratings with suspicion, since those track the atmosphere and the screens as much as the food. Naming a style narrows it considerably.",
    related: ["fried-chicken", "korean-food", "bbq"],
    situations: ["big-group", "late-night", "on-a-budget"],
  },

  {
    s: "mexican-food",
    n: "Mexican food",
    h1: "How to find good Mexican food",
    title: "How to Find Good Mexican Food Near You — Beyond Tacos",
    desc:
      "Mexican food is regional and enormous. What to look for, which regional traditions to seek out, and how to tell a serious kitchen from a combo-plate restaurant.",
    lede:
      "Mexico has more distinct regional cuisines than most continents, and the version that became standard in the United States is a narrow slice of northern border cooking. The good news is that almost every American city now has more than that, if you know what to search for.",
    good: [
      ["Corn treated properly", "Nixtamalised corn, ideally ground on site. A kitchen making its own masa is making a serious commitment, and it changes every tortilla, tamal and sope that leaves the kitchen."],
      ["Chillies named individually", "Guajillo, ancho, pasilla, morita, chile de árbol. A menu that names its chillies is describing specific flavours. One that says spicy is not."],
      ["Regional labels", "Oaxacan, Yucatecan, Poblano, Sinaloan, Jalisciense. These are meaningful claims about a specific tradition."],
      ["Salsas made there, plural", "Several, at different heats, from different chillies. The house salsa selection is the fastest read on a kitchen."],
      ["Not a combo plate menu", "Rice and beans with everything, under melted yellow cheese, is Tex-Mex — a real and good cuisine with its own history, and a different one."],
    ],
    order: [
      ["Oaxacan", "Moles — there are seven classic ones — tlayudas, and string cheese. Mole negro takes days and dozens of ingredients and is one of the great dishes on earth."],
      ["Yucatecan", "Cochinita pibil, achiote, sour orange, habanero. Completely distinct from anything else and unmistakable."],
      ["Poblano", "Mole poblano, chiles en nogada in season, cemitas."],
      ["Coastal Sinaloan and Nayarit", "Aguachile, ceviche, pescado zarandeado. Bright, citrus-heavy seafood cooking."],
      ["Birria and barbacoa", "Jalisco and central Mexico. Slow-braised, and frequently weekend-only."],
      ["Tex-Mex, on its own terms", "Queso, fajitas, puffy tacos. Not lesser — just a different cuisine with its own standards."],
    ],
    signals:
      "Mexican searches read for regional vocabulary and for the words that indicate a kitchen making things from scratch — nixtamal, masa, mole, named chillies. The matcher also distinguishes Tex-Mex from regional Mexican rather than blending them, so a search for mole will not return you a fajita restaurant with a higher rating.",
    related: ["tacos", "salad", "soup"],
    situations: ["with-a-toddler", "birthday-dinner", "moving-day", "after-a-workout"],
  },

  {
    s: "chinese-food",
    n: "Chinese food",
    h1: "How to find good Chinese food",
    title: "How to Find Good Chinese Food Near You — Regional Cuisines Explained",
    desc:
      "Sichuan, Cantonese, Hunan, Shanghainese, Xinjiang and Northeastern: what the regional cuisines actually are and how to find them.",
    lede:
      "There is no such thing as Chinese food in the sense the phrase is usually used. There are at least eight major regional cuisines that differ from each other roughly as much as Italian differs from Swedish, and the most useful thing you can do is learn which one you want.",
    good: [
      ["A regional identity, stated", "Sichuan, Hunan, Cantonese, Shanghainese, Dongbei, Xinjiang, Fujianese. A restaurant that names its region is cooking something specific. One that offers all of it is cooking a takeout menu."],
      ["Two menus, or a second page", "Common and worth asking about. Many restaurants run a translated regional menu alongside the American-Chinese one, and it is frequently where the good food is."],
      ["Wok hei", "The smoky char of a properly hot wok, unmistakable in fried rice, chow fun and stir-fried greens. Underpowered burners cannot produce it."],
      ["Vegetables cooked with attention", "Stir-fried greens with garlic is the cheapest thing on many menus and one of the best tests of the kitchen."],
      ["Numbing, not just hot", "For Sichuan food specifically. Real Sichuan peppercorn produces a tingling numbness distinct from chilli heat. Its absence means the kitchen is cooking Sichuan-style rather than Sichuan."],
    ],
    order: [
      ["Sichuan", "Mapo tofu, dan dan mian, shuizhu fish, dry-fried green beans. Numbing and hot, and far more varied than its reputation."],
      ["Cantonese", "Dim sum, roast meats, steamed fish, clay pots. The most restrained and technically demanding of the major cuisines."],
      ["Hunan", "Hotter than Sichuan and without the numbing. Smoked and cured meats, pickled chillies."],
      ["Shanghainese", "Xiao long bao, red-braised pork, drunken chicken. Sweeter and richer, soy and sugar forward."],
      ["Dongbei / Northeastern", "Wheat rather than rice, cumin lamb, dumplings, pickled cabbage. Hearty and increasingly common in American cities."],
      ["Xinjiang", "Uyghur cooking — hand-pulled laghman, cumin lamb skewers, big plate chicken. Central Asian rather than East Asian in character."],
      ["American Chinese", "General Tso's, crab rangoon, chop suey. A genuine and historically significant American regional cuisine. Judge it on its own terms rather than as a failed imitation."],
    ],
    signals:
      "Chinese searches key off regional names first. Searching for Sichuan food returns kitchens whose menus and reviews use Sichuan vocabulary rather than the highest-rated restaurant with the word Chinese on the sign, and mentions of a separate or translated menu are treated as a strong positive signal.",
    related: ["dumplings", "noodles", "soup"],
    situations: ["big-group", "sunday-night", "late-night", "vegetarians-and-meat-eaters"],
  },

  {
    s: "indian-food",
    n: "Indian food",
    h1: "How to find good Indian food",
    title: "How to Find Good Indian Food Near You — Regions and What to Order",
    desc:
      "North Indian, South Indian, Bengali, Gujarati and beyond: how to find a kitchen cooking something specific rather than the standard template menu.",
    lede:
      "Most Indian restaurants outside India run some version of the same North Indian menu, which was itself shaped by Punjabi migration and British tastes. It can be very good. It is also about two per cent of what Indian food is.",
    good: [
      ["Spices ground and bloomed in the kitchen", "The difference between layered, specific aroma and the generic smell of curry powder. This is perceptible before you sit down."],
      ["A stated region", "Kerala, Chettinad, Hyderabad, Goa, Bengal, Gujarat, Andhra. Naming one is a claim the kitchen can be held to."],
      ["Distinct sauces", "If the dishes look like the same base gravy with different proteins, that is exactly what they are. Good kitchens produce visually and aromatically different dishes."],
      ["A working tandoor", "Bread made to order, and meat with actual char. Naan reheated from earlier is immediately obvious."],
      ["Serious vegetarian cooking", "In much of India vegetarian food is the default rather than the accommodation. A menu with a deep vegetarian section is a sign of a kitchen cooking from a real tradition."],
    ],
    order: [
      ["South Indian", "Dosa, idli, uttapam, sambar, rasam. Rice and lentil based, fermented, light, and almost entirely different from northern food. Usually the best value Indian food in any city."],
      ["Chettinad and Andhra", "The hottest regional cuisines, black pepper and dried chilli forward, and superb."],
      ["Kerala", "Coconut, curry leaf, seafood, appam. Distinctively bright."],
      ["Hyderabadi", "Biryani cooked in the dum style, sealed and steamed. A properly made biryani is a different dish from rice with curry poured over it."],
      ["Bengali and Gujarati", "Mustard oil, freshwater fish and panch phoron in one; sweet-sour vegetarian thalis in the other. Both rare and both worth finding."],
      ["The thali", "Several dishes at once, often unlimited. The best possible way to judge an unfamiliar kitchen."],
    ],
    signals:
      "Indian searches read heavily for regional vocabulary and for individual dish names, because the template menu is so widespread that a generic search returns the same restaurant everywhere. Searching for dosa or biryani specifically will surface a South Indian or Hyderabadi kitchen that a general search would bury under higher-rated North Indian restaurants.",
    related: ["curry", "soup", "noodles"],
    situations: ["vegetarians-and-meat-eaters", "sunday-night", "on-a-budget", "cold-rainy-night"],
  },

  {
    s: "thai-food",
    n: "Thai food",
    h1: "How to find good Thai food",
    title: "How to Find Good Thai Food Near You — Regional Styles and Real Heat",
    desc:
      "How to find Thai cooking that isn't sweetened for export, what the regional styles are, and what to order beyond pad thai.",
    lede:
      "Thai food is built on a balance of hot, sour, salty and sweet. The version that travelled abroad tends to have the sweet dial turned up and the other three turned down, which is why so much of it tastes broadly the same.",
    good: [
      ["Sour and salty as loud as the sweet", "Fish sauce, lime, tamarind and chilli all present and assertive. A dish that is mostly sweet with a little heat has been adjusted."],
      ["Curry paste pounded in the kitchen", "Fresh paste smells of galangal, lemongrass and lime leaf. Jarred paste is flatter and more uniform, and it is what most curries are made from."],
      ["A regional label", "Isaan, Northern, Southern. Isaan in particular — the food of the northeast — is a distinct cuisine with som tam, larb, grilled meats and sticky rice."],
      ["Heat that is real when asked for", "A kitchen that will actually cook Thai-hot rather than adding chilli flakes at the end. Reviews from Thai customers are the best evidence of this."],
      ["A second menu", "As with Chinese restaurants, plenty of Thai kitchens run a separate menu. Asking is worth it."],
    ],
    order: [
      ["Som tam", "Green papaya salad, pounded to order. The single best test of an Isaan kitchen — it should be fiercely hot, sour and funky."],
      ["Larb", "Minced meat with toasted rice powder, lime, chilli and herbs. Should be dry and sharp, not saucy."],
      ["Khao soi", "Northern Thai coconut curry noodle soup with crisp noodles on top. One of the great noodle dishes and still uncommon."],
      ["Boat noodles", "Dark, intense, spiced beef or pork noodle soup. Small bowls, ordered several at a time."],
      ["Southern curries", "Gaeng som, gaeng tai pla. The hottest food in Thailand and rarely found abroad."],
      ["Pad thai, knowingly", "A genuine dish and a good one, and also the dish most likely to have been sweetened into candy. Judge a kitchen by anything else first."],
    ],
    signals:
      "Thai searches read for regional terms and for specific dishes rather than ranking by rating, because the highest-rated Thai restaurant in a given area is often the one most adjusted to a general palate. Reviews mentioning real heat, Isaan dishes, or a separate menu push a place up substantially.",
    related: ["curry", "noodles", "salad", "soup"],
    situations: ["hot-day", "sick-with-a-cold", "work-team-lunch", "vegetarians-and-meat-eaters"],
  },

  {
    s: "japanese-food",
    n: "Japanese food",
    h1: "How to find good Japanese food",
    title: "How to Find Good Japanese Food Near You — Beyond Sushi",
    desc:
      "Izakaya, teishoku, yakitori, tonkatsu, soba: the Japanese restaurant formats worth knowing, and how to find them.",
    lede:
      "Japanese restaurants abroad are heavily skewed toward sushi, which is one part of a large cuisine and by some distance the most expensive part. The better value and frequently the better eating is in the formats that did not travel as loudly.",
    good: [
      ["Specialisation", "Japanese restaurant culture is built around doing one thing. A shop that sells only tonkatsu, or only soba, or only yakitori is the norm in Japan and a strong signal abroad. A menu offering sushi, ramen, teriyaki and tempura is an export format."],
      ["Rice cooked properly", "Underrated and central. Good short-grain rice, cooked and held correctly, is the foundation of most of the cuisine."],
      ["Dashi that tastes of something", "The stock underlying an enormous share of Japanese cooking. Made with real katsuobushi and kombu it has a distinct smoky depth; made from granules it is flat and salty."],
      ["A counter", "Most Japanese formats are counter-first — sushi, yakitori, ramen, tempura. It is the correct seat, not the overflow one."],
      ["A set menu at lunch", "Teishoku sets are how most of Japan eats lunch and are almost always the best value on the menu."],
    ],
    order: [
      ["Izakaya", "Small plates with drinks. Grilled fish, karaage, agedashi tofu, pickles. The most sociable Japanese format and the best for a group."],
      ["Yakitori", "Charcoal-grilled chicken, skewer by skewer, every part of the bird. A good yakitori-ya is a serious thing."],
      ["Tonkatsu", "Panko-crusted pork cutlet, with shredded cabbage and rice. Simple and exacting."],
      ["Soba and udon", "Buckwheat and wheat noodles. Handmade soba is a craft food and worth seeking out specifically."],
      ["Teishoku", "A set meal — main, rice, miso soup, pickles. The everyday Japanese meal and rarely found abroad outside dedicated shops."],
      ["Kissaten and Japanese curry", "Old-style coffee shops and thick, sweet kare raisu. Both comfort food and both excellent."],
    ],
    signals:
      "Japanese searches weight specialisation strongly: a shop doing one format outranks a general Japanese restaurant with a higher rating. Naming a format — yakitori, tonkatsu, izakaya, soba — filters out the export-menu restaurants that would otherwise dominate on volume of reviews.",
    related: ["sushi", "ramen", "noodles", "curry"],
    situations: ["eating-alone", "business-dinner", "before-a-flight", "after-a-workout"],
  },

  {
    s: "korean-food",
    n: "Korean food",
    h1: "How to find good Korean food",
    title: "How to Find Good Korean Food Near You — Barbecue and Everything Else",
    desc:
      "Korean barbecue, stews, noodles and takeout — and the banchan that tell you everything about a kitchen before you order. How to find one doing it properly.",
    lede:
      "The fastest way to judge a Korean restaurant is to look at what arrives before you order anything. Banchan — the small side dishes — are made in-house at good places and bought in at indifferent ones, and the difference is visible immediately.",
    good: [
      ["Banchan that are varied and clearly house-made", "Six to twelve small dishes, changing with what is good, refilled without asking. Three tired dishes from a tub is the single clearest negative signal in the cuisine."],
      ["Kimchi with actual fermentation", "Sour, funky, complex — not just salty and spicy. Under-fermented kimchi tastes like a spicy salad and means it was made last week or bought."],
      ["Charcoal, for barbecue", "Charcoal grills produce a genuinely different result from gas or electric, and places using them advertise it. Worth choosing on."],
      ["Stews served actively boiling", "Jjigae should arrive still bubbling in a stone pot. Anything less means it was ladled from a holding pot."],
      ["Somewhere that is not only barbecue", "Korean barbecue is the export success, and the stew, noodle and rice-dish side of the cuisine is where a lot of the best eating is."],
    ],
    order: [
      ["Barbecue", "Samgyeopsal (pork belly), galbi (marinated short rib), chadolbagi (brisket). Cooked at the table, wrapped in lettuce with ssamjang."],
      ["Jjigae", "Kimchi jjigae, sundubu (soft tofu), doenjang. Everyday food and frequently better than the barbecue."],
      ["Bibimbap, in a stone bowl", "Dolsot bibimbap crisps the rice against the hot stone, which is most of the point."],
      ["Naengmyeon", "Cold buckwheat noodles in an icy broth. Extraordinary in hot weather and unlike anything else."],
      ["Korean fried chicken", "Twice-fried, glazed, and better than it has any right to be."],
      ["Bossam and jokbal", "Boiled pork belly and braised pig trotter, both for sharing, both underordered."],
    ],
    signals:
      "Korean searches read reviews for banchan quality and variety, charcoal grilling, and named dishes beyond barbecue. Because Korean barbecue restaurants attract high volumes of reviews, the matcher looks past that to find the stew and noodle kitchens when that is what you asked for.",
    related: ["fried-chicken", "wings", "noodles", "dumplings"],
    situations: ["big-group", "celebrating", "cold-rainy-night", "after-a-workout"],
  },

  {
    s: "vietnamese-food",
    n: "Vietnamese food",
    h1: "How to find good Vietnamese food",
    title: "How to Find Good Vietnamese Food Near You — Beyond Pho",
    desc:
      "Banh mi, bun cha, com tam, bun bo Hue: the Vietnamese dishes worth knowing, and how to tell a serious kitchen.",
    lede:
      "Vietnamese food abroad is dominated by pho, which is genuinely great and also the least representative dish to judge a kitchen on, because a restaurant can make one excellent broth and be mediocre at everything else.",
    good: [
      ["Herbs, fresh and in quantity", "Vietnamese cooking uses herbs as an ingredient rather than a garnish — mint, perilla, cilantro, Thai basil, rau ram. A stingy herb plate tells you about the whole kitchen."],
      ["Nuoc cham balanced properly", "The fish sauce dipping mixture that dresses half the menu. It should be light, bright and balanced between sweet, sour, salty and hot. Heavy and sweet is the common failing."],
      ["Regional labels", "Hue, Hanoi, Saigon. Central Vietnamese food — Hue in particular — is spicier and more complex than the southern food most people know."],
      ["Grilled over charcoal", "For bun cha, com tam and thit nuong. Charcoal char is essential to those dishes and gas is a real downgrade."],
      ["Banh mi bread that shatters", "A proper Vietnamese baguette has a thin, crackly crust and an airy, almost hollow interior. A dense bakery baguette makes a heavy, disappointing sandwich."],
    ],
    order: [
      ["Bun cha", "Hanoi. Grilled pork patties in a warm dipping broth, with cold rice noodles and herbs. Arguably better than pho and far less known."],
      ["Bun bo Hue", "Central Vietnam. Lemongrass and chilli beef noodle soup, more assertive than pho in every direction."],
      ["Com tam", "Broken rice with grilled pork chop, shredded pork skin and a steamed egg cake. Saigon street food and a complete meal."],
      ["Banh xeo and banh khot", "Crisp turmeric crepes and small coconut pancakes, wrapped in herbs and lettuce."],
      ["Banh mi", "The sandwich. Judge on the bread first, pâté second."],
      ["Ca kho to", "Fish braised in a clay pot with caramel and pepper. Home cooking, rarely on export menus, excellent when it is."],
    ],
    signals:
      "Vietnamese searches read for dish names beyond pho and for regional labels, and treat herb-plate and charcoal mentions in reviews as meaningful. Searching bun cha or com tam will surface kitchens that a generic Vietnamese search would never return, because those places often have fewer reviews and lower visibility.",
    related: ["pho", "sandwiches", "noodles", "salad"],
    situations: ["hot-day", "work-team-lunch", "before-a-flight", "on-a-budget"],
  },

  {
    s: "italian-food",
    n: "Italian food",
    h1: "How to find good Italian food",
    title: "How to Find Good Italian Food Near You — Regional, Not Generic",
    desc:
      "How to tell a real Italian kitchen from a red-sauce template, what the regional cuisines are, and what to order.",
    lede:
      "Italy has no national cuisine. It has twenty regional ones that have been resisting each other for centuries, and the generic Italian-American menu — which is a real cuisine with its own history — is what fills the gap abroad.",
    good: [
      ["A short menu that changes", "Italian cooking is seasonal and ingredient-led. A menu of eighty dishes available year-round is being executed from a freezer."],
      ["Pasta made there", "Fresh egg pasta for the shapes that call for it, and good dried pasta — bronze-cut, rough-surfaced — for the ones that do not. Fresh is not automatically better; the right one for the dish is."],
      ["Sauce that clings", "Pasta finished in the pan with the sauce and a little cooking water, emulsified. Sauce ladled on top of drained pasta is the single most common tell."],
      ["Regional identity", "Roman, Sicilian, Neapolitan, Emilian, Tuscan, Pugliese. These cuisines differ enormously and a kitchen that names one is telling you something."],
      ["Restraint with garlic and cheese", "Much Italian-American cooking is defined by an abundance of both, which is its own tradition. Regional Italian cooking generally is not."],
    ],
    order: [
      ["Roman", "Cacio e pepe, carbonara, amatriciana, gricia. Four pasta dishes from almost nothing, and a brutal test of technique."],
      ["Emilian", "Bologna and Modena. Fresh egg pasta, ragù, tortellini in brodo, parmigiano and balsamic."],
      ["Sicilian", "Arab and North African influence. Pasta con le sarde, caponata, arancini, granita."],
      ["Neapolitan", "Pizza, but also ragù napoletano, seafood, and a completely different register from the north."],
      ["Tuscan and Pugliese", "Grilled meat, beans and bread in one; orecchiette, vegetables and olive oil in the other."],
      ["Italian-American, on its own terms", "Chicken parm, baked ziti, Sunday gravy. A genuine and excellent cuisine, and best judged as itself rather than as a bad copy."],
    ],
    signals:
      "Italian searches read for regional labels and named dishes, and distinguish Italian-American from regional Italian rather than merging them. A search for cacio e pepe will prioritise a Roman kitchen over a higher-rated general Italian restaurant that happens to list it.",
    related: ["pizza", "steak", "seafood"],
    situations: ["first-date", "meeting-the-parents", "birthday-dinner", "business-dinner"],
  },

  {
    s: "mediterranean-food",
    /* Title reads "Mediterranean & Middle Eastern Restaurants Near You".
       "middle eastern foods near me" reaches this page and there is no separate
       Middle Eastern guide — this page already covers Lebanese, Turkish, Persian,
       Palestinian and Egyptian cooking, so naming it is accurate, not a stretch. */
    near: "Mediterranean & Middle Eastern",
    n: "Mediterranean food",
    h1: "How to find good Mediterranean food",
    title: "How to Find Good Mediterranean and Middle Eastern Food Near You",
    desc:
      "Lebanese, Turkish, Israeli, Persian, Palestinian, Egyptian: what the term covers, and how to find kitchens cooking something specific.",
    lede:
      "Mediterranean on a sign usually means one of several distinct Levantine, Turkish or Persian cuisines, flattened into a single word for an audience assumed not to know the difference. Learning the difference is the whole improvement.",
    good: [
      ["Bread made there", "Pita or lavash from an oven on site, arriving hot and puffed. This is the most reliable single indicator in the whole category and it is immediately obvious."],
      ["Hummus that is smooth and warm", "Properly made hummus is silky, generously dressed with olive oil, and frequently served warm. Cold, grainy, thick hummus from a tub is the default elsewhere."],
      ["A real mezze selection", "Ten or more small dishes. Muhammara, labneh, baba ganoush, kibbeh, manakish. Depth here means a kitchen cooking a tradition."],
      ["Charcoal grilling", "For kebabs of any kind. Gas produces a fundamentally different and lesser result, and places using charcoal say so."],
      ["A named country", "Lebanese, Turkish, Persian, Palestinian, Syrian, Egyptian, Israeli, Greek. The specificity is the signal."],
    ],
    order: [
      ["Lebanese", "The mezze tradition at its deepest. Also the best entry point to the region."],
      ["Turkish", "Kebabs, pide, lahmacun, and kahvaltı — the enormous Turkish breakfast spread, which is one of the great meals anywhere."],
      ["Persian", "Rice cooked with a crisp tahdig crust, herb stews like ghormeh sabzi, saffron and dried lime. Distinct from Arab cooking in every direction."],
      ["Palestinian and Syrian", "Musakhan, maqluba, fatteh. Increasingly present in American cities."],
      ["Egyptian", "Koshari — rice, lentils, pasta, fried onion, tomato and vinegar. Cheap, filling and unlike anything else."],
      ["Greek", "Its own tradition, covered separately, and frequently what a Mediterranean sign actually means."],
    ],
    signals:
      "Searches in this category try to resolve to a specific cuisine, because Mediterranean as a filter returns everything from a Greek diner to a Persian kebab house. The matcher reads for country-specific dish names and for bread and charcoal mentions, which are the two signals that most reliably separate a real kitchen from a wrap counter.",
    related: ["greek-food", "salad", "seafood"],
    situations: ["work-team-lunch", "vegetarians-and-meat-eaters", "after-a-workout", "job-interview-lunch"],
  },

  {
    s: "greek-food",
    n: "Greek food",
    h1: "How to find good Greek food",
    title: "How to Find Good Greek Food Near You — Taverna, Not Diner",
    desc:
      "How to find Greek cooking beyond the gyro counter: what a real taverna menu looks like and what to order.",
    lede:
      "Greek food in the United States mostly means a gyro, a Greek salad and a diner. All three are fine, and none of them is much like eating in Greece, where the cooking is vegetable-heavy, olive-oil-based and seasonal.",
    good: [
      ["Olive oil used generously and well", "Greek cooking is built on it. Vegetable dishes in the ladera tradition are cooked in olive oil until soft and served at room temperature, and they are the heart of the cuisine."],
      ["Vegetable dishes as mains", "Gigantes, briam, horta, gemista, fasolakia. A menu with a real section of these is cooking Greek food rather than Greek-diner food."],
      ["Whole grilled fish, sold by weight", "The standard at a good taverna. Being shown the fish before it is cooked is normal and a good sign."],
      ["Feta that is actual feta", "Sheep and goat milk, brined, sharp and crumbly. Cubes of mild white cheese are not the same thing."],
      ["Yoghurt and lemon everywhere", "Both used as seasoning rather than garnish. Tzatziki should be thick, sharp and heavy with garlic."],
    ],
    order: [
      ["Mezedes", "The small plates. Taramasalata, tirokafteri, saganaki, grilled octopus, dolmades. Order several and share."],
      ["Horta", "Boiled wild greens with olive oil and lemon. Simple, cheap, and a genuine test of whether a kitchen cares."],
      ["Whole grilled fish", "Branzino, sea bream, sardines. With nothing but oil, lemon and oregano."],
      ["Slow-cooked meat", "Kleftiko, stifado, youvetsi. The winter side of the cuisine and rarely on export menus."],
      ["Souvlaki and gyro, properly", "Judge on the pita — it should be soft, oiled and grilled — and on whether the meat is cut from a real vertical spit."],
      ["Loukoumades and galaktoboureko", "The dessert tradition is strong and consistently underordered."],
    ],
    signals:
      "Greek searches distinguish taverna-style restaurants from gyro counters and Greek-American diners, which are three different things that all match the same keyword. The matcher reads for vegetable dishes, whole fish and mezze depth on menus, so asking for Greek food returns a taverna rather than the highest-rated diner with Greek in the name.",
    related: ["mediterranean-food", "seafood", "salad"],
    situations: ["with-a-toddler", "sunday-night", "vegetarians-and-meat-eaters"],
  },
];
