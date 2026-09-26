/* The third batch of /food/ guides — dishes, formats and cuisines that people
 * search "near me" for in large numbers and that the first 68 did not cover.
 *
 * WHY THESE
 * The first two batches showed which kind of page this site can actually rank:
 * a dish or cuisine guide, answering "korean restaurants near me" with something
 * more useful than a directory. Every entry here is the same bet on a query the
 * site had no page for — "hibachi near me", "korean bbq near me", "soul food
 * near me", "biryani near me", "philly cheesesteak near me" — chosen because the
 * search is common and the question under it ("is this one any good?") has a
 * real answer that differs from dish to dish.
 *
 * Several of them are also the regional dishes the city pages already name
 * (hot chicken in Nashville, cheesesteak in Philadelphia, crawfish in New
 * Orleans), so the city pages finally have a guide to link those dishes to.
 *
 * Same contract as dishes.js and dishes-more.js. `good` carries each page and is
 * written per entry. No restaurant is named anywhere.
 */

module.exports = [
  /* ---- dishes and formats ------------------------------------------------- */
  {
    s: "hibachi",
    place: "Hibachi Restaurants",
    n: "hibachi",
    h1: "How to find good hibachi",
    desc:
      "What separates a good hibachi grill from a show with a griddle, what to order, and how to find hibachi near you worth the price.",
    lede:
      "What Americans call hibachi is teppanyaki: a chef cooking steak, shrimp, fried rice and vegetables on a flat iron griddle in front of the table, usually with an onion volcano along the way. The show is the same everywhere. The food is not, and that is the part worth choosing on.",
    qa: ["What is hibachi?", "In the US, hibachi means teppanyaki: meat, seafood, fried rice and vegetables cooked on a flat iron griddle at your table by a chef who performs while cooking. In Japan a hibachi is actually a small charcoal brazier. The American version is a group dinner and a show as much as a meal."],
    good: [
      ["The protein is cooked to order, not just cooked", "Ask for the steak medium-rare and see whether it arrives that way. A good teppanyaki chef times each person's protein separately; a mediocre one cooks everything in one pile until it is all grey."],
      ["Fried rice made on the grill", "Day-old rice, egg cracked on the iron, butter and soy, finished in front of you. Rice brought out of the kitchen pre-made has skipped the one thing the grill does best."],
      ["The sauces are house-made", "Yum yum sauce (the pink mayonnaise one) and ginger sauce both come from bottles at a lot of chains. A sharp, fresh ginger sauce is the quickest sign someone in the kitchen cares."],
      ["Fresh vegetables, not a frozen medley", "Zucchini, onion and mushroom cut that day have bite. A bag of frozen stir-fry mix steams on the iron and never browns."],
      ["The grill is clean between courses", "A chef who scrapes and oils the iron between the vegetables and the steak is cooking; one who does not is putting on a show on a dirty pan."],
    ],
    order: [
      ["Steak and shrimp combination", "The standard for a reason: the iron is ideal for both, and it shows whether the chef can time two proteins at once."],
      ["Upgrade to fried rice", "Often a small extra charge over steamed rice. It is the dish the format was built for."],
      ["Scallops", "Where they are fresh, a good griddle gives them a real sear in under two minutes."],
      ["Filet over sirloin if the gap is small", "Sliced thin and cooked fast, a better cut makes a visible difference."],
      ["The sushi bar, only if it is separate", "Many hibachi restaurants have one. It is usually the weaker half of the menu."],
    ],
    signals:
      "Hibachi searches read menus for teppanyaki service specifically, so a Japanese restaurant with a griddle table outranks one that only sells a hibachi-style plate from the kitchen. Reviews that mention the chef, birthdays and big tables weigh heavily, because for most people choosing hibachi the table is the point.",
    related: ["japanese-food", "steak", "sushi"],
    situations: ["birthday-dinner", "big-group", "with-picky-eaters"],
  },
  {
    s: "korean-bbq",
    place: "Korean BBQ Restaurants",
    n: "Korean barbecue",
    near: "Korean BBQ",
    h1: "How to find good Korean barbecue",
    desc:
      "Charcoal or gas, all-you-can-eat or à la carte, galbi or pork belly — how to pick a good Korean BBQ restaurant and what to order.",
    lede:
      "Korean barbecue is raw meat grilled at the table, eaten wrapped in lettuce with garlic, ssamjang and a spread of banchan. The grill is only half of it. The quality of the meat and the banchan decide whether it is a great night or an expensive smoky one.",
    qa: ["Is all-you-can-eat Korean BBQ worth it?", "For a big group that wants volume, often yes. For quality, usually not: all-you-can-eat places keep costs down with thin, heavily marinated, often frozen cuts. An à la carte Korean barbecue restaurant costs more per head but serves thicker, better meat that is actually worth grilling."],
    good: [
      ["Charcoal, if you can get it", "Real charcoal grills give a smoky crust that gas cannot. Many good places use gas, but a charcoal restaurant is usually a serious one."],
      ["Thick, fresh-cut pork belly", "Samgyeopsal should arrive as thick slabs of raw belly with visible layers, not thin frozen curls. It is the clearest test of a restaurant's butchery."],
      ["Marinades that taste of something", "Galbi marinade is soy, sugar, garlic, sesame and often Korean pear. It should be balanced, not just sweet."],
      ["Banchan that is made, and refilled", "Kimchi, bean sprouts, pickled radish, potato salad, fish cake, egg. Refills are free and expected. Six or more sides, freshly made, means the kitchen takes the rest seriously too."],
      ["Staff who help at the grill", "At good places the server cuts the meat with scissors and turns it at the right moment. It is part of the service."],
    ],
    order: [
      ["Galbi", "Marinated beef short rib, often cut in a long thin strip around the bone. The signature."],
      ["Samgyeopsal", "Unmarinated pork belly, grilled until crisp at the edges and dipped in sesame oil and salt."],
      ["Chadolbaegi", "Paper-thin beef brisket that cooks in seconds. Good to start with while the grill heats."],
      ["Doenjang jjigae", "Fermented soybean stew, usually served at the end with rice. Order it."],
      ["Naengmyeon to finish", "Cold buckwheat noodles in icy broth. The traditional way to end a barbecue meal in Korea."],
    ],
    signals:
      "Korean barbecue searches read menus for tabletop grilling and specific cuts, so a Korean restaurant that grills at the table ranks above one that serves bulgogi from the kitchen. Reviews mentioning charcoal, banchan refills and meat quality count toward the pick; all-you-can-eat is matched when you ask for it rather than assumed.",
    related: ["korean-food", "bibimbap", "steak"],
    situations: ["big-group", "birthday-dinner", "friends-visiting"],
  },
  {
    s: "seafood-boil",
    place: "Seafood Boil Restaurants",
    n: "seafood boil",
    h1: "How to find a good seafood boil",
    desc:
      "Crawfish, crab legs and shrimp by the pound: how to spot a good Cajun seafood boil restaurant, when crawfish is in season, and what to order.",
    lede:
      "A seafood boil is shellfish cooked in heavily seasoned water with corn, potatoes and sausage, and eaten with your hands off paper. There are two main American styles: the Louisiana boil, with the spice cooked in, and the Viet-Cajun boil that grew up along the Gulf Coast, where the seafood comes in a bag tossed in garlic butter.",
    qa: ["When is crawfish season?", "Louisiana crawfish season runs roughly from January to June, with the best and cheapest crawfish usually from March through May. Outside those months restaurants serve frozen crawfish or none at all, so a place selling live-boiled crawfish in October is worth asking about."],
    good: [
      ["Live crawfish, in season", "Crawfish should be boiled live and served in season. Frozen whole crawfish are soft and hard to peel. Straight tails and mushy meat are signs of crawfish that were dead before they were cooked."],
      ["The seasoning goes in, not just on", "In a Louisiana boil the spice is in the water and the seafood soaks in it after cooking. If the shells are spicy and the meat underneath is plain, it was not soaked long enough."],
      ["Sauce you can choose the heat of", "At a Viet-Cajun place the house sauce, usually garlic butter with Cajun spice and lemon pepper, should come at several heat levels. The best ones are heavy on garlic."],
      ["Market price that is actually posted", "Seafood boil prices move with the season. A board showing today's price per pound is honest; a menu that says only 'MP' is fine, but ask before ordering three pounds of crab."],
      ["Corn and potatoes cooked in the boil", "They should taste of the seasoning. Corn that tastes of plain water was boiled separately."],
    ],
    order: [
      ["Crawfish by the pound, in spring", "Two to three pounds per person if it is the main event."],
      ["Snow crab or Dungeness clusters", "Sweeter and easier than crawfish for a first-timer."],
      ["Head-on shrimp", "More flavour than peeled, and the heads are the point for many regulars."],
      ["The house sauce at medium", "Order hotter next time once you know the kitchen's scale."],
      ["Extra corn, potatoes and sausage", "They soak up the sauce and make the meal stretch."],
    ],
    signals:
      "Seafood boil searches read menus for sale by the pound and named seafood like crawfish, snow crab and head-on shrimp, which separates a boil house from a seafood restaurant with one boil platter. Reviews mentioning the sauce, the heat levels and live crawfish count toward the pick.",
    related: ["seafood", "cajun-food", "oysters"],
    situations: ["big-group", "friends-visiting", "celebrating"],
  },
  {
    s: "hot-chicken",
    place: "Nashville Hot Chicken",
    n: "Nashville hot chicken",
    h1: "How to find good Nashville hot chicken",
    desc:
      "What separates real Nashville hot chicken from spicy fried chicken, how the heat levels work, and how to find good hot chicken near you.",
    lede:
      "Nashville hot chicken is fried chicken coated after frying in a paste of cayenne and hot fat, then served on white bread with pickles. It started in Nashville's Black neighbourhoods and spent most of the twentieth century as a local dish before becoming a national chain menu item. The real thing is hotter, redder and wetter than most copies.",
    good: [
      ["The heat is painted on after frying", "The chicken is fried, then brushed or dunked in cayenne paste made with the frying fat. Chicken that is merely spicy in the batter is a different, milder dish."],
      ["A dark red, glossy coating", "It should look almost lacquered. A dry sprinkle of red powder means the paste step was skipped."],
      ["White bread underneath", "Plain white sandwich bread soaks up the chilli oil. It is not garnish; it is part of the dish."],
      ["Pickles on top", "Dill pickle chips cut the heat and the fat. A good place never forgets them."],
      ["Heat levels that mean something", "Most places run from plain or mild up to something named as a warning. The top level should be genuinely hard to finish; if it is not, the whole scale is timid."],
    ],
    order: [
      ["A quarter dark or a leg quarter", "Dark meat stays juicy under that much heat. The traditional order."],
      ["Medium or hot, the first time", "Tell them it is your first visit. Heat levels are not consistent between restaurants."],
      ["Tenders if you want it easier", "Every coated surface, less bone. The format most chains serve."],
      ["A hot chicken sandwich", "On a bun with slaw and pickles. The modern version, and a good one when done properly."],
      ["Mac and cheese or slaw on the side", "Something cool and creamy to eat between bites."],
    ],
    signals:
      "Hot chicken searches read menus for Nashville-style or named heat levels, which separates a hot chicken shop from a fried chicken place that added a spicy sandwich. Reviews that describe the coating and how hot the top level really is count toward the pick.",
    related: ["fried-chicken", "chicken-and-waffles", "sandwiches"],
    situations: ["hungover", "late-night", "friends-visiting"],
  },
  {
    s: "cheesesteak",
    n: "cheesesteak",
    near: "Philly Cheesesteak",
    h1: "How to find a good cheesesteak",
    desc:
      "Thin-sliced ribeye, the right roll and Whiz, American or provolone: what makes a real Philly cheesesteak and how to find a good one near you.",
    lede:
      "A Philadelphia cheesesteak is thinly sliced beef cooked on a flat-top, piled into a long Italian roll with melted cheese and usually fried onions. That is the whole recipe, which means the roll, the beef and the cheese each have nowhere to hide.",
    qa: ["What cheese goes on a Philly cheesesteak?", "Three are traditional: Cheez Whiz, American and provolone. Whiz is the famous one and the most common tourist order; many Philadelphians order American, which melts into the meat. Provolone is sharper. Ordering 'wit' gets fried onions and 'witout' gets none."],
    good: [
      ["The roll", "Long, soft inside, with a slightly chewy crust that holds the grease without going soggy. A hard sub roll or a soft hot dog bun both fail in different ways."],
      ["Ribeye sliced thin", "Ribeye is the traditional cut, shaved thin and cooked quickly on the griddle, either chopped with a spatula or left in slices. Grey, pre-cooked beef steamed in a tray is the most common shortcut."],
      ["Cheese melted into the meat", "The cheese should be folded into the beef on the griddle so every bite has some, not laid on top as a cold slice at the end."],
      ["Onions cooked soft on the same griddle", "Sweet, soft and slightly browned, cooked alongside the meat."],
      ["A griddle you can see", "Most good cheesesteak shops cook in view. A menu with forty other sandwiches and no flat-top in sight is a warning."],
    ],
    order: [
      ["American wit", "American cheese with fried onions. The order most locals would give."],
      ["Whiz wit", "The classic tourist order, and not a mistake. Salty and messy."],
      ["Provolone with peppers", "Sharp cheese and sweet or long hot peppers."],
      ["A chicken cheesesteak", "Same method with chopped chicken. A common and respectable alternative."],
      ["A pizza steak", "With tomato sauce and mozzarella. A Philadelphia menu fixture."],
    ],
    signals:
      "Cheesesteak searches read menus for cheesesteaks by name and the cheese choices that go with them, which separates a cheesesteak shop from a deli with a steak sandwich. Reviews mentioning the roll, the ribeye and a real griddle count toward the pick.",
    related: ["sandwiches", "deli", "burgers"],
    situations: ["hungover", "late-night", "road-trip"],
  },
  {
    s: "chicken-and-waffles",
    n: "chicken and waffles",
    h1: "How to find good chicken and waffles",
    desc:
      "Crisp fried chicken, a real waffle, syrup and hot sauce: what separates good chicken and waffles and where to look for them near you.",
    lede:
      "Chicken and waffles is fried chicken served on or beside a waffle, eaten with butter, maple syrup and hot sauce all at once. Its best-known American form comes out of Black soul food restaurants and late-night supper clubs, and it now lives on brunch menus everywhere, where it is often an afterthought.",
    good: [
      ["Chicken fried to order", "It should arrive crackling. Chicken held under a lamp and then set on a hot waffle steams and goes soft in minutes."],
      ["A waffle with a crisp outside", "Light inside, crisp at the edges, able to hold syrup without collapsing. A pale, soft waffle is a pancake in a grid."],
      ["Bone-in or thigh meat", "Wings and thighs stay juicier than breast. Tenders are common and fine, but dark meat is the traditional choice."],
      ["Real syrup, or a good house one", "Maple, a honey butter or a hot honey. Pancake syrup is cheap and it tastes it."],
      ["Hot sauce on the table", "The sweet-salty-hot combination is the whole point. A good place puts hot sauce down without being asked."],
    ],
    order: [
      ["Wings and a waffle", "The classic soul food version. Easier to eat than a whole piece."],
      ["Thigh and waffle with hot honey", "The modern brunch version, and a good one."],
      ["A side of grits or greens", "At a soul food restaurant, this is how it comes."],
      ["Chicken and waffle sandwich", "Two small waffles as the bread. Messy, often excellent."],
      ["Sweet potato waffle", "Where it is on the menu, usually worth the swap."],
    ],
    signals:
      "Chicken and waffles searches read menus for the dish by name and for fried chicken made to order, then weigh reviews that mention crisp chicken and the waffle itself. Brunch and late-night hours count, since that is when most people want this.",
    related: ["fried-chicken", "brunch", "soul-food"],
    situations: ["hungover", "sunday-night", "birthday-dinner"],
  },
  {
    s: "fish-and-chips",
    n: "fish and chips",
    h1: "How to find good fish and chips",
    desc:
      "Crisp batter, flaky white fish, proper chips and malt vinegar: what separates good fish and chips and how to find them near you.",
    lede:
      "Fish and chips is white fish in batter, deep-fried, with thick-cut fried potatoes. The British and Irish original is simple enough that the only variables are freshness and frying, which is exactly why a good one is rare.",
    good: [
      ["Fried to order", "The batter should shatter and the fish should steam when you break it open. Anything pre-fried and held goes soft within ten minutes."],
      ["Cod or haddock, or a named local fish", "Cod and haddock are traditional. Many American places use pollock, halibut or rockfish, which can all be good. A menu that just says 'white fish' is hiding something."],
      ["Thin, crisp batter", "It should be light and golden, clinging to the fish. Thick, bready batter that peels off in one piece is the most common failure."],
      ["Oil that is clean", "Fish from clean, hot oil is pale gold and tastes of nothing but itself. Dark, bitter batter means old oil."],
      ["Chips, not fries", "Thicker than fries and fluffy inside. Thin fries with fish is a fried fish plate, not fish and chips."],
    ],
    order: [
      ["Cod or haddock and chips", "The baseline order, and the best test of the kitchen."],
      ["Malt vinegar and salt", "Traditional, and better than it sounds."],
      ["Mushy peas", "Mashed marrowfat peas. If they are on the menu, the place is taking the British version seriously."],
      ["Tartar sauce made in house", "Pickle, caper and mayonnaise. The bottled kind is a sign."],
      ["A local catch", "In coastal towns, whatever the local white fish is often beats imported cod."],
    ],
    signals:
      "Fish and chips searches read menus for battered fish by species and for chips alongside it, which separates a fish and chip shop from a seafood restaurant with one fried plate. Reviews that describe the batter as crisp and the fish as fresh count toward the pick.",
    related: ["seafood", "oysters", "sandwiches"],
    situations: ["eating-alone", "road-trip", "friends-visiting"],
  },
  {
    s: "deep-dish-pizza",
    n: "deep dish pizza",
    near: "Deep Dish Pizza",
    h1: "How to find good deep dish pizza",
    desc:
      "Chicago deep dish, stuffed pizza and tavern-style: what separates a good deep dish from a thick pizza and how to find one near you.",
    lede:
      "Chicago deep dish is baked in a tall, oiled pan: a buttery crust up the sides, cheese laid directly on the dough, fillings, then chunky tomato sauce on top. It takes the better part of an hour to bake. Chicagoans are quick to point out that most of them eat thin, cracker-crust tavern-style pizza cut in squares far more often.",
    good: [
      ["The crust is fried in the pan", "Oil or butter in the pan gives the edge a crisp, almost flaky crust. A soft, bready crust means it was baked like a thick regular pizza."],
      ["Sauce on top", "Uncooked or lightly cooked crushed tomato on top of the cheese. It protects the cheese through a long bake and keeps it from burning."],
      ["A long wait", "Real deep dish takes thirty to forty-five minutes. A place that serves it in ten had it baked already."],
      ["Sausage as a layer", "In Chicago the sausage often goes in as a single patty pressed across the whole pie. It is the traditional topping."],
      ["It holds its shape on the plate", "A good slice stands up. One that collapses into a puddle had too much sauce or too little bake."],
    ],
    order: [
      ["Sausage deep dish", "The classic, and the one the format was built around."],
      ["Stuffed pizza", "A second layer of dough on top of the cheese, under the sauce. Even taller, even heavier."],
      ["Tavern-style thin crust", "If the menu offers it, order one alongside. It is what Chicago actually eats."],
      ["A small, not a large", "Two slices of deep dish is a meal for most people."],
      ["Call ahead", "Some places let you order by phone before you arrive so the pizza is nearly ready when you sit down."],
    ],
    signals:
      "Deep dish searches read menus for deep dish, pan or stuffed pizza by name, which separates a Chicago-style pizzeria from a place with a thick crust option. Reviews that mention the wait and the crust count as a good sign rather than a complaint.",
    related: ["pizza", "italian-food", "sandwiches"],
    situations: ["friends-visiting", "big-group", "cold-rainy-night"],
  },
  {
    s: "lobster-roll",
    n: "lobster roll",
    h1: "How to find a good lobster roll",
    desc:
      "Maine or Connecticut style, the right bun and real claw meat: what makes a good lobster roll and how to find one near you.",
    lede:
      "A lobster roll is lobster meat in a toasted, buttered hot dog bun. There are two New England schools: Maine-style, cold with a little mayonnaise, and Connecticut-style, warm and dressed in melted butter. Both are simple, both are expensive, and both are easy to do cheaply.",
    qa: ["What is the difference between a Maine and a Connecticut lobster roll?", "A Maine lobster roll is served cold, with the lobster lightly dressed in mayonnaise and sometimes a little celery or lettuce. A Connecticut lobster roll is served warm, with the meat tossed in melted butter. Both come in a toasted, buttered split-top bun."],
    good: [
      ["Claw and knuckle meat", "Big pieces of claw and knuckle are sweeter and more tender than tail alone. Shredded or tiny pieces often mean frozen or mixed meat."],
      ["A split-top bun, toasted in butter", "The New England bun is sliced on top with flat sides, so both sides can be griddled golden. A regular hot dog bun is a compromise."],
      ["Barely dressed", "The mayonnaise or butter should coat the meat, not bury it. A lobster roll that is mostly mayonnaise is a lobster salad sandwich."],
      ["The price is market price", "Lobster prices move through the year. A roll far cheaper than every other place near you is likely using less lobster or a substitute."],
      ["Nothing hiding the lobster", "Some celery, some chive, maybe lemon. Heavy seasoning is covering for something."],
    ],
    order: [
      ["Maine-style if you like it cold", "The version most New England shacks serve."],
      ["Connecticut-style if you like it rich", "Warm butter makes it richer and brings out the sweetness."],
      ["Chips and a pickle", "The traditional side. Fries are common too."],
      ["Clam chowder alongside", "Where the lobster is good, the chowder usually is too."],
      ["Ask what size", "Many places sell a regular and a large. The large is often the better value per ounce."],
    ],
    signals:
      "Lobster roll searches read menus for lobster rolls by name and the style offered, which separates a seafood shack from a restaurant with one on a specials board. Reviews that mention the amount of meat, claw meat and the bun count toward the pick.",
    related: ["seafood", "oysters", "sandwiches"],
    situations: ["celebrating", "road-trip", "friends-visiting"],
  },
  {
    s: "omakase",
    place: "Omakase",
    n: "omakase",
    h1: "How to find good omakase",
    desc:
      "What omakase is, what it should cost, how to book one, and how to tell a good sushi omakase from an expensive one.",
    lede:
      "Omakase means 'I leave it to you': a fixed-price meal where the chef decides what you eat and serves it one piece at a time, usually at a sushi counter. It is the most expensive way to eat sushi, and the most reliable way to find out whether a sushi chef is actually good.",
    qa: ["What is omakase?", "Omakase is a chef's-choice meal, most often sushi, where you pay a set price and the chef serves a sequence of dishes one at a time. A typical sushi omakase is twelve to twenty pieces of nigiri plus a few small dishes, served at a counter so each piece can be eaten the moment it is made."],
    good: [
      ["A counter, and a chef at it", "Omakase is meant to be served directly across the counter. A table omakase delivered from the kitchen loses most of what you are paying for."],
      ["Rice that is warm and loosely packed", "Body-temperature, lightly seasoned with vinegar, falling apart gently in the mouth. Cold, dense rice is the clearest sign of a weak sushi chef."],
      ["Fish that changes with the season", "The menu should change. A chef who can tell you where today's fish came from and why it is in season is the one to trust."],
      ["Each piece already seasoned", "The chef brushes on soy or adds salt and citrus. At a good omakase you do not need the soy dish at all."],
      ["The price is fixed and stated", "A good omakase tells you the price up front. Surprise supplements should be offered, not added."],
    ],
    order: [
      ["The standard omakase", "The chef's full sequence. The upgrades are rarely better value."],
      ["Counter seats", "Book the counter, even if it takes longer to get a reservation."],
      ["A lunch omakase", "Many counters run a shorter, cheaper version at lunch. A good way to try a place."],
      ["Tell them what you do not eat", "When booking, not at the counter. Good chefs plan around it."],
      ["Eat each piece straight away", "Nigiri is best within seconds of being set down."],
    ],
    signals:
      "Omakase searches read menus for a stated omakase or chef's-choice price and counter service, which separates a real omakase counter from a sushi restaurant with a chef's-choice platter. Reviews describing the rice, the pacing and the seasonality count toward the pick.",
    related: ["sushi", "japanese-food", "seafood"],
    situations: ["celebrating", "first-date", "birthday-dinner"],
  },
  {
    s: "izakaya",
    place: "Izakaya Restaurants",
    n: "izakaya",
    h1: "How to find a good izakaya",
    desc:
      "What an izakaya is, what to order, and how to tell a good Japanese pub from a sushi restaurant with a drinks list.",
    lede:
      "An izakaya is a Japanese pub: a place to drink beer, sake or highballs and order small plates in rounds over a long evening. The food is cooked to go with drinks — grilled, fried, salty, pickled — and a good one is one of the most relaxed and interesting meals in any city that has one.",
    good: [
      ["A grill", "Yakitori or robata grilling over charcoal is the heart of many izakaya menus. A charcoal grill in view is a good sign."],
      ["A long menu of small plates", "Thirty or more small dishes, many under ten dollars. A menu that is mostly rolls is a sushi restaurant."],
      ["A daily specials board", "Handwritten specials in Japanese and English suggest a kitchen cooking what is good that day."],
      ["Real drinks", "Several sakes, shochu, Japanese whisky highballs, draft Japanese beer. The drinks are half the point."],
      ["It gets loud", "An izakaya is supposed to be busy and noisy. A quiet one at nine on a Friday is not doing it right."],
    ],
    order: [
      ["Karaage", "Japanese fried chicken, marinated in soy and ginger. The standard first order."],
      ["Yakitori", "Skewered chicken parts over charcoal. Thigh with scallion, skin, meatballs. Order by the skewer."],
      ["Agedashi tofu", "Fried tofu in warm dashi broth. Simple and a good test of the kitchen."],
      ["Something pickled", "Tsukemono, the house pickles, to go with the drink."],
      ["Onigiri or ochazuke to finish", "A rice dish at the end is the traditional way to close an izakaya night."],
    ],
    signals:
      "Izakaya searches read menus for small plates, skewers and a real Japanese drinks list, which separates an izakaya from a sushi restaurant. Reviews that mention the grill, the specials and the atmosphere count toward the pick, since a quiet izakaya is missing half the point.",
    related: ["japanese-food", "ramen", "sushi"],
    situations: ["friends-visiting", "after-a-shift", "work-team-lunch"],
  },
  {
    s: "biryani",
    n: "biryani",
    h1: "How to find good biryani",
    desc:
      "Hyderabadi, Lucknowi, Kolkata or Karachi: what separates a real biryani from spiced rice with meat, and how to find good biryani near you.",
    lede:
      "Biryani is long-grain rice and marinated meat cooked together, sealed, so the rice takes on the flavour of the meat and spices. It is one of the most argued-over dishes in South Asia, with distinct versions from Hyderabad, Lucknow, Kolkata, Karachi and the Tamil south. The worst versions are just rice fried with curry, and they are everywhere.",
    good: [
      ["Separate, long grains", "Every grain of basmati should be whole and separate, not mushy or broken. Some grains stay white and some take on saffron or spice."],
      ["The meat cooked with the rice", "In dum biryani the rice and meat are layered and sealed to finish cooking together. Rice with curry stirred in afterwards is not biryani."],
      ["Fried onions, saffron and whole spices", "Crisp browned onions, saffron streaks, and whole cardamom, bay leaf or cinnamon in the rice. They show it was built in layers."],
      ["Meat on the bone", "Goat and chicken are traditionally cooked on the bone, which gives the rice much more flavour."],
      ["Raita and salan on the side", "Cooling yoghurt raita and, for Hyderabadi biryani, mirchi ka salan, a chilli and peanut gravy. A place that serves both is serving it properly."],
    ],
    order: [
      ["Goat biryani", "Where it is available, the version many regulars consider the real one."],
      ["Hyderabadi dum biryani", "The most common style in American Indian restaurants, and the one with the strongest spice."],
      ["Chicken biryani on the bone", "The everyday order, and a good test."],
      ["Family pack", "Many biryani specialists sell large trays for a group. Usually the best value."],
      ["Double ka meetha to finish", "Hyderabadi bread pudding, if the menu has it."],
    ],
    signals:
      "Biryani searches read menus for named biryani styles and dum cooking, which separates a biryani specialist from a general Indian menu with one rice dish. Reviews mentioning goat, the rice and portion size count toward the pick, and halal meat is matched when you ask for it.",
    related: ["indian-food", "curry", "halal-food"],
    situations: ["big-group", "friends-visiting", "on-a-budget"],
  },
  {
    s: "dosa",
    n: "dosa",
    h1: "How to find a good dosa",
    desc:
      "Crisp, fermented and the size of the table: what separates a good South Indian dosa and what to order at a South Indian restaurant.",
    lede:
      "A dosa is a thin, crisp crepe made from fermented rice and lentil batter, the everyday breakfast and snack food of South India. It usually comes rolled around spiced potato, with coconut chutney and sambar, a lentil and vegetable stew, on the side. Most of a South Indian menu is vegetarian, and most of it is very good value.",
    good: [
      ["The batter is fermented", "A good dosa has a gentle sourness from overnight fermentation. A flat, starchy taste means a quick batter."],
      ["Crisp and golden, thin enough to see light through", "A paper dosa can be nearly two feet long. It should crackle when you tear it."],
      ["Fresh coconut chutney", "White, fresh, with mustard seed and curry leaf tempered on top. Chutney from a tub is flat and grey."],
      ["Sambar that is hot and refilled", "Thin, tangy, with vegetables and tamarind. Good places refill it without being asked."],
      ["Made on a flat griddle to order", "Each dosa is spread and cooked one at a time. It should reach the table within a minute of leaving the griddle."],
    ],
    order: [
      ["Masala dosa", "Filled with spiced potato and onion. The standard."],
      ["Mysore masala dosa", "Spread inside with a red chilli and garlic chutney before the potato goes in. Hotter and better."],
      ["Idli and vada", "Steamed rice cakes and a savoury lentil doughnut, both for dipping in sambar."],
      ["Uttapam", "A thick dosa with onion, tomato and chilli cooked into it."],
      ["Filter coffee", "South Indian coffee with chicory, milk and sugar. Order it to finish."],
    ],
    signals:
      "Dosa searches read menus for South Indian dishes by name — dosa, idli, vada, uttapam — which separates a South Indian restaurant from a North Indian one with a dosa added. Vegetarian menus are matched here by default, and reviews that mention the chutney and sambar count toward the pick.",
    related: ["indian-food", "curry", "breakfast"],
    situations: ["vegetarians-and-meat-eaters", "on-a-budget", "eating-alone"],
  },
  {
    s: "korean-fried-chicken",
    n: "Korean fried chicken",
    h1: "How to find good Korean fried chicken",
    desc:
      "Double-fried, crackling, glazed or plain: what separates good Korean fried chicken from American wings with sauce, and what to order.",
    lede:
      "Korean fried chicken is fried twice, which renders out the fat under the skin and leaves a thin, glassy crust that stays crisp even under a sticky glaze. It is eaten in Korea with beer, a combination known as chimaek, and often late at night.",
    good: [
      ["Double-fried", "The second fry is what makes the crust thin and crackling instead of thick and bready. It is the entire difference from American fried chicken."],
      ["It takes twenty to thirty minutes", "Made to order, a batch takes time. Chicken that arrives in five minutes was fried earlier."],
      ["Glaze that coats without soaking", "Yangnyeom sauce, sweet and spicy with gochujang, should cling to the crust and leave it crisp. A soggy crust means the sauce was poured on too early."],
      ["Pickled radish on the side", "Cubes of sweet pickled daikon, chikin-mu, cut through the grease. It is standard, and its absence is a sign."],
      ["Half-and-half offered", "Half plain fried, half glazed. Every good Korean chicken place offers it."],
    ],
    order: [
      ["Half-and-half", "Plain and yangnyeom, so you can taste both."],
      ["Soy garlic", "Sweet and salty, less messy than the red glaze."],
      ["Wings and drumsticks", "More crust to meat than boneless."],
      ["A beer", "The traditional pairing, for a reason."],
      ["Tteokbokki on the side", "Spicy rice cakes, a common add-on at Korean chicken places."],
    ],
    signals:
      "Korean fried chicken searches read menus for Korean-style chicken and glaze names like yangnyeom and soy garlic, which separates a Korean chicken place from a wing shop with a gochujang sauce. Reviews mentioning a crisp crust and the wait count toward the pick.",
    related: ["fried-chicken", "wings", "korean-food"],
    situations: ["late-night", "friends-visiting", "after-a-shift"],
  },
  {
    s: "pozole",
    n: "pozole",
    h1: "How to find good pozole",
    desc:
      "Red, green or white: what separates good pozole from a thin soup with hominy, and how to find a Mexican restaurant that makes it properly.",
    lede:
      "Pozole is a Mexican stew of pork or chicken and hominy, big chewy kernels of nixtamalised corn, in a broth coloured red with dried chillies, green with tomatillo and pepita, or left white. It is served with a spread of garnishes you add yourself, and at many restaurants only on weekends.",
    good: [
      ["Hominy that has burst open", "The kernels should have flowered open and be soft and chewy. Hard, tinned-tasting hominy means a short cook."],
      ["Broth with body", "Pork pozole should have a rich, slightly gelatinous broth from bones and shoulder simmered for hours."],
      ["Meat that falls apart", "Pork shoulder and often head meat, cooked until it shreds."],
      ["A full plate of garnishes", "Shredded cabbage or lettuce, sliced radish, diced onion, dried oregano, lime and ground chilli. Tostadas on the side. The garnishes are half the dish."],
      ["Weekends-only is a good sign", "It takes all day to make, so many good kitchens only serve it on Saturday and Sunday."],
    ],
    order: [
      ["Pozole rojo", "Red, with guajillo and ancho chillies. The most common style."],
      ["Pozole verde", "Green, with tomatillo, pepitas and herbs. Associated with Guerrero."],
      ["A large bowl", "It is a meal, and leftovers improve."],
      ["Tostadas with crema", "To eat alongside, or crumble into the bowl."],
      ["Menudo, if you are there anyway", "The tripe soup that usually shares the weekend board."],
    ],
    signals:
      "Pozole searches read menus for pozole by name and style, and treat weekend-only availability as a sign of a kitchen that makes it properly. Reviews mentioning the broth and the garnishes count toward the pick.",
    related: ["mexican-food", "soup", "tamales"],
    situations: ["hungover", "sick-with-a-cold", "cold-rainy-night"],
  },
  {
    s: "mariscos",
    place: "Mariscos Restaurants",
    n: "mariscos",
    h1: "How to find good mariscos",
    desc:
      "Aguachile, ceviche, cocteles and whole grilled fish: what separates a good Mexican seafood restaurant, and what to order at one.",
    lede:
      "Mariscos is Mexican seafood cooking, mostly from the Pacific coast states of Sinaloa, Nayarit and Jalisco: raw shrimp cured in lime, cold seafood cocktails, tostadas piled with ceviche, and whole fish split and grilled. A good marisquería is loud, bright, cheap for what it serves and full on weekend afternoons.",
    good: [
      ["Shrimp that is raw and cured to order", "Aguachile is raw shrimp dressed in lime, chilli and cucumber just before serving. It should still be translucent in the middle. Shrimp that is fully opaque has sat too long."],
      ["Lime juice, not bottled", "Fresh lime is the backbone of every cold dish here. Bottled juice tastes flat and bitter."],
      ["Cocteles that are not just ketchup", "A good coctel de camarón has tomato, lime, onion, cilantro, avocado and chilli in a cold broth. Ketchup-heavy versions are the shortcut."],
      ["Whole fish on the menu", "Pescado zarandeado, butterflied and grilled over charcoal, is a sign of a serious kitchen."],
      ["Busy at lunch", "Mariscos is daytime food. A place that is full at two in the afternoon on a Saturday is the one to trust."],
    ],
    order: [
      ["Aguachile", "Green with serrano, red with chiltepin, or black with a dark sauce. Choose your heat."],
      ["Tostada de ceviche", "A crisp tortilla heaped with lime-cured fish or shrimp."],
      ["Coctel de camarón", "Cold shrimp cocktail in a tall glass with crackers."],
      ["Campechana", "A mixed seafood cocktail, often with octopus and oyster."],
      ["A michelada", "Beer with lime, chilli and salt. The standard drink."],
    ],
    signals:
      "Mariscos searches read menus for aguachile, ceviche and cocteles, which separates a marisquería from a Mexican restaurant with one shrimp dish. Reviews mentioning freshness and weekend crowds count toward the pick.",
    related: ["mexican-food", "seafood", "tacos"],
    situations: ["hot-day", "hungover", "friends-visiting"],
  },
  {
    s: "hot-dogs",
    n: "hot dogs",
    h1: "How to find good hot dogs",
    desc:
      "Chicago-style, New York, Sonoran and Coney: the regional hot dog styles, what separates a good one, and how to find a hot dog stand worth the trip.",
    lede:
      "A hot dog is an easy thing to do badly and a surprisingly specific thing to do well. American cities have their own versions — Chicago's dragged through the garden, New York's with onions and kraut, Tucson's bacon-wrapped Sonoran dog, Detroit's Coney with chilli — and each has rules locals will explain whether you asked or not.",
    good: [
      ["Natural casing with a snap", "An all-beef frank in natural casing has a snap when you bite it. Skinless franks are softer and blander."],
      ["Cooked the way the style demands", "Griddled, grilled, steamed or simmered, depending on the city. A place that knows its style knows which."],
      ["A steamed or toasted bun", "Warm and soft, or poppy seed for Chicago. A cold bun from the bag is the fastest giveaway."],
      ["Toppings that are fresh and specific", "A real Chicago dog has seven toppings; a Coney has a particular meat sauce. Generic relish and ketchup is a baseball stadium, not a hot dog stand."],
      ["A short menu", "The best hot dog places sell hot dogs, maybe a sausage, maybe fries. Everything else is a distraction."],
    ],
    order: [
      ["Chicago-style", "Poppy seed bun, yellow mustard, bright green relish, onion, tomato, a pickle spear, sport peppers and celery salt. No ketchup."],
      ["A Coney", "A hot dog in a steamed bun with a loose meat chilli sauce, mustard and onion. Detroit and Flint argue over the details."],
      ["A Sonoran dog", "Wrapped in bacon, in a soft bolillo roll, with beans, onions, tomato, mayonnaise and jalapeño salsa. Tucson's own."],
      ["New York style", "With sauerkraut or a sweet onion sauce and spicy brown mustard."],
      ["A Polish or a brat", "Most good hot dog places also do one sausage properly."],
    ],
    signals:
      "Hot dog searches read menus for named regional styles and all-beef or natural casing franks, which separates a hot dog stand from a bar with a hot dog on the kids' menu. Reviews that mention the snap and the style count toward the pick.",
    related: ["burgers", "sandwiches", "deli"],
    situations: ["road-trip", "with-a-toddler", "on-a-budget"],
  },
  {
    s: "crepes",
    place: "Crêpe Restaurants",
    n: "crepes",
    h1: "How to find good crepes",
    desc:
      "Sweet crêpes and savoury buckwheat galettes: what separates a good crêperie and what to order at one.",
    lede:
      "A crêpe is a very thin pancake cooked on a wide, flat griddle. In Brittany, where the tradition comes from, the savoury version is a galette made from buckwheat flour and the sweet version is a wheat crêpe. Outside France they are often thick, pale and overfilled, which is the opposite of the point.",
    good: [
      ["Made to order on a round griddle", "A crêperie spreads each one with a wooden rake on a large flat round griddle. You should be able to see it happen."],
      ["Thin, with lacy, crisp edges", "It should be almost translucent, with golden, slightly crisp edges. A thick, floppy crêpe is a pancake."],
      ["Buckwheat for savoury", "A savoury galette made from buckwheat is darker, nuttier and crisper. A menu that offers it is taking the tradition seriously."],
      ["Fillings in proportion", "A few good ingredients folded inside. A crêpe overflowing with whipped cream and six toppings is dessert theatre."],
      ["Real butter", "Crêpes are cooked in butter and often finished with it. You can taste the difference."],
    ],
    order: [
      ["A galette complète", "Buckwheat, ham, cheese and an egg cooked in the middle. The Breton classic."],
      ["Butter and sugar", "The simplest sweet crêpe and the best test of the batter."],
      ["Lemon and sugar", "Bright, simple, excellent."],
      ["Salted butter caramel", "Another Breton classic, if the kitchen makes it."],
      ["Cider on the side", "Dry Breton cider is the traditional drink with galettes."],
    ],
    signals:
      "Crêpe searches read menus for crêpes and galettes by name and for buckwheat specifically, which separates a crêperie from a café with one dessert crêpe. Reviews mentioning thin crêpes and a visible griddle count toward the pick.",
    related: ["brunch", "breakfast", "bakery"],
    situations: ["first-date", "sunday-night", "with-a-toddler"],
  },
  {
    s: "donuts",
    place: "Donut Shops",
    n: "donuts",
    h1: "How to find good donuts",
    desc:
      "Yeast-raised or cake, fresh or from yesterday: how to find a good donut shop near you and what to order when you get there.",
    lede:
      "There are two families of donut: yeast-raised, which are light, airy and chewy, and cake donuts, which are denser, crumbly and made from a batter. A good donut shop does both well, fries through the morning, and usually sells out of the best ones before noon.",
    good: [
      ["Fried that morning", "Donuts are at their best within a few hours. A shop that fries only at four in the morning and sells until close is serving stale donuts by afternoon."],
      ["Yeast donuts that are light", "They should squash easily and spring back, with a thin white band around the middle from floating in the oil. Heavy, greasy ones were fried at too low a temperature."],
      ["Glaze that shatters", "A good glaze sets into a thin, crackly shell. A sticky, wet glaze was applied too thick or too cool."],
      ["Fillings made there", "Custard and jam filled to order, or at least that day. A filling that tastes of the tub is common."],
      ["They sell out", "A shop with empty trays at eleven is doing it right. One with full trays at six in the evening fried too many."],
    ],
    order: [
      ["A plain glazed yeast donut", "The simplest, and the best test of any shop."],
      ["An old-fashioned", "A cracked, crisp-edged cake donut. The best one for coffee."],
      ["Something filled", "Custard or jam, filled that day."],
      ["An apple fritter", "Big, craggy, full of apple. Often the best value in the case."],
      ["Go early", "Before nine, for the best choice."],
    ],
    signals:
      "Donut searches read menus and listings for donut shops and bakeries by name, then weigh reviews that mention freshness, early opening and selling out. Morning hours count, since a donut shop that opens at ten is usually not frying at dawn.",
    related: ["bakery", "breakfast", "bagels"],
    situations: ["road-trip", "with-a-toddler", "moving-day"],
  },
  {
    s: "bakery",
    place: "Bakeries",
    n: "bakery",
    near: "Bakery",
    h1: "How to find a good bakery",
    desc:
      "Laminated pastry, dark crusts and bread baked on site: how to tell a good bakery from a café selling delivered croissants.",
    lede:
      "A lot of places that look like bakeries are cafés reselling pastry baked somewhere else, or baking frozen dough from a factory. A real bakery bakes on site, early, in small batches, and is honest about when things run out.",
    good: [
      ["They bake on site", "Ovens you can see, or the smell when you walk in. A café that receives a delivery of croissants every morning is a café."],
      ["Croissants with layers you can see", "Cut one open: a good croissant has a honeycomb of open layers and shatters into flakes. A bready, uniform inside means poor lamination or frozen dough."],
      ["Bread with a dark crust", "A well-baked loaf has a deep brown, crackling crust. Pale bread was pulled early to look soft."],
      ["A menu that changes", "Seasonal fruit, a weekend special, something that runs out. A bakery with the same forty items all year is likely buying some of them in."],
      ["It runs out", "A bakery that sells out of croissants by noon is baking the right amount. One that has full trays at close is baking too much, or baking yesterday's."],
    ],
    order: [
      ["A plain croissant", "The test of any bakery. If this is good, everything laminated will be."],
      ["A loaf to take home", "Sourdough or a country loaf. Bread is where a bakery shows its skill."],
      ["Whatever is seasonal", "The fruit tart, the weekend special, the thing on the board."],
      ["Something savoury", "A ham and cheese croissant or a savoury galette, if lunch is the plan."],
      ["Go in the morning", "The first two hours after opening have the best choice."],
    ],
    signals:
      "Bakery searches read listings and menus for bread and pastry baked in house, and weigh reviews that mention croissants, sourdough and selling out. Early opening hours count toward the pick, since that is when a real bakery is at its best.",
    related: ["donuts", "breakfast", "bagels"],
    situations: ["moving-day", "sunday-night", "friends-visiting"],
  },
  {
    s: "ice-cream",
    place: "Ice Cream Shops",
    n: "ice cream",
    h1: "How to find good ice cream",
    desc:
      "Small-batch, gelato or soft serve: how to find a good ice cream shop near you and tell real ice cream from sweet air.",
    lede:
      "Most of what separates good ice cream from ordinary ice cream is air and ingredients. Commercial ice cream can be half air by volume; good ice cream is dense, made with real dairy, and tastes of what it says it is. Gelato is denser still and served slightly warmer.",
    good: [
      ["Made in the shop", "Small-batch ice cream made on the premises, often with a machine visible behind the counter. Tubs from a distributor are the norm at most scoop shops."],
      ["Dense, not fluffy", "A scoop should feel heavy for its size and melt slowly. Light, fluffy ice cream is mostly air."],
      ["Flavours that taste of the thing", "Pistachio that tastes of pistachio, not almond extract and green colouring. Strawberry that is pink, not red."],
      ["Gelato that is not piled high", "Traditional gelato is often kept flat in covered tins. Towering mounds decorated with fruit can mean a lot of air and stabilisers."],
      ["A seasonal board", "Peach in summer, pumpkin in autumn. A shop that changes with the season is buying ingredients rather than bases."],
    ],
    order: [
      ["Vanilla or chocolate first", "The simplest flavours show the quality of the base most clearly."],
      ["Whatever is seasonal", "The flavour that is only there this month."],
      ["Ask for a taste", "Every good scoop shop expects it."],
      ["A cup, not a cone, to judge it", "The cone is fun; the cup lets you taste the ice cream."],
      ["Soft serve, done well", "Where it is made from real dairy mix, a very good thing in its own right."],
    ],
    signals:
      "Ice cream searches read listings and menus for small-batch or house-made ice cream and gelato, and weigh reviews that mention flavour, texture and seasonal specials. Late opening hours count, since ice cream is an after-dinner errand for most people.",
    related: ["bakery", "donuts", "boba"],
    situations: ["hot-day", "with-a-toddler", "first-date"],
  },
  {
    s: "acai-bowls",
    place: "Acai Bowl Shops",
    n: "açaí bowls",
    near: "Acai Bowls",
    h1: "How to find a good açaí bowl",
    desc:
      "Thick enough to eat with a spoon, not too sweet, with real fruit: how to find a good açaí bowl near you and what to order.",
    lede:
      "An açaí bowl is frozen açaí berry pulp from the Brazilian Amazon, blended thick and topped with granola, fruit and honey. In Brazil it is a post-beach snack. In the US it is sold as health food, and how healthy it is depends almost entirely on which açaí the shop buys and how much sugar it adds.",
    good: [
      ["Thick enough to hold a spoon upright", "Good açaí is blended with very little liquid and eaten with a spoon. A runny bowl is a smoothie in a bowl."],
      ["Unsweetened or lightly sweetened açaí", "Shops buy frozen açaí packs that are either unsweetened or sweetened with cane sugar or guaraná syrup. Good ones say which, and many let you choose."],
      ["Deep purple, almost black", "Real açaí is a dark purple. A pale pink or bright red bowl has been bulked out with other fruit or juice."],
      ["Fresh fruit on top", "Banana, strawberry and berries cut that day. Brown banana slices and frozen berries sitting soft are a sign of prep done too early."],
      ["Granola that is crunchy", "Added last, so it stays crisp. Soggy granola was added too early."],
    ],
    order: [
      ["A classic bowl", "Açaí, granola, banana, strawberry and honey. The standard."],
      ["Ask for unsweetened", "If they have it. You can add honey yourself."],
      ["Peanut butter or almond butter", "A common add-on that makes it a meal rather than a snack."],
      ["Small first", "Bowls are often much larger and sweeter than people expect."],
      ["A pitaya bowl", "Pink dragon fruit, lighter and less sweet. Often on the same menu."],
    ],
    signals:
      "Açaí bowl searches read menus for açaí bowls by name and for unsweetened options, which separates an açaí shop from a smoothie counter with one bowl. Reviews that mention thickness and fresh fruit count toward the pick.",
    related: ["salad", "brunch", "breakfast"],
    situations: ["after-a-workout", "hot-day", "hungover"],
  },
  {
    s: "buffet",
    place: "Buffets",
    n: "buffet",
    near: "Buffet",
    h1: "How to find a good buffet",
    desc:
      "Turnover, fresh trays and the right time to go: how to find a buffet worth the price and avoid the food that has been sitting.",
    lede:
      "A buffet is only as good as its turnover. The same restaurant can serve excellent food at one in the afternoon and tired food at three, because a tray that is emptied and refilled every fifteen minutes is fresh and one that sits for an hour is not. Most of choosing a good buffet is choosing a busy one, at the right time.",
    good: [
      ["It is busy", "A full dining room means trays are refilled constantly. An empty buffet at peak time is the clearest warning there is."],
      ["Small trays, refilled often", "Good buffets use shallow pans refilled in small batches rather than deep trays that sit for an hour."],
      ["Hot food is actually hot", "Steaming, with a lid or heat lamp. Lukewarm food on a buffet is a food safety problem, not just a quality one."],
      ["Fried food that is still crisp", "Fried items go soft quickly. If the fried shrimp or chicken is crisp, the kitchen is refilling often."],
      ["A cooked-to-order station", "A grill, a noodle station or a carving station means at least some of the meal is made in front of you."],
    ],
    order: [
      ["Go at the start of a service", "Arrive at opening for lunch or dinner, when every tray is fresh."],
      ["Walk the whole line first", "See what is fresh before you fill a plate."],
      ["Start with what is cooked to order", "The station food is always the freshest thing there."],
      ["Indian lunch buffets", "Often very good value and a good way to try dishes you would not order."],
      ["Churrascaria", "A Brazilian steakhouse is really a buffet with the meat carved at the table."],
    ],
    signals:
      "Buffet searches read listings and menus for buffet service and its hours, then weigh reviews that mention freshness, how often trays are refilled and busy times. Recent reviews count more here than anywhere else, because a buffet's quality depends on how busy it is now.",
    related: ["chinese-food", "indian-food", "brazilian-food"],
    situations: ["big-group", "with-picky-eaters", "on-a-budget"],
  },
  {
    s: "fine-dining",
    place: "Fine Dining Restaurants",
    n: "fine dining",
    near: "Fine Dining",
    h1: "How to find good fine dining",
    desc:
      "Tasting menus, prices, dress codes and reservations: how to choose a fine dining restaurant worth the money, and what to expect.",
    lede:
      "Fine dining is less about expensive ingredients than about control: a kitchen and dining room where everything, from the bread to the pacing of courses, is deliberate. At its best it is the most memorable meal of a year. At its worst it is a very expensive dinner with good lighting.",
    qa: ["How much does fine dining cost?", "In most US cities, a fine dining tasting menu runs from around $100 to well over $300 per person before drinks, tax and tip. À la carte fine dining is usually less. Lunch, a bar menu or a shorter tasting menu is often the cheapest way to try an expensive restaurant."],
    good: [
      ["A kitchen with a point of view", "The best restaurants are cooking something specific, a place, a season, a tradition. A menu that could belong to any expensive restaurant anywhere is a warning."],
      ["Bread and the small things are excellent", "The bread, the butter, the first bite from the kitchen. A restaurant that gets the free things right usually gets the rest right."],
      ["Service that is attentive, not hovering", "Plates cleared promptly, questions answered well, and nobody interrupting the table every four minutes."],
      ["Pacing", "Courses arrive at a steady rhythm. Long gaps and rushed sequences both mean a kitchen struggling to keep up."],
      ["Prices stated up front", "Tasting menu prices, supplements and service charges should be clear before you sit down."],
    ],
    order: [
      ["The tasting menu", "If the restaurant is built around one, it is the reason to go."],
      ["À la carte, if you want control", "Often cheaper and less of an evening."],
      ["Wine pairing, selectively", "Worth it at a restaurant with a serious list. Two glasses chosen with the sommelier are often better value."],
      ["Lunch", "Many fine dining rooms run a shorter, cheaper lunch."],
      ["Tell them the occasion", "When booking. Good restaurants notice."],
    ],
    signals:
      "Fine dining searches read menus for tasting menus, prix fixe and chef-driven cooking, and weigh reviews that describe service, pacing and the value for money. Reservation and dress-code details are surfaced where they exist, because they decide whether a place works for tonight.",
    related: ["steak", "sushi", "omakase"],
    situations: ["celebrating", "birthday-dinner", "meeting-the-parents"],
  },

  /* ---- cuisines ----------------------------------------------------------- */
  {
    s: "soul-food",
    n: "soul food",
    near: "Soul Food",
    h1: "How to find good soul food",
    desc:
      "Fried chicken, smothered pork chops, greens and mac and cheese: what separates good soul food and how to find it near you.",
    lede:
      "Soul food is the cooking of Black Southern Americans, carried north and west during the Great Migration and kept alive in family restaurants, church kitchens and cafeterias in every American city. It is built on long-cooked vegetables, fried and smothered meats, and sides that are the real test of the kitchen.",
    qa: ["What is soul food?", "Soul food is the traditional cooking of African Americans from the American South: fried chicken, smothered pork chops, oxtails, catfish, collard greens cooked with smoked meat, baked macaroni and cheese, candied yams, black-eyed peas, cornbread and peach cobbler. It grew out of making the most of limited ingredients and is closely tied to family and Sunday meals."],
    good: [
      ["Greens cooked low and slow", "Collards or mixed greens simmered for hours with smoked turkey or ham hock, with a pot liquor worth drinking. Bright green, squeaky greens were rushed."],
      ["Baked mac and cheese", "Baked in a pan, set firm enough to cut, with a browned top. Creamy stovetop macaroni is a different dish."],
      ["Food made that day, in a steam line", "Many great soul food restaurants serve from a cafeteria-style line. That is not a warning; a busy line means fresh pans."],
      ["Daily specials", "Oxtails on Friday, chitlins on the weekend, a Sunday dinner plate. A daily board is a sign of home-style cooking."],
      ["Cornbread with some texture", "Crumbly, a little crisp at the edge. Whether sweet or savoury is a family argument."],
    ],
    order: [
      ["A meat and three", "One meat and three sides. The standard order and the best way to judge a kitchen."],
      ["Fried chicken or smothered pork chops", "Smothered means cooked slowly in a thick onion gravy."],
      ["Oxtails", "Braised until they fall apart, often a weekend special."],
      ["Greens, mac and cheese, candied yams", "The three sides most regulars would choose."],
      ["Peach cobbler or banana pudding", "Save room."],
    ],
    signals:
      "Soul food searches read menus for the dishes that define the cuisine — smothered meats, oxtails, greens, baked macaroni — which separates a soul food kitchen from a restaurant with a Southern-themed brunch. Reviews that mention the sides, daily specials and home cooking count toward the pick.",
    related: ["fried-chicken", "chicken-and-waffles", "bbq"],
    situations: ["sunday-night", "sad", "cold-rainy-night"],
  },
  {
    s: "cajun-food",
    n: "Cajun food",
    near: "Cajun & Creole",
    h1: "How to find good Cajun and Creole food",
    desc:
      "Gumbo, étouffée, jambalaya and po'boys: what separates good Cajun and Creole cooking, the difference between them, and what to order.",
    lede:
      "Cajun and Creole are the two great cooking traditions of south Louisiana. Cajun cooking comes from the rural Acadian communities of the bayou country; Creole cooking comes from New Orleans itself, with French, Spanish, African and Caribbean roots. They share a base of dark roux and the 'holy trinity' of onion, celery and green pepper.",
    qa: ["What is the difference between Cajun and Creole food?", "Cajun food is the rustic country cooking of Louisiana's Acadian descendants, usually heavier on pork, game and dark roux. Creole food is the city cooking of New Orleans, with more tomatoes, butter and cream and more European and Caribbean influence. A Creole jambalaya is red with tomato; a Cajun one is brown."],
    good: [
      ["A dark roux", "Flour and fat cooked slowly until it is the colour of chocolate. It gives gumbo its depth. A pale, floury gumbo skipped the most important step."],
      ["The trinity is fresh", "Onion, celery and green pepper, cooked down, not a dried seasoning mix."],
      ["Andouille and seafood that belong", "Smoked andouille sausage with real bite, Gulf shrimp, crawfish tails and oysters. Generic sausage and tiny frozen shrimp are the shortcut."],
      ["Spice that is warm, not only hot", "Cajun cooking is seasoned, not simply fiery. A dish that is all cayenne and no flavour is a tourist version."],
      ["Rice served properly", "White rice under gumbo and étouffée, never cooked into them."],
    ],
    order: [
      ["Gumbo", "Seafood gumbo or chicken and andouille. The first order at any Louisiana kitchen."],
      ["Crawfish étouffée", "Crawfish tails smothered in a buttery roux sauce over rice."],
      ["Jambalaya", "Rice cooked with sausage, chicken and often shrimp."],
      ["A po'boy", "Fried shrimp or oysters, or roast beef debris, on crusty New Orleans French bread, dressed."],
      ["Red beans and rice", "Traditionally a Monday dish in New Orleans. Simple and often the best thing on the menu."],
    ],
    signals:
      "Cajun and Creole searches read menus for gumbo, étouffée, jambalaya and po'boys by name, which separates a Louisiana kitchen from a restaurant with one blackened chicken dish. Reviews mentioning the roux, the seafood and the andouille count toward the pick.",
    related: ["seafood-boil", "seafood", "soul-food"],
    situations: ["friends-visiting", "cold-rainy-night", "celebrating"],
  },
  {
    s: "tex-mex-food",
    n: "Tex-Mex food",
    near: "Tex-Mex",
    h1: "How to find good Tex-Mex",
    desc:
      "Enchiladas in chili gravy, fajitas, queso and puffy tacos: what separates good Tex-Mex from generic Mexican food, and what to order.",
    lede:
      "Tex-Mex is its own cuisine, not a lesser version of Mexican food: the cooking of Tejano families in Texas, built on beef, yellow cheese, cumin, chili gravy and flour tortillas. Done well it is some of the most satisfying food in America. Done badly it is a combination plate that tastes the same whatever you ordered.",
    qa: ["What is the difference between Tex-Mex and Mexican food?", "Tex-Mex is the Texan cooking of Tejano communities. It uses more beef, cumin, yellow cheese and flour tortillas than most Mexican regional cooking, and is known for combination plates, chili con queso, fajitas and enchiladas in chili gravy. Mexican food covers dozens of regional cuisines, most of which use little cumin or yellow cheese."],
    good: [
      ["Chili gravy on the enchiladas", "Classic Tex-Mex enchiladas come in a brown, cumin-heavy chili gravy, with melted yellow cheese and raw onion. It is the defining sauce."],
      ["Flour tortillas made in house", "Soft, slightly charred, made that day. A restaurant pressing its own flour tortillas is the one to trust."],
      ["Fajitas that arrive sizzling", "Skirt steak, marinated and grilled over high heat, on a sizzling cast-iron plate. Thin, grey strips of meat are the shortcut."],
      ["Salsa and chips made there", "Warm chips and a house salsa are free and expected. Bagged chips and a jar salsa are a sign."],
      ["Queso as a dish", "Chile con queso should be smooth, with green chilli and a little heat."],
    ],
    order: [
      ["Cheese enchiladas with chili gravy", "The classic, and the best test of a Tex-Mex kitchen."],
      ["Beef fajitas", "Skirt steak, with warm flour tortillas and the fixings."],
      ["Puffy tacos", "A fried masa shell that puffs up in the oil. A San Antonio speciality."],
      ["Queso with ground beef", "Often called a bob or a Bob Armstrong in Texas, depending on the add-ins."],
      ["A frozen margarita", "Tex-Mex restaurants are where it was made popular."],
    ],
    signals:
      "Tex-Mex searches read menus for the dishes that define it — chili gravy enchiladas, fajitas, queso, combination plates — and for house-made flour tortillas. Reviews mentioning the salsa, the tortillas and sizzling fajitas count toward the pick.",
    related: ["mexican-food", "tacos", "bbq"],
    situations: ["big-group", "birthday-dinner", "with-picky-eaters"],
  },
  {
    s: "sichuan-food",
    n: "Sichuan food",
    near: "Sichuan",
    h1: "How to find good Sichuan food",
    desc:
      "Mapo tofu, dan dan noodles and the numbing heat of Sichuan peppercorn: what separates a real Sichuan restaurant and what to order.",
    lede:
      "Sichuan cooking, from southwest China, is known for mala: the combination of chilli heat and the tingling, numbing effect of Sichuan peppercorn. But it is not all heat. A good Sichuan menu covers sour, sweet, smoky and garlicky dishes too, and the best restaurants balance them across a meal.",
    good: [
      ["Real Sichuan peppercorn", "Your lips should tingle and go slightly numb. Chilli heat without the numbing is not Sichuan cooking."],
      ["Chilli oil made in house", "Fragrant, dark red, with sediment at the bottom. It is in half the dishes, so it matters."],
      ["Doubanjiang in the sauces", "Fermented broad bean and chilli paste gives Sichuan sauces their deep red colour and savoury flavour."],
      ["A menu with cold dishes", "Mouth-watering chicken, wood ear salad, spicy beef tendon. A cold starter section is a sign of a regional kitchen."],
      ["Balance across the menu", "Not everything should be red. Garlicky greens, a mild soup and plain rice are part of a proper Sichuan meal."],
    ],
    order: [
      ["Mapo tofu", "Soft tofu in a red, numbing sauce with minced beef. The dish to judge the kitchen by."],
      ["Dan dan noodles", "Noodles with chilli oil, peppercorn and minced pork, mixed at the table."],
      ["Water-boiled fish", "Tender fish in a broth covered in chilli and peppercorn. Spectacular and very hot."],
      ["Dry-fried green beans", "Blistered, with pork and preserved vegetable."],
      ["Fish-fragrant eggplant", "Sweet, sour and garlicky. No fish in it; the name comes from the seasoning."],
    ],
    signals:
      "Sichuan searches read menus for regional dishes by name — mapo tofu, dan dan noodles, water-boiled fish — and for mala and Sichuan peppercorn, which separates a Sichuan restaurant from a general Chinese menu with a few spicy dishes. Reviews that mention the numbing heat count toward the pick.",
    related: ["chinese-food", "hot-pot", "noodles"],
    situations: ["sick-with-a-cold", "cold-rainy-night", "friends-visiting"],
  },
  {
    s: "taiwanese-food",
    n: "Taiwanese food",
    h1: "How to find good Taiwanese food",
    desc:
      "Beef noodle soup, braised pork rice, gua bao and popcorn chicken: what separates a good Taiwanese restaurant and what to order.",
    lede:
      "Taiwanese food mixes Fujianese home cooking, Japanese influence and the cooking of mainland Chinese who arrived after 1949, and it is best known outside Taiwan for its night-market snacks. It is also the home of bubble tea, which is often the reason people first walk into a Taiwanese café.",
    good: [
      ["Beef noodle soup with a deep broth", "Braised beef shank or tendon in a dark, spiced broth with thick wheat noodles. It is the national dish, and a thin broth is the giveaway."],
      ["Braised pork rice done slowly", "Lu rou fan: fatty pork braised in soy and spice over white rice. Rich and glossy, not dry."],
      ["Night-market snacks made to order", "Popcorn chicken fried with basil, scallion pancakes, oyster omelettes. They should arrive hot."],
      ["A Taiwanese breakfast menu", "Soy milk, youtiao and egg crepes. A place that does breakfast is cooking the full tradition."],
      ["Boba that is fresh", "Tapioca pearls cooked that day are soft and chewy. Hard or mushy pearls sat too long."],
    ],
    order: [
      ["Beef noodle soup", "The first order at any Taiwanese restaurant."],
      ["Lu rou fan", "Braised pork rice. Cheap, filling and addictive."],
      ["Popcorn chicken", "Salt and pepper chicken, fried with basil leaves."],
      ["Gua bao", "A steamed bun with braised pork belly, pickled greens and peanut powder."],
      ["Milk tea with boba", "Where it began."],
    ],
    signals:
      "Taiwanese searches read menus for beef noodle soup, lu rou fan and night-market dishes by name, which separates a Taiwanese restaurant from a bubble tea shop or general Chinese menu. Reviews that mention the broth and the snacks count toward the pick.",
    related: ["chinese-food", "boba", "noodles"],
    situations: ["cold-rainy-night", "late-night", "eating-alone"],
  },
  {
    s: "puerto-rican-food",
    n: "Puerto Rican food",
    h1: "How to find good Puerto Rican food",
    desc:
      "Mofongo, pernil, arroz con gandules and frituras: what separates good Puerto Rican food and what to order.",
    lede:
      "Puerto Rican cooking is built on sofrito, a green base of culantro, cilantro, peppers, garlic and onion, and on plantains in every form. It is island food with Taíno, Spanish and African roots, and in the US it lives in family restaurants and lunch counters in New York, Florida, Chicago and beyond.",
    good: [
      ["Sofrito made fresh", "Bright green, herbal and garlicky. A place making its own sofrito tastes completely different from one using a jar."],
      ["Mofongo mashed to order", "Fried green plantain mashed with garlic and chicharrón in a wooden pilón. It should be warm, garlicky and hold together."],
      ["Pernil with crackling", "Slow-roasted pork shoulder with crisp, salty skin. The crackling is the prize."],
      ["Arroz con gandules with pegao", "Rice with pigeon peas, sofrito and pork. The crisp rice at the bottom of the pot, pegao, is what regulars ask for."],
      ["Frituras fried fresh", "Alcapurrias, bacalaítos and empanadillas, fried that day and hot."],
    ],
    order: [
      ["Mofongo", "With shrimp in garlic sauce or with pork. The signature dish."],
      ["Pernil with arroz con gandules", "The Sunday and Christmas plate."],
      ["Tostones", "Twice-fried green plantain, with garlic dipping sauce."],
      ["Alcapurrias", "Fried fritters of green banana and taro, filled with meat."],
      ["A tripleta", "A pressed sandwich with three meats. The Puerto Rican lunch counter classic."],
    ],
    signals:
      "Puerto Rican searches read menus for mofongo, pernil and arroz con gandules by name, which separates a Puerto Rican kitchen from a pan-Latin menu. Reviews that mention sofrito, the pernil and the frituras count toward the pick.",
    related: ["cuban-food", "caribbean-food", "salvadoran-food"],
    situations: ["sunday-night", "friends-visiting", "hungover"],
  },
  {
    s: "hawaiian-food",
    n: "Hawaiian food",
    h1: "How to find good Hawaiian food",
    desc:
      "Plate lunch, kalua pork, loco moco and spam musubi: what separates good Hawaiian food and what to order at a Hawaiian restaurant.",
    lede:
      "Most Hawaiian food on the mainland is local Hawaii food: the plate lunch culture that grew out of the plantation era, mixing Native Hawaiian, Japanese, Chinese, Filipino, Korean and Portuguese cooking. It is generous, salty, cheap and built around rice.",
    good: [
      ["Two scoops rice, one scoop mac", "The plate lunch standard. Mac salad should be soft macaroni in a plain mayonnaise dressing, not a pasta salad."],
      ["Kalua pork that tastes smoky", "Traditionally cooked in an underground imu, now usually slow-roasted with Hawaiian salt and liquid smoke. It should be moist and deeply salty."],
      ["Real Hawaiian dishes on the menu", "Lau lau, poi, lomi salmon. A place that serves them is cooking Native Hawaiian food and not just plate lunch."],
      ["Chicken katsu with a proper crust", "Panko-breaded and fried crisp, with katsu sauce."],
      ["Spam musubi made that day", "Grilled Spam, rice and nori. A snack, and a test of whether they care."],
    ],
    order: [
      ["A mixed plate", "Two proteins, rice and mac salad. The best way to try a kitchen."],
      ["Loco moco", "Rice, a hamburger patty, a fried egg and brown gravy."],
      ["Kalua pork and cabbage", "The Native Hawaiian classic, on a plate lunch."],
      ["Garlic shrimp", "Shell-on shrimp in garlic butter, North Shore style."],
      ["Spam musubi", "Order two."],
    ],
    signals:
      "Hawaiian searches read menus for plate lunch, kalua pork and loco moco by name, which separates a Hawaiian kitchen from a poke shop. Reviews that mention portion size and the mac salad count toward the pick.",
    related: ["poke", "japanese-food", "filipino-food"],
    situations: ["on-a-budget", "work-team-lunch", "hungover"],
  },
  {
    s: "pakistani-food",
    n: "Pakistani food",
    h1: "How to find good Pakistani food",
    desc:
      "Nihari, karahi, haleem and seekh kebabs: what separates good Pakistani food from a generic Indian menu, and what to order.",
    lede:
      "Pakistani food shares a lot with North Indian cooking, but it is more meat-centred, cooked in bigger, bolder portions, and nearly always halal. The best Pakistani restaurants in the US are often plain, busy and open late, and the menu is built around slow-cooked meat and the tandoor.",
    good: [
      ["Karahi cooked to order", "Chicken or goat cooked fast in a wok-like karahi with tomato, ginger and green chilli. It takes twenty minutes and should arrive sizzling."],
      ["Nihari with marrow", "Beef shank slow-cooked overnight in a rich, spiced gravy, finished with ginger and lemon. Traditionally a breakfast dish, and often weekend-only."],
      ["Bread from a tandoor", "Naan and roti slapped on the wall of a clay oven, blistered and charred. Naan from a grill or oven is flat by comparison."],
      ["Kebabs grilled over charcoal", "Seekh kebabs of minced meat on skewers should be smoky, juicy and spiced."],
      ["Halal, and says so", "Most Pakistani restaurants are halal and state it plainly."],
    ],
    order: [
      ["Chicken or goat karahi", "The dish to judge the kitchen by."],
      ["Nihari", "If it is on, especially on a weekend morning."],
      ["Seekh kebab", "With naan, onions and mint chutney."],
      ["Haleem", "A thick, slow-cooked stew of wheat, lentils and meat."],
      ["Chai", "Strong, milky, sweet. Order it to finish."],
    ],
    signals:
      "Pakistani searches read menus for karahi, nihari and haleem by name and for halal service, which separates a Pakistani restaurant from a general North Indian menu. Reviews that mention the karahi, the naan and weekend nihari count toward the pick.",
    related: ["indian-food", "biryani", "halal-food"],
    situations: ["late-night", "big-group", "friends-visiting"],
  },
  {
    s: "nepali-food",
    n: "Nepali food",
    near: "Nepali & Himalayan",
    h1: "How to find good Nepali and Himalayan food",
    desc:
      "Momos, dal bhat, thukpa and chili chicken: what separates a good Nepali or Himalayan restaurant, and what to order.",
    lede:
      "Nepali and Himalayan restaurants, often run by Nepali, Tibetan or Bhutanese families, have become common in American cities, many with Indian dishes on the same menu. The food to go for is the Himalayan side: momos, dal bhat, thukpa and the fiery pickles that come with them.",
    good: [
      ["Momos pleated by hand", "Steamed dumplings filled with spiced chicken, buffalo, pork or vegetables, pleated by hand and served with a tomato and sesame achar. Machine-made or frozen momos are uniform and doughy."],
      ["Achar that is made there", "The dipping sauce, usually tomato, sesame and chilli, should be fresh and bright. It is half the dish."],
      ["Dal bhat as a full set", "Rice, lentils, vegetable curry, pickles and greens on one tray. The everyday Nepali meal, and a sign of a real Nepali kitchen."],
      ["Himalayan dishes, not just curry", "Thukpa, chow mein, sekuwa, chili chicken. A menu that is almost all tikka masala is an Indian restaurant."],
      ["Jhol momo", "Momos served in a spiced, soupy sauce. A menu that has them is cooking the current Kathmandu version."],
    ],
    order: [
      ["Steamed momos", "Chicken or vegetable, with achar. The first order."],
      ["Jhol momo", "In a warm, tangy soup."],
      ["Dal bhat", "The full set, for a real meal."],
      ["Thukpa", "Tibetan noodle soup. Good on a cold day."],
      ["Chili chicken", "Indo-Chinese, fried and tossed with peppers and chilli. Very popular for good reason."],
    ],
    signals:
      "Nepali searches read menus for momos, dal bhat and thukpa by name, which separates a Nepali or Himalayan kitchen from an Indian restaurant with momos added. Reviews mentioning hand-made momos and the achar count toward the pick.",
    related: ["dumplings", "indian-food", "soup"],
    situations: ["cold-rainy-night", "sick-with-a-cold", "on-a-budget"],
  },
  {
    s: "yemeni-food",
    n: "Yemeni food",
    h1: "How to find good Yemeni food",
    desc:
      "Mandi, saltah, fahsa and honey bread: what separates good Yemeni food, and what to order at a Yemeni restaurant.",
    lede:
      "Yemeni restaurants have spread across American cities in the last decade, many with a Yemeni coffee house alongside. The food centres on slow-cooked meat and rice, bubbling stone bowls of stew and huge flatbreads, and it is almost always halal and meant to be shared.",
    good: [
      ["Mandi meat that falls off the bone", "Lamb or chicken slow-cooked over spiced rice, traditionally in a sealed pit so the smoke flavours the rice. The meat should pull apart and the rice should taste of it."],
      ["Stews served bubbling", "Saltah and fahsa arrive boiling in a stone or iron bowl. They should still be bubbling when they reach the table."],
      ["Hilbeh on top", "Whipped fenugreek froth, spooned over saltah. It is the defining touch."],
      ["Bread from a tandoor", "Huge, thin, blistered flatbreads, torn and used to scoop."],
      ["Built for sharing", "Large platters for the table. A Yemeni meal is a group meal."],
    ],
    order: [
      ["Lamb mandi", "The signature. Order one platter for two."],
      ["Fahsa", "Shredded lamb stew, boiling in a stone bowl. Eat it with bread."],
      ["Saltah", "The national dish, a meat broth stew topped with hilbeh."],
      ["Bint al-sahn", "Layered honey bread, flaky and sweet."],
      ["Adeni tea or Yemeni coffee", "Spiced milk tea, or qishr made from coffee husks."],
    ],
    signals:
      "Yemeni searches read menus for mandi, fahsa and saltah by name, which separates a Yemeni restaurant from a general Middle Eastern grill. Reviews that mention the meat, the bread and the coffee count toward the pick, and halal service is matched when asked.",
    related: ["lebanese-food", "halal-food", "mediterranean-food"],
    situations: ["big-group", "friends-visiting", "celebrating"],
  },
];
