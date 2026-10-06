/* The third batch of /food/ guides: 48 more cuisines.
 *
 * WHY MORE CUISINES
 * Search Console, early October. Outside the campus pages, the guides pulling
 * impressions are cuisine and dish pages: /food/korean-food (108), /food/soup
 * (68), /food/arepas (34), /food/afghan-food (17), /food/brazilian-food (13),
 * /food/lebanese-food (11), /food/polish-food (10). Small, specific cuisines are
 * finding searchers, which says the long tail of "<cuisine> restaurants near
 * me" is open — and the incumbents answering it are directories, not guides.
 *
 * The IPEDS and Census APIs that the campus and city pages are built from were
 * not reachable when this batch was written, so this is the class that could
 * be grown honestly: written per entry, with no figure that needs a source.
 *
 * Same contract as dishes.js. `good` is written per entry and carries the page.
 * No restaurant is named anywhere.
 */

module.exports = [
  {
    s: "french-food",
    n: "French food",
    h1: "How to find good French food",
    title: "How to Find Good French Food Near You",
    desc:
      "Bistro or brasserie, steak frites or coq au vin: what separates a good French restaurant from an expensive average one, and what to order.",
    lede:
      "Most good French cooking in America is bistro cooking — braises, sauces, bread and butter done with discipline — and the best restaurants are rarely the most expensive ones. A short menu cooked exactly right beats a long one cooked politely.",
    qa: [
      "What is the difference between a bistro and a brasserie?",
      "A bistro is small and usually family-scaled, with a short menu of home-style dishes that changes with the season. A brasserie is bigger and busier, open long hours, serves beer and wine alongside a broad fixed menu, and often has a raw bar. Both are casual compared with fine dining, and both are where most good French food in America is cooked.",
    ],
    good: [
      ["Bread worth eating on its own", "Crusty outside, open crumb, served with real butter. French restaurants that buy in bland rolls are telling you how much attention the rest of the kitchen pays."],
      ["Sauces that taste reduced, not thickened", "A proper pan sauce or jus has depth from stock and time. Glossy, floury sauces mean shortcuts, and in French cooking the sauce is most of the point."],
      ["Frites that are actually crisp", "Steak frites is the test dish of a bistro. Twice-fried, salted, hot. Soft fries next to a good steak is a kitchen that has stopped checking."],
      ["A menu that changes", "A seasonal board — ramps in spring, game in autumn — means someone is shopping rather than reordering the same case every week."],
      ["A wine list you can navigate", "Good French places pour wine by the glass from regions you have heard of and some you have not, and the staff can tell you which one goes with what you ordered."],
    ],
    order: [
      ["Steak frites", "The benchmark. Hanger or bavette, cooked to order, with béarnaise or a pan sauce."],
      ["Moules frites", "Mussels steamed in white wine, shallots and butter. The broth is for the bread."],
      ["Coq au vin or boeuf bourguignon", "Long braises in red wine. Good when cold out and good evidence of patience in the kitchen."],
      ["French onion soup", "Deep, dark onions, real stock, a lid of bread and melted Gruyère. Easy to make badly, memorable done well."],
      ["Crème brûlée or tarte tatin", "The brûlée top should crack cleanly; the tatin should be properly caramelised, nearly bitter at the edges."],
    ],
    signals:
      "A French search reads menus for the specific dishes — steak frites, mussels, duck confit, onion soup — rather than the word French, which a lot of places use for a vibe rather than a cuisine. Reviews that mention bread, sauces and frites by name push a place up; reviews that only mention the décor push it down.",
    related: ["steak", "brunch", "italian-food"],
    situations: ["first-date", "birthday-dinner", "meeting-the-parents"],
  },
  {
    s: "sichuan-food",
    n: "Sichuan food",
    h1: "How to find good Sichuan food",
    title: "How to Find Good Sichuan Food Near You",
    desc:
      "Mala, Sichuan peppercorn and real chilli oil: how to tell a genuine Sichuan restaurant from a generic Chinese menu, and what to order.",
    lede:
      "Sichuan cooking is not simply hot. Its signature is mala — the numbing tingle of Sichuan peppercorn layered with chilli heat — and a restaurant that only delivers the heat has missed the half that makes it Sichuan.",
    qa: [
      "What does mala mean?",
      "Mala means numbing and spicy. The numbing (ma) comes from Sichuan peppercorn, which produces a tingling, buzzing sensation on the lips and tongue; the spicy (la) comes from dried chillies. A good mala dish balances both, so the numbing tempers the heat rather than adding to it. It is the defining flavour of Sichuan cooking.",
    ],
    good: [
      ["Peppercorn you can feel", "Real Sichuan peppercorn makes your lips buzz within a bite or two. If nothing tingles, the kitchen is using too little or very old stock."],
      ["Chilli oil with sediment", "Good house chilli oil is fragrant, dark red, with toasted chilli flakes, sesame and spices settled at the bottom. Thin red oil that only burns is a supermarket shortcut."],
      ["Two menus", "Many Sichuan restaurants keep a Chinese-language or 'traditional' menu alongside an Americanised one. Ask for it, or look for the section with tripe, kidney and fish in chilli oil — that is where the kitchen is cooking for itself."],
      ["Wok hei on dry-fried dishes", "Dry-fried green beans and dry-fried chicken should be blistered and smoky, not oily and soft."],
      ["Balance, not just heat", "Fish-fragrant sauce, garlic sauce and strange-flavour dishes are sweet, sour and savoury at once. A kitchen that can do these is a kitchen that understands the cuisine."],
    ],
    order: [
      ["Mapo tofu", "Soft tofu in a chilli-bean sauce with ground pork and peppercorn. The single best test of a Sichuan kitchen."],
      ["Dan dan noodles", "Noodles with spiced pork, chilli oil and preserved vegetable. Mix thoroughly before eating."],
      ["Water-boiled fish", "Fish slices poached in a broth under a layer of chilli and peppercorn. For a group, and spectacular."],
      ["Dry-fried green beans", "Blistered, with garlic and minced pork. The vegetable dish people come back for."],
      ["Chongqing chicken", "Crisp chicken buried in dried chillies. You hunt for the chicken; the chillies are aromatic, not for eating."],
    ],
    signals:
      "A Sichuan search reads reviews for mala, numbing and peppercorn — words that only appear when the dish was actually made the Sichuan way — and for named dishes like mapo tofu and water-boiled fish. A place that is Chinese in category but Sichuan in its reviews will surface ahead of one that is Sichuan in name only.",
    related: ["chinese-food", "hot-pot", "dumplings"],
    situations: ["cold-rainy-night", "big-group", "sick-with-a-cold"],
  },
  {
    s: "taiwanese-food",
    n: "Taiwanese food",
    h1: "How to find good Taiwanese food",
    title: "How to Find Good Taiwanese Food Near You",
    desc:
      "Beef noodle soup, braised pork rice, gua bao and night-market snacks: what makes a Taiwanese restaurant good and what to order first.",
    lede:
      "Taiwanese food is snack food elevated into a cuisine — night-market dishes, small bowls, fried things and braises — and it is built for ordering several things rather than one big plate.",
    good: [
      ["Beef noodle soup with a real broth", "Deep, beefy, often with a little star anise and chilli bean paste, and tendon if you want it. A thin broth with a few slices of beef is the weak version."],
      ["Lu rou fan done properly", "Braised pork rice: fatty pork belly slow-cooked in soy and spices, spooned over rice. It should be glossy and rich, never dry."],
      ["Fried chicken with five-spice", "Taiwanese popcorn chicken and large fried cutlets are seasoned with five-spice, white pepper and fried basil. Unseasoned chicken nuggets miss the point."],
      ["Fresh-made dough", "Scallion pancakes, dumplings and bao are better made in-house. Frozen and reheated is common and noticeable."],
      ["Breakfast if they do it", "Soy milk, youtiao and egg crepes are a Taiwanese breakfast institution. A restaurant serving it is cooking for people who grew up on it."],
    ],
    order: [
      ["Beef noodle soup", "The national dish, and the benchmark."],
      ["Lu rou fan", "Braised pork over rice. Cheap, small and essential."],
      ["Popcorn chicken", "Bite-sized, five-spice, with fried basil."],
      ["Gua bao", "Steamed bun with braised pork belly, pickled greens, peanut powder and cilantro."],
      ["Oyster omelette or three-cup chicken", "The first is a sticky, saucy night-market classic; the second is chicken cooked in soy, rice wine and sesame oil with basil."],
    ],
    signals:
      "Taiwanese places are often filed as Chinese, so the search reads for named Taiwanese dishes — beef noodle soup, lu rou fan, popcorn chicken, gua bao — and for words like night market and Taiwanese breakfast. Boba-only shops are separated from kitchens that actually cook.",
    related: ["boba", "chinese-food", "noodles"],
    situations: ["late-night", "eating-alone", "on-a-budget"],
  },
  {
    s: "cantonese-food",
    n: "Cantonese food",
    h1: "How to find good Cantonese food",
    title: "How to Find Good Cantonese Food Near You",
    desc:
      "Roast meats, live seafood, wonton noodles and dim sum: what separates a serious Cantonese restaurant from a generic Chinese menu.",
    lede:
      "Cantonese cooking is the cuisine most Chinese-American food descends from, and the real thing is about the opposite of what that food became: clean flavours, precise cooking, and ingredients so fresh the restaurant often keeps them alive in a tank.",
    good: [
      ["A tank and a market-price board", "Live fish, crab and lobster priced by the pound. Steamed whole fish is the purest test of a Cantonese kitchen, and you cannot do it without fresh fish."],
      ["Roast meats hanging in the window", "Char siu, roast duck and crispy pork belly. The duck skin should be lacquered and the pork crackling should shatter."],
      ["Restraint", "Cantonese seasoning is light — ginger, scallion, soy, a little sugar. If every dish is gloopy and sweet, you are at an Americanised restaurant with a Cantonese name."],
      ["Wok hei", "The smoky breath of a very hot wok. Chow fun and fried rice should have it."],
      ["Banquet tables", "Round tables with lazy Susans and set menus for ten. A place built for family celebrations is cooking for people who know the food."],
    ],
    order: [
      ["Steamed whole fish", "With ginger, scallion and hot oil poured over at the end."],
      ["Roast meat combination", "Char siu, roast duck and roast pork over rice."],
      ["Beef chow fun", "Wide rice noodles, beef, bean sprouts, dark soy. Wok hei or nothing."],
      ["Wonton noodle soup", "Shrimp wontons and thin springy egg noodles in a clear broth."],
      ["Salt and pepper squid or shrimp", "Light batter, garlic, chilli. Should be dry and crisp, not greasy."],
    ],
    signals:
      "A Cantonese search reads for live seafood, roast duck, char siu, wonton noodles and dim sum, and for reviews describing whole fish or family-style banquets. Those terms separate restaurants cooking Cantonese from the very large number of Chinese takeout menus that merely descend from it.",
    related: ["dim-sum", "chinese-food", "seafood"],
    situations: ["big-group", "celebrating", "meeting-the-parents"],
  },
  {
    s: "nepali-food",
    n: "Nepali food",
    h1: "How to find good Nepali food",
    title: "How to Find Good Nepali Food Near You",
    desc:
      "Momo, dal bhat and thukpa: what to look for in a Nepali or Himalayan restaurant, and how it differs from the Indian menu next to it.",
    lede:
      "A lot of Nepali restaurants in the US also serve a full Indian menu, because that is what most customers know to ask for. The Nepali section is shorter, cheaper and usually better, and it is where you should be ordering.",
    good: [
      ["Momo pleated by hand", "Nepali dumplings, steamed or fried, with a tomato-sesame achar on the side. Hand-pleated momo are the clearest sign of a kitchen that cares; frozen ones are thicker and uniform."],
      ["Achar with real sourness", "The dipping sauces and pickles — tomato, timur pepper, radish — carry a lot of the flavour. Good achar is tangy and bright."],
      ["Dal bhat as a full set", "Lentils, rice, vegetable curry, greens and pickle. The everyday meal of Nepal, and a place that serves it properly is cooking for Nepali customers."],
      ["Timur pepper", "A Himalayan relative of Sichuan pepper with a citrus, numbing edge. If it shows up in the achar or the sekuwa, the kitchen is cooking its own food."],
      ["A separate Nepali menu", "Look for a section labelled Nepali, Himalayan or Newari. That is the point of the visit."],
    ],
    order: [
      ["Momo", "Steamed first, then try jhol momo — dumplings in a spiced soup."],
      ["Dal bhat", "The set meal. Often refilled on request."],
      ["Thukpa", "Himalayan noodle soup, warming and generous."],
      ["Chicken or goat sekuwa", "Spiced, grilled skewers."],
      ["Chatamari or bara", "Newari rice crepe and lentil patty, if the menu has them."],
    ],
    signals:
      "Nepali restaurants are usually filed as Indian, so the search reads menus and reviews for momo, dal bhat, thukpa and Himalayan, and favours places where reviewers talk about the Nepali dishes rather than the tikka masala.",
    related: ["indian-food", "dumplings", "soup"],
    situations: ["cold-rainy-night", "on-a-budget", "vegetarians-and-meat-eaters"],
  },
  {
    s: "pakistani-food",
    n: "Pakistani food",
    h1: "How to find good Pakistani food",
    title: "How to Find Good Pakistani Food Near You",
    desc:
      "Nihari, karahi, biryani and seekh kebab: what separates a good Pakistani restaurant and what to order the first time.",
    lede:
      "Pakistani food is meat-forward, rich and slow-cooked, and it rewards places that do a few things over many hours rather than a long menu cooked to order. It is also almost always halal, and frequently open late.",
    good: [
      ["Nihari on the weekend", "Beef shank stewed overnight until it falls apart, finished with ginger, chilli and lemon. Many places only make it on weekends because it takes all night — that is a good sign."],
      ["Karahi made to order", "Cooked in the wok-like karahi with tomato, ginger and green chilli. It should take fifteen or twenty minutes. If it arrives in five, it came out of a pot."],
      ["A real tandoor", "Naan should come out blistered and puffed. Flat, pale naan means an oven, not a tandoor."],
      ["Biryani with distinct layers", "Long-grain rice that stays separate, with meat and masala layered through rather than stirred in."],
      ["Busy at midnight", "Pakistani restaurants serving taxi drivers and families late at night are usually the ones worth going to at any hour."],
    ],
    order: [
      ["Chicken or goat karahi", "Ordered by the half or full kilo, for sharing."],
      ["Nihari", "With naan to scoop it, and the garnishes added at the table."],
      ["Seekh kebab", "Minced meat kebabs from the grill, spiced and smoky."],
      ["Haleem", "Wheat, lentils and meat cooked to a thick porridge. Deeply savoury."],
      ["Chai", "Strong, milky, sweet. Finish with it."],
    ],
    signals:
      "The search reads for karahi, nihari, haleem and seekh kebab, which appear on Pakistani menus and rarely on generic Indian ones, and for reviews that mention halal and late-night hours. Places described as desi or Pakistani by reviewers are favoured over places filed under Indian by default.",
    related: ["indian-food", "halal-food", "afghan-food"],
    situations: ["late-night", "big-group", "after-a-shift"],
  },
  {
    s: "bangladeshi-food",
    n: "Bangladeshi food",
    h1: "How to find good Bangladeshi food",
    title: "How to Find Good Bangladeshi Food Near You",
    desc:
      "Fish curries, bhorta, kacchi biryani and mustard oil: what makes a Bangladeshi restaurant worth finding, and how it differs from Indian menus.",
    lede:
      "Bangladeshi cooking is a river cuisine — fish, rice, mustard oil and greens — and it is very different from the North Indian food most South Asian restaurants in the US serve. The good places are usually small, cheap and run as a steam table.",
    good: [
      ["Fish, especially hilsa", "Freshwater fish curries are the heart of the cuisine. Hilsa (ilish) in mustard sauce is the celebratory dish; a place with several fish curries is cooking Bangladeshi food in earnest."],
      ["Mustard oil you can taste", "Pungent and sharp. It is the defining fat of the cuisine and a kitchen that uses it is not toning anything down."],
      ["Bhorta", "Mashed vegetables or fish with mustard oil, onion and chilli — aubergine, potato, dried fish. Small dishes, eaten with rice, and a sign of home cooking."],
      ["A steam table that turns over", "Most Bangladeshi restaurants serve from trays. Busy at lunch with fresh trays coming out is the sign."],
      ["Kacchi biryani", "Raw marinated mutton cooked with the rice in a sealed pot. Many places only make it on certain days."],
    ],
    order: [
      ["Fish curry", "Whatever fish they have — hilsa, rui or pabda."],
      ["Bhorta platter", "Several mashes with plain rice."],
      ["Kacchi biryani", "If it is on that day."],
      ["Dal", "Thin, comforting, tempered with garlic."],
      ["Mishti doi or roshogolla", "Sweet yoghurt or syrupy cheese balls to finish."],
    ],
    signals:
      "The search reads for bhorta, hilsa, kacchi and Bangladeshi in menus and reviews, because most Bangladeshi restaurants are listed as Indian and the cuisine only becomes visible in the dish names.",
    related: ["indian-food", "curry", "seafood"],
    situations: ["on-a-budget", "eating-alone", "trying-something-new"],
  },
  {
    s: "sri-lankan-food",
    n: "Sri Lankan food",
    h1: "How to find good Sri Lankan food",
    title: "How to Find Good Sri Lankan Food Near You",
    desc:
      "Hoppers, kottu, string hoppers and black curry: what to look for in a Sri Lankan restaurant and what to order first.",
    lede:
      "Sri Lankan food is coconut, chilli, curry leaf and toasted spice, hotter and more sour than most South Indian cooking, and there are few enough restaurants that finding a good one is worth the drive.",
    good: [
      ["Hoppers made to order", "Bowl-shaped fermented rice-and-coconut pancakes, crisp at the edges and soft in the middle, often with an egg cooked into the centre. They have to be made fresh; a place that makes them on the weekend is worth planning around."],
      ["Black curry", "Curry powder roasted until very dark, giving a deep, smoky pork or chicken curry. It is distinctly Sri Lankan."],
      ["Pol sambol", "Fresh grated coconut with chilli, lime and onion. Should taste bright and fresh, never dried-out."],
      ["Kottu with rhythm", "Chopped flatbread stir-fried on a griddle with vegetables, egg and curry — and you can hear it being made, the clatter of two blades on the steel."],
      ["Rice and curry as a set", "Rice with three to five small curries. A kitchen showing range across lentils, vegetables and meat in one plate is a serious one."],
    ],
    order: [
      ["Egg hoppers", "With pol sambol and a curry."],
      ["Kottu roti", "The street food, loud and filling."],
      ["Black pork curry", "Dark, rich, smoky."],
      ["Lamprais", "Rice and curries baked in a banana leaf, if offered."],
      ["String hoppers", "Steamed rice-noodle nests for breakfast or with curry."],
    ],
    signals:
      "With so few Sri Lankan restaurants, the search reads widely for hoppers, kottu, lamprais and Sri Lankan in menus and reviews, and keeps the radius generous because the nearest good one may be some distance away.",
    related: ["indian-food", "curry", "malaysian-food"],
    situations: ["trying-something-new", "friends-visiting", "cold-rainy-night"],
  },
  {
    s: "burmese-food",
    n: "Burmese food",
    h1: "How to find good Burmese food",
    title: "How to Find Good Burmese Food Near You",
    desc:
      "Tea leaf salad, mohinga and khao suey: what makes Burmese food distinct, what to look for, and what to order first.",
    lede:
      "Burmese food sits between Indian, Thai and Chinese cooking and tastes like none of them. It is built on fermentation, crunch and sourness, and the dish that wins over almost everyone is a salad made from pickled tea leaves.",
    good: [
      ["Tea leaf salad mixed at the table", "Fermented tea leaves with fried beans, peanuts, sesame, tomato and cabbage. The best places bring the components separately and mix it in front of you. It should be crunchy, sour and slightly bitter."],
      ["Mohinga with depth", "The national breakfast: rice noodles in a fish and lemongrass broth thickened with chickpea flour, topped with crispy fritters. A thin broth means it has been simplified."],
      ["Crunch everywhere", "Fried garlic, fried split peas, crispy shallots. Burmese food is about textures, and a kitchen that fries its own toppings shows it."],
      ["Sour and fermented flavours left in", "Fish sauce, shrimp paste and lime should be present. Burmese food made too mild for a general audience loses its identity."],
      ["Curries cooked in oil", "Burmese curries separate their oil on purpose — it means the paste has been cooked long enough."],
    ],
    order: [
      ["Tea leaf salad", "Essential."],
      ["Mohinga", "Breakfast, lunch, or whenever."],
      ["Ohn no khao swe", "Coconut chicken noodle soup, the ancestor of khao soi."],
      ["Platha with curry", "Flaky flatbread with dipping curry."],
      ["Samusa soup", "Samosas broken into a sour lentil soup. Strange, and excellent."],
    ],
    signals:
      "The search reads for tea leaf salad, mohinga and Burmese, and for reviews describing the salad mixed at the table — a small detail that reliably separates kitchens doing the real thing.",
    related: ["thai-food", "salad", "noodles"],
    situations: ["trying-something-new", "vegetarians-and-meat-eaters", "friends-visiting"],
  },
  {
    s: "cambodian-food",
    n: "Cambodian food",
    h1: "How to find good Cambodian food",
    title: "How to Find Good Cambodian Food Near You",
    desc:
      "Kuy teav, fish amok, lok lak and prahok: what to look for in a Cambodian restaurant and what to order first.",
    lede:
      "Cambodian food is less sweet than Thai and less herbal than Vietnamese, with a backbone of kroeung — a pounded paste of lemongrass, galangal and turmeric — and fermented fish. Many Cambodian restaurants in the US also serve Thai or Chinese dishes, so look for the Khmer section.",
    good: [
      ["Kroeung made fresh", "The yellow lemongrass paste behind amok and many soups. Fresh kroeung is bright and fragrant; jarred paste is flat."],
      ["Kuy teav with a clear broth", "Rice noodle soup with pork and often seafood. The broth is clean and sweet from bones and dried squid, and dressed at the table with lime, chilli and garlic oil."],
      ["Amok steamed in banana leaf", "Fish in coconut custard with kroeung, steamed until just set. Should be soft, not rubbery."],
      ["Prahok on the menu", "Fermented fish paste. It is pungent, and a menu with prahok dishes is cooking for Cambodian customers."],
      ["A Khmer section", "Dishes labelled Khmer or Cambodian on a mixed menu are the reason to go."],
    ],
    order: [
      ["Fish amok", "The national dish."],
      ["Kuy teav", "Breakfast noodle soup."],
      ["Lok lak", "Peppery stir-fried beef with a lime and black pepper dip."],
      ["Num banh chok", "Rice noodles with a green fish curry, if offered."],
      ["Bai sach chrouk", "Grilled pork with broken rice, a breakfast classic."],
    ],
    signals:
      "The search reads for amok, kuy teav, lok lak and Khmer in menus and reviews, which surfaces Cambodian kitchens that are listed as Thai or Asian and would be missed by a category filter.",
    related: ["thai-food", "vietnamese-food", "noodles"],
    situations: ["trying-something-new", "on-a-budget", "eating-alone"],
  },
  {
    s: "laotian-food",
    n: "Laotian food",
    h1: "How to find good Laotian food",
    title: "How to Find Good Laotian Food Near You",
    desc:
      "Larb, sticky rice, papaya salad and khao piak: what makes Lao food distinct from Thai, and what to order first.",
    lede:
      "Lao food is the cuisine behind a lot of what Americans think of as Thai — larb, papaya salad, sticky rice — but cooked with more funk, more bitterness and more heat. Many Lao cooks run Thai restaurants and keep the Lao dishes on a separate list.",
    good: [
      ["Sticky rice in a basket", "Glutinous rice steamed and served in a woven basket, eaten with your hands. It is the staple, not a side."],
      ["Papaya salad with padaek", "Lao-style tam mak hoong uses fermented fish sauce and is funkier and saltier than the Thai version. Ask for it Lao style."],
      ["Larb with toasted rice", "Minced meat with lime, fish sauce, herbs and toasted ground rice. The toasted rice should be freshly made and nutty."],
      ["Bitterness allowed", "Lao cooking uses bile, bitter herbs and greens on purpose. A kitchen that keeps them is not adjusting the food for you."],
      ["A Lao menu", "Look for a section or a separate page. That is where the cooking is."],
    ],
    order: [
      ["Larb", "Chicken, beef or pork, with sticky rice."],
      ["Lao papaya salad", "Ask for the heat level honestly."],
      ["Khao piak sen", "Thick, chewy rice noodle soup, the Lao comfort food."],
      ["Sai oua", "Herbal Lao sausage with lemongrass and galangal."],
      ["Ping gai", "Grilled marinated chicken."],
    ],
    signals:
      "The search reads for Lao, Laotian, sticky rice, khao piak and sai oua in menus and reviews, because most Lao kitchens are filed as Thai, and reviewers are usually the ones who point out the Lao menu.",
    related: ["thai-food", "salad", "noodles"],
    situations: ["trying-something-new", "hot-day", "friends-visiting"],
  },
  {
    s: "indonesian-food",
    n: "Indonesian food",
    h1: "How to find good Indonesian food",
    title: "How to Find Good Indonesian Food Near You",
    desc:
      "Rendang, nasi goreng, satay and sambal: what makes a good Indonesian restaurant and what to order the first time.",
    lede:
      "Indonesian food spans thousands of islands, but in the US it mostly means a handful of dishes from Java and Sumatra — rendang, satay, fried rice — and the difference between a good version and a tired one is enormous.",
    good: [
      ["Rendang cooked dry", "Beef simmered in coconut milk and spices for hours until the liquid is gone and the meat is dark and caramelised. A soupy rendang is a curry pretending."],
      ["Sambal made in-house", "Chilli paste in several varieties — sambal terasi with shrimp paste is the benchmark. Good sambal is fresh and complex, not just hot."],
      ["Satay over charcoal", "Small skewers with a peanut sauce that has texture and a little sweetness from kecap manis."],
      ["Kecap manis used properly", "Sweet soy sauce is the characteristic flavour of nasi goreng and many grills. It should add depth, not make everything taste like dessert."],
      ["Weekend specials", "Many Indonesian restaurants are small and cook special dishes — nasi padang spreads, soto, martabak — on weekends. Worth checking for."],
    ],
    order: [
      ["Beef rendang", "With rice and sambal."],
      ["Nasi goreng", "Fried rice with kecap manis, topped with a fried egg and crackers."],
      ["Chicken satay", "With peanut sauce and rice cakes."],
      ["Gado-gado", "Vegetables, tofu and egg with peanut sauce."],
      ["Soto ayam", "Turmeric chicken soup with noodles."],
    ],
    signals:
      "The search reads for rendang, nasi goreng, sambal and satay alongside Indonesian, and for reviews that describe the sambal or weekend specials, which tend to identify kitchens cooking for an Indonesian crowd.",
    related: ["malaysian-food", "curry", "thai-food"],
    situations: ["trying-something-new", "friends-visiting", "vegetarians-and-meat-eaters"],
  },
  {
    s: "hawaiian-food",
    n: "Hawaiian food",
    h1: "How to find good Hawaiian food",
    title: "How to Find Good Hawaiian Food Near You",
    desc:
      "Plate lunch, kalua pig, loco moco and spam musubi: what makes a good Hawaiian restaurant on the mainland, and what to order.",
    lede:
      "Hawaiian food on the mainland usually means local food — the plate lunch culture that grew from Japanese, Chinese, Filipino, Portuguese, Korean and Native Hawaiian cooking — and the best places feel like a lunch counter, not a theme restaurant.",
    good: [
      ["The plate lunch format", "Two scoops of rice, one scoop of macaroni salad, and a main. That is the shape; a place that serves it is cooking the real thing."],
      ["Mac salad that is soft and mayonnaise-heavy", "Hawaiian macaroni salad is deliberately soft and simple. Done right it is the best part of the plate."],
      ["Kalua pig with smoke", "Pork traditionally cooked underground, shredded and salty. It should taste smoky, not like plain pulled pork."],
      ["Poke made to order", "Fresh, cubed fish dressed with shoyu, sesame oil, onion and limu. See our poke guide; a Hawaiian restaurant's poke is often more traditional than a poke bowl shop's."],
      ["Spam musubi done well", "Grilled, glazed Spam on rice wrapped with nori. Loved for good reasons."],
    ],
    order: [
      ["Kalua pig plate", "With cabbage, rice and mac salad."],
      ["Loco moco", "Rice, a hamburger patty, a fried egg and brown gravy."],
      ["Chicken katsu plate", "Crisp cutlet with katsu sauce."],
      ["Garlic shrimp", "In the North Shore style, with lots of butter and garlic."],
      ["Shave ice", "Fine-textured, syrup-soaked, with ice cream underneath."],
    ],
    signals:
      "The search reads for plate lunch, kalua, loco moco and mac salad, which separate Hawaiian lunch counters from poke chains and tiki bars. Reviews mentioning island-style or local food push a place up.",
    related: ["poke", "shaved-ice", "katsu"],
    situations: ["on-a-budget", "hot-day", "big-group"],
  },
  {
    s: "mongolian-food",
    n: "Mongolian food",
    near: "Mongolian BBQ",
    h1: "How to find good Mongolian food — and Mongolian barbecue",
    title: "How to Find Good Mongolian Food and Mongolian BBQ Near You",
    desc:
      "The difference between Mongolian barbecue and Mongolian food, how to build a good stir-fry bowl, and what to order at a real Mongolian restaurant.",
    lede:
      "Mongolian barbecue is not Mongolian: it is a Taiwanese invention of the 1970s, a stir-fry bar on a big round griddle. Real Mongolian food — dumplings, mutton, noodles — is a different and much rarer restaurant. Both are worth knowing.",
    qa: [
      "Is Mongolian BBQ actually Mongolian?",
      "No. Mongolian barbecue was created in Taiwan in the 1970s, inspired loosely by Japanese teppanyaki. You pick raw meat, vegetables and sauces, and a cook stir-fries them on a large round griddle. Traditional Mongolian cuisine is something else — mutton, dumplings like buuz and khuushuur, and noodle dishes — and is served at a small number of dedicated restaurants.",
    ],
    good: [
      ["A hot, clean griddle", "At a Mongolian barbecue, the grill should be scraped between bowls and hot enough to sear. Steaming, crowded food comes out soggy."],
      ["Fresh-looking raw bar", "Meats kept cold and vegetables crisp. If the bar looks tired, the bowl will be too."],
      ["Sauces you can taste first", "The bowl is only as good as the sauce mix. Two or three sauces plus garlic and ginger water beats ten random ladles."],
      ["Real Mongolian dishes, if you can find them", "Buuz (steamed mutton dumplings), khuushuur (fried meat pastries) and tsuivan (stir-fried noodles) are the signs of an actual Mongolian kitchen."],
      ["Mutton or lamb on the menu", "Traditional Mongolian food is built on it. A menu without it is a barbecue bar, which is fine — just a different meal."],
    ],
    order: [
      ["A barbecue bowl with less, not more", "Fewer ingredients cook better. Meat, noodles, a few vegetables, and your sauce."],
      ["Buuz", "Steamed mutton dumplings, at a Mongolian restaurant."],
      ["Khuushuur", "Fried mutton pastries."],
      ["Tsuivan", "Hand-cut noodles stir-fried with meat and vegetables."],
      ["Suutei tsai", "Salty milk tea, if you are curious."],
    ],
    signals:
      "Savor Scout separates the two by what the menu and reviews describe: griddle, bowl and all-you-can-eat mean a barbecue bar; buuz, khuushuur and tsuivan mean a Mongolian kitchen. Say which you want and the search follows.",
    related: ["all-you-can-eat", "noodles", "dumplings"],
    situations: ["big-group", "with-picky-eaters", "on-a-budget"],
  },
  {
    s: "uzbek-food",
    n: "Uzbek food",
    h1: "How to find good Uzbek food",
    title: "How to Find Good Uzbek Food Near You",
    desc:
      "Plov, lagman, samsa and shashlik: what to look for in an Uzbek or Central Asian restaurant and what to order the first time.",
    lede:
      "Uzbek food is Silk Road cooking — rice, lamb, hand-pulled noodles and bread from a clay oven — and the handful of Uzbek restaurants in most US cities are some of the most generous, best-value places to eat.",
    good: [
      ["Plov from a big kazan", "Rice cooked with lamb, carrots, onions and cumin in one large pot. Good plov is glossy, each grain separate, with the carrots sweet and the meat falling apart. Many places make it in the morning and sell out."],
      ["Hand-pulled lagman", "Thick, chewy noodles pulled by hand, served in a broth or stir-fried with meat and peppers."],
      ["Samsa from a tandoor", "Flaky pastries of lamb and onion baked against the wall of a clay oven. Should be crisp and juicy."],
      ["Non bread", "Round, stamped bread with a dense centre and crisp rim, served with everything."],
      ["Shashlik over coals", "Skewers of lamb, beef or chicken, often including lamb fat between the meat. Charcoal makes the difference."],
    ],
    order: [
      ["Plov", "The national dish. Ask if it is fresh today."],
      ["Lagman", "Soup or stir-fried."],
      ["Samsa", "Lamb or pumpkin."],
      ["Lamb shashlik", "With raw onion and vinegar."],
      ["Manti", "Large steamed dumplings with lamb and onion."],
    ],
    signals:
      "Uzbek restaurants are often listed as Mediterranean, Russian or halal, so the search reads for plov, lagman, samsa and manti, and for reviews that mention Central Asian or Uzbek cooking.",
    related: ["kebabs", "hand-pulled-noodles", "halal-food"],
    situations: ["big-group", "trying-something-new", "cold-rainy-night"],
  },
  {
    s: "georgian-food",
    n: "Georgian food",
    h1: "How to find good Georgian food",
    title: "How to Find Good Georgian Food Near You",
    desc:
      "Khachapuri, khinkali, walnut sauces and Georgian wine: what to look for in a Georgian restaurant and how to order.",
    lede:
      "Georgian food — from the country, not the state — is cheese bread, soup dumplings, walnuts, herbs and some of the oldest wine traditions in the world. It is meant for a table full of people and a long evening.",
    qa: [
      "How do you eat khinkali?",
      "By hand. Hold the khinkali by the twisted knot at the top, turn it upside down, bite a small hole in the side and drink the hot broth first, then eat the rest. The knot is traditionally left on the plate. Using a knife and fork lets the broth spill out, which wastes the best part.",
    ],
    good: [
      ["Khachapuri baked to order", "Adjaruli khachapuri is a boat of bread filled with molten cheese, an egg and butter you stir in at the table. It should arrive bubbling."],
      ["Khinkali pleated tightly", "Large soup dumplings with many pleats and a knot on top. Thin dough, lots of broth inside."],
      ["Walnut and herb sauces", "Pkhali (vegetable and walnut pâtés) and badrijani (aubergine rolls with walnut paste) show whether the kitchen uses fresh herbs and real spice."],
      ["Tkemali", "Sour plum sauce, served with grilled meat. Fresh and tart, not jam."],
      ["Georgian wine by the glass", "Amber wines fermented in clay qvevri. A place that pours a few is taking the culture seriously."],
    ],
    order: [
      ["Adjaruli khachapuri", "Stir the egg and butter in immediately."],
      ["Khinkali", "Order several per person."],
      ["Pkhali and badrijani", "As starters for the table."],
      ["Mtsvadi", "Grilled pork or lamb skewers with tkemali."],
      ["Chakapuli or chashushuli", "Herb lamb stew or spicy beef stew."],
    ],
    signals:
      "The search reads for khachapuri, khinkali and Georgian in menus and reviews, and filters out places in the state of Georgia that merely mention it — which, for this cuisine, is most of the noise.",
    related: ["dumplings", "soup-dumplings", "bakery"],
    situations: ["celebrating", "big-group", "trying-something-new"],
  },
  {
    s: "russian-food",
    n: "Russian food",
    h1: "How to find good Russian food",
    title: "How to Find Good Russian Food Near You",
    desc:
      "Pelmeni, borscht, blini and herring under a fur coat: what makes a good Russian restaurant, and what to order the first time.",
    lede:
      "Russian restaurants in the US range from cafeterias serving immigrant neighbourhoods to loud banquet halls built for weddings. The cafeterias usually have the better food; the banquet halls have the better night out.",
    good: [
      ["Pelmeni made in-house", "Small meat dumplings, boiled and served with sour cream or butter. Handmade ones are tender with a thin wrapper; frozen ones are heavy."],
      ["Borscht with sourness", "Beet soup with meat stock, cabbage and a sour balance from vinegar or lemon, finished with sour cream and dill. A sweet borscht is a lazy one."],
      ["Salads in mayonnaise", "Olivier and herring under a fur coat are rich, layered salads built on mayonnaise. Good versions taste of the vegetables and fish, not just dressing."],
      ["Dill everywhere", "Fresh dill is the dominant herb. A kitchen generous with it is cooking the food properly."],
      ["A deli counter", "Many Russian places double as delis selling smoked fish, sausages and pickles. A busy counter means fresh stock."],
    ],
    order: [
      ["Pelmeni", "With sour cream."],
      ["Borscht", "With rye bread."],
      ["Blini", "Thin pancakes with sour cream and caviar, or filled with meat or farmer cheese."],
      ["Beef stroganoff", "Beef in a sour-cream mushroom sauce."],
      ["Herring under a fur coat", "Layers of herring, beets, potato and mayonnaise. Better than it sounds."],
    ],
    signals:
      "The search reads for pelmeni, borscht, blini and Russian or Eastern European in reviews, and for deli counters and banquet halls, then lets your sentence decide which one you are after.",
    related: ["ukrainian-food", "pierogi", "soup"],
    situations: ["celebrating", "cold-rainy-night", "big-group"],
  },
  {
    s: "ukrainian-food",
    n: "Ukrainian food",
    h1: "How to find good Ukrainian food",
    title: "How to Find Good Ukrainian Food Near You",
    desc:
      "Varenyky, borscht, holubtsi and salo: what to look for in a Ukrainian restaurant and how it differs from Russian or Polish menus.",
    lede:
      "Ukrainian cooking is the source of a lot of what gets called Eastern European food — borscht especially — and Ukrainian restaurants and church kitchens are some of the warmest, most generous places to eat in the cities that have them.",
    good: [
      ["Borscht as the house pride", "Ukrainian borscht is a national dish, red and rich with beets, beans and cabbage, often with pampushky — garlic bread rolls. A kitchen that makes it seriously makes everything seriously."],
      ["Varenyky pinched by hand", "Dumplings filled with potato, farmer cheese, sauerkraut or cherries, topped with fried onions and sour cream."],
      ["Holubtsi", "Cabbage rolls with rice and meat in tomato sauce. Should be tender all the way through."],
      ["Pampushky", "Soft bread rolls brushed with garlic and oil. The best sign of a home-style kitchen."],
      ["Seasonal and church sales", "Ukrainian churches in many US cities sell handmade varenyky. Not a restaurant, but often the best version in town."],
    ],
    order: [
      ["Borscht with pampushky", "The essential pairing."],
      ["Varenyky", "Potato and cheese first, cherry for dessert."],
      ["Holubtsi", "Cabbage rolls."],
      ["Chicken Kyiv", "Butter-filled breaded chicken, done properly."],
      ["Deruny", "Potato pancakes with sour cream."],
    ],
    signals:
      "The search reads for varenyky, borscht, holubtsi and Ukrainian, and treats pierogi-focused places as related rather than identical, so a Ukrainian kitchen is not buried under Polish ones.",
    related: ["russian-food", "polish-food", "pierogi"],
    situations: ["cold-rainy-night", "with-grandparents", "big-group"],
  },
  {
    s: "hungarian-food",
    n: "Hungarian food",
    h1: "How to find good Hungarian food",
    title: "How to Find Good Hungarian Food Near You",
    desc:
      "Goulash, chicken paprikash, lángos and chimney cake: what makes a good Hungarian restaurant and what to order.",
    lede:
      "Hungarian food is paprika cooking — not as a garnish but as the base of the dish — and the handful of Hungarian restaurants in the US tend to be old, family-run and worth finding.",
    good: [
      ["Paprika you can taste", "Sweet Hungarian paprika should be the main flavour of a stew, deep red and fragrant. If the goulash tastes of tomato instead, it has been shortcut."],
      ["Goulash as a soup", "Real gulyás is a beef soup with paprika, potatoes and caraway, not the thick stew Americans know by the name."],
      ["Nokedli", "Small, soft egg dumplings served with paprikash. Made by hand, they are irregular and tender."],
      ["Lángos fried to order", "Fried dough with garlic, sour cream and cheese. Should be crisp outside and airy inside."],
      ["Family history", "Hungarian restaurants that have been around for decades usually still cook the way they started."],
    ],
    order: [
      ["Chicken paprikash", "With nokedli and sour cream."],
      ["Gulyás soup", "With bread."],
      ["Stuffed cabbage", "Töltött káposzta, with sauerkraut and sour cream."],
      ["Lángos", "As a snack or starter."],
      ["Dobos torte or chimney cake", "For dessert."],
    ],
    signals:
      "The search reads for paprikash, gulyás, lángos and Hungarian in menus and reviews, and favours places reviewers describe as family-run or old-world, which for this cuisine is usually the right signal.",
    related: ["german-food", "polish-food", "soup"],
    situations: ["cold-rainy-night", "with-grandparents", "trying-something-new"],
  },
  {
    s: "portuguese-food",
    n: "Portuguese food",
    h1: "How to find good Portuguese food",
    title: "How to Find Good Portuguese Food Near You",
    desc:
      "Grilled sardines, bacalhau, piri-piri chicken and pastéis de nata: what to look for in a Portuguese restaurant and what to order.",
    lede:
      "Portuguese food in the US is concentrated in a few places — southeastern New England, New Jersey, California's Central Valley — and in those places it is excellent: grilled fish, salt cod, pork and clams, and custard tarts.",
    good: [
      ["Grilled fish done simply", "Whole sardines or sea bream grilled over charcoal with olive oil and salt. Simplicity is the test."],
      ["Bacalhau in several forms", "Salt cod is the national obsession, with hundreds of preparations. A menu with several bacalhau dishes is a serious Portuguese kitchen."],
      ["Piri-piri with real heat", "Chicken grilled and basted with a hot, garlicky chilli sauce. It should be smoky and genuinely spicy."],
      ["Pastéis de nata with a scorched top", "Custard tarts with flaky, crisp pastry and a blistered, almost burnt top. Pale, soft ones are a different pastry."],
      ["Portuguese bread and wine", "Papo-secos rolls and a list with vinho verde and Douro reds."],
    ],
    order: [
      ["Grilled sardines", "In season, with boiled potatoes and peppers."],
      ["Bacalhau à Brás", "Shredded salt cod with eggs, onion and straw potatoes."],
      ["Carne de porco à alentejana", "Pork and clams."],
      ["Piri-piri chicken", "Whole or half."],
      ["Pastel de nata", "With coffee."],
    ],
    signals:
      "The search reads for bacalhau, piri-piri, sardines and pastéis de nata, and for Portuguese rather than the much more common Brazilian, so the two cuisines do not get confused in results.",
    related: ["seafood", "spanish-food", "brazilian-food"],
    situations: ["celebrating", "with-grandparents", "friends-visiting"],
  },
  {
    s: "irish-food",
    n: "Irish food",
    near: "Irish pubs",
    h1: "How to find a good Irish pub and Irish food",
    title: "How to Find a Good Irish Pub Near You",
    desc:
      "Fish and chips, shepherd's pie, a full Irish breakfast and a properly poured pint: what separates a good Irish pub from a themed one.",
    lede:
      "Most Irish food in America is served in pubs, and the gap between a real one and a theme bar with a shamrock on the sign is easy to spot once you know where to look: the stew, the bread and how they pour a stout.",
    good: [
      ["Brown bread made in-house", "Dense Irish soda bread with butter. A kitchen that bakes its own is a kitchen that cares."],
      ["Stew with depth", "Lamb or beef with root vegetables, slow-cooked. Thin broth with a few cubes of meat is the giveaway."],
      ["A proper full Irish", "Rashers, sausages, black and white pudding, eggs, beans, tomato and toast. Pudding on the menu is the sign of the real thing."],
      ["Stout poured in two stages", "Filled, allowed to settle, then topped up. Rushed pints are a sign of a rushed bar."],
      ["Quiet enough at lunch", "A good pub works at lunch as much as at night. Food that is only an afterthought to the bar is usually reheated."],
    ],
    order: [
      ["Fish and chips", "Battered cod or haddock with thick chips."],
      ["Shepherd's or cottage pie", "Lamb or beef under mashed potato."],
      ["Irish stew", "With brown bread."],
      ["Full Irish breakfast", "If served, and especially on a weekend."],
      ["Bangers and mash", "With onion gravy."],
    ],
    signals:
      "The search reads reviews for food-specific language — stew, brown bread, black pudding, fish and chips — rather than the word Irish, which is used by plenty of bars that serve little food at all.",
    related: ["fish-and-chips", "gastropub", "breakfast"],
    situations: ["watching-the-game", "cold-rainy-night", "big-group"],
  },
  {
    s: "moroccan-food",
    n: "Moroccan food",
    h1: "How to find good Moroccan food",
    title: "How to Find Good Moroccan Food Near You",
    desc:
      "Tagine, couscous, pastilla and mint tea: what makes a good Moroccan restaurant and what to order the first time.",
    lede:
      "Moroccan food is sweet and savoury at once — lamb with prunes, chicken with preserved lemon, pigeon pie dusted with sugar — and a good Moroccan restaurant takes its time, because the dishes do.",
    good: [
      ["Tagines that have been slow-cooked", "Meat should be tender enough to pull with bread, in a sauce reduced to richness. Tagine is a method, not just the clay pot it is served in."],
      ["Preserved lemon and olives", "Salty, sour, fragrant. Chicken with preserved lemon and olives is the classic test."],
      ["Couscous steamed, not boiled", "Light, fluffy grains, steamed several times over the stew. Friday couscous is a tradition; a place that marks it is serious."],
      ["Pastilla", "Flaky pastry filled with spiced chicken or pigeon and almonds, dusted with cinnamon sugar. A labour-intensive dish few places make — when they do, order it."],
      ["Mint tea poured from height", "Green tea with fresh mint and sugar, poured from a raised pot to make foam."],
    ],
    order: [
      ["Chicken tagine with preserved lemon and olives", "The classic."],
      ["Lamb tagine with prunes", "Sweet and rich."],
      ["Couscous royale", "With vegetables and several meats."],
      ["Pastilla", "If available."],
      ["Harira", "Tomato, lentil and chickpea soup."],
    ],
    signals:
      "The search reads for tagine, couscous, pastilla and Moroccan, and separates Moroccan kitchens from the much broader Mediterranean category that would otherwise hide them.",
    related: ["mediterranean-food", "lebanese-food", "egyptian-food"],
    situations: ["celebrating", "first-date", "big-group"],
  },
  {
    s: "egyptian-food",
    n: "Egyptian food",
    h1: "How to find good Egyptian food",
    title: "How to Find Good Egyptian Food Near You",
    desc:
      "Koshari, ful medames, ta'ameya and molokhia: what to look for in an Egyptian restaurant and what to order first.",
    lede:
      "Egyptian food is street food at heart — beans, lentils, rice and fried things — cheap, filling and mostly vegetarian, and it is quite different from the Levantine food that dominates Middle Eastern menus in the US.",
    good: [
      ["Koshari layered properly", "Rice, lentils, pasta and chickpeas topped with a sharp tomato-vinegar sauce and crispy fried onions. The onions and the sauce make it."],
      ["Ta'ameya made with fava beans", "Egyptian falafel uses fava beans instead of chickpeas, so it is green inside and lighter. A kitchen that makes it this way is cooking Egyptian."],
      ["Ful medames slow-cooked", "Stewed fava beans with oil, cumin and lemon. Breakfast, and the national dish."],
      ["Molokhia", "A green soup of jute leaves with garlic and coriander. Its texture is slippery and that is correct."],
      ["Fresh baladi bread", "Round wholewheat flatbread, puffed and warm."],
    ],
    order: [
      ["Koshari", "The essential first order."],
      ["Ful medames", "With bread, onion and pickles."],
      ["Ta'ameya", "Fava-bean falafel."],
      ["Hawawshi", "Bread stuffed with spiced meat and baked."],
      ["Om ali", "Warm bread pudding with nuts and cream."],
    ],
    signals:
      "Egyptian restaurants are often listed as Mediterranean, so the search reads for koshari, ful, ta'ameya and hawawshi in menus and reviews, which reliably separates them.",
    related: ["falafel", "mediterranean-food", "lebanese-food"],
    situations: ["on-a-budget", "vegetarians-and-meat-eaters", "trying-something-new"],
  },
  {
    s: "israeli-food",
    n: "Israeli food",
    h1: "How to find good Israeli food",
    title: "How to Find Good Israeli Food Near You",
    desc:
      "Hummus, sabich, shakshuka, schnitzel and salatim: what makes an Israeli restaurant good and what to order first.",
    lede:
      "Israeli food is a mix of Middle Eastern, North African and Eastern European Jewish cooking, served abundantly — the table usually fills with small salads before anything you ordered arrives.",
    good: [
      ["Hummus as a main", "Warm, silky, generous, with whole chickpeas, tahini and good olive oil on top, eaten with pita. Grainy, cold hummus is the industrial version."],
      ["Salatim", "A spread of small salads — pickles, cabbage, roasted aubergine, matbucha. Variety and freshness show the kitchen's range."],
      ["Pita that is fluffy and warm", "Baked in-house or delivered fresh daily, with a proper pocket."],
      ["Amba and schug", "Pickled mango sauce and green chilli paste. Their presence means the sandwiches are being made the Israeli way."],
      ["Sabich", "Pita with fried aubergine, egg, hummus, salad and amba. A place that does it well usually does everything well."],
    ],
    order: [
      ["Hummus with toppings", "Mushrooms, meat or ful on top."],
      ["Sabich", "The Iraqi-Israeli sandwich."],
      ["Shakshuka", "Eggs baked in tomato and pepper, for breakfast or lunch."],
      ["Shawarma laffa", "Wrapped in a large flatbread."],
      ["Schnitzel", "Israeli-style, often in pita."],
    ],
    signals:
      "The search reads for sabich, salatim, schug, laffa and Israeli, and treats hummus-specific reviews as a strong signal, since a good hummus is the clearest tell of this kitchen.",
    related: ["hummus", "falafel", "shakshuka"],
    situations: ["vegetarians-and-meat-eaters", "big-group", "trying-something-new"],
  },
  {
    s: "syrian-food",
    n: "Syrian food",
    h1: "How to find good Syrian food",
    title: "How to Find Good Syrian Food Near You",
    desc:
      "Kibbeh, shawarma, muhammara and Aleppo pepper: what makes a good Syrian restaurant and what to order the first time.",
    lede:
      "Syrian cooking shares a lot with Lebanese food, but Aleppo in particular has its own tradition — more spice, more sour pomegranate, more kibbeh — and the Syrian kitchens that have opened across the US in the past decade are some of the best Middle Eastern food available.",
    good: [
      ["Kibbeh in several forms", "Bulgur and meat shells stuffed with spiced meat and pine nuts — fried, baked or raw. A long kibbeh list is a serious Syrian kitchen."],
      ["Muhammara with real Aleppo pepper", "Red pepper, walnut and pomegranate molasses dip. Should be smoky, sweet, sour and gently hot."],
      ["Pomegranate molasses used freely", "Its sour depth runs through Aleppan cooking. Dishes that taste of it are a sign of the region."],
      ["Shawarma carved to order", "Off a turning spit, with garlic toum and pickles, wrapped in thin bread."],
      ["Sweets made in-house", "Many Syrian restaurants run a sweet counter — knafeh, baklava, maamoul. A busy counter is a good sign."],
    ],
    order: [
      ["Fried kibbeh", "Crisp shells with spiced lamb."],
      ["Muhammara", "With warm bread."],
      ["Chicken shawarma plate", "With garlic sauce and pickles."],
      ["Fattoush", "Salad with toasted bread and sumac."],
      ["Knafeh", "Warm cheese pastry in syrup."],
    ],
    signals:
      "The search reads for kibbeh, muhammara, Aleppo and Syrian, separating Syrian kitchens from the wider Mediterranean category where they are usually filed.",
    related: ["lebanese-food", "shawarma", "mezze"],
    situations: ["big-group", "vegetarians-and-meat-eaters", "friends-visiting"],
  },
  {
    s: "armenian-food",
    n: "Armenian food",
    h1: "How to find good Armenian food",
    title: "How to Find Good Armenian Food Near You",
    desc:
      "Khorovats, lahmajun, manti, dolma and basturma: what to look for in an Armenian restaurant and what to order.",
    lede:
      "Armenian food sits where Middle Eastern, Caucasian and Mediterranean cooking meet. In the US it is concentrated in Southern California, Boston and New York, and its best restaurants are grill houses and bakeries.",
    good: [
      ["Khorovats over coals", "Armenian barbecue — pork, lamb or chicken on long skewers, grilled over charcoal. Smoke is essential."],
      ["Lahmajun baked thin", "Flatbread topped with minced meat, tomato and herbs, rolled up with parsley and lemon. Crisp edges, not soggy."],
      ["Small, handmade manti", "Armenian manti are tiny, baked until crisp, and served in broth or with yoghurt. Labour-intensive and a mark of care."],
      ["Basturma and sujuk", "Cured spiced beef and sausage. A deli counter with them means a kitchen connected to the community."],
      ["Lavash fresh", "Thin, soft flatbread made daily."],
    ],
    order: [
      ["Khorovats platter", "With grilled vegetables and lavash."],
      ["Lahmajun", "Several."],
      ["Manti", "With garlic yoghurt."],
      ["Dolma", "Grape leaves stuffed with rice or meat."],
      ["Basturma", "With eggs at breakfast, or on its own."],
    ],
    signals:
      "The search reads for khorovats, lahmajun, manti, basturma and Armenian, and favours grills and bakeries over generic Mediterranean listings.",
    related: ["kebabs", "mediterranean-food", "georgian-food"],
    situations: ["big-group", "celebrating", "friends-visiting"],
  },
  {
    s: "iraqi-food",
    n: "Iraqi food",
    h1: "How to find good Iraqi food",
    title: "How to Find Good Iraqi Food Near You",
    desc:
      "Masgouf, dolma, quzi, kubba and samoon bread: what to look for in an Iraqi restaurant and what to order the first time.",
    lede:
      "Iraqi food is generous, rice-heavy and slow-cooked, with flavours of dried lime, tomato and baharat. Iraqi restaurants in the US are most common around Detroit, San Diego, Nashville and Chicago, and they are worth seeking out.",
    good: [
      ["Samoon baked in-house", "Diamond-shaped Iraqi bread, crisp outside and soft inside, often from a stone oven on site."],
      ["Quzi", "Lamb slow-cooked on spiced rice with nuts and raisins. A centrepiece dish; a place that makes it is cooking for families."],
      ["Iraqi dolma", "Vegetables and vine leaves stuffed and cooked together in a sour, tomatoey sauce. Different from Greek or Lebanese dolma."],
      ["Kubba", "Rice or bulgur shells with spiced meat, fried or simmered in soup. Kubba hamuth, in a sour turnip broth, is a sign of a home-style kitchen."],
      ["Dried lime", "Black dried lime gives Iraqi stews their sour, earthy depth."],
    ],
    order: [
      ["Quzi", "If on the menu."],
      ["Dolma", "The Iraqi mixed version."],
      ["Tikka and kebab", "From the grill, with samoon."],
      ["Masgouf", "Butterflied grilled carp, if you find it."],
      ["Tepsi baytinjan", "Baked aubergine and meatballs in tomato sauce."],
    ],
    signals:
      "The search reads for samoon, quzi, kubba, masgouf and Iraqi, which separates Iraqi kitchens from the Middle Eastern category they are usually filed in.",
    related: ["kebabs", "mediterranean-food", "halal-food"],
    situations: ["big-group", "trying-something-new", "celebrating"],
  },
  {
    s: "yemeni-food",
    n: "Yemeni food",
    h1: "How to find good Yemeni food",
    title: "How to Find Good Yemeni Food Near You",
    desc:
      "Mandi, saltah, fahsa, malawah and Yemeni coffee: what to look for in a Yemeni restaurant and what to order.",
    lede:
      "Yemeni restaurants and coffee houses have spread quickly across the US, and the food — slow-roasted meat on spiced rice, bubbling stews in stone bowls, enormous flatbreads — is some of the best value in any city that has it.",
    good: [
      ["Mandi with tender meat", "Lamb or chicken slow-roasted and served on fragrant rice. The meat should fall from the bone."],
      ["Saltah or fahsa bubbling in a stone pot", "Stews topped with a frothy fenugreek foam (hulba), served boiling. Eaten with bread torn by hand."],
      ["Fresh, huge flatbread", "Malawah and khubz baked in a tandoor, often big enough to share."],
      ["Zhug", "Green chilli and herb sauce on every table."],
      ["Yemeni coffee and tea", "Spiced coffee with cardamom and ginger, and milk tea. The coffee houses are a cultural institution."],
    ],
    order: [
      ["Lamb mandi", "The essential."],
      ["Fahsa", "Shredded lamb stew in a stone pot."],
      ["Saltah", "With bread."],
      ["Fattah", "Bread soaked in broth with honey or meat."],
      ["Honey cake (bint al sahn)", "Layered flaky bread with honey and black seed."],
    ],
    signals:
      "The search reads for mandi, fahsa, saltah and Yemeni, and also for Yemeni coffee, so it can tell a full kitchen from a coffee house and give you the one you asked for.",
    related: ["halal-food", "coffee", "mediterranean-food"],
    situations: ["big-group", "late-night", "trying-something-new"],
  },
  {
    s: "somali-food",
    n: "Somali food",
    h1: "How to find good Somali food",
    title: "How to Find Good Somali Food Near You",
    desc:
      "Bariis, suqaar, goat, sambusa and the banana on the side: what to look for in a Somali restaurant and what to order.",
    lede:
      "Somali food blends East African, Arabian, Indian and Italian influences — spiced rice, tender goat, pasta — and the restaurants, concentrated in Minneapolis, Columbus and Seattle, are cheap, generous and halal.",
    good: [
      ["Bariis that is aromatic", "Spiced basmati rice with cardamom, cumin and cinnamon, often with raisins and onions. It is the base of most meals."],
      ["Goat that falls apart", "Slow-cooked or roasted goat is the house speciality at many Somali restaurants."],
      ["A banana with the plate", "Served on the side and eaten with the rice. Its presence means the plate is being served the Somali way."],
      ["Suqaar", "Small pieces of meat sautéed with vegetables and spices. A quick, everyday dish that shows the kitchen's spicing."],
      ["Basbaas", "Green chilli sauce. Should be fresh and sharp."],
    ],
    order: [
      ["Goat with bariis", "The classic plate."],
      ["Suqaar", "With rice, pasta or chapati."],
      ["Sambusa", "Fried pastries with meat."],
      ["Canjeero", "Spongy flatbread for breakfast."],
      ["Shaah", "Spiced tea."],
    ],
    signals:
      "The search reads for bariis, suqaar, goat, sambusa and Somali, and for reviews describing the restaurant as East African or halal, which is where Somali kitchens tend to be filed.",
    related: ["ethiopian-food", "halal-food", "curry"],
    situations: ["on-a-budget", "big-group", "trying-something-new"],
  },
  {
    s: "haitian-food",
    n: "Haitian food",
    h1: "How to find good Haitian food",
    title: "How to Find Good Haitian Food Near You",
    desc:
      "Griot, pikliz, diri djon djon and soup joumou: what to look for in a Haitian restaurant and what to order first.",
    lede:
      "Haitian food is bold, citrusy and fried — pork marinated in sour orange, pickled cabbage with Scotch bonnet heat, black mushroom rice — and the best places are small, cash-friendly and packed on weekends.",
    good: [
      ["Griot crisp outside and tender inside", "Pork shoulder marinated in sour orange and epis, braised, then fried. It is the dish to judge a Haitian kitchen by."],
      ["Pikliz with real fire", "Pickled cabbage, carrots and Scotch bonnet in vinegar. It should be sharp and hot, and it goes on everything."],
      ["Epis", "The green seasoning base of parsley, garlic, peppers and herbs. Food that tastes of it is home cooking."],
      ["Diri djon djon", "Rice cooked with black mushrooms until it turns dark grey and earthy. Special, and not every place makes it."],
      ["Bannann peze", "Twice-fried plantains, crisp and salty."],
    ],
    order: [
      ["Griot", "With pikliz and plantains."],
      ["Tassot", "Fried goat or beef."],
      ["Diri djon djon", "If available."],
      ["Legume", "Vegetable and meat stew."],
      ["Soup joumou", "Pumpkin soup, especially around New Year."],
    ],
    signals:
      "The search reads for griot, pikliz, djon djon and Haitian, so Haitian kitchens are not lost under the broader Caribbean label.",
    related: ["caribbean-food", "jamaican-food", "dominican-food"],
    situations: ["big-group", "on-a-budget", "new-years-eve"],
  },
  {
    s: "puerto-rican-food",
    n: "Puerto Rican food",
    h1: "How to find good Puerto Rican food",
    title: "How to Find Good Puerto Rican Food Near You",
    desc:
      "Mofongo, pernil, arroz con gandules and alcapurrias: what to look for in a Puerto Rican restaurant and what to order.",
    lede:
      "Puerto Rican food is built on sofrito, pork and plantains, and the best versions on the mainland come from small family places and food trucks where the mofongo is mashed to order.",
    good: [
      ["Mofongo mashed to order", "Fried green plantains mashed with garlic and chicharrón in a wooden pilón. It should be garlicky and dense, with crisp bits, and served with broth or a sauce."],
      ["Pernil with crackling", "Slow-roasted pork shoulder with crisp skin (cuerito). Soft skin is a let-down."],
      ["Sofrito that tastes fresh", "Recaito, peppers, garlic and culantro. Puerto Rican food made with fresh sofrito tastes brighter than anything made with jarred."],
      ["Arroz con gandules with pegao", "Rice with pigeon peas, and ideally a crust of crispy rice from the bottom of the pot."],
      ["Frituras", "Alcapurrias, bacalaítos and pastelillos fried fresh. A counter of them is a good sign."],
    ],
    order: [
      ["Mofongo", "With shrimp or chicharrón."],
      ["Pernil", "With arroz con gandules."],
      ["Alcapurrias", "Fried plantain-and-yuca fritters with meat."],
      ["Tripleta", "The Puerto Rican three-meat sandwich."],
      ["Flan or tembleque", "Coconut pudding to finish."],
    ],
    signals:
      "The search reads for mofongo, pernil, alcapurrias and Puerto Rican or boricua, and keeps food trucks and counter spots in results, because that is where much of the best cooking is.",
    related: ["caribbean-food", "cuban-food", "dominican-food"],
    situations: ["big-group", "celebrating", "on-a-budget"],
  },
  {
    s: "dominican-food",
    n: "Dominican food",
    h1: "How to find good Dominican food",
    title: "How to Find Good Dominican Food Near You",
    desc:
      "Mangú, la bandera, chicharrón and sancocho: what to look for in a Dominican restaurant and what to order first.",
    lede:
      "Dominican restaurants are everyday places — cheap lunch plates, breakfast mangú, chicken by the pound — and in cities with a big Dominican community they are some of the most reliable food in town.",
    good: [
      ["La bandera at lunch", "Rice, red beans and stewed meat — the Dominican flag. A busy lunch counter serving it is the core of the cuisine."],
      ["Mangú smooth and buttery", "Mashed green plantains with pickled red onions, served with fried cheese, salami and eggs (los tres golpes). Breakfast, but available all day at good places."],
      ["Chicharrón de pollo", "Bone-in chicken pieces marinated in lime and fried hard. Crisp, sour and salty."],
      ["Sancocho on the weekend", "A thick stew of several meats and root vegetables. Many places make it only on weekends."],
      ["Fresh juices and morir soñando", "Orange juice and milk shaken together. A good Dominican spot always has fresh juices."],
    ],
    order: [
      ["La bandera", "With stewed chicken or beef."],
      ["Mangú con los tres golpes", "Breakfast."],
      ["Chicharrón de pollo", "With tostones."],
      ["Sancocho", "On the weekend."],
      ["Pastelitos", "Fried turnovers."],
    ],
    signals:
      "The search reads for mangú, la bandera, sancocho and Dominican, and looks at lunch-hour reviews, because Dominican restaurants are best judged on everyday plates rather than special-occasion ones.",
    related: ["caribbean-food", "puerto-rican-food", "cuban-food"],
    situations: ["on-a-budget", "hungover", "after-a-shift"],
  },
  {
    s: "venezuelan-food",
    n: "Venezuelan food",
    h1: "How to find good Venezuelan food",
    title: "How to Find Good Venezuelan Food Near You",
    desc:
      "Arepas, pabellón criollo, cachapas and tequeños: what to look for in a Venezuelan restaurant and what to order.",
    lede:
      "Venezuelan restaurants have multiplied across the US, and the core menu — arepas, cachapas, tequeños, pabellón — is simple enough that the gap between a good kitchen and an average one is obvious.",
    good: [
      ["Arepas cooked to order", "Griddled then finished in the oven, crisp outside, steamy inside, split and stuffed. See our arepas guide for more."],
      ["Pabellón criollo with balance", "Shredded beef, black beans, white rice and fried sweet plantains. The beef should be saucy and well seasoned."],
      ["Cachapas from fresh corn", "Sweet corn pancakes folded over soft queso de mano. Should be tender and slightly coarse."],
      ["Tequeños with real cheese", "White cheese wrapped in dough and fried. The cheese should stretch."],
      ["Guasacaca", "Avocado and herb sauce. Fresh and tangy, on the table."],
    ],
    order: [
      ["Reina pepiada arepa", "Chicken and avocado salad."],
      ["Pabellón criollo", "The national dish."],
      ["Cachapa", "With queso de mano."],
      ["Tequeños", "For the table."],
      ["Tres leches or quesillo", "For dessert."],
    ],
    signals:
      "The search reads for pabellón, cachapa, tequeños and Venezuelan, alongside arepas, and separates Venezuelan kitchens from Colombian ones where the menus overlap.",
    related: ["arepas", "colombian-food", "empanadas"],
    situations: ["on-a-budget", "big-group", "late-night"],
  },
  {
    s: "argentinian-food",
    n: "Argentinian food",
    h1: "How to find good Argentinian food",
    title: "How to Find Good Argentinian Food Near You",
    desc:
      "Asado, empanadas, chimichurri and milanesa: what to look for in an Argentinian steakhouse or parrilla, and what to order.",
    lede:
      "Argentinian food is beef cooked over wood and coals with very little else — salt, chimichurri, a glass of Malbec — and a good parrilla shows its quality in exactly how little it does.",
    good: [
      ["A real parrilla", "A grill over wood or charcoal embers, not gas. Smoke and slow, even heat define Argentinian beef."],
      ["Cuts you do not see elsewhere", "Vacío (flank), entraña (skirt), mollejas (sweetbreads), chorizo and morcilla. A menu with them is a real asado menu."],
      ["Chimichurri made fresh", "Parsley, oregano, garlic, vinegar, oil and chilli flakes. Bright and sharp, never blended into a paste."],
      ["Empanadas baked, with repulgue", "The folded edge tells you the filling. Juicy beef empanadas (cortadas a cuchillo, knife-cut) are the best."],
      ["Malbec by the glass", "Not essential, but nearly always a sign the place knows its customers."],
    ],
    order: [
      ["Parrillada", "A mixed grill for two or more."],
      ["Entraña or vacío", "With chimichurri."],
      ["Beef empanadas", "As a starter."],
      ["Milanesa napolitana", "Breaded cutlet with ham, tomato and cheese."],
      ["Alfajores or flan with dulce de leche", "For dessert."],
    ],
    signals:
      "The search reads for parrilla, asado, entraña, chimichurri and Argentinian, and leans on reviews that talk about the grill itself, which is where an Argentinian restaurant's quality shows.",
    related: ["steak", "empanadas", "brazilian-food"],
    situations: ["celebrating", "birthday-dinner", "big-group"],
  },
  {
    s: "ecuadorian-food",
    n: "Ecuadorian food",
    h1: "How to find good Ecuadorian food",
    title: "How to Find Good Ecuadorian Food Near You",
    desc:
      "Ceviche, encebollado, llapingachos and hornado: what to look for in an Ecuadorian restaurant and what to order.",
    lede:
      "Ecuadorian food has two halves — the coast, with shrimp ceviche and fish soups, and the highlands, with roast pork and potato cakes — and most Ecuadorian restaurants in the US serve both.",
    good: [
      ["Coastal ceviche", "Ecuadorian ceviche is soupier than Peruvian, often made with cooked shrimp in a tangy tomato-citrus juice, served with popcorn or plantain chips."],
      ["Encebollado", "Tuna and yuca soup with pickled onions. The national hangover cure, usually best in the morning."],
      ["Hornado with crackling", "Whole roast pork, served with llapingachos (potato cakes) and mote (hominy)."],
      ["Ají on the table", "Fresh chilli sauce with tree tomato or onion. Every good place makes its own."],
      ["Weekend specials", "Fanesca at Easter, guatita (tripe stew) and caldo de bola on weekends — signs of a kitchen serving the community."],
    ],
    order: [
      ["Shrimp ceviche", "With chifles and popcorn."],
      ["Encebollado", "For breakfast or lunch."],
      ["Hornado", "Roast pork with potato cakes."],
      ["Bolón de verde", "Green plantain dumpling with cheese or pork."],
      ["Seco de chivo", "Goat stew with rice."],
    ],
    signals:
      "The search reads for encebollado, hornado, llapingachos and Ecuadorian, and does not confuse Ecuadorian ceviche with Peruvian, since the two are different dishes.",
    related: ["ceviche", "peruvian-food", "colombian-food"],
    situations: ["hungover", "big-group", "trying-something-new"],
  },
  {
    s: "guatemalan-food",
    n: "Guatemalan food",
    h1: "How to find good Guatemalan food",
    title: "How to Find Good Guatemalan Food Near You",
    desc:
      "Pepián, chuchitos, pupusas and Guatemalan breakfast: what to look for in a Guatemalan restaurant and what to order.",
    lede:
      "Guatemalan food is Maya-rooted cooking — roasted-seed stews, tamales, black beans and thick tortillas — and the restaurants are often small bakeries and cafés that serve the community breakfast.",
    good: [
      ["Pepián with roasted spices", "A national stew of chicken or beef in a sauce of toasted seeds, chillies and tomatoes. Should be smoky and complex."],
      ["Chuchitos and paches", "Guatemalan tamales: chuchitos are small and firm in corn husks; paches are made with potato. Both show home-style cooking."],
      ["Thick handmade tortillas", "Smaller and thicker than Mexican tortillas, made fresh."],
      ["Desayuno chapín", "Eggs, black beans, plantains, cream, cheese and tortillas. A good Guatemalan breakfast is a big one."],
      ["A bakery counter", "Many Guatemalan restaurants run a panadería. Fresh pan dulce is a sign of an active kitchen."],
    ],
    order: [
      ["Pepián", "The national dish."],
      ["Chuchitos", "With salsa and cheese."],
      ["Desayuno chapín", "Breakfast."],
      ["Hilachas", "Shredded beef in tomato sauce."],
      ["Rellenitos", "Sweet plantain balls filled with beans and chocolate."],
    ],
    signals:
      "The search reads for pepián, chuchitos, chapín and Guatemalan, separating Guatemalan places from the Mexican and Salvadoran restaurants they often sit beside.",
    related: ["salvadoran-food", "tamales", "honduran-food"],
    situations: ["on-a-budget", "trying-something-new", "breakfast-meeting"],
  },
  {
    s: "honduran-food",
    n: "Honduran food",
    h1: "How to find good Honduran food",
    title: "How to Find Good Honduran Food Near You",
    desc:
      "Baleadas, plato típico, sopa de caracol and fried fish: what to look for in a Honduran restaurant and what to order.",
    lede:
      "Honduran food is simple and satisfying — flour tortillas folded around beans and cream, fried fish with plantains, coconut seafood soups — and a good Honduran restaurant is usually judged by one thing: the baleadas.",
    good: [
      ["Baleadas with thick handmade tortillas", "Soft, chewy flour tortillas, folded over refried beans, crema and crumbled cheese. Handmade tortillas are essential."],
      ["Plato típico", "Grilled steak, beans, rice, plantains, cream, cheese and avocado. Generous is the point."],
      ["Fried whole fish", "Pescado frito with tajadas (fried plantain chips) and cabbage salad. Crisp and fresh."],
      ["Coconut soups", "Sopa de caracol (conch) and seafood soups made with coconut milk, from the Caribbean coast."],
      ["Tajadas everywhere", "Thin fried green plantain slices. Fresh and crisp is a good sign."],
    ],
    order: [
      ["Baleada sencilla, then with eggs or meat", "Start plain to judge it."],
      ["Plato típico", "The full plate."],
      ["Pescado frito", "Fried fish with tajadas."],
      ["Sopa de caracol", "If available."],
      ["Pollo chuco", "Fried chicken over plantain chips with cabbage and sauces."],
    ],
    signals:
      "The search reads for baleadas, plato típico, catracho and Honduran, which is enough to find Honduran kitchens listed as Latin or Mexican.",
    related: ["salvadoran-food", "guatemalan-food", "seafood"],
    situations: ["on-a-budget", "breakfast-meeting", "big-group"],
  },
  {
    s: "oaxacan-food",
    n: "Oaxacan food",
    h1: "How to find good Oaxacan food",
    title: "How to Find Good Oaxacan Food Near You",
    desc:
      "Moles, tlayudas, memelas and quesillo: what makes Oaxacan cooking distinct and how to find a good Oaxacan restaurant.",
    lede:
      "Oaxaca is the region of Mexico most celebrated for its food — seven moles, giant crisp tlayudas, mezcal — and Oaxacan restaurants in the US, especially in Los Angeles, are some of the best Mexican cooking in the country.",
    good: [
      ["More than one mole", "Mole negro, rojo, coloradito, amarillo, verde. A kitchen offering several, made in-house, is serious. See our mole guide for how to judge one."],
      ["Tlayudas crisp over charcoal", "Large, thin, toasted tortillas spread with asiento (pork lard), beans, quesillo and meat, folded and grilled."],
      ["Quesillo", "Oaxacan string cheese, pulled into strands. Its presence is a good sign."],
      ["Chapulines", "Toasted grasshoppers with lime and chilli. If they are on the menu, the kitchen is cooking for Oaxacans."],
      ["Tasajo and cecina", "Thin dried beef and chilli-rubbed pork from the grill."],
    ],
    order: [
      ["Mole negro", "With chicken."],
      ["Tlayuda", "With tasajo or cecina."],
      ["Memelas", "Thick tortillas with asiento, beans and cheese."],
      ["Tamales oaxaqueños", "Wrapped in banana leaf, with mole."],
      ["Champurrado or mezcal", "To finish."],
    ],
    signals:
      "The search reads for Oaxacan, tlayuda, mole negro, quesillo and chapulines, which separates Oaxacan kitchens from the very large field of general Mexican restaurants.",
    related: ["mole", "mexican-food", "tamales"],
    situations: ["celebrating", "trying-something-new", "friends-visiting"],
  },
  {
    s: "tex-mex-food",
    n: "Tex-Mex food",
    h1: "How to find good Tex-Mex",
    title: "How to Find Good Tex-Mex Near You",
    desc:
      "Enchiladas in chili gravy, fajitas, queso and puffy tacos: what separates good Tex-Mex from tired chain food, and what to order.",
    lede:
      "Tex-Mex is not inauthentic Mexican food — it is its own regional American cuisine, a century old, with its own canon: chili gravy, yellow cheese, flour tortillas, fajitas and queso. Judged on its own terms, the gap between good and bad is wide.",
    qa: [
      "What is the difference between Tex-Mex and Mexican food?",
      "Tex-Mex is a Texan cuisine developed by Tejano cooks, built on beef, yellow cheese, cumin, flour tortillas and chili gravy. Interior Mexican cooking uses more pork, fresh white cheeses, corn tortillas, and complex sauces like mole. Dishes like fajitas, chili con queso, crispy tacos and combination plates are Tex-Mex inventions.",
    ],
    good: [
      ["Flour tortillas made in-house", "Soft, slightly charred, a little chewy. Store-bought flour tortillas are the clearest sign of a lazy Tex-Mex kitchen."],
      ["Chili gravy enchiladas", "Cheese enchiladas with a brown, cumin-heavy chili gravy and raw onion. The classic Texas plate."],
      ["Queso that is smooth and hot", "Melted cheese with peppers and tomatoes, served hot enough to stay liquid."],
      ["Fajitas sizzling from the grill", "Skirt steak, grilled over flame, with charred onions and peppers."],
      ["Salsa and chips made fresh", "Warm chips fried in-house and a salsa with some heat."],
    ],
    order: [
      ["Cheese enchiladas with chili gravy", "The benchmark."],
      ["Beef fajitas", "Skirt steak, not flank."],
      ["Queso", "With chips, for the table."],
      ["Puffy tacos", "A San Antonio speciality, if available."],
      ["Breakfast tacos", "In the morning, on flour tortillas."],
    ],
    signals:
      "The search reads for Tex-Mex, chili gravy, fajitas, queso and handmade tortillas, and keeps Tex-Mex separate from interior Mexican, so you get the one you asked for.",
    related: ["mexican-food", "enchiladas", "nachos"],
    situations: ["big-group", "birthday-dinner", "with-picky-eaters"],
  },
  {
    s: "cajun-food",
    n: "Cajun food",
    near: "Cajun and Creole",
    h1: "How to find good Cajun and Creole food",
    title: "How to Find Good Cajun and Creole Food Near You",
    desc:
      "Gumbo, étouffée, boudin and jambalaya: the difference between Cajun and Creole, and what separates a good Louisiana restaurant from a themed one.",
    lede:
      "Cajun and Creole are two Louisiana cuisines that share a pantry — the holy trinity of onion, celery and bell pepper, dark roux, rice and seafood — but differ in origin and style. A good restaurant knows which one it is cooking.",
    qa: [
      "What is the difference between Cajun and Creole food?",
      "Creole cooking grew in New Orleans from French, Spanish, African and Caribbean influences and tends to use tomatoes, butter and cream. Cajun cooking comes from the Acadian settlers of rural southwest Louisiana and is rustic, built on dark roux and pork fat, usually without tomatoes. Gumbo and jambalaya exist in both styles.",
    ],
    good: [
      ["A dark roux", "Flour cooked in fat until it is the colour of chocolate. It gives gumbo and étouffée their depth and takes patience."],
      ["Andouille and boudin", "Smoked sausage and rice-and-pork sausage. A place that makes or sources real versions is connected to Louisiana."],
      ["Seafood in season", "Crawfish in spring, Gulf shrimp and oysters year round. A Louisiana kitchen cooks by the season."],
      ["Heat with flavour", "Cajun food is well seasoned, not just hot. Cayenne should be a layer, not the whole dish."],
      ["Rice cooked right", "Separate grains under gumbo and étouffée. Mushy rice ruins a good stew."],
    ],
    order: [
      ["Gumbo", "Chicken and andouille, or seafood."],
      ["Crawfish étouffée", "Smothered crawfish over rice."],
      ["Jambalaya", "Red (Creole) or brown (Cajun)."],
      ["Boudin", "As a snack or starter."],
      ["Red beans and rice", "Traditional on Mondays."],
    ],
    signals:
      "The search reads for roux, andouille, étouffée, boudin and Cajun or Creole, and separates Louisiana kitchens from seafood boil chains that use the word Cajun as a seasoning description.",
    related: ["gumbo", "jambalaya", "crawfish"],
    situations: ["big-group", "celebrating", "cold-rainy-night"],
  },
  {
    s: "soul-food",
    n: "Soul food",
    near: "soul food",
    h1: "How to find good soul food",
    title: "How to Find Good Soul Food Near You",
    desc:
      "Fried chicken, collard greens, mac and cheese, candied yams and cornbread: what separates a great soul food restaurant from an average one.",
    lede:
      "Soul food is African American cooking with roots in the Deep South, and the best restaurants serving it are often cafeterias and family kitchens where the sides matter as much as the main.",
    good: [
      ["Greens cooked long", "Collards or mustard greens simmered with smoked meat until tender, with plenty of pot liquor. Bitter, tough greens mean a rushed pot."],
      ["Baked mac and cheese", "Firm enough to cut, with a browned top and several cheeses. Soupy macaroni is a different dish."],
      ["Fried chicken seasoned through", "Crisp skin and meat that is seasoned right to the bone."],
      ["Cornbread", "Whether sweet or savoury, it should be fresh and moist, ideally from a skillet."],
      ["Sides that change daily", "A board of daily sides — black-eyed peas, candied yams, okra, cabbage — is a kitchen cooking every morning."],
    ],
    order: [
      ["Fried chicken with two or three sides", "Greens and mac and cheese at minimum."],
      ["Smothered pork chops", "In onion gravy."],
      ["Oxtails", "Braised, with rice."],
      ["Fried catfish", "Cornmeal-crusted."],
      ["Peach cobbler or sweet potato pie", "For dessert."],
    ],
    signals:
      "The search reads for greens, mac and cheese, smothered, oxtails and soul food, and favours places where reviewers praise the sides by name — the most reliable tell of a serious soul food kitchen.",
    related: ["fried-chicken", "southern-food", "mac-and-cheese"],
    situations: ["sunday-night", "with-grandparents", "after-a-shift"],
  },
  {
    s: "southern-food",
    n: "Southern food",
    near: "Southern food",
    h1: "How to find good Southern food",
    title: "How to Find Good Southern Food Near You",
    desc:
      "Biscuits, fried chicken, shrimp and grits, barbecue and pie: what separates a genuinely good Southern restaurant from a theme, and what to order.",
    lede:
      "Southern food covers enormous ground — Lowcountry rice and shrimp, Appalachian beans and cornbread, Delta catfish, Carolina barbecue — and the good restaurants are specific about which South they are cooking.",
    good: [
      ["Biscuits made from scratch", "Tall, flaky, buttery, baked through the morning. A kitchen that buys them frozen tells you a lot."],
      ["Grits that are stone-ground", "Coarse, slow-cooked with butter. Instant grits are smooth and bland by comparison."],
      ["A clear regional identity", "Lowcountry, Appalachian, Gulf, Delta. Places that say which tend to cook better than places that do all of it."],
      ["Seasonal vegetables", "Okra, tomatoes, butter beans, field peas. Southern cooking is as much about vegetables as meat."],
      ["Pie made in-house", "Pecan, chess, buttermilk, sweet potato. A dessert case of homemade pie is a good sign."],
    ],
    order: [
      ["Fried chicken and biscuits", "With honey or gravy."],
      ["Shrimp and grits", "The Lowcountry classic."],
      ["Country fried steak", "With cream gravy."],
      ["A vegetable plate", "Several sides as a meal."],
      ["Pie", "Whatever is fresh."],
    ],
    signals:
      "The search reads for scratch biscuits, stone-ground grits, regional terms like Lowcountry, and reviews describing sides and pies, which tend to separate cooking from branding in this category.",
    related: ["soul-food", "biscuits-and-gravy", "shrimp-and-grits"],
    situations: ["sunday-night", "with-grandparents", "friends-visiting"],
  },
  {
    s: "new-mexican-food",
    n: "New Mexican food",
    h1: "How to find good New Mexican food",
    title: "How to Find Good New Mexican Food Near You",
    desc:
      "Red or green chile, sopaipillas, carne adovada and stacked enchiladas: what makes New Mexican cooking distinct and how to find a good one.",
    lede:
      "New Mexican food is not Mexican and not Tex-Mex. It is built on one ingredient — the New Mexico chile, roasted green or dried red — and the state question, 'red or green?', is the whole cuisine in two words.",
    qa: [
      "What does 'Christmas' mean in New Mexican food?",
      "Ordering 'Christmas' means you want both red and green chile on your dish, usually half and half. Green chile is roasted fresh pods with a bright, smoky heat; red chile is made from dried pods and is earthier and deeper. If you can't decide, Christmas is the standard answer.",
    ],
    good: [
      ["Roasted green chile with smoke", "Hatch or other New Mexico chiles roasted until blistered. Bright, smoky, with real heat."],
      ["Red chile from pods", "Dried red chile pods blended into a smooth sauce. Should taste earthy and slightly sweet, not like chilli powder."],
      ["Sopaipillas puffed and hot", "Fried bread pillows, served with honey. They should be hollow and light."],
      ["Stacked enchiladas", "Flat, layered blue corn tortillas with chile and cheese, often with a fried egg on top."],
      ["Posole and carne adovada", "Hominy stew and pork braised in red chile. Signs of a kitchen cooking the state's food."],
    ],
    order: [
      ["Enchiladas, Christmas", "Red and green chile."],
      ["Carne adovada", "Pork in red chile."],
      ["Green chile stew", "With pork and potatoes."],
      ["A green chile cheeseburger", "A state institution."],
      ["Sopaipillas", "With honey."],
    ],
    signals:
      "The search reads for Hatch, green chile, red chile, Christmas, sopaipillas and New Mexican, which separates New Mexican kitchens from Tex-Mex and Mexican restaurants nearby.",
    related: ["mexican-food", "tex-mex-food", "enchiladas"],
    situations: ["road-trip", "cold-rainy-night", "friends-visiting"],
  },
  {
    s: "american-food",
    n: "American food",
    h1: "How to find a good American restaurant",
    title: "How to Find a Good American Restaurant Near You",
    desc:
      "Burgers, steaks, roast chicken and seasonal plates: what separates a good American restaurant or neighbourhood grill from a forgettable one.",
    lede:
      "'American' on a restaurant sign can mean a diner, a sports bar, a steakhouse, a farm-to-table bistro or a chain — so the useful question is not whether it is American but whether the kitchen is cooking or reheating.",
    good: [
      ["A short menu", "A long American menu — pasta, tacos, sushi rolls and burgers — is almost always a freezer. Twenty items or fewer usually means fresh."],
      ["A burger that tells you how it is cooked", "Ask for medium and see if you get medium. It is the simplest check of a grill cook."],
      ["House-made sides", "Real fries, slaw made that day, seasonal vegetables. Sides reveal effort."],
      ["Seasonal changes", "A menu that shifts with the season is a kitchen buying ingredients rather than pallets."],
      ["Reliable at lunch", "A good neighbourhood American place is good on a Tuesday at noon, not only on a Saturday night."],
    ],
    order: [
      ["The burger", "The benchmark dish."],
      ["Roast chicken", "If there is one, it is often the best thing on the menu."],
      ["The seasonal vegetable plate", "To check if the kitchen cares."],
      ["A steak", "If the place is a grill."],
      ["Pie or a sundae", "American dessert, done properly."],
    ],
    signals:
      "Because 'American' says so little, the search leans heavily on what reviewers describe — house-made, seasonal, from scratch — and on what you ask for, so a sentence like 'neighbourhood grill with a great burger' does more than the category ever could.",
    related: ["burgers", "steak", "diner"],
    situations: ["with-picky-eaters", "meeting-the-parents", "work-team-lunch"],
  },
  {
    s: "tibetan-food",
    n: "Tibetan food",
    h1: "How to find good Tibetan food",
    title: "How to Find Good Tibetan Food Near You",
    desc:
      "Momo, thenthuk, shapale and butter tea: what to look for in a Tibetan restaurant and what to order first.",
    lede:
      "Tibetan food is highland cooking — dumplings, hand-torn noodle soups, barley — warming, simple and inexpensive, and often served in small family restaurants alongside Nepali and Indian dishes.",
    good: [
      ["Momo pleated by hand", "Beef, vegetable or cheese dumplings, steamed or fried. Tibetan momo tend to be larger and plainer than Nepali ones, with the flavour in the filling and the chilli sauce."],
      ["Thenthuk with hand-pulled noodles", "Flat, hand-torn noodles in a hearty broth with meat and vegetables. Rustic and comforting."],
      ["Sepen", "Tibetan chilli sauce. Every kitchen makes its own, and it can be fiery."],
      ["Shapale", "Fried bread pockets filled with seasoned meat. Crisp and juicy."],
      ["Butter tea, if offered", "Salty tea churned with butter. An acquired taste, and a sign of a traditional kitchen."],
    ],
    order: [
      ["Beef momo", "Steamed."],
      ["Thenthuk", "Noodle soup."],
      ["Shapale", "Fried meat pies."],
      ["Laphing", "Cold, spicy mung bean noodles."],
      ["Butter tea", "Once, for the experience."],
    ],
    signals:
      "The search reads for momo, thenthuk, shapale and Tibetan or Himalayan, and favours small family restaurants where reviewers describe the food as home-style.",
    related: ["nepali-food", "dumplings", "momos"],
    situations: ["cold-rainy-night", "on-a-budget", "sick-with-a-cold"],
  },
  {
    s: "trinidadian-food",
    n: "Trinidadian food",
    h1: "How to find good Trinidadian food",
    title: "How to Find Good Trinidadian Food Near You",
    desc:
      "Doubles, roti, bake and shark, and curry goat: what makes Trinidadian food distinct and how to find a good place.",
    lede:
      "Trinidadian food combines Indian, African, Chinese and Creole cooking, and its most famous dish — doubles, curried chickpeas between two pieces of fried bread — is the best two-dollar breakfast in any city that sells it.",
    good: [
      ["Doubles made fresh", "Soft, fried bara with curried channa, cucumber, tamarind and pepper sauce. Wrapped in paper, eaten standing up, still warm."],
      ["Roti with a soft, layered skin", "Buss-up-shut (shredded paratha) or dhalpuri (with ground split peas). Both should be tender and flaky."],
      ["Curry with green seasoning", "Trini curries start with a green seasoning of culantro, thyme and peppers. The flavour is distinct from Indian or Jamaican curry."],
      ["Pepper sauce with a warning", "Scotch bonnet-based and very hot. Always ask for slight, medium or hot."],
      ["A line on weekend mornings", "Doubles and roti shops get busy early. A queue at 10am on Saturday is the review you want."],
    ],
    order: [
      ["Doubles", "With slight pepper, at first."],
      ["Curry goat roti", "Buss-up-shut or dhalpuri."],
      ["Bake and shark", "Fried bread with fried shark and condiments, if available."],
      ["Pelau", "Rice cooked with chicken, pigeon peas and caramelised sugar."],
      ["Sorrel or mauby", "To drink."],
    ],
    signals:
      "The search reads for doubles, roti, buss-up-shut, pelau and Trini, separating Trinidadian kitchens from the broader Caribbean category where they are often filed.",
    related: ["caribbean-food", "roti", "curry"],
    situations: ["on-a-budget", "hungover", "trying-something-new"],
  },
  {
    s: "nigerian-food",
    n: "Nigerian food",
    h1: "How to find good Nigerian food",
    title: "How to Find Good Nigerian Food Near You",
    desc:
      "Jollof rice, suya, egusi soup, pounded yam and puff-puff: what to look for in a Nigerian restaurant and what to order.",
    lede:
      "Nigerian food is soup-and-swallow cooking — rich, spicy stews eaten with a ball of pounded yam or fufu — plus party jollof and charcoal-grilled suya. The restaurants are often small, generous and busy late.",
    good: [
      ["Smoky party jollof", "Rice cooked in a tomato and pepper base until it takes on smoke from the bottom of the pot. Should be deep red-orange, separate and spicy."],
      ["Suya with yaji", "Thin beef skewers rubbed with a peanut-chilli spice mix and grilled. The spice crust is everything."],
      ["Egusi with depth", "Ground melon seed soup with leafy greens, palm oil, meat and fish. Rich and layered."],
      ["Swallow made fresh", "Pounded yam, eba or amala. Smooth and stretchy, made to go with the soups."],
      ["Pepper soup", "A thin, fiery, aromatic broth with goat or fish. A sign of a kitchen cooking for Nigerians."],
    ],
    order: [
      ["Jollof rice with chicken", "With fried plantain (dodo)."],
      ["Egusi with pounded yam", "Eaten by hand."],
      ["Suya", "With onions and tomatoes."],
      ["Goat pepper soup", "Spicy and warming."],
      ["Puff-puff", "Fried dough balls to finish."],
    ],
    signals:
      "The search reads for jollof, egusi, suya, pounded yam and Nigerian, and keeps Nigerian kitchens distinct from Ghanaian and other West African ones, while still treating them as related.",
    related: ["west-african-food", "ethiopian-food", "somali-food"],
    situations: ["big-group", "celebrating", "trying-something-new"],
  },
  {
    s: "asian-fusion-food",
    n: "Asian fusion food",
    near: "Asian fusion",
    h1: "How to find good Asian fusion food",
    title: "How to Find Good Asian Fusion Food Near You",
    desc:
      "What separates thoughtful Asian fusion from a menu of random mash-ups, and the signs a fusion restaurant knows what it is doing.",
    lede:
      "Asian fusion has a bad reputation because a lot of it is a pan-Asian greatest-hits menu with sweet sauces. The good version is something else: a chef with roots in one cuisine cooking with ideas from another, and a menu short enough to have a point of view.",
    good: [
      ["A clear starting point", "Good fusion begins with one cuisine — Korean, Filipino, Japanese — and borrows from others. A menu that spans five countries usually masters none."],
      ["Technique you can taste", "Sauces built from scratch, proper wok heat, real fermentation. Fusion done well is technically harder, not easier."],
      ["A short menu", "Twelve dishes that make sense together beat forty that do not."],
      ["Balance beyond sweet", "If everything is glazed or teriyaki-sweet, the kitchen is chasing a palate rather than cooking."],
      ["Dishes that change", "Seasonal specials signal a kitchen that is experimenting rather than repeating."],
    ],
    order: [
      ["The dish the chef is known for", "Fusion places usually have one."],
      ["Something rice- or noodle-based", "To test the fundamentals."],
      ["A vegetable dish", "Often where the creativity shows."],
      ["Small plates to share", "Fusion menus tend to work best ordered widely."],
      ["Dessert", "Often the most inventive part of the menu."],
    ],
    signals:
      "The search reads reviews for chef-driven, house-made and specific named dishes rather than the word fusion, which a lot of generic pan-Asian menus use. Say what you like and it reads for that.",
    related: ["korean-food", "japanese-food", "chinese-food"],
    situations: ["first-date", "birthday-dinner", "date-night"],
  },
];
