/* What each state eats — written per state, for the /eat/<st> hubs and as a
 * short "known for" line on every city page in that state.
 *
 * WHY THIS EXISTS
 * The state hubs were a list of cities plus a Census median: a crawl route with
 * a number on it. And the 950 city pages without a written metro entry shared
 * everything except their numbers. The one piece of genuinely local knowledge
 * that can be written honestly for all of them at once is the state's own food
 * tradition — Wisconsin's fish fry, New Mexico's green chile, Maryland's crab —
 * because it is documented, stable over decades, and true of every town in it.
 *
 * Same rule as metros.js: regional dishes and food traditions only. No
 * restaurants, no rankings, nothing a local would catch us inventing.
 *
 * `foods` are /food/ guide slugs, checked by the generator at build time.
 */

module.exports = {
  AL: {
    identity: "Alabama's food is Deep South cooking with two distinct accents: barbecue in the north, where pit-smoked chicken comes with a vinegar-and-mayonnaise white sauce found almost nowhere else, and Gulf seafood on the short coastline around Mobile.",
    known: [
      ["White barbecue sauce", "Mayonnaise, vinegar and black pepper, served on smoked chicken. A north Alabama invention."],
      ["Gulf oysters and shrimp", "From Mobile Bay and the Gulf coast, fried, raw or in gumbo."],
      ["Fried green tomatoes", "Firm unripe tomatoes, cornmeal-coated and fried, tied to Alabama by Fannie Flagg's novel and the 1991 film set in the state."],
      ["Meat-and-three", "One meat, three vegetables, from a steam table. A weekday lunch fixture in Birmingham."],
    ],
    foods: ["bbq", "seafood", "soul-food", "fried-chicken"],
  },
  AK: {
    identity: "Alaska eats what it catches. Wild salmon, halibut and king crab are everyday food rather than luxuries, and reindeer sausage turns up at breakfast. Anchorage, the one Alaska city here, also has a notably diverse food scene for its size, including Korean, Filipino, Hmong and Samoan cooking.",
    known: [
      ["Wild salmon", "King, sockeye and silver, grilled, smoked or in chowder."],
      ["Halibut", "Most often as fish and chips or in tacos."],
      ["King crab", "Bering Sea crab legs, usually steamed with butter."],
      ["Reindeer sausage", "A breakfast and hot dog stand staple."],
    ],
    foods: ["seafood", "fish-and-chips", "filipino-food", "korean-food"],
  },
  AZ: {
    identity: "Arizona's food is Sonoran: the cooking of the desert borderland that spans Arizona and the Mexican state of Sonora, built on beef, flour tortillas the size of a plate and chiles grown nearby. Tucson in particular takes this seriously, and was the first US city named a UNESCO City of Gastronomy.",
    known: [
      ["Sonoran hot dog", "Bacon-wrapped, in a soft bolillo, with beans, onion, tomato, mayonnaise and salsa."],
      ["Chimichanga", "A deep-fried burrito, which both Tucson and Phoenix claim."],
      ["Carne asada and flour tortillas", "Mesquite-grilled beef in huge, thin Sonoran flour tortillas."],
      ["Cheese crisp", "A flour tortilla baked flat with melted cheese. Arizona's own."],
    ],
    foods: ["mexican-food", "tacos", "hot-dogs", "tamales"],
  },
  AR: {
    identity: "Arkansas cooking is Southern and rural, shaped by the Delta in the east and the Ozarks in the northwest. It is catfish, barbecue and rice country — Arkansas grows more rice than any other state — and cheese dip, a fixture of Arkansas's Mexican restaurants, is claimed as an Arkansas invention.",
    known: [
      ["Cheese dip", "Warm, smooth queso with tortilla chips, traced by Arkansans to Hot Springs in the 1930s."],
      ["Fried catfish", "Cornmeal-crusted, with hushpuppies and slaw. Catfish are pond-farmed across the Arkansas Delta."],
      ["Chocolate gravy", "Cocoa gravy over biscuits. A breakfast tradition in the Ozarks."],
      ["Fried pickles", "Battered, deep-fried dill pickle slices, claimed as an invention of Atkins, Arkansas, in the 1960s."],
    ],
    foods: ["bbq", "tex-mex-food", "soul-food", "fried-chicken"],
  },
  CA: {
    identity: "California has several food cultures rather than one. Mexican cooking runs through all of it; Los Angeles has some of the largest Korean, Thai, Armenian and Salvadoran communities outside their home countries; the San Gabriel Valley and the Bay Area have large Chinese communities, and Orange County's Little Saigon and San Jose large Vietnamese ones; and the Central Valley grows a large share of the country's produce.",
    known: [
      ["Mission burrito", "San Francisco's oversized, foil-wrapped burrito with rice and beans inside."],
      ["Fish tacos", "Battered and fried, with cabbage and crema. A Baja California import that San Diego adopted."],
      ["Korean barbecue and Koreatown", "Los Angeles's Koreatown is the centre of the largest Korean community in the US."],
      ["Santa Maria tri-tip", "Beef tri-tip grilled over red oak, from the Central Coast."],
    ],
    foods: ["tacos", "mexican-food", "korean-bbq", "vietnamese-food", "dim-sum"],
  },
  CO: {
    identity: "Colorado's food is Southwestern with a mountain accent. Green chile smothers burritos and burgers here, as it does in New Mexico, and Pueblo grows its own prized variety. Denver adds a large Vietnamese and Mexican food scene, and lamb and trout are local specialities.",
    known: [
      ["Green chile", "A pork and green chile stew, poured over almost anything. Pueblo chiles are the local pride."],
      ["Smothered burrito", "A burrito covered in green chile and cheese, eaten with a fork."],
      ["Rocky Mountain trout", "Rainbow trout, usually pan-fried, a standard on mountain-town menus."],
      ["Colorado lamb", "Colorado is one of the largest sheep-raising states, and many flocks spend summer on high mountain pasture."],
    ],
    foods: ["mexican-food", "burgers", "pho", "breakfast"],
  },
  CT: {
    identity: "Connecticut is known for two foods: the charred, thin-crust apizza of New Haven, and the warm, butter-dressed lobster roll that shares the state's name. The shoreline also means clams in every form.",
    known: [
      ["New Haven apizza", "Coal-fired, thin, charred and chewy. White clam pizza is the local classic."],
      ["Connecticut lobster roll", "Warm lobster in melted butter, in a toasted split-top bun."],
      ["Steamed cheeseburger", "A Meriden-area speciality: the cheese and burger steamed in small trays."],
      ["Clam chowder and fried clams", "From the Long Island Sound shoreline."],
    ],
    foods: ["pizza", "lobster-roll", "seafood", "italian-food"],
  },
  DE: {
    identity: "Delaware's food follows its coastline: blue crabs from the Delaware Bay and the Inland Bays behind the beaches, and the scrapple and chicken-and-dumplings traditions it shares with Maryland and Pennsylvania. The beach towns add boardwalk fries and salt water taffy.",
    known: [
      ["Blue crabs", "Steamed and seasoned, or as crab cakes."],
      ["Scrapple", "Pork and cornmeal loaf, sliced and fried for breakfast."],
      ["Slippery dumplings", "Flat, slick dumplings in chicken broth. A Delaware home-cooking dish."],
      ["Boardwalk fries", "Fresh-cut, with vinegar, on the Rehoboth Beach boardwalk."],
    ],
    foods: ["seafood", "breakfast", "sandwiches", "diner"],
  },
  DC: {
    identity: "Washington's food reflects who lives there: the largest Ethiopian community in the US, a big Salvadoran population, and a long history of Black-owned restaurants along U Street. The half-smoke, a coarse, smoky sausage, is the city's own.",
    known: [
      ["Half-smoke", "A coarse smoked sausage, often half pork and half beef, usually with chili and onions."],
      ["Ethiopian food", "Injera and wat, from one of the country's largest Ethiopian communities."],
      ["Mumbo sauce", "A sweet, tangy red sauce served on wings and fried rice at carryouts."],
      ["Pupusas", "From the region's large Salvadoran community."],
    ],
    foods: ["ethiopian-food", "hot-dogs", "wings", "pupusas"],
  },
  FL: {
    identity: "Florida is several food regions: Cuban and wider Latin American cooking in Miami and Tampa, Southern and Gulf seafood cooking in the Panhandle, and Caribbean food — Haitian and Jamaican in South Florida, Puerto Rican around Orlando. Stone crab, grouper and Key lime pie are the state's own.",
    known: [
      ["Cuban sandwich", "Roast pork, ham, Swiss, pickles and mustard, pressed. Tampa adds salami."],
      ["Stone crab claws", "In season from October to May, served cold with mustard sauce."],
      ["Grouper sandwich", "Fried or blackened, a staple of Florida's Gulf coast."],
      ["Key lime pie", "Tart, made from small Key limes, with a graham crust."],
    ],
    foods: ["cuban-food", "seafood", "caribbean-food", "puerto-rican-food"],
  },
  GA: {
    identity: "Georgia is Southern cooking at its most varied: soul food and lemon pepper wings in Atlanta, Lowcountry seafood around Savannah, and the Mexican, Vietnamese, Chinese and Korean cooking of Buford Highway, the immigrant corridor running northeast from Atlanta.",
    known: [
      ["Lemon pepper wings", "Atlanta's signature wing, often ordered 'wet'."],
      ["Lowcountry boil", "Shrimp, sausage, corn and potatoes boiled together. Coastal Georgia's party food."],
      ["Peaches and peach cobbler", "The state fruit, in dessert form."],
      ["Brunswick stew", "A thick tomato stew of smoked meat and vegetables, served with barbecue. The coastal city of Brunswick claims it, as does Brunswick County, Virginia."],
    ],
    foods: ["wings", "soul-food", "fried-chicken", "korean-food"],
  },
  HI: {
    identity: "Hawaii's everyday food is local food: the plate lunch culture that grew out of the sugar plantations, mixing Native Hawaiian, Japanese, Chinese, Filipino, Korean and Portuguese cooking. Poke has since spread from the islands to the mainland US.",
    known: [
      ["Plate lunch", "Two scoops rice, mac salad and a protein."],
      ["Poke", "Cubed raw fish seasoned with soy, sesame and onion."],
      ["Spam musubi", "Grilled Spam on rice, wrapped in nori."],
      ["Loco moco", "Rice, hamburger patty, fried egg and gravy."],
    ],
    foods: ["hawaiian-food", "poke", "japanese-food", "filipino-food"],
  },
  ID: {
    identity: "Idaho is potato country — it grows about a third of the country's crop — and its food is ranch and mountain cooking: steak, trout from the Snake River, and finger steaks, a battered and fried beef strip that Idaho claims as its own. Boise also has one of the largest Basque communities in the US.",
    known: [
      ["Finger steaks", "Strips of beef, battered and deep-fried, with fry sauce."],
      ["Fry sauce", "Ketchup and mayonnaise, served with fries across Idaho and Utah."],
      ["Basque food", "Chorizo, lamb and croquetas, from Boise's Basque community."],
      ["Idaho trout", "Idaho farms more rainbow trout than any other state, in spring-fed raceways along the Snake River."],
    ],
    foods: ["burgers", "steak", "spanish-food", "breakfast"],
  },
  IL: {
    identity: "Illinois food mostly means Chicago: deep dish and tavern-style pizza, the Italian beef sandwich and the Chicago-style hot dog, alongside one of the largest Mexican communities in the US and a long Polish and Greek tradition. Downstate adds the horseshoe, an open-faced sandwich buried in fries and cheese sauce.",
    known: [
      ["Deep dish and tavern-style pizza", "Chicago's two pizzas, and the argument over which is more Chicago."],
      ["Italian beef", "Thin-sliced roast beef in a jus-soaked roll, with giardiniera or sweet peppers."],
      ["Chicago-style hot dog", "Seven toppings, a poppy seed bun, never ketchup."],
      ["Horseshoe sandwich", "Springfield's open-faced sandwich, covered in fries and cheese sauce."],
    ],
    foods: ["deep-dish-pizza", "hot-dogs", "sandwiches", "mexican-food"],
  },
  IN: {
    identity: "Indiana is Midwestern farm cooking: the breaded pork tenderloin sandwich, pounded out far wider than its bun, is the state's signature, and sugar cream pie is its official one. Indianapolis also has a sizeable Burmese community, which makes it one of the few places in the US to find Chin cooking.",
    known: [
      ["Breaded pork tenderloin", "Pounded thin, breaded, fried and much bigger than the bun."],
      ["Sugar cream pie", "A simple eggless pie of cream and sugar, thickened with flour and dusted with nutmeg. The state pie."],
      ["Fried biscuits and apple butter", "A southern Indiana tradition."],
      ["Persimmon pudding", "A baked pudding of wild persimmon pulp, the autumn dessert of southern Indiana."],
    ],
    foods: ["sandwiches", "steak", "diner", "fried-chicken"],
  },
  IA: {
    identity: "Iowa is corn and pork country, and its food is built on both: the pork tenderloin sandwich, the loose-meat sandwich and sweet corn in summer. Iowa's Dutch, Czech and Scandinavian towns keep their own pastries alive.",
    known: [
      ["Loose-meat sandwich", "Seasoned crumbled ground beef on a bun. Iowa's own."],
      ["Pork tenderloin", "The breaded, oversized sandwich Iowa shares with Indiana."],
      ["Sweet corn", "In season in July and August, sold from truck beds."],
      ["Dutch letters", "S-shaped almond pastries from Pella."],
    ],
    foods: ["sandwiches", "steak", "burgers", "bbq"],
  },
  KS: {
    identity: "Kansas eats beef and wheat, the two farm products it is best known for. Kansas City barbecue spills over the state line, and Wichita has a long-established Lebanese community and a large Vietnamese one. The bierock, a bread pocket of beef and cabbage from Volga German settlers, is the local speciality.",
    known: [
      ["Kansas City barbecue", "Burnt ends and sweet tomato sauce, on both sides of the state line."],
      ["Bierocks", "Yeast bread filled with beef, cabbage and onion."],
      ["Chili and cinnamon rolls", "Served together as a school lunch tradition in Kansas and Nebraska."],
      ["Steak", "Kansas is one of the country's biggest beef producers."],
    ],
    foods: ["bbq", "steak", "pho", "lebanese-food"],
  },
  KY: {
    identity: "Kentucky's food is bourbon country cooking: burgoo and barbecued mutton in the west, and the Hot Brown — an open-faced turkey sandwich under Mornay sauce — in Louisville.",
    known: [
      ["Hot Brown", "Turkey and bacon on toast, covered in Mornay sauce and broiled. Louisville's own."],
      ["Burgoo", "A thick stew of several meats and vegetables, cooked in huge batches."],
      ["Barbecued mutton", "Western Kentucky's speciality, with a black Worcestershire dip."],
      ["Benedictine", "Louisville's cucumber and cream cheese spread, served on sandwiches."],
    ],
    foods: ["fried-chicken", "bbq", "sandwiches", "soul-food"],
  },
  LA: {
    identity: "Louisiana has a food culture of its own: Creole cooking in New Orleans, Cajun cooking in the bayou country to the west, and crawfish boils every spring. Rice and the trinity of onion, celery and green pepper sit under much of it, and many dishes start with a dark roux.",
    known: [
      ["Gumbo", "Dark roux, the trinity, and seafood or chicken and andouille, over rice."],
      ["Crawfish boil", "In season from roughly January to June, eaten by the pound."],
      ["Po'boy", "Fried shrimp, oysters or roast beef on crisp New Orleans French bread."],
      ["Boudin", "Pork and rice sausage, a Cajun country snack."],
    ],
    foods: ["cajun-food", "seafood-boil", "oysters", "sandwiches"],
  },
  ME: {
    identity: "Maine is lobster country — it lands most of the US lobster catch — and its food is built on the cold Atlantic: lobster rolls served cold with mayonnaise, steamed clams, and chowder. Wild blueberries, which Maine grows more of than any other state, end the meal.",
    known: [
      ["Maine lobster roll", "Cold lobster, a little mayonnaise, in a toasted split-top bun."],
      ["Steamers", "Soft-shell clams, steamed and dipped in broth and butter."],
      ["Whoopie pies", "Two soft chocolate cakes around a cream filling. The official state treat."],
      ["Wild blueberry pie", "Made with the small, intense wild Maine berry."],
    ],
    foods: ["lobster-roll", "seafood", "oysters", "bakery"],
  },
  MD: {
    identity: "Maryland's food revolves around the Chesapeake Bay blue crab: steamed under a crust of peppery crab seasoning, picked into crab cakes, or in a spicy vegetable crab soup. Baltimore adds pit beef, a charcoal-grilled top round sliced thin and served with horseradish.",
    known: [
      ["Steamed blue crabs", "Crusted in peppery crab seasoning, picked by hand on newspaper."],
      ["Maryland crab cake", "Mostly lump crab, very little filler, broiled or fried."],
      ["Pit beef", "Baltimore's charcoal-grilled, rare-sliced beef sandwich."],
      ["Smith Island cake", "Many thin layers of yellow cake and fudge frosting. The state dessert."],
    ],
    foods: ["seafood", "seafood-boil", "sandwiches", "bbq"],
  },
  MA: {
    identity: "Massachusetts eats New England seafood — clam chowder, fried clams, scallops, lobster — alongside a deep Italian tradition in Boston's North End and a Portuguese one on the South Coast. Roast beef sandwiches on the North Shore are their own quiet institution.",
    known: [
      ["New England clam chowder", "Cream, clams, potatoes, salt pork. Never tomato."],
      ["Fried clams", "Whole-belly clams, fried, on the North Shore."],
      ["North Shore roast beef", "Rare roast beef on an onion roll with sauce, cheese and mayonnaise."],
      ["Portuguese food", "Linguiça, kale soup and malasadas in Fall River and New Bedford."],
    ],
    foods: ["seafood", "lobster-roll", "oysters", "italian-food"],
  },
  MI: {
    identity: "Michigan's food is Great Lakes and industrial Midwest: Detroit-style square pizza with crisp, cheesy edges, the Coney dog, and the pasty the Upper Peninsula inherited from Cornish miners. Dearborn has one of the largest Arab American communities in the country, and the Lebanese and Yemeni cooking to go with it.",
    known: [
      ["Detroit-style pizza", "Baked in a steel pan, with cheese to the edges and sauce on top."],
      ["Coney dog", "The Detroit version: a hot dog with beanless meat chili, yellow mustard and chopped onion."],
      ["Pasty", "A meat and root vegetable pastry from the Upper Peninsula."],
      ["Lebanese and Yemeni food", "Especially in Dearborn."],
    ],
    foods: ["pizza", "hot-dogs", "lebanese-food", "yemeni-food"],
  },
  MN: {
    identity: "Minnesota's food is Scandinavian and German farm cooking — hotdish, wild rice, walleye — with a newer layer from large Hmong, Somali and Vietnamese communities in the Twin Cities. The Juicy Lucy, a burger with the cheese sealed inside, is the local argument: two Minneapolis bars claim it, and one spells it Jucy.",
    known: [
      ["Juicy Lucy", "A cheeseburger with the cheese sealed inside the patty."],
      ["Walleye", "The state fish, pan-fried or in a sandwich."],
      ["Hotdish", "A baked casserole, often topped with tater tots."],
      ["Wild rice soup", "Creamy, with native wild rice."],
    ],
    foods: ["burgers", "seafood", "vietnamese-food", "soup"],
  },
  MS: {
    identity: "Mississippi is the Delta and the Gulf: farm-raised catfish, of which Mississippi grows more than any other state, Delta hot tamales simmered in spicy broth, and Gulf shrimp and oysters on the coast around Biloxi.",
    known: [
      ["Fried catfish", "Cornmeal-crusted, from the farms of the Delta."],
      ["Delta hot tamales", "Smaller than Mexican tamales, simmered in a spicy broth."],
      ["Gulf shrimp and oysters", "From the coast around Biloxi and Gulfport."],
      ["Comeback sauce", "A spicy mayonnaise-chili sauce from Jackson, for dipping everything."],
    ],
    foods: ["soul-food", "tamales", "seafood", "bbq"],
  },
  MO: {
    identity: "Missouri has two barbecue cities with different ideas: Kansas City, with burnt ends and a thick, sweet sauce, and St. Louis, with grilled pork steaks and St. Louis-cut spare ribs. St. Louis also has a cracker-thin pizza topped with Provel cheese. Toasted ravioli and gooey butter cake are St. Louis's own.",
    known: [
      ["Burnt ends", "The crisp, fatty point of a smoked brisket, cubed. Kansas City's pride."],
      ["St. Louis-style pizza", "Cracker-thin crust, Provel cheese, cut in squares."],
      ["Toasted ravioli", "Breaded and fried ravioli with marinara. A St. Louis starter."],
      ["Gooey butter cake", "A dense, sticky cake from St. Louis bakeries."],
    ],
    foods: ["bbq", "pizza", "italian-food", "bakery"],
  },
  MT: {
    identity: "Montana eats like ranch country: steak, bison and huckleberries, with pasties in the old mining town of Butte.",
    known: [
      ["Bison", "As burgers and steaks, leaner than beef."],
      ["Huckleberries", "Wild berries in pie, ice cream and jam."],
      ["Butte pasty", "A meat and potato pastry brought by Cornish miners."],
      ["Pork chop sandwich", "A Butte speciality, a battered pork patty on a bun."],
    ],
    foods: ["steak", "burgers", "diner", "breakfast"],
  },
  NE: {
    identity: "Nebraska is beef country, and Omaha has a steakhouse tradition to match. The runza — Nebraska's name for the Volga German bread pocket of beef, cabbage and onion — is the state's signature, and the Reuben sandwich is one of Omaha's claims to food history.",
    known: [
      ["Bierock", "A yeast bread pocket of beef, cabbage and onion."],
      ["Steak", "Nebraska corn-fed beef, served in Omaha's long-established steakhouses."],
      ["Reuben", "Corned beef, Swiss, sauerkraut and Russian dressing on rye. Omaha claims it."],
      ["Chili and cinnamon rolls", "A school-lunch pairing found across Nebraska and its Plains neighbours."],
    ],
    foods: ["steak", "sandwiches", "burgers", "bbq"],
  },
  NV: {
    identity: "Nevada's food is mostly Las Vegas: casino steakhouses and buffets on the Strip, and a large Asian district along Spring Mountain Road. Northern Nevada keeps a Basque tradition of family-style dinners from its sheepherding days.",
    known: [
      ["Las Vegas buffets", "The format the city made famous."],
      ["Steakhouses", "A fixture of the Strip's casino resorts."],
      ["Chinatown on Spring Mountain", "Ramen, hot pot, Korean and Thai, just west of the Strip."],
      ["Basque family-style dinners", "Northern Nevada's boarding-house tradition."],
    ],
    foods: ["buffet", "steak", "ramen", "korean-food"],
  },
  NH: {
    identity: "New Hampshire's food is small-town New England: fried clams and seafood from the shortest ocean coastline of any coastal state, maple syrup in the spring and orchard apples in the autumn.",
    known: [
      ["Fried clams and seafood shacks", "On the state's short coast, from Hampton Beach to Portsmouth."],
      ["Maple syrup", "Tapped each spring from the state's sugar maples."],
      ["Apple cider doughnuts", "From orchards in the autumn."],
      ["Boiled dinner", "Corned beef or ham with root vegetables, a New England staple."],
    ],
    foods: ["seafood", "diner", "donuts", "lobster-roll"],
  },
  NJ: {
    identity: "New Jersey is sandwiches, diners and pizza: it is often called the diner capital of the world, the pork roll sandwich is its own, and boardwalk pizza and tomato pie run from Trenton to the shore. It has large Indian, Korean and Latin American communities, from Oak Tree Road in Edison to Palisades Park and Union City.",
    known: [
      ["Pork roll, egg and cheese", "On a hard roll. Pork roll was first made in Trenton in the 19th century."],
      ["Diners", "Hundreds of them, in the state where many of America's prefabricated diners were built."],
      ["Tomato pie", "A Trenton-area pizza with sauce on top of the cheese."],
      ["Disco fries", "Fries under brown gravy and melted mozzarella, a late-night New Jersey diner order."],
    ],
    foods: ["diner", "pizza", "sandwiches", "indian-food"],
  },
  NM: {
    identity: "New Mexico's food is built on its own chile, grown in the Hatch Valley and elsewhere along the Rio Grande: red or green, asked at almost every restaurant as the state question. Its food is Hispanic and Pueblo cooking that predates the US border, and it is not the same as Tex-Mex or Mexican.",
    known: [
      ["Green chile", "Roasted in late summer and autumn and put on everything from stew to cheeseburgers."],
      ["Red or green?", "The state question. Answer 'Christmas' for both."],
      ["Sopaipillas", "Puffed fried bread, eaten with honey."],
      ["Blue corn enchiladas", "Stacked flat rather than rolled, often with an egg on top."],
    ],
    foods: ["mexican-food", "burgers", "tamales", "breakfast"],
  },
  NY: {
    identity: "New York State's food is shaped by New York City's immigrant neighbourhoods, but upstate has its own: Buffalo wings, beef on weck, Rochester's late-night plates and the salt potatoes of Syracuse. New York City adds the bagel and the thin, foldable pizza slice.",
    known: [
      ["Buffalo wings", "Fried, tossed in hot sauce and butter, with blue cheese and celery."],
      ["Bagels", "The New York City style: boiled then baked, chewy and dense."],
      ["Beef on weck", "Roast beef on a salt and caraway kummelweck roll. Buffalo's other sandwich."],
      ["Rochester plate", "A late-night pile of hot dogs or burgers over home fries and macaroni salad, topped with a spiced meat sauce."],
    ],
    foods: ["pizza", "bagels", "wings", "deli"],
  },
  NC: {
    identity: "North Carolina is split by barbecue: whole hog with a thin vinegar sauce in the east, pork shoulder with a touch of tomato in the Piedmont around Lexington. Biscuits, fried chicken and seafood on the Outer Banks fill in the rest.",
    known: [
      ["Eastern barbecue", "Whole hog, chopped, with vinegar and red pepper sauce."],
      ["Lexington barbecue", "Pork shoulder with a vinegar sauce touched with tomato, and red slaw."],
      ["Biscuits", "Buttermilk biscuits, often with fried chicken or, in the west of the state, fried livermush."],
      ["Calabash seafood", "Lightly battered, fried seafood from the southern coast."],
    ],
    foods: ["bbq", "fried-chicken", "breakfast", "seafood"],
  },
  ND: {
    identity: "North Dakota's food is German-Russian and Scandinavian prairie cooking: knoephla soup, fleischkuechle and lefse, with bison and walleye as the local proteins.",
    known: [
      ["Knoephla soup", "A creamy chicken and dumpling soup."],
      ["Fleischkuechle", "Meat-filled fried dough from German-Russian settlers."],
      ["Lefse", "A soft Norwegian potato flatbread."],
      ["Walleye", "Pan-fried, from Devils Lake, Lake Sakakawea and the state's other lakes."],
    ],
    foods: ["soup", "steak", "diner", "breakfast"],
  },
  OH: {
    identity: "Ohio has three food cities with their own habits: Cincinnati's cinnamon-spiced chili, invented by Greek and Macedonian immigrants and served over spaghetti, Cleveland's Polish and Eastern European cooking, and Columbus with its square-cut, thin-crust pizza. Buckeyes, the peanut butter and chocolate sweets, are the state's own.",
    known: [
      ["Cincinnati chili", "Cinnamon-spiced meat sauce over spaghetti, ordered by 'ways'."],
      ["Pierogies and the Polish Boy", "Cleveland's Eastern European cooking, and its kielbasa sandwich piled with fries, slaw and barbecue sauce."],
      ["Columbus-style pizza", "Thin crust, toppings to the edge, cut in squares."],
      ["Buckeyes", "Peanut butter fudge balls dipped in chocolate."],
    ],
    foods: ["pizza", "polish-food", "hot-dogs", "sandwiches"],
  },
  OK: {
    identity: "Oklahoma's food is where the South meets the Plains: chicken-fried steak, smoked meats and fried onion burgers from the Route 66 towns. Oklahoma City also has a long-established Vietnamese community, centred on its Asian District along Classen Boulevard.",
    known: [
      ["Fried onion burger", "Onions smashed into the patty on the griddle. From El Reno."],
      ["Chicken-fried steak", "Part of the official state meal, with cream gravy."],
      ["Barbecue", "Smoked brisket, ribs and bologna."],
      ["Pho", "From Oklahoma City's large Vietnamese community."],
    ],
    foods: ["burgers", "bbq", "pho", "steak"],
  },
  OR: {
    identity: "Oregon eats from the Pacific Northwest: Dungeness crab and salmon from the coast, marionberries and hazelnuts from the Willamette Valley, and Portland's food carts, parked together in pods on city lots.",
    known: [
      ["Dungeness crab", "From the Oregon coast, steamed or in cakes."],
      ["Marionberry pie", "An Oregon blackberry, in pie and jam."],
      ["Food carts", "Portland's pods of trailers, serving almost every cuisine."],
      ["Chinook salmon", "The state fish, from the Columbia River and the coast, grilled or smoked."],
    ],
    foods: ["seafood", "thai-food", "brunch", "vietnamese-food"],
  },
  PA: {
    identity: "Pennsylvania's food is Philadelphia's cheesesteak, roast pork and soft pretzels in the east, Pittsburgh's pierogies and sandwiches stuffed with fries in the west, and Pennsylvania Dutch farm cooking in between: scrapple, shoofly pie and chicken pot pie made with square noodles.",
    known: [
      ["Philly cheesesteak", "Thin-sliced ribeye, cheese and onions on a long roll."],
      ["Roast pork sandwich", "With broccoli rabe and provolone. Philadelphia's other signature sandwich."],
      ["Pierogies", "Potato and cheese dumplings from Pittsburgh's Eastern European communities."],
      ["Shoofly pie", "A molasses pie from Pennsylvania Dutch country."],
    ],
    foods: ["cheesesteak", "sandwiches", "polish-food", "italian-food"],
  },
  RI: {
    identity: "Rhode Island has a food vocabulary all its own: clear-broth chowder, fried calamari with hot peppers, stuffies, coffee milk and New York System wieners. Providence also has a strong Italian tradition on Federal Hill, and Fox Point was long the centre of its Portuguese and Cape Verdean community.",
    known: [
      ["Fried calamari", "With banana peppers and garlic. The official state appetizer."],
      ["Stuffies", "Quahog clams stuffed with bread crumbs and often chouriço."],
      ["New York System wieners", "Small hot dogs with meat sauce, mustard, onion and celery salt."],
      ["Clear clam chowder", "Rhode Island style, no cream and no tomato."],
    ],
    foods: ["seafood", "hot-dogs", "italian-food", "pizza"],
  },
  SC: {
    identity: "South Carolina's food is Lowcountry cooking around Charleston, rooted in the Gullah Geechee culture of the coastal sea islands: shrimp and grits, she-crab soup, red rice and Frogmore stew. Inland, barbecue sauce changes by region, and the mustard sauce of the Midlands is found almost nowhere else.",
    known: [
      ["Shrimp and grits", "Creamy stone-ground grits with shrimp, often with gravy and sausage."],
      ["Mustard barbecue", "Pulled pork with a tangy yellow 'Carolina Gold' sauce."],
      ["She-crab soup", "A rich crab and cream soup, finished with sherry."],
      ["Frogmore stew", "A Lowcountry boil of shrimp, sausage, corn and potatoes."],
    ],
    foods: ["seafood", "bbq", "soul-food", "seafood-boil"],
  },
  SD: {
    identity: "South Dakota's food is plains cooking: chislic, cubes of grilled or fried meat on skewers, is its official nosh, and kuchen, a custard fruit pastry from German-Russian settlers, is its state dessert. Bison and pheasant are the local proteins.",
    known: [
      ["Chislic", "Cubes of lamb or beef, fried or grilled, on toothpicks."],
      ["Kuchen", "A German pastry of custard and fruit on a sweet dough."],
      ["Bison", "As steaks and burgers, from ranches and tribal herds across the state."],
      ["Indian tacos", "Fry bread, the official state bread, topped with chili and fixings. A powwow staple across the state."],
    ],
    foods: ["steak", "burgers", "bbq", "diner"],
  },
  TN: {
    identity: "Tennessee has two famous food cities and they are nothing alike: Memphis, a barbecue town known for dry-rubbed ribs and pulled pork, and Nashville, the home of hot chicken. Meat-and-three lunch counters and Southern breakfasts connect the two.",
    known: [
      ["Nashville hot chicken", "Fried chicken painted with cayenne paste, on white bread with pickles."],
      ["Memphis dry ribs", "Pork ribs with a dry spice rub, no sauce."],
      ["Barbecue spaghetti", "Spaghetti in barbecue sauce with pulled pork. A Memphis oddity."],
      ["Meat-and-three", "Nashville's steam-table lunch tradition."],
    ],
    foods: ["hot-chicken", "bbq", "soul-food", "fried-chicken"],
  },
  TX: {
    identity: "Texas has at least three distinct food traditions: Central Texas brisket smoked over post oak, Tex-Mex from San Antonio to the Rio Grande Valley, and Gulf coast seafood and Cajun-influenced cooking around Houston. Houston, one of the most ethnically diverse cities in the country, also has a large Vietnamese community and is known for the Viet-Cajun crawfish boil.",
    known: [
      ["Central Texas brisket", "Salt, pepper, post oak smoke, sliced to order."],
      ["Tex-Mex", "Enchiladas in chili gravy, fajitas, queso and puffy tacos."],
      ["Breakfast tacos", "Flour tortillas with egg, potato and bacon or chorizo."],
      ["Viet-Cajun crawfish", "Crawfish boiled and tossed in garlic butter, a Houston speciality."],
    ],
    foods: ["bbq", "tex-mex-food", "tacos", "seafood-boil"],
  },
  UT: {
    identity: "Utah's food runs to fry sauce and fried scones, with a sizeable Pacific Islander community — Tongan and Samoan — adding its own cooking to Salt Lake. Funeral potatoes, a cheesy baked casserole, are the state's own comfort dish.",
    known: [
      ["Fry sauce", "Ketchup and mayonnaise, with fries and burgers."],
      ["Utah scones", "Fried dough served with honey butter, not the British kind."],
      ["Funeral potatoes", "A baked casserole of potatoes, cheese and cornflakes."],
      ["Pastrami burger", "A burger topped with pastrami, a Salt Lake City fixture."],
    ],
    foods: ["burgers", "breakfast", "diner", "hawaiian-food"],
  },
  VT: {
    identity: "Vermont is dairy and maple country: sharp cheddar and maple syrup from the sugarhouses each spring.",
    known: [
      ["Maple syrup", "Vermont makes more than any other state."],
      ["Vermont cheddar", "Sharp, aged, often served with apple pie."],
      ["Sugar on snow", "Hot maple syrup poured on snow, a spring tradition."],
      ["Maple creemee", "Vermont's word for soft-serve, often maple-flavoured."],
    ],
    foods: ["breakfast", "bakery", "donuts", "burgers"],
  },
  VA: {
    identity: "Virginia's food is Chesapeake seafood and Southern tradition: country ham from Smithfield, oysters from the bay, and peanut soup. Northern Virginia has large Korean, Vietnamese, Salvadoran and Ethiopian communities, with a Koreatown in Annandale and a Vietnamese one in Falls Church.",
    known: [
      ["Virginia country ham", "Salt-cured and aged, served thin on biscuits."],
      ["Chesapeake oysters", "Raw, roasted or fried."],
      ["Peanut soup", "A creamy soup with West African roots, long a Virginia tradition."],
      ["Brunswick stew", "Virginia also claims this one."],
    ],
    foods: ["seafood", "oysters", "korean-food", "pupusas"],
  },
  WA: {
    identity: "Washington eats from Puget Sound and the Pacific: salmon, Dungeness crab, oysters and geoduck, alongside a strong Japanese, Vietnamese and Chinese food culture. The teriyaki shop is Seattle's own everyday takeout, and Washington grows more apples than any other state, most of them east of the Cascades.",
    known: [
      ["Salmon", "Wild, often cedar-plank grilled or smoked."],
      ["Oysters", "From Puget Sound and Willapa Bay, including the small native Olympia oyster."],
      ["Seattle teriyaki", "Grilled chicken with a sweet glaze and rice, from small shops across the Seattle area."],
      ["Seattle dog", "A hot dog with cream cheese and grilled onions."],
    ],
    foods: ["seafood", "oysters", "pho", "sushi"],
  },
  WV: {
    identity: "West Virginia's food is Appalachian: the pepperoni roll, invented as a lunch for coal miners, is the state's signature, alongside buckwheat cakes, ramps in spring, and hot dogs topped with chili and coleslaw.",
    known: [
      ["Pepperoni roll", "Soft bread baked around pepperoni. A miner's lunch."],
      ["Slaw dog", "A hot dog with chili and coleslaw."],
      ["Ramps", "Wild leeks, foraged each spring."],
      ["Buckwheat cakes", "Buckwheat pancakes, a Preston County tradition with a long-running autumn festival in Kingwood."],
    ],
    foods: ["hot-dogs", "breakfast", "diner", "soul-food"],
  },
  WI: {
    identity: "Wisconsin's food draws on German and Scandinavian heritage and the supper club: the Friday fish fry, brandy old fashioneds, bratwurst, cheese curds and the butter burger. Milwaukee's German beer halls and the Dane County Farmers' Market on Madison's Capitol Square are long-standing food institutions.",
    known: [
      ["Friday fish fry", "Beer-battered cod, perch or walleye, with rye bread and coleslaw."],
      ["Cheese curds", "Fresh ones squeak. They are also eaten battered and deep-fried."],
      ["Butter burger", "A burger with butter on the bun, sometimes in the patty."],
      ["Supper clubs", "Relish trays, prime rib and an old fashioned."],
    ],
    foods: ["fish-and-chips", "burgers", "german-food", "steak"],
  },
  WY: {
    identity: "Wyoming, the least populous state, is ranch country and eats like it: steak, bison, elk and trout. Green chile from Colorado and chicken-fried steak from the southern Plains both turn up on menus.",
    known: [
      ["Steak and bison", "Beef from the state's ranches, and bison, the state mammal."],
      ["Rocky Mountain oysters", "Fried bull calf testicles. A ranch tradition."],
      ["Trout", "Cutthroat, the state fish, and other trout from its rivers, pan-fried."],
      ["Chicken-fried steak", "With cream gravy, at diners across the state."],
    ],
    foods: ["steak", "burgers", "diner", "breakfast"],
  },
};
