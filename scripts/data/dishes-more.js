/* The second batch of /food/ guides — 38 more cuisines and dishes.
 *
 * WHY THESE AND WHY NOW
 * Search Console, six days in: /food/korean-food was the single
 * highest-impression page on the site, ahead of all 627 campus pages. One dish
 * guide out-pulled the entire campus set. The query log behind it was fifteen
 * variants of "korean restaurants near me" — a query class the site had 29
 * pages against, where it has hundreds of campus pages against a narrower one.
 *
 * So this follows the evidence rather than the plan: more of the thing that is
 * already working, in a class small enough to write properly. Thirty-eight
 * pages will not strain a crawl queue that already has 306 URLs discovered and
 * uncrawled; nine hundred more campus templates would.
 *
 * Same contract as dishes.js. `good` is the part that carries each page and is
 * written per entry — if two of them could be swapped without anyone noticing,
 * one is not finished. No restaurant is named anywhere: we hold no restaurant
 * data, and a page claiming the best pupusa in a city nobody here has visited
 * is worth nothing.
 */

module.exports = [
  /* ---- cuisines ----------------------------------------------------------- */
  {
    s: "ethiopian-food",
    n: "Ethiopian food",
    h1: "How to find good Ethiopian food",
    title: "How to Find Good Ethiopian Food Near You",
    desc:
      "What separates a good Ethiopian restaurant from an average one, how injera should taste, and what to order the first time.",
    lede:
      "Ethiopian food is eaten with your hands off a shared platter, and that single fact reorganises everything — the menu, the pace, and how many people you should bring.",
    good: [
      ["Injera with real sourness", "The flatbread is fermented teff batter and should taste distinctly sour, like a spongy sourdough. Bland, sweet injera means a short ferment or a heavy wheat blend, and it flattens everything served on it."],
      ["Teff, or at least mostly teff", "Pure teff injera is darker, more fragile and more sour. Many restaurants cut it with wheat or barley for cost and handling. Neither is wrong, but a place that says which it uses is a place paying attention."],
      ["Niter kibbeh you can smell", "The spiced clarified butter underlying most wat. Cardamom, fenugreek, ginger, korarima. If the stews smell only of chilli, the butter is doing no work."],
      ["Berbere that is layered, not just hot", "A dozen-plus spices, not a chilli powder. Good berbere is fragrant before it is hot."],
      ["A proper fasting platter", "Ethiopian Orthodox fasting days mean no animal products, so almost every restaurant keeps a full vegan spread. A deep one is the strongest single indicator of a serious kitchen, and it is among the best vegan food in any US city."],
    ],
    order: [
      ["The vegetarian combination", "Six to ten stews on one injera — misir wat, gomen, shiro, atakilt. The best introduction and usually the best value on the menu."],
      ["Doro wat", "Chicken slow-cooked in berbere with a hard-boiled egg. The national dish, and takes hours to do properly."],
      ["Kitfo", "Minced raw beef with niter kibbeh and mitmita. Order it leb leb (lightly warmed) if raw is a step too far."],
      ["Tibs", "Sautéed cubes of beef or lamb with onion and jalapeño. The most approachable thing on the menu."],
      ["Buna", "The coffee ceremony, if they do it. Ethiopia is where coffee comes from and the ceremony takes half an hour — worth the time once."],
    ],
    signals:
      "An Ethiopian search reads menus and reviews for injera and fasting-menu language, plus named stews rather than a generic listing. Reviews mentioning the vegetarian combination or the coffee ceremony push a place up, because both indicate a kitchen doing the whole thing rather than a short export menu.",
    related: ["mediterranean-food", "indian-food", "west-african-food"],
    situations: ["vegetarians-and-meat-eaters", "big-group", "friends-visiting"],
  },
  {
    s: "filipino-food",
    n: "Filipino food",
    h1: "How to find good Filipino food",
    title: "How to Find Good Filipino Food Near You",
    desc:
      "Adobo, sisig, lechon and kamayan: what to look for in a Filipino restaurant and what to order first.",
    lede:
      "Filipino cooking is built on sour, salty and fatty in combinations most other cuisines avoid, and it is unapologetic about all three. It is also the largest Asian cuisine in America with the smallest restaurant footprint, which means the good places are frequently in a strip mall with a handwritten sign.",
    good: [
      ["Sourness that is actually sour", "Vinegar and tamarind do the work here. A sinigang that is not aggressively sour has been softened, and softening is the most common way Filipino food gets adjusted for a general audience."],
      ["Lechon with crackling that shatters", "Whole roast pig. The skin is the whole point and should crack audibly. Soft skin means it was reheated."],
      ["A turo-turo steam table that turns over", "Point-and-choose counters are the everyday format. Full trays at 7pm are good; tired trays at 3pm are not."],
      ["Rice cooked for the dishes", "Garlic fried rice at breakfast, plain steamed otherwise. It is a component, not a side, and good places treat it that way."],
      ["Kamayan available", "The banana-leaf communal feast eaten by hand. A restaurant offering it is confident and usually cooking for Filipino customers, not around them."],
    ],
    order: [
      ["Sisig", "Chopped pork jowl and ear, griddled, served sizzling with calamansi and chilli. The single best thing to order first."],
      ["Adobo", "Braised in vinegar, soy, garlic and bay. Every family makes it differently and the variation is the point."],
      ["Sinigang", "Sour tamarind soup with pork or shrimp. The most distinctly Filipino thing on the menu."],
      ["Lechon kawali or lechon belly", "Crisp-skinned pork, with liver sauce."],
      ["Halo-halo", "Shaved ice with ube, beans, jelly and leche flan. Chaotic and correct."],
    ],
    signals:
      "Filipino searches read for named dishes rather than the cuisine label, because a lot of Filipino food is sold from counters and bakeries that do not describe themselves as restaurants. Mentions of kamayan, turo-turo or lechon in reviews are strong signals, and they surface places a category filter would miss entirely.",
    related: ["chinese-food", "vietnamese-food", "bbq"],
    situations: ["big-group", "friends-visiting", "celebrating"],
  },
  {
    s: "peruvian-food",
    n: "Peruvian food",
    h1: "How to find good Peruvian food",
    title: "How to Find Good Peruvian Food Near You",
    desc:
      "Ceviche, lomo saltado and pollo a la brasa: what makes a Peruvian kitchen good and what to order.",
    lede:
      "Peru has three cuisines braided together — indigenous Andean, Spanish colonial, and a century of Japanese and Chinese immigration — and a good Peruvian restaurant will have all three on one menu without comment.",
    good: [
      ["Ceviche cured to order", "Fish, lime, salt, chilli, red onion. Fifteen minutes, not four hours. Ceviche that has been sitting is opaque and firm all the way through; fresh ceviche is still translucent at the centre."],
      ["Leche de tigre worth drinking", "The citrus marinade left in the bowl. Good places sell it as a shot on its own, which tells you they consider it a product rather than a by-product."],
      ["Ají amarillo and ají panca, used properly", "Peruvian chillies are fruity rather than punishing. If the heat is generic, the pastes are generic."],
      ["A rotisserie you can see", "Pollo a la brasa is charcoal-roasted marinated chicken. A visible rotisserie with birds turning is the whole signal."],
      ["Chifa and Nikkei on the menu", "Chinese-Peruvian and Japanese-Peruvian cooking are not fusion novelties here, they are century-old traditions. Their presence means a kitchen cooking real Peruvian food."],
    ],
    order: [
      ["Ceviche mixto", "Fish plus shellfish, with sweet potato and corn. The benchmark dish."],
      ["Lomo saltado", "Beef stir-fried with onion, tomato and soy, served with fries and rice. Chifa influence in one plate."],
      ["Pollo a la brasa", "With ají verde sauce. Order a quarter bird and the green sauce by the tub."],
      ["Ají de gallina", "Shredded chicken in a creamy yellow chilli sauce. Mild and deeply savoury."],
      ["Anticuchos", "Grilled beef heart skewers. Better than it sounds and a street-food staple."],
    ],
    signals:
      "Peruvian searches read for ceviche freshness language and for chifa and Nikkei vocabulary on menus, which separate a full Peruvian kitchen from a place with two Peruvian dishes. Rotisserie mentions matter for pollo a la brasa specifically — it is equipment, and either a restaurant has it or it does not.",
    related: ["seafood", "colombian-food", "japanese-food"],
    situations: ["celebrating", "friends-visiting", "big-group"],
  },
  {
    s: "cuban-food",
    n: "Cuban food",
    h1: "How to find good Cuban food",
    title: "How to Find Good Cuban Food Near You",
    desc:
      "The Cuban sandwich, ropa vieja, lechon asado and cafecito — what to look for and what to order.",
    lede:
      "Cuban food is garlic, citrus, cumin and slow time. There is almost no chilli heat in it, which surprises people who expect Caribbean cooking to be hot, and the flavour comes from mojo — sour orange and crushed garlic — rather than from spice.",
    good: [
      ["A working sandwich press", "The cubano is pressed until the bread is thin, crisp and fused. A sandwich assembled and not pressed is a different, lesser thing."],
      ["Real Cuban bread", "Lard in the dough, thin crackly crust, airy inside. It is what makes a cubano work and it is the component most often substituted."],
      ["Mojo you can smell", "Sour orange, garlic, oregano, cumin. Pork marinated in it overnight. If the roast pork tastes only of salt, the mojo was an afterthought."],
      ["A ventanita", "The walk-up window. A café with one is serving the neighbourhood's daily coffee habit, not just its lunch trade."],
      ["Black beans cooked separately", "Frijoles negros should have their own seasoning and a bay-leaf depth, not be a scoop from a can beside the rice."],
    ],
    order: [
      ["Cubano", "Roast pork, ham, Swiss, pickles, mustard, pressed. Miami's version has no salami; Tampa's does, and both camps are certain."],
      ["Ropa vieja", "Shredded beef braised with peppers and tomato, with rice and plantains."],
      ["Lechon asado", "Mojo-marinated roast pork. The Sunday dish."],
      ["Cafecito and pastelito", "Sweet espresso at the window with a guava pastry. A daily ritual, not a dessert."],
      ["Tostones or maduros", "Twice-fried green plantain, or sweet ripe plantain. Order whichever the rest of the plate is not."],
    ],
    signals:
      "Cuban searches read for pressed-sandwich and Cuban-bread language, plus ventanita and cafecito mentions, which indicate a café serving a community rather than a restaurant serving a concept. Bread quality is what reviewers actually talk about when a cubano is good, and that is what the matcher looks for.",
    related: ["sandwiches", "salvadoran-food", "colombian-food"],
    situations: ["on-a-budget", "friends-visiting", "before-a-flight"],
  },
  {
    s: "turkish-food",
    n: "Turkish food",
    h1: "How to find good Turkish food",
    title: "How to Find Good Turkish Food Near You",
    desc:
      "Kebabs, pide, lahmacun and the enormous Turkish breakfast — what to look for and what to order.",
    lede:
      "Turkish food is grilled meat and bread cooked in ovens hot enough to matter, plus a mezze tradition and a breakfast spread that is among the great meals anywhere. The bread is the tell: if it arrives hot and puffed, everything else is probably right.",
    good: [
      ["Bread from an oven on the premises", "Pide bread, lavash or somun, arriving hot. This is the single most reliable indicator in Turkish cooking and it is obvious the moment it lands."],
      ["Charcoal, not gas", "Kebabs cooked over charcoal taste of charcoal. Places using it advertise it, and the difference is not subtle."],
      ["Meat ground and seasoned in house", "Adana and urfa kebab are hand-minced lamb pressed onto flat skewers. Machine-ground, pre-formed kebabs have a uniform texture that gives them away."],
      ["A real mezze list", "Haydari, ezme, muhammara, çiğ köfte, dolma. Depth here means a kitchen cooking a tradition rather than running a grill."],
      ["Tea served properly", "In tulip glasses, from a double teapot, refilled without asking. A small thing that correlates strongly."],
    ],
    order: [
      ["Adana kebab", "Hand-minced spiced lamb on a flat skewer, over charcoal. The benchmark."],
      ["Lahmacun", "Thin flatbread with spiced minced lamb, rolled with lemon and parsley. Order two."],
      ["Pide", "Boat-shaped flatbread with cheese, egg or minced meat."],
      ["Kahvaltı", "The Turkish breakfast: cheeses, olives, tomato, cucumber, honey, clotted cream, eggs, endless bread and tea. Order it for two and clear your morning."],
      ["İskender", "Döner over bread with tomato sauce and yoghurt, finished with browned butter at the table."],
    ],
    signals:
      "Turkish searches weight bread and charcoal mentions heavily, because those two things separate a serious grill from a wrap counter. Kahvaltı on a menu is treated as a strong positive — it is a commitment of kitchen time and product that only a restaurant cooking for Turkish customers usually makes.",
    related: ["mediterranean-food", "lebanese-food", "greek-food"],
    situations: ["big-group", "friends-visiting", "vegetarians-and-meat-eaters"],
  },
  {
    s: "lebanese-food",
    n: "Lebanese food",
    h1: "How to find good Lebanese food",
    title: "How to Find Good Lebanese Food Near You",
    desc:
      "Mezze, shawarma, manakish and the best vegetarian spread in the Middle East — what to look for.",
    lede:
      "Lebanese food is the deepest mezze tradition in the region, which means the right way to eat it is fifteen small plates and no main course at all. It is also, quietly, one of the best vegetarian cuisines on earth.",
    good: [
      ["Hummus that is silky and warm", "Properly made hummus is smooth to the point of pourable, generously oiled, often served warm. Cold, thick, grainy hummus is the default everywhere else and the fastest way to judge a kitchen here."],
      ["Bread made on site", "Pita arriving hot and inflated. Manakish baked to order is even better."],
      ["A long mezze list", "Twenty or more cold and hot small plates. This is the cuisine's centre of gravity and a short list means a short kitchen."],
      ["Real tabbouleh", "Overwhelmingly parsley, with bulgur as a minor component. If it arrives as a grain salad with flecks of green, it has been inverted."],
      ["Charcoal for the grills", "Shish taouk and kafta over charcoal. Same rule as every grill tradition in the region."],
    ],
    order: [
      ["A mezze spread", "Hummus, moutabal, tabbouleh, fattoush, labneh, muhammara, kibbeh, and bread. Skip the mains entirely the first time."],
      ["Manakish", "Flatbread baked with za'atar and olive oil, or cheese. Breakfast food, available all day."],
      ["Shish taouk", "Garlic-marinated chicken skewers with toum — the fierce garlic emulsion that is half the reason to come."],
      ["Kibbeh nayyeh", "Raw minced lamb with bulgur and spices, if you see it. A celebration dish."],
      ["Knafeh", "Cheese pastry with syrup, eaten warm. Order it before you think you have room."],
    ],
    signals:
      "Lebanese searches read for mezze depth and for hummus texture language in reviews, plus toum and manakish, which are specific enough that they only appear when a kitchen is doing the real thing. Because Lebanese is often signed as generic Mediterranean, the matcher works from dish names rather than the cuisine label.",
    related: ["mediterranean-food", "turkish-food", "greek-food"],
    situations: ["vegetarians-and-meat-eaters", "big-group", "work-team-lunch"],
  },
  {
    s: "brazilian-food",
    n: "Brazilian food",
    h1: "How to find good Brazilian food",
    title: "How to Find Good Brazilian Food Near You",
    desc:
      "Churrascaria, feijoada and pão de queijo — how the rodizio format works and what to look for.",
    lede:
      "Most Americans meet Brazilian food as a churrascaria — endless skewers of grilled meat carried to the table until you flip a card to red. That format is real and it is also about a tenth of what Brazilian cooking is.",
    good: [
      ["Picanha carved at the table", "The top sirloin cap, fat layer intact, salted and grilled. It is the cut Brazilians care about and the one to judge a churrascaria on."],
      ["Rock salt and nothing else", "Traditional churrasco is seasoned with coarse salt, full stop. Heavy marinades are covering something."],
      ["A serious salad bar", "At a good rodizio the cold bar is not filler — hearts of palm, farofa, vinagrete, cheese bread, feijoada on the side."],
      ["Feijoada on Saturdays", "The black bean and pork stew is traditionally a weekend dish. A restaurant that runs it Saturdays is following the tradition rather than the tourist schedule."],
      ["Pão de queijo made there", "Tapioca-flour cheese bread, served hot and hollow. From a freezer bag it is dense and sad."],
    ],
    order: [
      ["Picanha", "At a churrascaria, wave the rest through until this arrives."],
      ["Feijoada completa", "Black beans with pork, over rice, with farofa, collards and orange."],
      ["Moqueca", "Bahian coconut and palm-oil fish stew. The best thing in Brazilian cooking that Americans rarely see."],
      ["Coxinha", "Teardrop-shaped fried chicken croquette. Street food, and a good bakery test."],
      ["Caipirinha", "Cachaça, lime, sugar. The national drink and hard to get wrong."],
    ],
    signals:
      "Brazilian searches distinguish churrascaria from Brazilian home cooking, which are two different meals at two different prices. Mentions of picanha, feijoada and moqueca in menus and reviews point at the second; rodizio and salad-bar language at the first. The matcher uses whichever your search implies.",
    related: ["steak", "bbq", "seafood"],
    situations: ["big-group", "celebrating", "after-a-workout"],
  },
  {
    s: "jamaican-food",
    n: "Jamaican food",
    h1: "How to find good Jamaican food",
    title: "How to Find Good Jamaican Food Near You",
    desc:
      "Jerk, curry goat, oxtail and patties — what separates a real Jamaican kitchen and what to order.",
    lede:
      "Jerk is a cooking method, not a sauce. Done properly it means pimento wood smoke and a long slow cook, and the difference between that and jerk-flavoured grilled chicken is the whole question.",
    good: [
      ["Smoke, from a drum or a pit", "Real jerk is smoked over pimento wood in a converted oil drum. A visible drum outside is the strongest signal in this cuisine."],
      ["Scotch bonnet doing the heat", "Fruity and floral before it is hot. If the heat is flat, it is cayenne."],
      ["Oxtail that is actually gelatinous", "Long-braised until the collagen has broken down. Chewy oxtail was rushed, and it takes hours that cannot be shortened."],
      ["Rice and peas cooked in coconut milk", "With a scotch bonnet dropped in whole. It should taste of coconut and thyme, not be plain rice with beans."],
      ["Patties with a flaky, turmeric-yellow crust", "The pastry is the difference. Dense, pale patties are bought in."],
    ],
    order: [
      ["Jerk chicken or pork", "Ask for it with the pan drippings. Quarter chicken, hard dough bread on the side."],
      ["Oxtail", "With butter beans, rice and peas. The dish most Jamaicans would order."],
      ["Curry goat", "Bone-in, long-cooked, with a Jamaican curry powder that is its own thing."],
      ["Ackee and saltfish", "The national dish, traditionally breakfast. Eggy-looking, savoury, unlike anything else."],
      ["Festival", "Slightly sweet fried cornmeal dumplings. Order them with the jerk."],
    ],
    signals:
      "Jamaican searches read for pimento wood, drum smokers and named dishes, because the word jerk on a menu means very little on its own. Reviews describing smoke and heat level are weighted heavily, and a place that sells out of oxtail on weekends is treated as a positive rather than a limitation.",
    related: ["bbq", "west-african-food", "caribbean-food"],
    situations: ["on-a-budget", "friends-visiting", "big-group"],
  },
  {
    s: "caribbean-food",
    n: "Caribbean food",
    h1: "How to find good Caribbean food",
    title: "How to Find Good Caribbean Food Near You",
    desc:
      "Trinidadian, Haitian, Dominican, Puerto Rican — the Caribbean is many cuisines, and this is how to tell them apart.",
    lede:
      "Caribbean on a sign covers at least a dozen national cuisines that share ingredients and share almost nothing else. Knowing which island a kitchen is cooking from is the difference between getting what you wanted and getting something good that you did not order.",
    good: [
      ["A named country, not a region", "Trinidadian, Haitian, Dominican, Guyanese, Bajan, Puerto Rican. Specificity is the signal; Caribbean alone usually means a broad menu."],
      ["Sofrito or epis made in house", "The aromatic base under most of these cuisines — Puerto Rican sofrito, Haitian epis. Made fresh it is bright and herbal; from a jar it is uniform."],
      ["Slow-cooked stews", "Griot, pepperpot, stew chicken, sancocho. These take hours and cannot be faked."],
      ["Scotch bonnet or habanero, used with restraint", "Heat present and controlled rather than applied at the end."],
      ["Provisions on the plate", "Yam, cassava, breadfruit, plantain, dasheen. A menu with real ground provisions is cooking for people who grew up on them."],
    ],
    order: [
      ["Trinidadian doubles", "Curried chickpeas between two fried breads. Breakfast street food and one of the great cheap eats anywhere."],
      ["Haitian griot", "Marinated fried pork with pikliz, the fierce pickled slaw."],
      ["Dominican sancocho", "A thick meat and root-vegetable stew, usually weekend food."],
      ["Puerto Rican mofongo", "Mashed fried plantain with garlic and pork, in a broth or stuffed."],
      ["Guyanese pepperpot", "Cassareep-braised beef, dark and slightly bitter. Christmas food, available year-round at the right place."],
    ],
    signals:
      "Caribbean searches try to resolve to a specific island, because the category is too broad to be useful. The matcher reads menus for national dish names — doubles, griot, mofongo, sancocho — rather than the regional label, which surfaces the right kitchen instead of the nearest one with the word on the sign.",
    related: ["jamaican-food", "cuban-food", "west-african-food"],
    situations: ["on-a-budget", "friends-visiting", "late-night"],
  },
  {
    s: "polish-food",
    n: "Polish food",
    h1: "How to find good Polish food",
    title: "How to Find Good Polish Food Near You",
    desc:
      "Pierogi, bigos, kielbasa and żurek — what to look for in a Polish restaurant or deli.",
    lede:
      "Polish food in America lives as much in delis and church basements as in restaurants, and the deli is frequently the better option: the pierogi are made that morning by someone who has made them for thirty years.",
    good: [
      ["Pierogi folded by hand", "Uneven edges, thicker at the seam. Machine pierogi are uniform and usually thicker overall."],
      ["Kielbasa from a smokehouse", "Polish delis often smoke their own. Several varieties behind the counter — wiejska, krakowska, kabanos — is the signal."],
      ["Sauerkraut that tastes fermented", "Sour and complex, not just vinegary. Bigos in particular depends on it."],
      ["Sour soups done properly", "Żurek and barszcz get their sourness from a fermented rye or beet starter. Lemon juice is a shortcut and tastes like one."],
      ["A counter rather than a dining room", "Some of the best Polish food in any American city is sold by weight from a deli case."],
    ],
    order: [
      ["Pierogi ruskie", "Potato and farmer's cheese, with butter and fried onion. The baseline."],
      ["Bigos", "Hunter's stew — sauerkraut, cabbage, several meats, cooked and recooked for days."],
      ["Żurek", "Sour rye soup with sausage and egg, sometimes in a bread bowl."],
      ["Kotlet schabowy", "Breaded pork cutlet with potatoes and dill. The Sunday plate."],
      ["Pączki", "Filled doughnuts, heaviest around Lent, and worth timing a visit for."],
    ],
    signals:
      "Polish searches include delis and markets alongside restaurants, because in most US cities that is where the food actually is. The matcher reads for hand-made pierogi language, house smoking, and named soups — and treats a place with no dining room as a candidate rather than filtering it out.",
    related: ["dumplings", "german-food", "soup"],
    situations: ["cold-rainy-night", "on-a-budget", "sunday-night"],
  },
  {
    s: "german-food",
    n: "German food",
    h1: "How to find good German food",
    title: "How to Find Good German Food Near You",
    desc:
      "Schnitzel, wurst, spätzle and the beer hall — what to look for and what to order.",
    lede:
      "German restaurants in America tend to be either a genuine neighbourhood institution with eighty years behind it or a themed beer hall, and the two are easy to tell apart once you know that schnitzel is the tell.",
    good: [
      ["Schnitzel pounded properly thin", "It should overhang the plate and be no thicker than a coin. Thick schnitzel has not been pounded and will be dry at the edges before the middle cooks."],
      ["A dry, puffed crust", "Good schnitzel breading separates slightly from the meat and blisters. Soggy breading means the oil was not hot enough."],
      ["House-made wurst, or a named butcher", "Weisswurst, bratwurst, currywurst, bockwurst — variety and provenance both matter."],
      ["Spätzle made there", "Irregular, chewy, scraped fresh. Packet spätzle is uniform and soft."],
      ["A serious beer list with proper glassware", "German beer culture is specific about styles and glasses, and a restaurant that respects it usually respects the food."],
    ],
    order: [
      ["Jägerschnitzel or wiener schnitzel", "The first with mushroom gravy, the second plain with lemon. Veal if they have it."],
      ["Sauerbraten", "Beef marinated for days in vinegar and spices, with red cabbage and dumplings."],
      ["Currywurst", "Sliced bratwurst with curried ketchup. Berlin street food, and better than the description."],
      ["Käsespätzle", "Spätzle baked with cheese and fried onion. The German answer to mac and cheese."],
      ["Pretzel with obatzda", "Soft pretzel with a spiced cheese spread."],
    ],
    signals:
      "German searches read for schnitzel preparation and house-made sausage language, and weight long-running family ownership heavily — this is a cuisine where the hundred-year-old neighbourhood place is nearly always better than the newer themed one, and reviews say so plainly.",
    related: ["polish-food", "sandwiches", "burgers"],
    situations: ["cold-rainy-night", "big-group", "friends-visiting"],
  },
  {
    s: "salvadoran-food",
    n: "Salvadoran food",
    h1: "How to find good Salvadoran food",
    title: "How to Find Good Salvadoran Food Near You",
    desc:
      "Pupusas, curtido and the rest — how to spot a real pupuseria and what to order.",
    lede:
      "Pupusas are the most under-appreciated cheap food in America: a thick hand-patted corn cake stuffed with cheese, beans or pork, griddled, and served with pickled cabbage and thin tomato salsa. Two of them is lunch for about six dollars.",
    good: [
      ["Patted by hand, in view", "You can usually see someone forming them. Hand-patted pupusas are slightly uneven and thicker at the centre; pressed ones are perfect circles."],
      ["Curtido that has actually fermented", "The pickled cabbage slaw should be sour and slightly funky, not a fresh slaw with vinegar poured on. It is the acid that makes the whole thing work."],
      ["Loroco on the menu", "An edible flower bud used with cheese in the best-known filling. Its presence means a kitchen sourcing properly."],
      ["Rice-flour pupusas offered", "Pupusas de arroz are a western Salvadoran variant. Offering both is a sign of a kitchen that knows the regional difference."],
      ["A griddle running constantly", "Pupusas are made to order. If they arrive in under two minutes they were made earlier."],
    ],
    order: [
      ["Pupusa revuelta", "Cheese, beans and chicharrón together. The standard, and the one to judge by."],
      ["Pupusa de queso con loroco", "Cheese and loroco. Order one alongside the revuelta."],
      ["Yuca con chicharrón", "Fried cassava with pork and curtido."],
      ["Panes con pollo", "A stewed chicken sandwich on a crusty roll — closer to a Salvadoran torta and rarely on the English menu."],
      ["Horchata", "Salvadoran horchata is made with morro seed, not rice, and tastes nothing like the Mexican version."],
    ],
    signals:
      "Salvadoran searches look for pupuseria and pupusa language directly, including in reviews written in Spanish, and treat mentions of curtido and loroco as strong positives. Many pupuserias are inside markets or share a space with another business, so the matcher does not require a standalone restaurant listing.",
    related: ["mexican-food", "tacos", "colombian-food"],
    situations: ["on-a-budget", "finals-week", "late-night"],
  },
  {
    s: "colombian-food",
    n: "Colombian food",
    h1: "How to find good Colombian food",
    title: "How to Find Good Colombian Food Near You",
    desc:
      "Arepas, bandeja paisa and ajiaco — what to look for in a Colombian kitchen.",
    lede:
      "Colombian food is regional to a degree that surprises people: the coast eats coconut rice and fried fish, Bogotá eats a chicken and potato soup with capers and cream, and Medellín eats a platter with nine components and a fried egg on top.",
    good: [
      ["Arepas made there", "Colombian arepas are thinner and less stuffed than Venezuelan ones, often griddled and topped rather than split. Made fresh they are soft inside."],
      ["Three potatoes in the ajiaco", "The Bogotá soup depends on using several potato varieties, one of which dissolves to thicken it. One potato means a shortcut."],
      ["Guascas", "The herb that makes ajiaco taste like ajiaco. Hard to source and its presence signals a serious kitchen."],
      ["A bandeja paisa that is genuinely excessive", "Beans, rice, chicharrón, chorizo, morcilla, steak, plantain, avocado, arepa and a fried egg. If it looks reasonable, something is missing."],
      ["Fresh juices", "Lulo, maracuyá, guanábana, mora. A long fruit-juice list is standard and its absence is notable."],
    ],
    order: [
      ["Bandeja paisa", "Once. Bring an appetite and expect to fail."],
      ["Ajiaco santafereño", "Chicken and potato soup with corn, capers and cream. The best thing on most Colombian menus."],
      ["Arepa de choclo", "Sweet corn arepa with cheese. Different from the plain ones and worth ordering separately."],
      ["Sancocho", "Weekend stew, regionally variable, always substantial."],
      ["Lulo juice", "A citrus you will not have had. Ask for it in water rather than milk the first time."],
    ],
    signals:
      "Colombian searches read for regional dish names and for bakery and juice-bar language, since a lot of Colombian food is sold from panaderías rather than restaurants. Ajiaco and guascas mentions are treated as strong signals of a kitchen cooking the Bogotá tradition rather than a general Latin menu.",
    related: ["arepas", "cuban-food", "peruvian-food"],
    situations: ["big-group", "on-a-budget", "cold-rainy-night"],
  },
  {
    s: "persian-food",
    n: "Persian food",
    h1: "How to find good Persian food",
    title: "How to Find Good Persian Food Near You",
    desc:
      "Kebabs, tahdig, ghormeh sabzi and saffron rice — what separates a real Persian kitchen.",
    lede:
      "Persian cooking is built on rice and on sourness, and both are unusual. The rice is par-boiled then steamed so each grain separates, with a crisp golden crust at the bottom of the pot; the sourness comes from dried limes, pomegranate and unripe grapes rather than from vinegar or citrus.",
    good: [
      ["Tahdig, and them being proud of it", "The crisp rice crust from the bottom of the pot. A restaurant that offers it as a dish rather than hiding it is confident in its rice, which is the foundation of everything else."],
      ["Rice that is separate and fluffy", "Each grain distinct, no clumping, faintly buttery. Sticky Persian rice means it was boiled rather than steamed."],
      ["Real saffron, used visibly", "Saffron rice should be streaked, not uniformly yellow. Uniform yellow is turmeric or colouring."],
      ["Slow-cooked herb stews", "Ghormeh sabzi takes hours of frying herbs down. If it is bright green it was rushed; it should be dark."],
      ["Charcoal for the kebabs", "Koobideh especially. Same rule as every grill cuisine in the region."],
    ],
    order: [
      ["Chelo kabab koobideh", "Minced lamb or beef kebab with saffron rice, grilled tomato and sumac."],
      ["Ghormeh sabzi", "Herb, kidney bean and lamb stew with dried lime. The national dish and the best test."],
      ["Fesenjan", "Chicken in a pomegranate and walnut sauce. Sweet, sour and unlike anything else."],
      ["Tahdig, as a side", "If it is available, order it. It usually sells out."],
      ["Doogh", "Salted yoghurt drink with mint. An acquired taste that arrives quickly."],
    ],
    signals:
      "Persian searches read for tahdig and named stews rather than kebab alone, because kebab is where the cuisine overlaps with every other grill tradition and the stews are where it does not. Saffron and rice-quality language in reviews is weighted heavily — it is what Persian customers comment on.",
    related: ["mediterranean-food", "afghan-food", "turkish-food"],
    situations: ["meeting-the-parents", "celebrating", "big-group"],
  },
  {
    s: "afghan-food",
    n: "Afghan food",
    h1: "How to find good Afghan food",
    title: "How to Find Good Afghan Food Near You",
    desc:
      "Kabuli pulao, mantu and aushak — what to look for in an Afghan restaurant.",
    lede:
      "Afghan food sits where Persian, Indian and Central Asian cooking meet, and it takes the best parts of each: Persian rice technique, Indian spicing at a gentler level, and Central Asian dumplings. It is also one of the most consistently underrated cuisines in America.",
    good: [
      ["Kabuli pulao done properly", "Long-grain rice steamed with lamb, topped with caramelised carrot and raisin. The rice should be separate and faintly sweet, not a pilaf."],
      ["Dumplings folded by hand", "Mantu and aushak are labour-intensive and the pleating shows whether someone is doing it properly."],
      ["Chaka on everything", "Strained yoghurt with garlic and dried mint, spooned over dumplings. If it is plain yoghurt, a step was skipped."],
      ["Bread from a tandoor", "Afghan naan is long, ridged and enormous. Baked on site it arrives hot."],
      ["Restrained spicing", "Afghan food is aromatic rather than hot. A kitchen adding chilli heat is cooking for the wrong expectation."],
    ],
    order: [
      ["Kabuli pulao", "The national dish. Order it with lamb shank."],
      ["Mantu", "Beef dumplings with yoghurt, split peas and dried mint."],
      ["Aushak", "Leek dumplings, and usually the better of the two."],
      ["Kofta challow", "Meatballs in a tomato sauce with rice."],
      ["Bolani", "Stuffed flatbread with potato or pumpkin, griddled. Order it as a starter."],
    ],
    signals:
      "Afghan searches read for the specific dish names, since Afghan restaurants are frequently signed as Mediterranean or Middle Eastern and would be missed by a cuisine filter. Mantu, aushak and kabuli pulao on a menu are close to conclusive.",
    related: ["persian-food", "dumplings", "indian-food"],
    situations: ["big-group", "vegetarians-and-meat-eaters", "cold-rainy-night"],
  },
  {
    s: "malaysian-food",
    n: "Malaysian food",
    h1: "How to find good Malaysian food",
    title: "How to Find Good Malaysian Food Near You",
    desc:
      "Laksa, nasi lemak, roti canai and char kway teow — what to look for and what to order.",
    lede:
      "Malaysian food is Malay, Chinese and Indian cooking that has been in the same place long enough to become one cuisine. A single menu will run from a coconut rice breakfast to a Hokkien noodle stir-fry to a South Indian flatbread, and all three will be authentic.",
    good: [
      ["Roti canai flipped and stretched to order", "Layered, flaky, served with dhal and curry. It has to be made fresh; reheated roti is leathery."],
      ["Sambal made in house", "Chilli, shrimp paste, tamarind, pounded. It is the backbone of the cuisine and a jarred version is immediately obvious."],
      ["Wok hei on the fried noodles", "Char kway teow needs a fierce burner. Without the char it is just noodles in sauce."],
      ["Laksa broth with body", "Curry laksa should be rich with coconut and shrimp paste; asam laksa sour with tamarind and fish. They are different dishes and a kitchen should distinguish them."],
      ["Belacan on the menu", "Fermented shrimp paste. Its presence means the kitchen is cooking properly — and it is worth knowing about if you avoid shellfish."],
    ],
    order: [
      ["Nasi lemak", "Coconut rice with sambal, anchovies, peanuts, egg and cucumber. The national breakfast."],
      ["Roti canai", "With dhal and chicken curry for dipping."],
      ["Curry laksa", "Or asam laksa if you want the sour one. Ask which they do better."],
      ["Char kway teow", "Flat noodles with prawn, egg, Chinese sausage and chives, hard-fried."],
      ["Hainanese chicken rice", "Poached chicken with rice cooked in the stock, with ginger-scallion and chilli sauces."],
    ],
    signals:
      "Malaysian searches read for named dishes and for belacan and sambal language, and treat the Malay-Chinese-Indian spread on one menu as a positive rather than a sign of a scattered kitchen. Reviews mentioning wok hei or roti made to order are weighted heavily.",
    related: ["thai-food", "chinese-food", "noodles"],
    situations: ["nothing-sounds-good", "friends-visiting", "late-night"],
  },
  {
    s: "west-african-food",
    n: "West African food",
    h1: "How to find good West African food",
    title: "How to Find Good West African Food Near You",
    desc:
      "Jollof, egusi, suya and fufu — Nigerian, Ghanaian and Senegalese cooking, and what to order.",
    lede:
      "West African food is among the fastest-growing restaurant categories in America and among the least covered. It is built on stews eaten with a starchy swallow, on smoked and dried fish for depth, and on a chilli heat that is present but rarely punishing.",
    good: [
      ["A named country", "Nigerian, Ghanaian, Senegalese, Ivorian. Jollof alone is claimed by several and cooked differently by each — the rivalry is genuine and the rice is genuinely different."],
      ["Jollof with smoke and body", "Rice cooked in a tomato-pepper base until the bottom catches slightly. That faint smokiness is the point, and pale jollof has been steamed rather than cooked down."],
      ["Real egusi texture", "Ground melon seed stew should be thick and slightly grainy, with bitter leaf or spinach through it."],
      ["Fresh swallow", "Fufu, eba, amala, pounded yam. Made properly it is smooth and elastic, eaten with the hand, and not something you chew."],
      ["Suya with yaji", "Grilled skewers dusted with a groundnut and chilli spice mix. If it tastes only of chilli the yaji is thin."],
    ],
    order: [
      ["Jollof rice", "With chicken or fish. Ask whether it is Nigerian or Ghanaian and let them tell you why theirs is better."],
      ["Egusi soup with pounded yam", "The dish to order if you order one thing."],
      ["Suya", "Beef skewers, as a starter or on their own."],
      ["Thieboudienne", "Senegalese fish and rice, the national dish, usually only at Senegalese places."],
      ["Puff puff", "Sweet fried dough. Order them while you wait."],
    ],
    signals:
      "West African searches read for national labels and for dish names like egusi, suya and thieboudienne, because many of these kitchens operate out of markets or shared spaces and are poorly categorised in place data. The matcher treats an uncategorised listing with the right dishes on its menu as a strong candidate.",
    related: ["ethiopian-food", "jamaican-food", "soup"],
    situations: ["big-group", "friends-visiting", "on-a-budget"],
  },
  {
    s: "spanish-food",
    n: "Spanish food",
    h1: "How to find good Spanish food and tapas",
    title: "How to Find Good Spanish Food and Tapas Near You",
    desc:
      "Tapas, paella, jamón and pintxos — what a real Spanish kitchen does and what to order.",
    lede:
      "Tapas is a way of eating, not a category of food, and the American version frequently misses that — small plates ordered all at once and delivered together is a tasting menu, not tapas. The real thing is sequential, standing up, and closer to a bar crawl than a dinner.",
    good: [
      ["Jamón sliced by hand, to order", "Ibérico or serrano, off the leg, thin enough to see through. Pre-sliced vacuum-packed ham has a different texture entirely."],
      ["Tortilla española that is runny in the middle", "Potato and onion omelette, set outside, barely cooked at the centre. A firm tortilla all the way through has been overcooked."],
      ["Paella with socarrat", "The caramelised crust on the bottom of the pan. It is the point, it takes attention, and a good kitchen will mention it."],
      ["Paella cooked to order", "It takes 30–40 minutes and good places say so. Paella that arrives in ten minutes was made earlier."],
      ["Good olive oil, and a lot of it", "Spanish cooking uses it as an ingredient, not a medium. Bread with oil and salt should be worth eating on its own."],
    ],
    order: [
      ["Jamón ibérico", "With pan con tomate. Start here."],
      ["Tortilla española", "A wedge, room temperature, which is correct."],
      ["Gambas al ajillo", "Prawns in garlic and olive oil, sizzling, with bread for the oil."],
      ["Pulpo a la gallega", "Octopus with paprika and potato."],
      ["Paella valenciana or de marisco", "For the table, ordered early."],
    ],
    signals:
      "Spanish searches read for socarrat and cooked-to-order language on paella, and for hand-carved jamón, which are the two places a Spanish kitchen either does the work or does not. Pintxos-style bars are distinguished from sit-down tapas restaurants, because they are different evenings.",
    related: ["mediterranean-food", "seafood", "italian-food"],
    situations: ["first-date", "celebrating", "big-group"],
  },

  /* ---- dishes and formats -------------------------------------------------- */
  {
    s: "banh-mi",
    n: "banh mi",
    h1: "How to find a good banh mi",
    title: "How to Find a Good Banh Mi Near You",
    desc:
      "The bread is the whole thing. What separates a great banh mi from a soggy one, and what to order.",
    lede:
      "A banh mi is one of the best value sandwiches in America — usually five to eight dollars for something built from pâté, cured meat, pickled vegetables, chilli and herbs. And it lives or dies on a baguette that almost no other sandwich uses.",
    good: [
      ["A crust that shatters", "Vietnamese baguettes use rice flour, which makes them lighter and crisper than French ones and gives an airy, almost hollow interior. A dense bakery baguette makes a heavy sandwich and is the most common failure."],
      ["Baked that morning, ideally on site", "Vietnamese baguettes go stale within hours. Shops that bake their own or take delivery twice a day are the ones to find."],
      ["Pâté and butter, both", "The traditional base is liver pâté and a mayonnaise or butter. Skipping either is a common Americanisation and it flattens the sandwich."],
      ["Do chua with real bite", "Pickled daikon and carrot, still crunchy, genuinely sour. Limp pickles mean they were made too far ahead."],
      ["Fresh chilli and cilantro at the end", "Added to order. If the sandwich is pre-made and wrapped, the herbs have wilted."],
    ],
    order: [
      ["Thit nguoi (đặc biệt)", "The combination — several cured pork cuts, pâté, the works. The one to judge by."],
      ["Thit nuong", "Grilled marinated pork. The most approachable."],
      ["Xiu mai", "Pork meatballs in tomato sauce. Messy and excellent."],
      ["Chay", "The vegetarian version, usually tofu or seitan, and often better than it has any right to be."],
      ["A Vietnamese iced coffee alongside", "Condensed milk, strong drip coffee. Standard."],
    ],
    signals:
      "Banh mi searches read for bakery language and for bread mentions in reviews specifically, because that is the variable people comment on when a shop is good. Many banh mi counters are inside grocery stores or shared spaces, so the matcher does not require a standalone restaurant listing.",
    related: ["vietnamese-food", "sandwiches", "pho"],
    situations: ["on-a-budget", "work-team-lunch", "finals-week"],
  },
  {
    s: "birria",
    n: "birria",
    h1: "How to find good birria",
    title: "How to Find Good Birria Near You",
    desc:
      "Quesabirria, consommé and the real thing — what separates good birria from a trend.",
    lede:
      "Birria is a slow-braised chilli stew from Jalisco, traditionally goat, traditionally served in a bowl. The griddled cheese taco with a cup of consommé for dipping is a recent Tijuana-by-way-of-Los-Angeles invention, it is genuinely excellent, and it is not what birria means in Mexico.",
    good: [
      ["Consommé with fat on top", "The braising liquid, skimmed and served for dipping. It should be deeply red, rich, and have a visible layer of chilli-stained fat. Thin, pale consommé means a short braise."],
      ["Dried chillies, not chilli powder", "Guajillo, ancho, chile de árbol, rehydrated and blended. The colour and the depth both come from there."],
      ["Meat that shreds without effort", "Four hours minimum. If it holds its shape it was rushed."],
      ["Goat available, not just beef", "Birria de chivo is the original. A place offering it is cooking the tradition rather than the trend."],
      ["Tortillas dipped in the fat before griddling", "That is what makes a quesabirria taco red and crisp. Dry-griddled tortillas with stew inside are something else."],
    ],
    order: [
      ["Quesabirria tacos with consommé", "Three, with the cup. The format that made it famous."],
      ["Birria de chivo in a bowl", "The traditional service, with onion, cilantro and lime. Order this if it is on the menu."],
      ["Mulita", "Two tortillas, cheese and birria, like a small quesadilla."],
      ["Ramen birria, knowingly", "A recent hybrid. Not traditional, occasionally very good."],
      ["Weekends", "Many birrierias only run on weekends, which is a sign of a kitchen doing it properly rather than holding it all week."],
    ],
    signals:
      "Birria searches read for consommé and goat mentions, which separate a birrieria from a taqueria that added quesabirria to the menu in 2021. Weekend-only hours are treated as a positive signal here rather than a limitation.",
    related: ["tacos", "mexican-food", "soup"],
    situations: ["hungover", "late-night", "friends-visiting"],
  },
  {
    s: "pupusas",
    n: "pupusas",
    h1: "How to find good pupusas",
    title: "How to Find Good Pupusas Near You",
    desc:
      "Hand-patted masa, fermented curtido and what to order at a pupuseria.",
    lede:
      "A pupusa is a thick corn cake stuffed with cheese, beans or pork, griddled until the outside blisters, and served with pickled cabbage and a thin tomato salsa. Two of them is a full lunch for about six dollars, which makes it one of the best value meals in America.",
    good: [
      ["Hand-patted, made to order", "Slightly uneven, thicker in the middle, and taking four or five minutes to arrive. Perfectly round pupusas that arrive instantly were pressed and held."],
      ["Curtido that is genuinely fermented", "Sour and a little funky, not a fresh slaw with vinegar on it. The acid is what balances the whole thing."],
      ["Cheese that pulls", "Quesillo, stretchy and mild. If the cheese is firm and salty it is a substitute."],
      ["Salsa roja that is thin", "A loose, mildly spiced tomato sauce, ladled not dolloped. Thick chunky salsa is a different cuisine's."],
      ["Rice-flour option", "Pupusas de arroz, from western El Salvador. Offering both flours signals a kitchen that knows the regional difference."],
    ],
    order: [
      ["Revuelta", "Cheese, beans and chicharrón. The standard against which everything else is judged."],
      ["Queso con loroco", "Cheese with the edible flower bud. The one to order second."],
      ["Frijol con queso", "Beans and cheese. The simplest and a good test."],
      ["Two, not one", "A single pupusa is a snack."],
      ["Horchata", "Salvadoran horchata is morro seed based and tastes nothing like the Mexican rice version."],
    ],
    signals:
      "Pupusa searches read for pupuseria language and for curtido and loroco mentions, including in Spanish-language reviews. Many are counters inside markets rather than restaurants, so the matcher treats a non-restaurant listing with the right vocabulary as a candidate.",
    related: ["salvadoran-food", "tacos", "mexican-food"],
    situations: ["on-a-budget", "finals-week", "late-night"],
  },
  {
    s: "arepas",
    n: "arepas",
    h1: "How to find good arepas",
    title: "How to Find Good Arepas Near You",
    desc:
      "Venezuelan and Colombian arepas are different foods. Which is which, and what to order.",
    lede:
      "The first thing to establish is which country's arepa you are getting. Venezuelan arepas are thick, split open and stuffed like a pocket; Colombian arepas are thinner, often griddled with cheese and eaten flat. Both are corn cakes and that is roughly where the similarity ends.",
    good: [
      ["Made to order, not held", "Arepas go leathery within twenty minutes. A griddle running constantly is the signal."],
      ["A crisp shell and a soft interior", "Griddled then sometimes finished in the oven. Uniformly soft means undercooked; uniformly hard means held."],
      ["Fillings made in house", "Reina pepiada — chicken and avocado — should taste of both. Carne mechada should be long-braised."],
      ["Real queso de mano or costeño", "Fresh mild cheese, not shredded mozzarella."],
      ["Nata or garlic sauce on the side", "Venezuelan places put out a thin garlic sauce; Colombian ones offer nata, a cultured cream. Their presence signals a kitchen cooking for its own community."],
    ],
    order: [
      ["Reina pepiada", "Venezuelan, chicken and avocado. The best-known and a good benchmark."],
      ["Pabellón", "Shredded beef, black beans, plantain and cheese. The Venezuelan national plate in an arepa."],
      ["Arepa de choclo", "Colombian sweet corn arepa with cheese. Almost a dessert."],
      ["Arepa de huevo", "Colombian coastal — a whole egg fried inside. Order it hot."],
      ["Cachapa, if offered", "A sweet fresh-corn pancake folded around cheese. Not an arepa but usually on the same menu and often the best thing there."],
    ],
    signals:
      "Arepa searches resolve to Venezuelan or Colombian where the search implies one, since the two are different dishes with the same name. The matcher reads for named fillings — reina pepiada, pabellón, de choclo — which are unambiguous about which tradition a kitchen is cooking.",
    related: ["colombian-food", "sandwiches", "cuban-food"],
    situations: ["on-a-budget", "work-team-lunch", "nothing-sounds-good"],
  },
  {
    s: "shawarma",
    n: "shawarma",
    h1: "How to find good shawarma",
    title: "How to Find Good Shawarma Near You",
    desc:
      "The spit is the whole story. What separates real shawarma from reheated meat, and what to order.",
    lede:
      "Shawarma is meat stacked on a vertical spit, roasted slowly, and shaved off in thin crisp-edged slices as the outside cooks. If the meat was not shaved off a turning spit in front of you, it is not shawarma — it is a meat wrap.",
    good: [
      ["A visible, turning spit with meat on it", "Non-negotiable. A spit that is bare or not turning at lunchtime means the meat is coming from a pan."],
      ["Shaved thin, with crisp edges", "The exterior caramelises and is shaved off; the next layer cooks. Thick chunks mean it was carved in bulk earlier."],
      ["A spit that looks hand-stacked", "Layers of marinated meat and fat, uneven. A perfectly smooth cone is a commercial pre-formed cylinder."],
      ["Toum or tahini made there", "Lebanese garlic emulsion or a proper sesame sauce. Both are made fresh in good places and both are obvious when they are not."],
      ["Bread warmed on the grill", "Pita or saj bread heated in the meat fat. It makes the whole thing."],
    ],
    order: [
      ["Chicken shawarma with toum", "The most common and the best test of the garlic sauce."],
      ["Beef or lamb shawarma with tahini", "Richer, and traditionally served with tahini rather than toum."],
      ["A plate rather than a wrap", "Meat, rice, salad, sauces. More food, easier to judge the meat."],
      ["Pickles and turnips", "The pink pickled turnip is not a garnish; it cuts the fat and belongs in the wrap."],
      ["Ask when the spit went on", "A reasonable question at a good place, and the answer tells you a lot."],
    ],
    signals:
      "Shawarma searches weight spit and shaved-to-order mentions in reviews heavily, because that single detail separates the real thing from a wrap counter. Toum specifically is a strong positive — it is laborious and a shop that makes it is not cutting corners elsewhere.",
    related: ["mediterranean-food", "lebanese-food", "gyros"],
    situations: ["late-night", "on-a-budget", "after-a-shift"],
  },
  {
    s: "gyros",
    n: "gyros",
    h1: "How to find a good gyro",
    title: "How to Find a Good Gyro Near You",
    desc:
      "Cone meat versus hand-stacked, tzatziki that means it, and how to tell a real Greek grill.",
    lede:
      "Most American gyro meat comes off a commercially produced cone of blended beef and lamb, and there is nothing dishonest about that — it is what the dish became here. But a handful of places stack their own pork or chicken, and the difference is immediate.",
    good: [
      ["Hand-stacked meat, where you can find it", "In Greece the gyro is usually pork, stacked in layers on the spit. A place doing that rather than slicing a commercial cone is rare and worth seeking out."],
      ["Crisped on the flat-top after shaving", "Even cone meat is transformed by a minute on the griddle. Limp, grey gyro meat went straight from spit to pita."],
      ["Pita that is oiled and grilled", "Thick Greek-style pita, brushed and warmed. Cold supermarket pita is the most common failing."],
      ["Tzatziki that is thick and sharp", "Strained yoghurt, a lot of garlic, cucumber squeezed dry. Thin, watery tzatziki has not been drained."],
      ["Fries in the wrap, on request", "The Greek way. A place that offers it is following the tradition rather than the American adaptation."],
    ],
    order: [
      ["Pork gyro, if available", "The Greek default and usually the best thing on the menu."],
      ["Chicken gyro", "Lighter, and a good test of whether they marinate."],
      ["A gyro plate", "Meat, rice or fries, salad, tzatziki, pita. Easier to judge the components separately."],
      ["Souvlaki as a comparison", "Skewered grilled cubes rather than spit meat. Different dish, same counter, and often better."],
      ["Loukoumades after", "Honey-soaked dough balls, if they have them."],
    ],
    signals:
      "Gyro searches read for hand-stacked and pork mentions, which are rare and indicate a Greek kitchen rather than a general grill. Tzatziki texture is the other thing reviewers reliably comment on, and the matcher reads for it.",
    related: ["greek-food", "shawarma", "sandwiches"],
    situations: ["on-a-budget", "late-night", "finals-week"],
  },
  {
    s: "falafel",
    n: "falafel",
    h1: "How to find good falafel",
    title: "How to Find Good Falafel Near You",
    desc:
      "Fried to order, green inside, and never from a mix — what separates good falafel.",
    lede:
      "Falafel has a short half-life. It is excellent for about four minutes after it leaves the fryer and mediocre after twenty, which means the single most important question is whether it was fried when you ordered it.",
    good: [
      ["Fried to order", "Three to four minutes' wait. Falafel sitting in a warming tray is dense and dry, and no amount of tahini rescues it."],
      ["Green inside", "Soaked dried chickpeas blended with a lot of parsley, cilantro and herbs. If the interior is beige, it is short on herbs or made from a dry mix."],
      ["Soaked, never cooked, chickpeas", "The chickpeas are soaked raw and ground. Using cooked chickpeas or canned makes a paste that falls apart in the oil — a common shortcut."],
      ["A crisp, craggy shell", "Rough surface, shatters when bitten. Smooth uniform spheres came from a scoop and a mix."],
      ["Tahini made in house", "Thinned with lemon and water to a pourable cream. Thick, bitter tahini straight from the jar is a tell."],
    ],
    order: [
      ["A falafel sandwich", "In pita or laffa, with salad, pickles, tahini and hot sauce."],
      ["A falafel plate", "With hummus, salads and bread. Better for judging the components."],
      ["Ask for them fresh", "At a busy place this costs you four minutes and is always worth it."],
      ["Sabich as an alternative", "Fried aubergine, egg, amba and tahini in pita. Same counters, often better."],
      ["Amba, if offered", "Pickled mango sauce. Divisive and excellent."],
    ],
    signals:
      "Falafel searches weight fried-to-order mentions above everything else, including overall rating, because freshness is the dominant variable in this dish. Reviews describing a green interior or a wait are treated as positives.",
    related: ["mediterranean-food", "lebanese-food", "shawarma"],
    situations: ["on-a-budget", "work-team-lunch", "finals-week"],
  },
  {
    s: "empanadas",
    n: "empanadas",
    h1: "How to find good empanadas",
    title: "How to Find Good Empanadas Near You",
    desc:
      "Argentine, Colombian, Chilean and Dominican empanadas are different foods. How to tell, and what to order.",
    lede:
      "Empanada covers a wheat pastry baked in Argentina, a corn shell deep-fried in Colombia, a huge baked pocket in Chile and a thin fried one in the Dominican Republic. Knowing which country a place is cooking from tells you what you are about to get.",
    good: [
      ["Pastry made there", "Hand-crimped edges, uneven repulgue. Machine-sealed empanadas have a uniform fork-pressed rim."],
      ["The right shell for the tradition", "Argentine and Chilean are wheat and usually baked; Colombian is corn and fried; Dominican is thin wheat and fried. A place doing all of them equally well is unusual."],
      ["Filling that is cooked separately and cooled", "Good filling is a stew in its own right. Raw-mixed filling steams inside the pastry and goes watery."],
      ["Crimping that signals the filling", "Traditional Argentine kitchens crimp differently for each filling so you can tell them apart. A place doing that is serious."],
      ["Hot from the oven, not the case", "Reheated empanadas go tough. Ask what just came out."],
    ],
    order: [
      ["Argentine carne", "Beef, onion, egg, olive, cumin. The benchmark, and the olive belongs."],
      ["Humita", "Creamed sweetcorn. The best vegetarian one in most kitchens."],
      ["Colombian de carne with ají", "Corn shell, fried, with the thin chilli sauce that comes with it."],
      ["Chilean pino", "Large, baked, with beef, onion, egg and olive."],
      ["Two or three at a time", "They are smaller than they look."],
    ],
    signals:
      "Empanada searches resolve to a national tradition where possible, since the shell and cooking method differ completely between them. The matcher reads menus for country labels and filling names, and treats bakeries and counters as candidates alongside restaurants.",
    related: ["colombian-food", "arepas", "sandwiches"],
    situations: ["on-a-budget", "work-team-lunch", "moving-day"],
  },
  {
    s: "tamales",
    n: "tamales",
    h1: "How to find good tamales",
    title: "How to Find Good Tamales Near You",
    desc:
      "Masa that is light, lard that is real, and why the best tamales are sold from a cooler.",
    lede:
      "Tamales are labour, which is why they are traditionally made in large batches for holidays and why the best ones are frequently sold from a cooler outside a church, a laundromat or a market rather than from a restaurant.",
    good: [
      ["Masa that is light, not dense", "Properly beaten masa with fat whipped through it is almost fluffy. Dense, heavy masa means it was not beaten enough — the most common failure."],
      ["Real lard", "Manteca gives the flavour and the texture. Vegetable shortening makes a tamal that is technically correct and tastes of nothing."],
      ["A thin layer of masa", "The masa is the vehicle, not the meal. A thick wall with a teaspoon of filling is a bad ratio."],
      ["Steamed, still hot", "Tamales are steamed and should arrive hot and moist. Reheated in a microwave they go rubbery."],
      ["Regional variety", "Oaxacan tamales are wrapped in banana leaf and flatter; Mexican-American ones in corn husk. Both are right, and a place offering several is cooking a tradition."],
    ],
    order: [
      ["Rojo and verde", "Pork in red chilli, chicken in green. Buy one of each the first time."],
      ["Rajas con queso", "Poblano strips and cheese. The best vegetarian option."],
      ["Oaxacan mole tamal", "Banana leaf, mole negro. A different dish and worth finding."],
      ["Dulce", "Sweet tamales, often pink, with raisin or pineapple."],
      ["By the dozen", "They freeze and steam back perfectly, which is most of the point."],
    ],
    signals:
      "Tamale searches include markets, bakeries and non-restaurant listings, because that is where a large share of the best tamales are sold. The matcher reads for masa and lard language and for weekend or holiday availability, which is a signal of a batch made properly rather than held all week.",
    related: ["mexican-food", "tacos", "pupusas"],
    situations: ["on-a-budget", "big-group", "moving-day"],
  },
  {
    s: "poke",
    n: "poke",
    h1: "How to find good poke",
    title: "How to Find Good Poke Near You",
    desc:
      "Hawaiian poke versus the build-your-own bowl, and how to tell whether the fish is any good.",
    lede:
      "Poke in Hawaii is cubed raw fish seasoned simply and sold by weight from a deli case. The mainland version — a bowl you assemble from twelve toppings — is a different product, and the main risk with it is that the fish becomes the least considered ingredient.",
    good: [
      ["Fish that looks translucent, not flat red", "Fresh ahi has depth and slight translucency. Uniform bright red usually means it was treated with carbon monoxide to hold colour, which is legal and tells you it is not fresh-cut."],
      ["Cut to order, or a case that turns over fast", "Pre-cubed fish sitting in dressing goes mushy at the edges."],
      ["Restrained seasoning", "Traditional poke is shoyu, sesame oil, onion, limu, inamona. If the fish is buried in spicy mayo, you cannot taste whether it is good."],
      ["A short topping list", "The best poke counters offer a few things well. Twenty toppings is a salad bar with fish in it."],
      ["They will tell you what came in", "A counter that knows its supplier and says so is the one to use."],
    ],
    order: [
      ["Shoyu ahi", "The classic. Soy, sesame, sweet onion. Order this to judge the fish."],
      ["Spicy ahi, second", "Good, but the mayo hides a lot."],
      ["Limu or seaweed poke", "If they have it, they are cooking Hawaiian rather than bowl-shop."],
      ["Over rice, warm", "The rice should be warm and lightly seasoned, which improves the fish."],
      ["Skip the twelve toppings", "Two or three. The fish is what you are paying for."],
    ],
    signals:
      "Poke searches distinguish Hawaiian-style counters from build-your-own bowl chains, which are different products at similar prices. The matcher reads reviews for fish-quality language and for traditional preparations like limu and inamona, which only appear where a place is cooking the original.",
    related: ["sushi", "seafood", "japanese-food"],
    situations: ["hot-day", "after-a-workout", "work-team-lunch"],
  },
  {
    s: "hot-pot",
    n: "hot pot",
    h1: "How to find good hot pot",
    title: "How to Find Good Hot Pot Near You",
    desc:
      "Broth, sauce bar and how the format works — what separates a good hot pot restaurant.",
    lede:
      "Hot pot is a simmering pot of broth at the table and a pile of raw ingredients you cook yourself. It takes two hours, it is the single best cold-weather group meal available, and the broth is the only thing the kitchen actually makes.",
    good: [
      ["Broth made from scratch", "Especially mala. A good Sichuan broth is fragrant with peppercorn and chilli before it is hot. Broth from a packet is uniformly salty."],
      ["A split pot offered", "Two broths in one pan so the table can have both spicy and mild. Standard at good places."],
      ["A real sauce bar", "Sesame paste, fermented tofu, chilli oil, garlic, cilantro, chive flower. The sauce is half the meal and a thin bar is a bad sign."],
      ["Meat sliced thin and fresh", "Paper-thin, arranged, slightly marbled. Frozen bricks that arrive still icy have been held."],
      ["Hand-made items", "House-made fish balls, shrimp paste, handmade noodles pulled at the table. These are the things that separate a good hot pot restaurant from a supply-chain one."],
    ],
    order: [
      ["A split broth", "Mala on one side, a bone or mushroom broth on the other."],
      ["Fatty beef and lamb", "Thin-sliced, cooked in seconds. The staple."],
      ["Hand-made shrimp paste", "Spooned in raw. If they make it, order it."],
      ["Greens and mushrooms", "Napa, enoki, tong ho. Not an afterthought — they carry the broth."],
      ["Noodles last", "Cooked in the broth at the end, when it is at its most concentrated."],
    ],
    signals:
      "Hot pot searches read for broth quality and sauce bar mentions, plus hand-made items, which are what distinguish a serious restaurant from a franchise running on shipped-in product. Group-size and table-equipment language matters too, because a hot pot table is physical infrastructure.",
    related: ["chinese-food", "korean-food", "soup"],
    situations: ["cold-rainy-night", "big-group", "celebrating"],
  },
  {
    s: "dim-sum",
    n: "dim sum",
    h1: "How to find good dim sum",
    title: "How to Find Good Dim Sum Near You",
    desc:
      "Carts versus order sheets, the four benchmark dishes, and why you should go before noon.",
    lede:
      "Dim sum is a Cantonese lunch service of dozens of small steamed and fried dishes, traditionally pushed around on carts. Cart service is charming and made-to-order is usually better food — the trade is between theatre and everything arriving hot.",
    good: [
      ["Har gow with a translucent, pleated skin", "Shrimp dumplings in a wheat-starch wrapper. At least seven pleats, thin enough to see the filling, holding together when lifted. The single hardest item and the fairest test."],
      ["Siu mai with distinct pork texture", "You should see and feel individual pieces of pork and shrimp, not a homogenous paste."],
      ["Char siu bao that is just-steamed", "Fluffy, slightly sweet, with a glossy filling. A bao that has sat goes dense."],
      ["Busy, loud, and full of families", "Dim sum halls are judged by their Sunday crowd more reliably than by anything else."],
      ["Made-to-order tickets", "A paper order sheet usually means fresher food than carts, even though carts are more fun."],
    ],
    order: [
      ["Har gow and siu mai", "Always. The two benchmarks."],
      ["Cheung fun", "Rice noodle rolls with shrimp or beef, in sweet soy."],
      ["Lo bak go", "Turnip cake, pan-fried until crisp at the edges."],
      ["Egg tarts", "Flaky or shortcrust. Order at the end, ask for them warm."],
      ["Go before noon", "Dim sum is a morning and early-afternoon meal. By 2pm you are eating what is left."],
    ],
    signals:
      "Dim sum searches read for cart or made-to-order service style, and for the benchmark dish names in reviews. A packed weekend room is treated as a strong positive rather than a wait to be avoided, because in this format turnover is freshness.",
    related: ["chinese-food", "dumplings", "noodles"],
    situations: ["big-group", "friends-visiting", "sunday-night"],
  },
  {
    s: "bibimbap",
    n: "bibimbap",
    h1: "How to find good bibimbap",
    title: "How to Find Good Bibimbap Near You",
    desc:
      "The stone bowl is the point. What separates good bibimbap and what to order with it.",
    lede:
      "Bibimbap is rice with seasoned vegetables, meat and an egg, mixed at the table with gochujang. The version worth seeking out is dolsot bibimbap, served in a stone bowl hot enough to crisp the rice against the sides while you eat.",
    good: [
      ["A stone bowl that is genuinely hot", "It should still be sizzling when it reaches you and crisping the rice for several minutes after. A warm bowl produces no crust and misses the point."],
      ["Namul prepared individually", "Each vegetable — spinach, bean sprouts, fernbrake, carrot, courgette — seasoned separately. If they all taste the same they were cooked together."],
      ["Fernbrake on the plate", "Gosari, a seasoned bracken fern, is laborious to prepare and a good indicator of a kitchen cooking properly."],
      ["Gochujang served on the side", "So you control it. Pre-mixed bibimbap takes the decision away and is usually over-sauced."],
      ["Banchan that are varied and refilled", "Same rule as anywhere Korean: the side dishes tell you about the kitchen before the main arrives."],
    ],
    order: [
      ["Dolsot bibimbap", "The stone bowl version. Worth the extra couple of dollars every time."],
      ["Yukhoe bibimbap", "With raw seasoned beef and a raw yolk, if you see it."],
      ["Mix it immediately", "Thoroughly, while the bowl is hot, then let it sit to crisp."],
      ["A jjigae alongside for two", "Bibimbap plus a stew is the standard Korean lunch pairing."],
      ["Scrape the crust at the end", "The nurungji at the bottom is the best part."],
    ],
    signals:
      "Bibimbap searches read for dolsot and stone-bowl mentions specifically, since that is the version people mean when the dish is good. Banchan quality in reviews is weighted as a proxy for the whole kitchen.",
    related: ["korean-food", "noodles", "salad"],
    situations: ["after-a-workout", "work-team-lunch", "eating-alone"],
  },
  {
    s: "udon",
    n: "udon",
    h1: "How to find good udon",
    title: "How to Find Good Udon Near You",
    desc:
      "Thick wheat noodles, dashi that tastes of something, and the difference between hot and cold service.",
    lede:
      "Udon is thick, soft, chewy wheat noodles in a clear dashi broth, and it is the quietest of the Japanese noodle dishes — there is nothing rich to hide behind, so the broth and the noodle texture are the entire dish.",
    good: [
      ["Noodles with real chew", "Good udon has a dense, springy resistance — koshi. Soft, mushy udon has been overcooked or came frozen and reheated badly."],
      ["Made or cut on site", "Handmade udon is slightly irregular in width. Some excellent shops use frozen Sanuki-style noodles, which is legitimate, but fresh is different."],
      ["Dashi that tastes of kombu and katsuobushi", "Clear, light, deeply savoury. If it tastes only of salt and soy, it is from a concentrate."],
      ["A short menu", "Udon shops that also do ramen, sushi and teriyaki are not making their own noodles."],
      ["Tempura fried to order", "If they serve it alongside, it should arrive crisp, not from a warmer."],
    ],
    order: [
      ["Kake udon", "Plain, in dashi. The purest test of both broth and noodle."],
      ["Niku udon", "With sweet simmered beef."],
      ["Curry udon", "Thick Japanese curry over udon. Messy and excellent in cold weather."],
      ["Zaru udon", "Cold, with dipping sauce. Better in summer, and it shows the noodle texture more clearly."],
      ["Kitsune udon", "With sweet fried tofu. The classic vegetarian-ish option."],
    ],
    signals:
      "Udon searches weight specialisation heavily — a shop doing only udon and tempura over a general Japanese menu — and read for handmade and dashi language in reviews, which is what people mention when a shop is genuinely good.",
    related: ["japanese-food", "ramen", "noodles"],
    situations: ["cold-rainy-night", "eating-alone", "stressed"],
  },
  {
    s: "congee",
    n: "congee",
    h1: "How to find good congee",
    title: "How to Find Good Congee Near You",
    desc:
      "Rice porridge that took hours, and why it's the best thing to eat when you feel terrible.",
    lede:
      "Congee is rice cooked in far too much water for far too long until the grains break down into a savoury porridge. It is breakfast across much of Asia, it is what you eat when you are ill, and it is almost impossible to find done badly in a place that specialises in it.",
    good: [
      ["Grains fully broken down", "Good congee is smooth and creamy with no distinct grains left. If you can see whole rice, it was rushed — it takes hours."],
      ["Stock, not water", "The best congee is cooked in chicken or pork stock. Water-based congee is comforting; stock-based congee is a dish."],
      ["Served scalding", "It should be too hot to eat immediately and hold that heat, which good congee does because of its density."],
      ["Toppings added at the table", "Ginger, scallion, white pepper, youtiao, century egg, peanuts. If it arrives pre-mixed you cannot adjust it."],
      ["Youtiao on the side", "Fried dough sticks for dipping. A congee shop without them is missing the standard accompaniment."],
    ],
    order: [
      ["Century egg and pork", "The classic Cantonese combination. Start here."],
      ["Plain, with toppings", "If you want to judge the congee itself."],
      ["Fish congee", "Sliced raw fish cooked by the heat of the porridge as it is stirred in."],
      ["Youtiao to dip", "Always."],
      ["Jok or okayu variants", "Thai jok comes with a raw egg and ginger; Japanese okayu is plainer. Different traditions, same comfort."],
    ],
    signals:
      "Congee searches read for texture language in reviews and for breakfast hours, since a shop open at 7am for congee is cooking it the way it is meant to be eaten. Places serving it only as a side dish on a large menu rank lower than specialists.",
    related: ["chinese-food", "soup", "noodles"],
    situations: ["sick-with-a-cold", "hungover", "stressed"],
  },
  {
    s: "bagels",
    n: "bagels",
    h1: "How to find a good bagel",
    title: "How to Find a Good Bagel Near You",
    desc:
      "Boiled, not steamed. What separates a real bagel from a bread roll with a hole.",
    lede:
      "A real bagel is boiled before it is baked, and that single step is what produces the dense chew and the glossy, slightly blistered crust. Almost everything sold as a bagel in America is steamed or simply baked, which produces a soft round bread roll with a hole in it.",
    good: [
      ["Boiled, and they will say so", "Shops that boil advertise it. The crust should be shiny and slightly wrinkled, with small blisters."],
      ["Dense enough to have weight", "A good bagel feels heavy for its size. If it is light and airy it was not boiled."],
      ["A chew that resists", "You should have to work slightly. Soft, fluffy bagels are a different product."],
      ["Baked that morning, sold out by afternoon", "Bagels are at their best within a few hours. A shop with a full case at 4pm is not turning over."],
      ["Not toasted by default", "At a good bagel place, toasting a fresh bagel is mildly frowned upon — and that attitude is a signal."],
    ],
    order: [
      ["Plain or sesame, first visit", "Nothing to hide behind. Judge the bagel itself."],
      ["Everything", "The benchmark for whether their seasoning is made or bought."],
      ["Lox and schmear", "Cream cheese, cured salmon, tomato, red onion, capers. The full construction."],
      ["Whitefish salad", "The deli test, and better than it sounds."],
      ["Before 10am", "Genuinely a different product than the same bagel at 3pm."],
    ],
    signals:
      "Bagel searches read for boiled and hand-rolled language, and weight reviews describing crust and chew far above overall rating — because a bagel shop's rating is heavily influenced by coffee and speed, neither of which is the bagel.",
    related: ["deli", "sandwiches", "breakfast"],
    situations: ["hungover", "sunday-night", "before-a-flight"],
  },
  {
    s: "deli",
    n: "delis",
    h1: "How to find a good deli",
    title: "How to Find a Good Deli Near You",
    desc:
      "Hand-carved pastrami, a slicer that never stops, and how to tell a real deli from a sandwich shop.",
    lede:
      "A deli cures and cooks its own meat. A sandwich shop buys it sliced. Both can make you lunch, but only one of them is doing the thing the word means, and the difference is visible from the door.",
    good: [
      ["A slicer running constantly", "Meat sliced when you order it. Pre-sliced deli meat oxidises and goes leathery within hours, and it is the single biggest quality variable."],
      ["Pastrami hand-carved, not machine-sliced", "Jewish delis carve navel pastrami by hand in thick irregular slices. Machine-thin pastrami is a different eating experience entirely."],
      ["Meat cured on site, or a named supplier", "The good ones will tell you. Vagueness usually means a distributor."],
      ["Pickles from a barrel", "Half-sour and full-sour, from brine rather than a jar, brought to the table unasked."],
      ["Rye with a real crust and caraway", "Seeded corn rye. Soft sandwich bread under pastrami is a structural failure."],
    ],
    order: [
      ["Pastrami on rye, mustard only", "No mayonnaise, no lettuce. The benchmark, and the only correct construction."],
      ["Corned beef", "The comparison. If both are good, the deli is good."],
      ["Matzo ball soup", "A floater or a sinker — both camps are right, and it tells you about the kitchen."],
      ["A knish", "Potato, baked not fried, if they make their own."],
      ["Black-and-white cookie", "For later."],
    ],
    signals:
      "Deli searches read for house-cured and hand-carved language and for a visible slicer, which is what separates a deli from a sandwich counter. The matcher also reads for Italian delis and salumerias under the same query, since the same signals apply to both traditions.",
    related: ["sandwiches", "bagels", "soup"],
    situations: ["work-team-lunch", "on-a-budget", "friends-visiting"],
  },
  {
    s: "diner",
    n: "diners",
    h1: "How to find a good diner",
    title: "How to Find a Good Diner Near You",
    desc:
      "A full counter at 7am, a griddle with decades on it, and coffee that keeps coming.",
    lede:
      "A diner is not judged on its best dish. It is judged on whether a stranger can walk in alone at any hour, sit at the counter, and be fed quickly and without ceremony — and the places that do that well have usually been doing it for forty years.",
    good: [
      ["Regulars at the counter", "People eating alone on a weekday morning who are clearly known. It is the strongest signal in this category and it cannot be manufactured."],
      ["A seasoned flat-top", "Decades of use changes how eggs and hash browns cook. The griddle is the diner's most important asset."],
      ["Coffee refilled unasked", "Not necessarily good coffee. The pot coming round is the operating standard."],
      ["Hash browns or home fries done properly", "Crisp outside, cooked through, seasoned. The component most often phoned in and the best single test."],
      ["Open early, open late, open always", "A diner that closes at 2pm on a Sunday is a café."],
    ],
    order: [
      ["Eggs, exactly how you want them", "Over easy, over medium. If they arrive right, everything else will."],
      ["A short stack alongside", "Pancakes are the second test."],
      ["Whatever is on the hand-written board", "It is there because they have it today."],
      ["A patty melt", "Rye, griddled onions, American cheese. The diner sandwich."],
      ["Pie, if the case is turning over", "A full case at closing is not a good sign."],
    ],
    signals:
      "Diner searches weight early opening hours, counter service and long-running ownership, and treat the absence of a website as neutral rather than negative. That last adjustment is the difference between finding the forty-year-old counter and finding the place with the best food photography.",
    related: ["breakfast", "burgers", "sandwiches"],
    situations: ["hungover", "road-trip", "after-a-shift", "eating-alone"],
  },
  {
    s: "boba",
    n: "boba",
    h1: "How to find good boba",
    title: "How to Find Good Boba Tea Near You",
    desc:
      "Tapioca cooked fresh, tea that tastes like tea, and how to order sweetness properly.",
    lede:
      "Boba is tea, milk and cooked tapioca pearls, and the failure mode is almost always the same: the tea is an afterthought and the drink is sugar. The good shops start from tea that would be worth drinking on its own.",
    good: [
      ["Pearls cooked within the last few hours", "Tapioca has a four-hour window. Fresh pearls are chewy with a soft centre; old pearls are hard in the middle or dissolving at the edges."],
      ["Tea brewed, not powdered", "A good shop brews and discards. If the menu is all powder-based flavours, the tea is a vehicle for sugar."],
      ["Adjustable sweetness and ice", "25%, 50%, 75%, 100%. A shop that does not offer it is not expecting you to taste the tea."],
      ["Brown sugar syrup made in house", "For brown sugar drinks specifically — it should be caramelised and slightly bitter, not just sweet."],
      ["A queue of people who look particular about it", "Boba shops live and die on repeat customers who know exactly what they want."],
    ],
    order: [
      ["Classic milk tea, 50% sugar", "The baseline. If it is good here, everything else will be."],
      ["Brown sugar boba milk", "Judge the syrup."],
      ["An unsweetened or lightly sweetened straight tea", "The fastest way to find out whether they brew properly."],
      ["Ask when the pearls were cooked", "A normal question at a good shop."],
      ["Less ice, if you want to taste it", "Standard ice dilutes quickly."],
    ],
    signals:
      "Boba searches read for fresh-pearl and brewed-tea language and for sweetness-customisation mentions. Because these shops attract high ratings on decor and speed, the matcher discounts that and reads specifically for what people say about the tea and the texture of the pearls.",
    related: ["chinese-food", "japanese-food", "breakfast"],
    situations: ["finals-week", "hot-day", "first-date"],
  },
  {
    s: "oysters",
    n: "oysters",
    h1: "How to find good oysters",
    title: "How to Find Good Oysters Near You",
    desc:
      "Shucked to order, named by the bed, and how to tell a real raw bar.",
    lede:
      "Oysters are the one thing on a menu where the restaurant is not cooking anything, so everything depends on sourcing, handling and the twenty seconds between shucking and your table.",
    good: [
      ["Named by origin, not just 'oysters'", "Kumamoto, Wellfleet, Blue Point, Shigoku. A raw bar that names the beds is buying deliberately; a menu that says oysters is buying whatever."],
      ["Shucked to order, in view", "Never pre-shucked and held. A shucking station you can see is the format that works."],
      ["Liquor still in the shell", "The natural liquid should be present and clear. A dry oyster was shucked too early or rinsed, and rinsing removes the flavour."],
      ["Cut cleanly from the shell", "The adductor muscle severed, no shell fragments. Sloppy shucking means a rushed or inexperienced bar."],
      ["High turnover", "Oysters are alive until shucked. A busy raw bar is a safer raw bar, and that is a genuine food-safety point rather than a preference."],
    ],
    order: [
      ["A half dozen from two different beds", "East coast and west coast. The difference is dramatic and it is the best way in."],
      ["Mignonette or nothing", "Shallot and vinegar, or bare. Cocktail sauce is for hiding things."],
      ["Happy hour, if the bar is busy", "The standard way to eat oysters affordably, and quality rarely drops when volume is high."],
      ["Ask what came in today", "A good raw bar answers immediately and specifically."],
      ["Grilled or roasted inland", "Away from the coast, cooked preparations are frequently the better bet."],
    ],
    signals:
      "Oyster searches read menus for named varieties and for shucked-to-order language, and factor in distance from the coast — inland, the matcher gives more weight to cooked preparations rather than pushing you toward a raw bar that is unlikely to be at its best.",
    related: ["seafood", "sushi", "spanish-food"],
    situations: ["celebrating", "first-date", "business-dinner"],
  },
  {
    s: "halal-food",
    n: "halal food",
    h1: "How to find good halal food",
    title: "How to Find Good Halal Food Near You",
    desc:
      "From halal carts to full kitchens — what to look for and what to order.",
    lede:
      "Halal covers an enormous range of cuisines, from a New York street cart to a Uyghur noodle house to a Pakistani biryani kitchen. What follows is about finding good food among them; the question of certification and standards is a separate one.",
    good: [
      ["A stated standard, not just a sign", "Fully halal kitchen, halal meat only, or certified by a named body. These are different things and the good places say which."],
      ["A cart with a queue at 1am", "The halal cart is its own genre — chicken or lamb over rice, white sauce, hot sauce. The line is the review."],
      ["Bread from a tandoor", "Across Pakistani, Afghan and Uyghur kitchens, bread baked on site is the reliable signal."],
      ["Whole-animal cooking", "Nihari, paya, haleem. Dishes that take overnight and indicate a kitchen cooking for its own community."],
      ["Rice treated as a discipline", "Biryani and pulao should have separate, long grains and layered seasoning, not be a rice dish with sauce through it."],
    ],
    order: [
      ["Chicken over rice, from a cart", "White sauce and hot sauce. The New York standard."],
      ["Biryani", "Hyderabadi or Pakistani, cooked sealed. A proper one is a different dish from rice with curry."],
      ["Nihari", "Slow-cooked beef shank stew, traditionally breakfast, with naan."],
      ["Uyghur laghman", "Hand-pulled noodles with lamb and peppers, if you can find it."],
      ["Karahi", "Cooked to order in a wok-like pan, for the table."],
    ],
    signals:
      "Halal searches read menus and reviews for the distinction between fully halal and halal-meat-only, which listings almost never make but reviewers often do. See the dietary guide for how certification and standards are handled — this page is about the cooking.",
    related: ["indian-food", "mediterranean-food", "noodles"],
    situations: ["late-night", "big-group", "on-a-budget"],
  },
];
