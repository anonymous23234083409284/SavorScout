/* Content for the /diet/<slug> pages — eating out with a restriction.
 *
 * THE RULE FOR THIS FILE: NO MEDICAL ADVICE, AND NO SAFETY PROMISES.
 *
 * Several of these cover allergies that put people in hospital. Savor Scout
 * reads menus and reviews for the terms somebody gives it, and that is a
 * discovery aid — it is not verification, it cannot see a kitchen, and a menu
 * saying "gluten-free" tells you what a restaurant printed, not how it cooks.
 * Every allergy entry below states that limit in its own words rather than
 * relying on a footer disclaimer, because a page that implies we have checked
 * would be actively dangerous and is exactly the kind of content that deserves
 * to rank nowhere.
 *
 * What these pages CAN honestly do is the thing the internet does badly for
 * this audience: explain what actually goes wrong in a kitchen, which questions
 * get a useful answer, and which cuisines are structurally easier — because
 * that last one is real, specific, and different for every restriction. A
 * dairy allergy and a shellfish allergy point at opposite ends of the map.
 */

module.exports = [
  {
    s: "gluten-free",
    n: "gluten-free",
    h1: "Eating out gluten-free",
    title: "Eating Out Gluten-Free — How to Find Restaurants That Get It Right",
    desc:
      "How to eat out gluten-free or with coeliac disease: what actually goes wrong in kitchens, the questions worth asking, and which cuisines are structurally easier.",
    lede:
      "There is an enormous difference between a restaurant with gluten-free items on the menu and a restaurant that can safely feed someone with coeliac disease, and almost nothing in a listing or a star rating distinguishes them.",
    wrong: [
      "The menu is rarely the problem. Cross-contact is. A gluten-free pasta boiled in the same water as wheat pasta, fries cooked in the oil that handled battered fish, a grill that has been searing burger buns all night, one pair of tongs used for everything — none of these appear on a menu and all of them matter if the reason you are avoiding gluten is coeliac disease rather than preference.",
      "The second issue is the invisible sources. Soy sauce is made with wheat, which puts it in most Chinese, Japanese and Korean marinades and sauces. Flour is used to thicken soups, gravies and roux. Malt vinegar, some stocks, some sausages, seitan, and a great deal of fried food all contain it. Anything described as crispy deserves a question.",
      "The third is that staff answer the question they think you are asking. If a server hears a preference, the answer is often a cheerful yes. Saying clearly that it is a medical requirement changes the conversation, frequently results in the kitchen being consulted, and is the single most effective thing you can do.",
    ],
    ask: [
      ["Say it is coeliac disease, or a medical allergy", "The words change how the question is handled. Preference gets a yes; medical gets a manager."],
      ["Is there a dedicated fryer?", "The fastest question to ask and the most commonly failed. One shared fryer rules out everything fried."],
      ["Is the gluten-free pasta cooked in separate water?", "Almost never is, unless the kitchen has thought about it. A place that answers this precisely is a place that has."],
      ["What is in the sauce?", "Soy sauce, roux, stock and thickeners are where it hides. Grilled meat with a sauce is frequently not safe when the meat alone would have been."],
      ["Call at a quiet hour", "Three in the afternoon gets you a real conversation with someone who is not mid-service. This works far better than asking at 7:30pm."],
    ],
    cuisines: [
      ["Naturally lower risk", "Mexican taquerias built on corn tortillas — ask about the tortillas specifically, since flour is also common. Vietnamese, which is rice-noodle based, though watch for fish sauce blends and hoisin. South Indian, which is built on rice and lentils: dosa, idli and sambar are naturally gluten-free. Ethiopian, where injera is traditionally teff, although many restaurants blend in wheat, so ask. Brazilian churrascarias, Greek and Levantine grills, and most sushi other than the soy sauce and the imitation crab."],
      ["Higher risk", "Anywhere built on wheat — Italian, Chinese, most bakeries, most bars with a shared fryer. Also, counter-intuitively, restaurants with extensive gluten-free menus but a single small kitchen, where the intent is genuine and the space to keep things separate is not."],
    ],
    tool:
      "If you set gluten-free or coeliac as an allergy in Savor Scout, it reads restaurant menus and reviews for those exact terms, does not loosen them into near-matches, and shows you on the card which phrases it found and where. Reviews are frequently more useful than menus here, because other coeliac diners describe how a kitchen actually handled it.",
    limit:
      "That is a way to find candidates, not a safety check. We have not visited these kitchens and cannot see the fryer. Treat anything Savor Scout surfaces as a place worth calling, and make the call.",
    related: ["dairy-free", "low-fodmap", "vegan"],
    dishes: ["mexican-food", "vietnamese-food", "indian-food", "greek-food"],
    situations: ["work-team-lunch", "big-group", "first-date"],
  },

  {
    s: "peanut-and-tree-nut-allergy",
    n: "peanut and tree nut allergy",
    h1: "Eating out with a peanut or tree nut allergy",
    title: "Eating Out With a Nut Allergy — Finding Restaurants You Can Trust",
    desc:
      "How to approach restaurants with a peanut or tree nut allergy: where nuts hide, which questions get a real answer, and which cuisines carry more risk.",
    lede:
      "Nut allergy is the restriction where the gap between an ingredient list and reality is widest, because nuts appear as thickeners, oils, garnishes and traces in places no menu would ever mention.",
    wrong: [
      "Peanuts are used as a cooking oil, a sauce base and a thickener, and ground nuts thicken sauces across a lot of South Asian, Southeast Asian and West African cooking. Almond flour and marzipan run through European baking; pesto is pine nuts; a great many desserts are finished with a nut garnish that nobody thinks of as an ingredient. A dish can be nut-free as written and not as served.",
      "Shared equipment is the second half. Ice cream scoops, blenders, fryers, grinders, pastry surfaces and bakery cases all carry trace amounts, and a kitchen turning out three hundred covers cannot easily isolate any of them mid-service.",
      "The most useful thing to understand is that a good restaurant will tell you when it cannot do this. A kitchen that says it cannot guarantee a nut-free dish is being responsible, not unhelpful, and that answer is far more trustworthy than a quick reassurance from somebody who did not check.",
    ],
    ask: [
      ["Tell them before you order, not after", "Ideally when booking. It gives the kitchen time rather than a problem during service."],
      ["Ask what oil the fryer uses", "Peanut oil is still common, particularly in fried chicken and some Asian kitchens."],
      ["Ask whether the kitchen can isolate a preparation", "The real question. The answer tells you what you need to know regardless of which way it goes."],
      ["Ask about desserts separately", "The highest-risk course and the one people relax at. Shared scoops and shared pastry surfaces are routine."],
      ["Carry what you carry, always", "Prescribed medication stays with you regardless of how well the conversation went."],
    ],
    cuisines: [
      ["Higher risk", "Thai, Vietnamese, Indonesian and Malaysian cooking, where peanut is a common sauce base. Indian and Pakistani, where ground nuts and nut pastes thicken curries and appear in rice dishes. West African, where groundnut stews are a staple. Bakeries, ice cream shops and anywhere with a shared pastry kitchen. Chinese kitchens using peanut oil."],
      ["Generally lower risk, still worth asking", "Italian outside of pesto and dessert, most steakhouses and grills, Mexican taquerias, Japanese outside of certain sauces and desserts, Greek and Levantine grills — though baklava and tahini-adjacent preparations mean the dessert menu needs its own conversation."],
    ],
    tool:
      "Savor Scout keeps allergy terms strict rather than loosening them — an entry of tree nut is not softened into nut or tree, because narrowing an allergy term is how a matcher quietly hands you something dangerous. It reads menus and reviews for the exact terms and shows which ones it found, including reviews from other people with nut allergies describing how a kitchen handled it.",
    limit:
      "This finds places worth calling. It does not check a kitchen, cannot see shared equipment, and is not a substitute for telling the restaurant directly. For a serious allergy, the phone call is the step that matters and this only tells you who to call.",
    related: ["sesame-allergy", "shellfish-allergy", "dairy-free"],
    dishes: ["steak", "italian-food", "mexican-food", "greek-food"],
    situations: ["first-date", "work-team-lunch", "big-group"],
  },

  {
    s: "shellfish-allergy",
    n: "shellfish allergy",
    h1: "Eating out with a shellfish allergy",
    title: "Eating Out With a Shellfish Allergy — What to Watch For",
    desc:
      "Where shellfish hides on menus, why fish sauce and shared fryers matter, and how to pick restaurants with a shellfish allergy.",
    lede:
      "Shellfish allergy is unusual in that the risk is often not the dish you ordered. It is the stock, the sauce, the oil and the steam, and none of those are on the menu.",
    wrong: [
      "Fish sauce, oyster sauce, shrimp paste and dried shrimp are foundational across Southeast Asian and southern Chinese cooking, and they are in dishes that contain no visible shellfish at all — a vegetable stir-fry, a papaya salad, a curry paste, a bowl of pho. Belacan and terasi do the same job in Malaysian and Indonesian cooking. This is the single most commonly missed source.",
      "Shared fryers are the other big one. A fryer that has cooked shrimp will transfer protein to everything else that goes in it, which puts most fried food at a seafood restaurant out of reach. Shared grills, shared steamers and shared water used for boiling seafood carry the same issue.",
      "Worth separating from the above: finned fish and shellfish are different allergens, and many people allergic to one can eat the other. Crustaceans — shrimp, crab, lobster — and molluscs — clams, mussels, oysters, squid — are also distinct. Being precise about which one it is gets you a much better answer from a kitchen than saying seafood.",
    ],
    ask: [
      ["Name the specific allergen", "Crustacean, mollusc, or both. It is a more useful question and it gets a more useful answer."],
      ["Ask about fish sauce and oyster sauce by name", "Do not ask whether a dish has shellfish. Ask whether it has fish sauce, oyster sauce or shrimp paste, because staff frequently do not classify those as shellfish."],
      ["Ask whether the fryer is shared", "At any restaurant that serves fried seafood, assume it is unless told otherwise."],
      ["Ask about the stock", "Seafood stock underlies paella, bisque, cioppino, some risotto and many soups, including dishes with no visible seafood."],
      ["Consider the airborne question", "For people who react to cooking vapour, a busy seafood restaurant is a risk regardless of what is ordered. Only you know whether that applies."],
    ],
    cuisines: [
      ["Higher risk", "Thai, Vietnamese, Filipino, Malaysian, Indonesian and Cantonese cooking, because of fish sauce, shrimp paste and oyster sauce. Any seafood restaurant, because of shared equipment. Spanish and Portuguese, where seafood stock is widespread. Cajun and Creole."],
      ["Generally easier", "Indian, particularly North Indian and vegetarian South Indian, where shellfish is largely absent from inland cooking. Ethiopian. Most Middle Eastern and Levantine grills. Mexican taquerias inland, though coastal Mexican cooking is seafood-heavy. Steakhouses, with the caveat that many have a raw bar and a shared kitchen."],
    ],
    tool:
      "Entering shellfish, shrimp or a specific crustacean as an allergy makes Savor Scout read menus and reviews for those exact terms without broadening them, and the card shows you which terms it matched. It is particularly useful for spotting fish sauce and oyster sauce mentions buried in a menu you would otherwise have to read line by line.",
    limit:
      "Reading a menu is not the same as knowing what is in a stockpot. Use this to build a shortlist, then ask the restaurant directly about stock, sauce and the fryer — those three answers decide it, and none of them are reliably written down anywhere.",
    related: ["peanut-and-tree-nut-allergy", "sesame-allergy", "halal"],
    dishes: ["indian-food", "steak", "mediterranean-food", "bbq"],
    situations: ["business-dinner", "celebrating", "friends-visiting"],
  },

  {
    s: "dairy-free",
    n: "dairy-free",
    h1: "Eating out dairy-free",
    title: "Eating Out Dairy-Free or Lactose Intolerant — Where to Go",
    desc:
      "How to eat out without dairy: where butter and cream hide, the difference between lactose intolerance and a milk allergy, and the cuisines that make it easy.",
    lede:
      "Dairy is the restriction most likely to be undone by something nobody mentioned, because butter is a cooking medium rather than an ingredient. A grilled steak is dairy-free until it is finished with butter in the pan, which is standard practice and appears on no menu.",
    wrong: [
      "Butter is the main issue and it is nearly invisible. Restaurant vegetables are frequently finished in it, bread arrives brushed with it, steaks are basted in it, and sauces are mounted with it at the last second. Asking whether a dish contains dairy often gets a no, because the person answering is thinking about cheese and cream.",
      "Then there are the less obvious sources: milk powder in bread and buns, whey in processed meats and seasoning blends, casein in some non-dairy creamers, ghee in Indian cooking, and butter in a great many things that seem savoury and simple.",
      "It is worth being clear about which situation you are in, because it changes what matters. Lactose intolerance is a digestive issue where quantity and type matter — aged hard cheeses and butter contain very little lactose, and many people tolerate them. A milk protein allergy is a different thing entirely, where trace amounts matter and the advice looks much more like the nut allergy page.",
    ],
    ask: [
      ["Ask specifically about butter", "Not about dairy. \"Is this finished with butter?\" is the question that gets the right answer."],
      ["Ask what the vegetables are cooked in", "The most common quiet failure on an otherwise safe plate."],
      ["Ask whether it can be cooked in oil instead", "Usually an easy yes if asked before the dish is cooked, and impossible afterwards."],
      ["Say whether it is an allergy or an intolerance", "It changes what the kitchen needs to do and the honest answer gets you better service."],
      ["Check the bread", "Frequently contains milk powder, and almost always arrives buttered."],
    ],
    cuisines: [
      ["Structurally easy", "Most Chinese cooking, where dairy is largely absent from the tradition. Vietnamese, Thai and Japanese, which use coconut and stock rather than cream. Most Levantine and North African cooking outside of yoghurt-based dishes. Jewish delis and any kosher restaurant serving meat, since kosher law separates meat and dairy entirely — which makes a kosher meat restaurant one of the most reliably dairy-free rooms you can walk into."],
      ["Harder", "French, northern Italian, and most American fine dining, all of which are built on butter and cream. Indian, where ghee, paneer, cream and yoghurt run through much of the northern menu — though South Indian food is far easier. Bakeries and most desserts."],
    ],
    tool:
      "Setting dairy-free, lactose or milk as a dietary term makes Savor Scout read menus and reviews for it, and because dairy tends to be discussed in reviews — people mention accommodating kitchens and dairy-free options by name — the review channel does a lot of the work here.",
    limit:
      "A menu cannot tell you what a pan was finished with. For an intolerance this is usually a good enough starting point; for a milk protein allergy, treat it the way you would any other allergy and speak to the kitchen.",
    related: ["vegan", "gluten-free", "kosher"],
    dishes: ["chinese-food", "vietnamese-food", "thai-food", "japanese-food"],
    situations: ["work-team-lunch", "first-date", "with-a-toddler"],
  },

  {
    s: "egg-allergy",
    n: "egg allergy",
    h1: "Eating out with an egg allergy",
    title: "Eating Out With an Egg Allergy — Where Eggs Hide",
    desc:
      "Egg turns up in far more than breakfast. Where it hides on restaurant menus, what to ask, and which cuisines are easier.",
    lede:
      "Egg is a binder, a glaze, an emulsifier and a wash, which means it appears throughout a menu in dishes that contain nothing recognisable as an egg.",
    wrong: [
      "The binder problem is the biggest one: egg holds together meatballs, burgers, crab cakes, falafel at some places, fish cakes and most breaded coatings. Anything crumbed has almost certainly been through an egg wash before it hit the breadcrumbs.",
      "Then the emulsifiers. Mayonnaise, aioli, hollandaise, béarnaise, Caesar dressing and a great many creamy dressings are egg-based. So is fresh pasta, most of the time. So are meringue, custard, ice cream, mousse and a large share of the dessert menu.",
      "The glazes are the sneakiest: pastry, bread and buns are frequently brushed with egg for shine, which means a burger can be egg-free in every component except the bun nobody thought to mention.",
    ],
    ask: [
      ["Ask about breading and batter", "Egg wash is the default step between the flour and the crumb."],
      ["Ask about the bun and the bread", "Egg wash on the crust is routine and invisible."],
      ["Ask whether the pasta is fresh or dried", "Dried pasta is usually just semolina and water. Fresh pasta usually is not."],
      ["Treat every creamy sauce as suspect", "Mayonnaise-based sauces run through far more menus than people expect."],
      ["Skip the dessert menu unless it is sorbet or fruit", "The highest-density egg course by a wide margin."],
    ],
    cuisines: [
      ["Generally easier", "Mexican taquerias, where the core menu is corn, meat and salsa. Most Indian cooking, particularly vegetarian South Indian. Thai and Vietnamese, with the caveat that egg appears in fried rice and some noodle dishes and is easily left out on request. Grills and steakhouses, avoiding the sauces. Middle Eastern mezze."],
      ["Harder", "French and Italian, because of fresh pasta, emulsified sauces and pastry. Bakeries and brunch places, for obvious reasons. Japanese, where egg appears in tamago, katsu coatings, some ramen and much of the fried menu."],
    ],
    tool:
      "Entering egg as an allergy keeps the term strict — it is not loosened into eggplant or any other partial match — and Savor Scout reads menus and reviews for it, showing you what it found. It is most useful for ruling in cuisines whose core dishes rarely involve egg, which narrows the shortlist quickly.",
    limit:
      "Egg wash never appears on a menu, so a clean menu read means less here than it does for other restrictions. The questions above, asked directly, are doing the real work.",
    related: ["dairy-free", "vegan", "gluten-free"],
    dishes: ["tacos", "mexican-food", "indian-food", "bbq"],
    situations: ["with-a-toddler", "work-team-lunch", "big-group"],
  },

  {
    s: "sesame-allergy",
    n: "sesame allergy",
    h1: "Eating out with a sesame allergy",
    title: "Eating Out With a Sesame Allergy — What to Look For",
    desc:
      "Sesame is now a major labelled allergen and it is in more restaurant food than most people realise. Where it hides and how to ask.",
    lede:
      "Sesame became the ninth major allergen required to be labelled on packaged food in the United States in 2023, which changed the grocery aisle and changed almost nothing about restaurants, where labelling rules do not apply the same way.",
    wrong: [
      "Tahini is ground sesame, which puts sesame at the centre of hummus, baba ganoush, halva and most Levantine sauces — including the sauce on a shawarma or falafel wrap that appears to be yoghurt. This is the largest single source and it is frequently not described as sesame anywhere.",
      "Sesame oil is a finishing oil across Chinese, Korean and Japanese cooking, added at the end for aroma rather than used for frying. That means it is in dressings, marinades, dipping sauces and noodle dishes without appearing in any ingredient description. Gomashio, furikake and many Korean banchan are sesame-based.",
      "Then the visible-but-overlooked: burger buns, bagels, breadsticks, crackers, and the seed mixes on bread baskets. A sesame seed bun is obvious; sesame in a spice blend like za'atar or dukkah is not.",
    ],
    ask: [
      ["Ask about tahini by name", "At any Middle Eastern restaurant this is the question. Asking about sesame may not connect for the person answering."],
      ["Ask about finishing oil", "Specifically at Chinese, Korean and Japanese restaurants. Sesame oil is added after cooking and is easy to omit if asked in advance."],
      ["Ask about the bread and the buns", "And about whether the same surfaces handle seeded bread."],
      ["Ask about spice blends", "Za'atar, dukkah, gomashio and many house rubs contain it."],
      ["Say it is an allergy", "Sesame is still not treated with the same reflexive seriousness as peanut in many kitchens, so being explicit matters more here."],
    ],
    cuisines: [
      ["Higher risk", "Levantine, Israeli, Turkish and Lebanese cooking, where tahini is foundational. Chinese, Korean and Japanese, because of finishing oil. Bakeries. Most burger places, because of the buns."],
      ["Generally easier", "Mexican taquerias, Italian outside of certain breads, Indian, Thai and Vietnamese, most steakhouses and barbecue, and Ethiopian. None of these are sesame-free by definition, but sesame is not structural to them the way it is above."],
    ],
    tool:
      "Sesame and tahini both work as allergy terms and are kept strict. Because sesame is under-described on menus, the review channel matters more than usual here — other people with sesame allergies frequently write about how a restaurant handled it, and Savor Scout reads reviews alongside menus rather than only one of them.",
    limit:
      "Finishing oil is never on a menu. A clean match means a place is worth calling, and the call is where you find out.",
    related: ["peanut-and-tree-nut-allergy", "gluten-free", "dairy-free"],
    dishes: ["mexican-food", "italian-food", "indian-food", "bbq"],
    situations: ["work-team-lunch", "first-date", "big-group"],
  },

  {
    s: "vegan",
    n: "vegan",
    h1: "Eating out as a vegan",
    title: "Eating Out Vegan — How to Find Restaurants Worth Going To",
    desc:
      "How to eat well as a vegan without defaulting to the same three places: the cuisines built for it, the hidden animal products, and what to ask.",
    lede:
      "The useful shift is to stop searching for vegan restaurants and start searching for cuisines where the vegetables were always the point. A dedicated vegan restaurant is one option. A South Indian, Ethiopian or Levantine kitchen is frequently a better meal and always a cheaper one.",
    wrong: [
      "The hidden animal products are the practical problem. Fish sauce in Southeast Asian dishes, shrimp paste in curry pastes, chicken stock in soups and risotto and rice, lard in refried beans and some tortillas, butter in vegetable dishes, honey in dressings, ghee in Indian cooking, gelatin in desserts, and anchovy in Caesar dressing, Worcestershire sauce and puttanesca. A vegetable dish is not a vegan dish.",
      "There is also a real difference between a kitchen that has vegan options and a kitchen where vegan dishes are its actual specialities. The first produces a substituted version of something else; the second produces food that was never going to have meat in it. The second is almost always better, and it is what you are looking for.",
      "The other thing worth knowing is that many of the world's great vegan traditions do not describe themselves that way, because the word is recent and the food is not. Ethiopian fasting food, South Indian temple cooking, Buddhist temple cuisine in China, Japan and Korea, and much of the Levantine mezze tradition are all vegan by construction rather than by accommodation.",
    ],
    ask: [
      ["Ask about stock", "The most common single failure. Soups, rice and risotto are the usual offenders."],
      ["Ask about fish sauce and shrimp paste", "At any Southeast Asian restaurant. Many curries and salads contain them by default and can often be made without."],
      ["Ask about lard", "Refried beans, some tortillas, and some pastry."],
      ["Ask about the fryer", "Shared with meat almost everywhere, which matters to some vegans and not others."],
      ["Look for the fasting or temple menu", "At Ethiopian and some Buddhist restaurants this is an entire section and it is the best food in the house."],
    ],
    cuisines: [
      ["Built for it", "Ethiopian — the fasting menu is a large, fully vegan spread. South Indian — dosa, idli, sambar, most of the menu, though ask about ghee. Levantine and Lebanese mezze. Buddhist temple cuisine, Chinese, Korean or Japanese. Gujarati thali. Vietnamese com chay. All of these are traditions rather than accommodations."],
      ["Workable with questions", "Thai and Vietnamese, once fish sauce is addressed. Mexican, once lard is addressed. Italian, where pasta e fagioli, pasta with vegetables and pizza marinara are genuine dishes rather than compromises."],
    ],
    tool:
      "Savor Scout keeps dietary preferences separate from allergies internally, and a vegan search reads menus and reviews for vegan-specific language rather than just filtering a cuisine tag. It will return a South Indian or Ethiopian restaurant for a vegan search when that is the honest answer, rather than restricting you to places with vegan in the name.",
    limit:
      "Menus describe intentions and reviews describe experiences; neither guarantees the stock. If a specific ingredient matters to you for ethical reasons, the question still has to be asked at the restaurant.",
    related: ["vegetarian", "dairy-free", "gluten-free"],
    dishes: ["indian-food", "mediterranean-food", "thai-food", "salad"],
    situations: ["vegetarians-and-meat-eaters", "work-team-lunch", "big-group", "first-date"],
  },

  {
    s: "vegetarian",
    n: "vegetarian",
    h1: "Eating out as a vegetarian",
    title: "Eating Out Vegetarian — Beyond the One Pasta Dish",
    desc:
      "How to find restaurants where the vegetarian food is the point rather than the concession, and the hidden meat products worth knowing about.",
    lede:
      "Most restaurants have a vegetarian option. Rather fewer have vegetarian food anyone chose to cook, and the difference is the entire experience of eating out as a vegetarian.",
    wrong: [
      "The structural problem is the menu built around a central protein. When a kitchen designs every dish around a piece of meat, the vegetarian item is whatever is left once it has been removed, and it is usually a pasta or a risotto that has been on the menu unchanged for years. Nothing in a rating will tell you this.",
      "The hidden animal products are the other half. Chicken stock in soups, risotto and rice. Anchovy in Caesar dressing, Worcestershire sauce and puttanesca. Rennet in many traditional cheeses, including Parmigiano-Reggiano, which matters to some vegetarians and not others. Gelatin in desserts. Lard in refried beans and pastry. Fish sauce across Southeast Asian cooking.",
      "The fix is the same as for vegans: look for the traditions where vegetables are the main event. India has the largest vegetarian food culture on earth. The Levantine mezze tradition, Sichuan and Cantonese vegetable cooking, southern Italian cooking and Ethiopian fasting food all qualify, and none of them will hand you a sad plate of grilled courgette.",
    ],
    ask: [
      ["Ask whether the soup is vegetarian, not whether it has meat in it", "Different questions, and only the first one covers stock."],
      ["Ask about the dressing", "Caesar and many house dressings contain anchovy."],
      ["Ask about cheese, if rennet matters to you", "Many hard cheeses are made with animal rennet. Staff frequently do not know; the kitchen sometimes does."],
      ["Count the vegetarian mains", "More than three means somebody cared. One means you already know what it is."],
      ["Ask what the kitchen likes to cook", "At a place with a real vegetable tradition this produces an enthusiastic answer, which is itself the signal."],
    ],
    cuisines: [
      ["Deep vegetarian traditions", "Indian, particularly South Indian and Gujarati — entire restaurants that are vegetarian by default. Levantine and Turkish mezze. Ethiopian. Sichuan and Cantonese vegetable cooking. Southern Italian. Korean temple food and banchan."],
      ["Usually thin", "Steakhouses, barbecue, most seafood restaurants, and anywhere whose identity is built around one animal. Not impossible, but you will be eating sides."],
    ],
    tool:
      "A vegetarian search reads menus and reviews for the depth of the vegetarian offering rather than for the presence of a vegetarian tag, which is what separates a restaurant with one pasta dish from a restaurant where half the menu qualifies. Reviews mentioning good vegetarian options carry real weight here because they are usually written by people in the same position.",
    limit:
      "Stock is invisible on a menu. If the reason is ethical rather than preference, the stock question is worth asking regardless of how good the match looked.",
    related: ["vegan", "dairy-free", "low-fodmap"],
    dishes: ["indian-food", "mediterranean-food", "italian-food", "chinese-food"],
    situations: ["vegetarians-and-meat-eaters", "big-group", "work-team-lunch", "meeting-the-parents"],
  },

  {
    s: "halal",
    n: "halal",
    h1: "Eating out halal",
    title: "Eating Out Halal — How to Find Restaurants Near You",
    desc:
      "How to find halal restaurants, what the different levels of certification mean in practice, and what to ask when a place says halal available.",
    lede:
      "Halal is not a single standard in practice, and the useful distinctions — fully halal kitchen, halal meat only, halal options on request — are rarely made clear on a sign or a listing.",
    wrong: [
      "The most common ambiguity is a restaurant advertising halal meat while also serving alcohol and pork. Whether that is acceptable is a personal decision, and plenty of people are fine with it — but it is worth knowing before you arrive, because the sign does not distinguish it from a fully halal kitchen.",
      "The second is shared equipment. A halal chicken cooked on the same grill as a pork product, or fried in the same oil, is a concern for some people and not for others. Restaurants that operate a fully halal kitchen usually say so explicitly, and the explicitness is the signal.",
      "The third is alcohol in cooking. Wine in sauces and braises is standard in French and Italian kitchens, beer in batters, and mirin and sake in Japanese cooking. A dish made with halal meat can still be cooked in wine, and this is almost never mentioned.",
    ],
    ask: [
      ["Ask whether the whole kitchen is halal", "The distinction between fully halal and halal meat only, which is the question the sign does not answer."],
      ["Ask about certification", "Certified restaurants generally display it and are happy to say which body certified them."],
      ["Ask about shared fryers and grills", "Relevant if a fully separated preparation matters to you."],
      ["Ask about wine and mirin in the cooking", "Particularly at Italian, French and Japanese restaurants serving halal meat."],
      ["Check whether it is seasonal", "Some restaurants run halal menus during Ramadan and not otherwise."],
    ],
    cuisines: [
      ["Widely available", "Turkish, Lebanese, Palestinian, Syrian, Egyptian, Pakistani, Bangladeshi, Afghan, Persian, Malaysian, Indonesian, Somali and Uyghur restaurants are frequently fully halal. Halal Chinese — particularly Uyghur and Hui cooking with hand-pulled noodles and cumin lamb — is an excellent and under-known category."],
      ["Naturally compatible", "Vegetarian restaurants, particularly South Indian, where the question largely does not arise apart from alcohol in cooking. Kosher restaurants share many but not all requirements and the overlap is not complete, so it depends on your own standard."],
    ],
    tool:
      "Halal works as a dietary term in Savor Scout, and it reads both menus and reviews for it — reviews matter here because people frequently specify in a review whether a place is fully halal or halal-meat-only, which is exactly the distinction a listing omits.",
    limit:
      "We read what restaurants and reviewers wrote. We do not verify certification, and standards differ between certifying bodies. If a specific standard matters to you, confirm it with the restaurant.",
    related: ["kosher", "vegetarian", "shellfish-allergy"],
    dishes: ["mediterranean-food", "indian-food", "chinese-food", "noodles"],
    situations: ["big-group", "work-team-lunch", "friends-visiting"],
  },

  {
    s: "kosher",
    n: "kosher",
    h1: "Eating out kosher",
    title: "Eating Out Kosher — Finding Restaurants and What to Check",
    desc:
      "How to find kosher restaurants, what supervision actually means, and why a kosher meat restaurant is also one of the easiest dairy-free rooms there is.",
    lede:
      "Kosher observance varies enormously, and what counts as an acceptable restaurant depends on the standard you keep. What does not vary is that certification is the thing to check, and that a restaurant either has it or does not.",
    wrong: [
      "The main thing to know is that kosher supervision is specific and documented. A restaurant under supervision displays a hechsher from a certifying agency, and which agency it is matters to many people. Style is not supervision: a delicatessen serving pastrami and matzo ball soup may be kosher-style and entirely unsupervised, and the menu will look identical.",
      "The meat and dairy separation is the structural feature that shapes the menu. A kosher meat restaurant serves no dairy at all — no butter, no cheese, no cream — which is why it is also one of the most reliably dairy-free environments available to anyone avoiding milk for other reasons. A dairy restaurant serves no meat, which usually makes it vegetarian or pescatarian by construction.",
      "Hours are the practical wrinkle. Supervised restaurants close before sundown on Friday and reopen after nightfall on Saturday, and close entirely for major festivals. Checking this before travelling is worth doing, because listings are frequently wrong about it.",
    ],
    ask: [
      ["Ask which agency certifies it", "The question that actually matters, and supervised restaurants answer it immediately."],
      ["Check whether it is meat, dairy or pareve", "It determines the entire menu and whether it suits what you want to eat."],
      ["Check Shabbat and festival hours", "Listings frequently show standard hours that do not apply."],
      ["Distinguish kosher from kosher-style", "A deli menu tells you nothing about supervision either way."],
      ["Ask about cholov yisroel or pas yisroel, if that is your standard", "Restaurants that meet those standards state it; others will tell you plainly that they do not."],
    ],
    cuisines: [
      ["Commonly certified", "Israeli, Middle Eastern and Levantine restaurants, delicatessens, steakhouses, pizza and dairy cafés, and sushi restaurants in cities with substantial kosher communities. Kosher Chinese and kosher Mexican exist in larger markets."],
      ["Naturally compatible, unsupervised", "Vegetarian and vegan restaurants avoid the meat-and-dairy question but are not kosher without supervision, since equipment and ingredients still matter. Whether that works depends entirely on your standard."],
    ],
    tool:
      "Kosher works as a dietary term and Savor Scout reads menus and reviews for it, including the distinction between kosher and kosher-style where reviewers make it. Certification agency names frequently appear in reviews, which is often the fastest way to find out what a restaurant holds.",
    limit:
      "We read text; we do not verify supervision, and a restaurant's certification can lapse or change. Confirm directly if it matters, which for kosher observance it generally does.",
    related: ["halal", "dairy-free", "vegetarian"],
    dishes: ["mediterranean-food", "steak", "sandwiches", "pizza"],
    situations: ["big-group", "friends-visiting", "celebrating"],
  },

  {
    s: "low-fodmap",
    n: "low-FODMAP",
    h1: "Eating out on a low-FODMAP diet",
    title: "Eating Out Low-FODMAP — Restaurants That Are Easier",
    desc:
      "Eating out with IBS or on a low-FODMAP plan: where garlic and onion hide, what to ask, and which cuisines are structurally easier.",
    lede:
      "The hard part of eating out on a low-FODMAP plan is that the two most common triggers — garlic and onion — are the base layer of almost every savoury kitchen in the world, and they are present long before anything reaches a menu description.",
    wrong: [
      "Garlic and onion are in the stock, the mirepoix, the sofrito, the marinade and the spice blend. A dish can contain no visible onion and still be built on it, which is why asking for a dish without onion frequently produces a plate that is no different. This is the single biggest practical obstacle and it is worth understanding before you order rather than after.",
      "The second issue is that low-FODMAP is quantity-dependent in a way allergies are not. Small amounts of many foods are tolerated where larger amounts are not, and tolerances are individual. That makes restaurant eating a matter of managing load across a meal rather than avoiding a list of ingredients outright.",
      "Worth saying plainly: a low-FODMAP diet is normally something worked out with a dietitian, and it is designed to be temporary and then systematically reintroduced. This page is about restaurants, not about the plan. What to eat is a question for the person guiding your protocol.",
    ],
    ask: [
      ["Ask whether anything can be cooked to order without garlic or onion", "Grills and kitchens that cook individual portions can often do this. Kitchens working from prepared bases cannot."],
      ["Ask about the marinade", "Grilled meat is a good bet only if it has not been sitting in garlic overnight."],
      ["Ask about stock", "It is the usual hidden source and it is in more dishes than you would expect."],
      ["Go at a quiet time", "A kitchen with capacity can accommodate a special preparation. The same kitchen at 8pm on a Saturday cannot."],
      ["Consider ordering simply", "Grilled protein, plain rice, a simple salad dressed with oil and lemon. Unglamorous, and it works."],
    ],
    cuisines: [
      ["Structurally easier", "Japanese — sashimi, rice, grilled fish, and a tradition that uses far less garlic and onion than most. Korean grill, where meat is cooked plain at the table and you control what goes with it. Brazilian churrascaria, for the same reason. Simple grills and steakhouses, ordering plainly. Vietnamese, where many dishes are built on herbs and fish sauce rather than an onion base, though it varies."],
      ["Harder", "Italian, Spanish, Indian, Thai and most of the Middle East, where an aromatic base is the foundation of the cooking. Not impossible, but you will be asking for something the kitchen is not set up to do."],
    ],
    tool:
      "Low-FODMAP, IBS and specific terms like garlic-free work as dietary terms, and Savor Scout will read menus and reviews for them. In practice the more useful approach is to search for the cooking formats above — grilled, cooked to order, plain — because those are properties a kitchen either has or does not, and they matter more here than a label does.",
    limit:
      "No menu describes its stock or its marinade. This narrows the field to restaurants whose format makes a plain preparation plausible; the conversation with the kitchen is what decides it.",
    related: ["gluten-free", "dairy-free", "vegetarian"],
    dishes: ["japanese-food", "korean-food", "steak", "seafood"],
    situations: ["stressed", "work-team-lunch", "first-date"],
  },

  {
    s: "keto-and-low-carb",
    n: "keto and low-carb",
    h1: "Eating out on keto or low-carb",
    title: "Eating Out on Keto or Low-Carb — What to Order",
    desc:
      "How to eat out low-carb without ordering a sad plate of lettuce: the cuisines that work, the hidden sugar, and what to ask.",
    lede:
      "Eating low-carb in restaurants is mostly easy and occasionally sabotaged, and the sabotage is nearly always sugar in something savoury rather than an obvious carbohydrate you could see coming.",
    wrong: [
      "Sugar is a standard seasoning in far more savoury cooking than people expect. Barbecue sauce, teriyaki, most Thai dishes, sweet and sour anything, ketchup-based sauces, many marinades, balsamic glazes and a great deal of salad dressing all carry meaningful sugar. A sauced dish is where the carbohydrate goes when there is no bread on the plate.",
      "The second source is the thickener. Sauces and gravies are thickened with flour or cornstarch, breading adds more than people estimate, and battered anything is substantially carbohydrate by weight.",
      "The third thing worth knowing is that restaurant portions of protein and fat are generous while portions of vegetables often are not, so the practical move is usually to order a protein plainly and add a vegetable side rather than to look for a dish that happens to fit."
    ],
    ask: [
      ["Ask for it grilled, with the sauce on the side", "The single most useful sentence. It converts a large share of menus."],
      ["Swap the starch for a vegetable", "Almost universally possible, usually free, and rarely offered unprompted."],
      ["Ask what is in the dressing", "Most house dressings and vinaigrettes contain sugar; oil and vinegar or lemon does not."],
      ["Avoid anything described as glazed, sticky, crispy or teriyaki", "All four words indicate sugar, starch, or both."],
      ["Ask about the marinade for grilled meat", "The usual hidden sugar source at barbecue and Asian restaurants."],
    ],
    cuisines: [
      ["Easy", "Steakhouses and grills. Korean barbecue, where meat is cooked plainly at the table — watch the marinated cuts. Brazilian churrascaria. Greek and Levantine grills, where the meat, salads and yoghurt dishes are all straightforwardly low-carb. Japanese sashimi. Most seafood restaurants."],
      ["Harder", "Anywhere built on a starch — Italian, Mexican outside of fajitas and grilled plates, most Chinese, most Indian, sandwich shops, and barbecue with sweet sauce, where the meat is fine and the sauce is not."],
    ],
    tool:
      "Low-carb and keto work as dietary terms, and Savor Scout reads menus and reviews for them. In practice the better search here describes the cooking rather than the diet — grilled protein, sauce on the side, vegetable sides — because those are things the matcher can actually find on a menu, and they are the things that determine whether a restaurant works.",
    limit:
      "Sugar in a marinade is not on any menu. The sauce-on-the-side request handles most of it without needing anyone to look anything up.",
    related: ["gluten-free", "low-fodmap", "dairy-free"],
    dishes: ["steak", "korean-food", "seafood", "greek-food"],
    situations: ["after-a-workout", "business-dinner", "work-team-lunch"],
  },
];
