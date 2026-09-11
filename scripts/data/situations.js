/* Content for the /what-to-eat/<situation> pages.
 *
 * WHY THIS FILE IS PROSE AND NOT A TEMPLATE
 * The city pages vary by data. These cannot — there is no dataset of "what to
 * eat when you're hungover". So the only thing that makes thirty of these pages
 * thirty pages instead of one page printed thirty times is that somebody
 * actually wrote them. Every `why`, `look` and `avoid` below is specific to its
 * situation and would read as nonsense pasted under any other one. That is the
 * test applied to each entry, and the reason this file is long.
 *
 * NO MEDICAL CLAIMS. Several of these touch illness, drinking and grief. The
 * copy stays on food and never tells anyone what will fix them — partly because
 * we are not qualified to, and partly because a restaurant picker dispensing
 * health advice is exactly the kind of page that deserves to be buried.
 *
 * `query` is a literal string that works in the app. It is the point of the
 * page: the reader arrives with a vague feeling and leaves with a search.
 */

module.exports = [
  {
    s: "hungover",
    h1: "What to eat when you're hungover",
    title: "What to Eat When You're Hungover — And Where to Get It",
    desc:
      "Grease, salt, soup or eggs? What actually works when you're hungover, why the classic advice is half wrong, and how to find the place near you that's still serving it.",
    lede:
      "A hangover does not make you hungry so much as it makes you suggestible. Anything anyone names out loud starts to sound correct, which is why the group chat produces eleven ideas and nobody moves for an hour.",
    why: [
      "The received wisdom is that you want grease. Sometimes you do. But the more reliable pattern is that you want three things at once — salt, liquid and something warm — and the reason a bacon sandwich has a reputation is that it delivers two of them while a bowl of pho delivers all three.",
      "The other constraint nobody mentions is effort. Hungover you will not park in a structure, will not wait forty minutes, and will abandon the plan entirely if the first place has a queue down the block. The best hangover restaurant is not the best restaurant. It is the good-enough one that is close, open, and fast.",
    ],
    look: {
      intro: "What separates a good hangover meal from a bad one:",
      items: [
        ["Broth, or something that drinks like it", "Pho, ramen, congee, menudo, tortilla soup, matzo ball soup. Hot salty liquid is the single most reliable category, and every food culture has a version of it for exactly this reason."],
        ["Salt you can taste", "Under-seasoned food is genuinely unpleasant in this state. A place known for being delicate is the wrong call today."],
        ["Egg availability", "Not because eggs are magic, but because a kitchen that will put a fried egg on anything gives you a way to make a dish heavier without ordering a second one."],
        ["Open now, close by, no wait", "Weight this far higher than you normally would. A 4.7 twenty-five minutes away loses to a 4.2 that is four minutes away."],
        ["Refills", "Somewhere that keeps filling the glass without being asked is worth more this morning than the food is."],
      ],
    },
    query: "hot salty soup, close by, open now",
    avoid:
      "The two classic errors are ordering for the person you were last night — a giant plate you will look at once and push away — and going somewhere fashionable, where brunch means a ninety-minute wait in direct sunlight. Also: anything that arrives on a wooden board.",
    group:
      "Hungover groups are the worst decision-makers alive, because everyone is agreeable and nobody is willing to be the one who picks. This is the single best use of a Savor Scout room — share a link, everyone taps what they would eat, and it is settled in ninety seconds without anyone having to form an opinion out loud.",
    dishes: ["pho", "ramen", "breakfast", "tacos", "burgers"],
    related: ["late-night", "nothing-sounds-good", "cant-decide"],
  },

  {
    s: "nothing-sounds-good",
    h1: "What to eat when nothing sounds good",
    title: "What to Eat When Nothing Sounds Good | Savor Scout",
    desc:
      "You're hungry but every option sounds wrong. Why that happens, and a way out of it that isn't scrolling delivery apps for forty minutes.",
    lede:
      "This is a different problem from not being hungry. You are hungry. You have opened three apps. Everything you see is either too heavy, too boring, or something you had recently, and the longer you look the worse it gets.",
    why: [
      "What is usually happening is that you are trying to choose a restaurant when you have not yet chosen a sensation. Menus are organised by cuisine, which is useless information when your actual preference is something like “warm but not heavy” or “sour and cold”. You are scrolling a list sorted by the wrong axis.",
      "The second thing going on is decision fatigue. Every option you reject makes the next one harder to accept, because you have now built a standard out of the rejections. Twenty minutes in, you are no longer looking for food you want — you are looking for food that can survive the case you have been building against everything.",
      "The way out is to stop choosing a restaurant and choose one property instead. Not a cuisine. A texture, a temperature, or a strength of flavour. Almost everyone can answer “do you want something sharp or something mild” even when they cannot answer “what do you want to eat”.",
    ],
    look: {
      intro: "Pick whichever of these you can answer, and let it decide:",
      items: [
        ["Temperature first", "Do you want something hot or something cold? If nothing hot appeals, that is real information and it rules out most of what you were scrolling."],
        ["Sharp, or soft", "Something acidic and bright — a ceviche, a papaya salad, a bowl of pickles and rice — or something mild and starchy. These fail in opposite directions, so knowing which one you are avoiding is worth more than any recommendation."],
        ["Something you eat with your hands", "Cutlery makes a meal feel like an obligation. It is a small thing and it works more often than it should."],
        ["A single strong flavour", "When everything tastes like nothing, one loud thing — chilli, lemon, garlic, vinegar, fish sauce — beats a balanced plate you will not finish."],
        ["Small, not large", "The size of the portion is frequently what you are flinching from. A plate of snacks is a legitimate dinner and solves this more often than a main course does."],
      ],
    },
    query: "something light and sharp, small plates, not heavy",
    avoid:
      "Do not keep scrolling. Past about ten minutes the scroll is the problem, not the shortlist. And do not default to the safe order you always place — the reason nothing sounds good is often that you have eaten that exact thing four times this month.",
    dishes: ["salad", "dumplings", "pho", "sushi", "soup"],
    related: ["cant-decide", "stressed", "sad"],
  },

  {
    s: "cant-decide",
    h1: "What to do when you can't decide where to eat",
    title: "Can't Decide Where to Eat? Here's How to Actually Settle It",
    desc:
      "Why picking a restaurant is genuinely hard, why lists and star ratings make it worse, and three methods that end the argument — including one that takes ninety seconds.",
    lede:
      "Nobody is short of restaurants. The problem is that every tool built for this hands you thirty options ranked by a number that has almost nothing to do with whether you personally want to eat there tonight.",
    why: [
      "A star rating is an average of strangers' experiences across every possible reason for visiting. A 4.6 taqueria and a 4.6 steakhouse are not comparable, and neither number tells you which one is right for a Tuesday when you are tired and want something sour. The rating is real. It is just answering a different question than the one you have.",
      "The deeper issue is that the list format shifts the work onto you at the exact moment you have the least appetite for work. Choosing between thirty things is harder than choosing between two, and dramatically harder than being handed one and asked whether it is wrong. This is why “where do you want to go” produces silence and “is Thai okay” produces an answer in two seconds.",
      "So the reliable methods all do the same thing: they shrink the field before you engage with it, rather than after.",
    ],
    look: {
      intro: "Three methods, roughly in order of how well they work:",
      items: [
        ["Name the sensation, not the cuisine", "“Something crispy and spicy” narrows the field faster than “Asian food” and is easier to answer honestly. A cuisine is a category; a craving is a constraint."],
        ["Let something else make the first cut", "The point of a picker is not that a machine has better taste than you. It is that reacting to one concrete suggestion is a much easier task than generating one from nothing — and if it is wrong, you will know instantly and know why."],
        ["Veto instead of vote, in a group", "Asking five people to name a restaurant produces five answers and no decision. Asking five people to remove the one thing they would not eat produces a shortlist in one round."],
      ],
    },
    query: "something crispy and spicy, nearby",
    avoid:
      "Do not open a second app. The problem was never insufficient options. And do not put it to an open vote in a group chat — an open vote is how you get four suggestions and a ninety-minute thread.",
    group:
      "Savor Scout's group rooms are built around the veto rather than the vote, because the veto is the move that carries information. Share a link, everyone taps yes on anything they would eat, and each person gets exactly one veto to strike an option for the whole table. When two options are left the vetoes stop and the votes decide. Nobody installs anything and it takes about ninety seconds.",
    dishes: ["tacos", "pizza", "ramen", "burgers"],
    related: ["nothing-sounds-good", "big-group", "with-picky-eaters"],
  },

  {
    s: "first-date",
    h1: "Where to eat on a first date",
    title: "Best Restaurants for a First Date — What to Actually Look For",
    desc:
      "The specific things that make a restaurant good or bad for a first date — noise, lighting, exit speed, and the menu trap most people walk into.",
    lede:
      "A first date restaurant has one job that has almost nothing to do with the food: it has to make a conversation between two strangers easier than it would otherwise be. Most highly rated restaurants are actively bad at this.",
    why: [
      "The three things that sink a first date are all environmental. Too loud and you spend the evening saying “sorry, what?”, which is its own small humiliation repeated forty times. Too quiet and every pause is audible to the table next to you. Too formal and you have committed two hours and a significant bill to someone you have known for eleven minutes.",
      "That last one is the real trap. A tasting menu on a first date is a hostage situation with better plating. What you want is a room you can leave in forty minutes if it is going badly, and stay in for three hours if it is going well — and the ability to do either without it being a statement.",
      "The menu matters less than people think, with one exception: it should not require concentration. Anything that needs to be assembled, cracked, deboned, or eaten with both hands is asking you to look down at the moment you should be looking up.",
    ],
    look: {
      intro: "What to actually weight:",
      items: [
        ["Noise you can talk over, not through", "Some background sound is good — silence puts the whole burden of the evening on the two of you. What you want is a room at conversation volume, not a room with a DJ."],
        ["Lighting that is warm and not dark", "Dark reads as trying too hard. Fluorescent reads as a canteen. Warm and slightly low is the whole target."],
        ["A menu with a cheap option and an expensive one", "So that neither person's order is a statement about money. A menu where everything costs the same forces a conversation nobody wants to have on a first date."],
        ["Bar seating, or a table you can leave", "An open-ended format. Drinks-and-snacks that can become dinner is a far better structure than dinner that cannot become anything else."],
        ["Somewhere to go afterwards, within walking distance", "The single most useful property. If it is going well you need a next move that does not involve getting into separate cars."],
      ],
    },
    query: "somewhere quiet enough to talk, mid-priced, good for a date",
    avoid:
      "Sushi counters where the chef talks to you the whole time, anywhere with a fixed menu, anywhere with a two-hour table limit, ribs, whole fish, and your regular spot where the staff know you — being greeted by name is charming to you and unsettling to a stranger.",
    dishes: ["italian-food", "mediterranean-food", "sushi", "steak"],
    related: ["meeting-the-parents", "birthday-dinner", "celebrating"],
  },

  {
    s: "with-picky-eaters",
    h1: "Where to eat with picky eaters",
    title: "Where to Eat With Picky Eaters — Restaurants That Actually Work",
    desc:
      "How to pick a restaurant when someone in the group won't eat most of the menu, without defaulting to chain food every single time.",
    lede:
      "The usual solution is to give up and go somewhere with a menu so broad it is good at nothing. That works, in the sense that everyone eats, and it is also why the same group has been to the same three places for two years.",
    why: [
      "It helps enormously to know which kind of picky you are dealing with, because they need opposite solutions. Texture-averse eaters can usually handle bold flavours as long as nothing is slimy, mushy, or unexpectedly cold. Flavour-averse eaters want mild, and will eat almost any texture. Novelty-averse eaters are fine with both and simply will not order something they cannot picture.",
      "Once you know which one it is, the target changes. For a novelty-averse eater, a specialised restaurant with one recognisable dish is much better than a broad menu — a ramen shop has exactly one thing on it and that thing is noodles in soup, which is picturable. For a texture-averse eater, a grill is safer than a curry house, regardless of how broad either menu is.",
      "The move that almost always works, across all three: somewhere that cooks one protein well and lets you choose the surroundings. Grilled meat and rice, a taqueria, a rotisserie, a pizza place with plain on the menu. Plainness available on request beats plainness as the house style.",
    ],
    look: {
      intro: "What to look for:",
      items: [
        ["A plain version of the house dish", "Not a kids' menu. A place where the signature thing can be ordered without the sauce is far more use than a place with chicken fingers in a corner of the menu."],
        ["Build-your-own anything", "Burritos, poke, pizza, grain bowls, banh mi. The picky eater constructs something safe and everyone else constructs something interesting, from the same kitchen."],
        ["Sides that are a meal", "Somewhere with genuinely good bread, rice, fries or grilled vegetables gives a fallback that is not humiliating to order."],
        ["Sauce on the side as a normal request", "A kitchen that is relaxed about modifications is worth more than a kitchen with a wider menu. Reviews mentioning accommodating staff are a real signal here."],
        ["One dish everyone has heard of", "Not because it is the best thing there, but because its presence lowers the stakes enough for everyone else to order adventurously."],
      ],
    },
    query: "grilled meat and rice, simple menu, sauces on the side",
    avoid:
      "Tasting menus, shared-plates-only restaurants, and anywhere the entire menu is one strong flavour profile. Also avoid making it a discussion at the table — deciding in advance is a kindness to the picky eater, who generally knows they are the constraint and does not enjoy it.",
    group:
      "If the group is big enough that there is more than one picky eater, stop negotiating and use a room. Each person gets a veto, which lets someone remove the place they genuinely cannot eat at without having to explain themselves to five people.",
    dishes: ["pizza", "tacos", "fried-chicken", "sandwiches", "bbq"],
    related: ["big-group", "with-a-toddler", "vegetarians-and-meat-eaters"],
  },

  {
    s: "big-group",
    h1: "Where to eat with a big group",
    title: "Where to Eat With a Big Group — How to Pick Without a 90-Minute Thread",
    desc:
      "Picking a restaurant for eight or more people, the constraints nobody thinks about until it's too late, and a way to decide it in one round instead of forty messages.",
    lede:
      "Above about six people, choosing a restaurant stops being a question of taste and becomes a logistics problem. The constraint is no longer what everyone likes. It is what the room can physically do.",
    why: [
      "Most restaurants cannot seat ten people at short notice, and many that can will only do it by splitting you across two tables — which is the outcome that quietly ruins the evening, because you have effectively held two separate dinners and the group will feel it.",
      "The second constraint is the bill. Ten people on separate cards is a genuine operational problem for a small kitchen, and a restaurant that refuses to split is within its rights but will produce twenty minutes of maths at the end of an otherwise good night. Places that add automatic gratuity for large parties are usually the ones set up to handle you, which makes the policy a positive signal rather than a warning.",
      "The third is noise, and it runs backwards from what you would guess. A quiet restaurant is a bad venue for a group of twelve — you will be the loudest thing in it, and you will spend the evening aware of that. A moderately loud room is more comfortable for everyone, including the other diners.",
    ],
    look: {
      intro: "What actually matters at this size:",
      items: [
        ["One long table, not two round ones", "Ask explicitly. This is the difference between one dinner and two, and restaurants will tell you honestly if you ask before you book."],
        ["Family-style or shared plates", "Ordering individually for twelve takes fifteen minutes and produces twelve different arrival times. Somewhere designed for sharing solves service, pace and the bill at once."],
        ["A menu with a wide price range", "At twelve people there is always someone stretching for it and someone who does not care. A menu that only works at one price point excludes one of them."],
        ["Loud enough that you are not the loudest thing", "Counter-intuitive, but the comfort of a big group is mostly about not feeling conspicuous."],
        ["Actual reservation capability", "Walk-in with a group of ten is not a plan, it is a two-hour wait split across three venues."],
      ],
    },
    query: "somewhere that takes big groups, shared plates, mid-priced",
    avoid:
      "Tiny acclaimed restaurants with twenty seats — you will not get in, and if you do you will have taken over the room. Anywhere with a strict table-turn time. And do not put the choice to an open vote in a group chat, which is how a decision that needs to take four minutes takes ninety.",
    group:
      "This is the situation Savor Scout's rooms were built for. The host shares one link, everyone taps yes on anything they would eat, and each person gets one veto to strike an option for the whole table. Because the veto is capped at one per person, nobody can filibuster — and because it is anonymous, people veto honestly instead of politely agreeing to somewhere they do not want to go. Two options left, vetoes stop, votes decide.",
    dishes: ["bbq", "pizza", "chinese-food", "mediterranean-food", "korean-food"],
    related: ["work-team-lunch", "with-picky-eaters", "birthday-dinner"],
  },

  {
    s: "eating-alone",
    h1: "Where to eat when you're eating alone",
    title: "Eating Alone at a Restaurant — Where to Go and How to Enjoy It",
    desc:
      "The restaurants that are genuinely good to eat at by yourself, why bar seating changes everything, and how to stop treating a solo dinner as a consolation prize.",
    lede:
      "Eating alone in public carries a stigma that almost nobody actually feels once they are doing it. The awkwardness is nearly all anticipatory, and it is mostly a function of picking the wrong room.",
    why: [
      "A two-top in the middle of a dining room full of couples is the worst possible seat and it is what you get by default if you walk in and say “just one”. The room is not hostile; it is simply configured for pairs, and you are sitting in a chair designed to have someone in the one opposite.",
      "Bar seating solves this almost completely, and not for the reason people assume. It is not that the bartender talks to you. It is that a bar is a place where being alone is the normal state, so nothing about your presence needs explaining — to the staff, to the room, or to yourself.",
      "Counters do the same job even better. Ramen counters, sushi counters, diner counters, taco counters: these are rooms where solo is the design assumption rather than an accommodation. You will be served faster, you can leave whenever you want, and you get to watch someone cook, which is a genuinely better use of a meal than looking at a phone.",
    ],
    look: {
      intro: "What makes a place good to eat at alone:",
      items: [
        ["A bar or counter you can eat a full meal at", "Not a waiting area with stools. A bar with the full menu, where people are visibly eating rather than just drinking."],
        ["An open kitchen", "Something to look at that is not your phone, and the reason counter dining is genuinely pleasant rather than merely tolerable."],
        ["Single-portion food", "Ramen, a rice bowl, a plate of pasta, a sandwich. Shared-plates restaurants are built for groups and will either overfeed you or make you order oddly."],
        ["Turnover", "Somewhere busy and quick, where nobody is tracking how long you have been there. A slow, formal room makes a solo meal feel observed."],
        ["Somewhere you can read", "Decent light and a table you can put a book on. This is the specific quality that turns a solo dinner into a thing you look forward to."],
      ],
    },
    query: "counter seating, single portion, open kitchen, nearby",
    avoid:
      "Restaurants known for being romantic, anywhere with a two-person minimum, tasting menus, and shared-plates places. Also avoid ordering the thing you would order with other people — a solo meal is the one time you can order exactly what you want without negotiating, which is most of the point.",
    dishes: ["ramen", "sushi", "pho", "sandwiches", "noodles"],
    related: ["late-night", "nothing-sounds-good", "on-a-budget"],
  },

  {
    s: "late-night",
    h1: "Where to eat late at night",
    title: "Late Night Food Near You — What's Actually Open and Worth It",
    desc:
      "Finding food after 11pm that isn't a garage forecourt sandwich: what stays open, what's actually good at that hour, and how to check before you drive.",
    lede:
      "After about eleven the question stops being what you want and becomes what exists. Most of the map has closed, and a meaningful share of what is still listed as open is not actually open.",
    why: [
      "The single most common late-night failure is trusting posted hours. Closing time is a plan, not a promise — kitchens shut early on slow nights, and a place listed until 2am may have stopped serving food at midnight and be pouring drinks only. Recent reviews are far more reliable than the hours field, because somebody who turned up at 1am and got fed will say so.",
      "The second thing worth knowing is that late-night food is not daytime food served later. The restaurants that are genuinely good at this hour are built for it: 24-hour diners, taquerias near a nightlife strip, Korean and Chinese kitchens that run late by design, dosa places, halal carts. These are not compromises. A kitchen that does most of its business after midnight is better after midnight than a restaurant staying open reluctantly.",
      "Cities also have a geography to this that is invisible during the day. Late food clusters near hospitals, markets, transport depots and anywhere with shift work, because that is where the demand is at 3am. If the obvious strip is dead, those are the areas worth checking.",
    ],
    look: {
      intro: "How to not waste the drive:",
      items: [
        ["Reviews from the last few weeks that mention a time", "“Went at 1am, kitchen still open” is worth more than any hours listing. This is the thing to actually search for."],
        ["Places that are late by design", "24-hour diners, taquerias, Korean barbecue, Chinese kitchens, halal carts, dosa and roti shops. Built for the hour rather than enduring it."],
        ["Kitchen close, not bar close", "Two different times, and the listing usually shows the second one."],
        ["Near shift work", "Hospitals, markets, depots, university districts. The demand is real there at hours when it is not real anywhere else."],
        ["Call, if it matters", "Thirty seconds on the phone beats a twenty-minute drive to a locked door, and late-night kitchens answer."],
      ],
    },
    query: "open right now, kitchen still serving, close by",
    avoid:
      "Do not trust the hours field alone, and do not assume a busy bar means a working kitchen. Avoid ordering delivery after midnight — the restaurant may be open while no driver will take it, and you will find that out in forty-five minutes.",
    dishes: ["tacos", "korean-food", "chinese-food", "burgers", "breakfast"],
    related: ["hungover", "eating-alone", "after-a-shift"],
  },

  {
    s: "on-a-budget",
    h1: "Where to eat when you're broke",
    title: "Cheap Places to Eat Near You — How to Eat Well on Very Little",
    desc:
      "How to find genuinely good cheap food rather than merely cheap food, the price signals that mislead, and what to search for when the budget is fixed.",
    lede:
      "Cheap food and bad food overlap much less than the price filters suggest. The thing you are actually looking for is a kitchen where the low price is a consequence of what it is, not a compromise it is making.",
    why: [
      "The most useful distinction is between restaurants that are cheap because they are specialised and restaurants that are cheap because they are cutting corners. A taqueria selling four things has low prices because it buys four ingredients in volume and has no front-of-house to pay for. A sit-down restaurant with a sixty-item menu and low prices is achieving that a different way, and you can usually taste it.",
      "Price bands on review sites are close to useless here, because they average a whole menu. A place marked as mid-priced may have a lunch plate at nine dollars; a place marked cheap may only be cheap if you eat nothing but sides. What you want is the price of a specific filling dish, which is the kind of thing people mention in reviews and never in a listing.",
      "The other large lever is time of day. The same kitchen frequently charges substantially less at lunch for a nearly identical plate, and set lunch menus are the single most reliable way to eat at a good restaurant on a small budget.",
    ],
    look: {
      intro: "Where the value actually is:",
      items: [
        ["Short menus", "A kitchen doing six things is buying in volume and wasting nothing. This is the strongest single predictor of cheap food being good food."],
        ["Lunch specials and set menus", "Frequently the same kitchen and often the same dish, at a third off. Worth reorganising the day around."],
        ["Counter service", "No table service means no tipping structure and lower prices for the same cooking."],
        ["Rice, bread, noodles and beans as the base", "Cuisines built on a cheap starch produce filling food at low cost without it reading as a budget decision."],
        ["Family-run, long-established, no website", "Very often the best value in a given neighbourhood, and systematically underrated because they do no marketing."],
      ],
    },
    query: "filling and cheap, counter service, nearby",
    avoid:
      "Happy-hour menus that are only cheap on drinks, anywhere charging separately for rice, and delivery apps entirely — fees and inflated menu prices routinely add forty per cent, which is the whole budget. Walk in or collect.",
    dishes: ["tacos", "pho", "sandwiches", "noodles", "fried-chicken"],
    related: ["finals-week", "eating-alone", "work-team-lunch"],
  },

  {
    s: "meeting-the-parents",
    h1: "Where to eat when you're meeting the parents",
    title: "Meeting the Parents — Choosing a Restaurant That Doesn't Make It Worse",
    desc:
      "How to pick a restaurant for meeting a partner's parents: the noise, price and menu decisions that quietly determine whether the evening is easy or awkward.",
    lede:
      "You are not picking a restaurant you would enjoy. You are picking a room in which four people who do not know each other have to talk for two hours, and the wrong room makes that measurably harder.",
    why: [
      "The failure mode is almost always noise. A trendy, hard-surfaced room at eighty decibels means the older people at the table catch roughly half of what is said, ask twice, and eventually stop contributing. That reads as the evening going badly when it is just acoustics.",
      "Price is the second trap, in both directions. Somewhere expensive creates an awkward moment about the bill and can read as showing off. Somewhere too casual can read as not having made an effort, fairly or not. The safe zone is a solidly mid-priced restaurant that is visibly competent — a room that looks like someone chose it rather than defaulted to it.",
      "Familiarity beats novelty here, and this is the one situation where that is true. An unfamiliar cuisine puts everyone in the position of asking what things are, and someone will order badly and be quietly unhappy about it for two hours. Save the adventurous pick for literally any other meal.",
    ],
    look: {
      intro: "What to weight:",
      items: [
        ["Quiet enough for four-way conversation", "The single highest-leverage factor. Reviews mentioning that you can hear each other are worth searching for specifically."],
        ["Mid-priced, with range", "Somewhere nobody has to think about money, in either direction."],
        ["A recognisable menu", "Italian, American, a good steakhouse, a well-run neighbourhood bistro. Not the place with the twelve-course tasting menu."],
        ["Booked, not walked into", "Turning up to a wait is a bad opening. Reserve, and reserve early enough to get a corner table rather than a walkway."],
        ["Chairs you can sit in for two hours", "Backless stools are fine at thirty and hostile at sixty-five."],
      ],
    },
    query: "quiet, mid-priced, classic menu, takes reservations",
    avoid:
      "Anywhere loud, anywhere with communal seating, anywhere requiring you to explain the food, and your own favourite spot if it is idiosyncratic. Also: do not let it be a surprise. Send the menu link in advance so nobody arrives anxious about what they will be able to order.",
    dishes: ["italian-food", "steak", "seafood", "mediterranean-food"],
    related: ["first-date", "birthday-dinner", "business-dinner"],
  },

  {
    s: "work-team-lunch",
    h1: "Where to take the team for lunch",
    title: "Where to Go for a Work Team Lunch — Without the Email Thread",
    desc:
      "Picking a lunch spot for a work team: the timing, dietary and billing constraints that matter, and how to settle it without a forty-message thread.",
    lede:
      "A team lunch has a hard constraint most social meals do not: it has to end. Everybody has something at two, and a restaurant that takes ninety minutes to bring food has broken the afternoon for eight people.",
    why: [
      "Speed is therefore the first filter, and it is not the same as fast food. What you want is a kitchen with a short, practised menu that turns tables at lunch as a matter of routine. Places that are busy with office workers at 12:30 are busy because they are fast; that crowd is a signal rather than a deterrent.",
      "The second constraint is that a work group almost always contains at least one dietary requirement, and often one nobody has announced. Somewhere with genuinely good vegetarian options — not one sad pasta — removes a small ongoing social cost that the person carrying the restriction is very aware of and usually does not raise.",
      "Third, and most underrated: the bill. If somebody is expensing it you need a single itemised receipt, which means avoiding places that will only split by card. If everyone is paying for themselves, the opposite is true. Deciding which of those it is before you book prevents the most annoying part of the meal.",
    ],
    look: {
      intro: "The constraints that actually bind:",
      items: [
        ["Food on the table within fifteen minutes", "Non-negotiable for a lunch that has to end at a known time. Short menus and counter-order formats are the reliable shapes."],
        ["Real vegetarian and vegan options", "At least two, and not both salads. Assume at least one person in any group of eight needs this and has not mentioned it."],
        ["Single bill or easy split — decide which first", "Sort this before booking, not at the end."],
        ["Noise low enough to talk shop", "If the point is a conversation rather than just feeding people, this matters as much as the food."],
        ["Walkable from the office", "Driving turns a one-hour lunch into a ninety-minute one and halves attendance."],
      ],
    },
    query: "fast lunch, good vegetarian options, quiet enough to talk",
    avoid:
      "Anywhere with a tasting menu, anywhere that takes reservations only for dinner, and anywhere you have to drive to. Avoid polling the team by email — it produces suggestions, not decisions, and the loudest person wins.",
    group:
      "A room settles this in the time it takes to walk to the lift. Share the link in the team channel, everyone taps what works, one veto each covers the dietary constraints nobody wanted to announce out loud — which is the quiet reason this format works better than a thread.",
    dishes: ["sandwiches", "mediterranean-food", "vietnamese-food", "salad", "thai-food"],
    related: ["business-dinner", "big-group", "vegetarians-and-meat-eaters"],
  },

  {
    s: "business-dinner",
    h1: "Where to take a client to dinner",
    title: "Best Restaurants for a Business Dinner — What to Look For",
    desc:
      "Choosing a restaurant for a client dinner: the acoustics, service and menu decisions that let the conversation actually happen.",
    lede:
      "The restaurant is a tool here. Its job is to let two or six people have a conversation with a purpose, without the room interrupting them, and without the food becoming the topic.",
    why: [
      "Acoustics are the whole game and are almost always underweighted. If you cannot discuss a number without repeating it, the restaurant has failed regardless of how good the food is. Hard surfaces, open ceilings and music are the signals to avoid; carpet, banquettes, fabric and spacing are the ones to look for.",
      "Service pace is the second variable. You want a kitchen that will hold courses and a floor team that reads a table — coming over during a pause rather than mid-sentence. This is genuinely hard to assess from photographs and genuinely easy to find in reviews, where people describe attentive-but-not-hovering service in exactly those words.",
      "The menu should be good and unremarkable. Something too adventurous forces your guest into a decision they may not want to make in front of you, and a guest who orders badly will be distracted by it. Steakhouses persist for client dinners for a reason that is not culinary: everyone knows how to order at one.",
    ],
    look: {
      intro: "The specifics:",
      items: [
        ["Genuinely quiet, with spaced tables", "Look for soft surfaces and distance between covers. Reviews complaining it is “a bit sedate” are describing exactly what you want."],
        ["Reservations honoured on time", "A wait with a client is a bad opening you cannot recover from."],
        ["Service that paces to the table", "Courses held, drinks topped, nobody appearing mid-point."],
        ["A menu that is easy to order from", "Recognisable dishes at a clear range of prices. Nothing that requires a decision about how adventurous to appear."],
        ["A quiet way to handle the bill", "Somewhere you can settle without a performance at the table."],
      ],
    },
    query: "quiet, spaced tables, classic menu, takes reservations",
    avoid:
      "Communal tables, small plates that require negotiation, anywhere with a queue, anywhere loud, and anywhere so expensive that the cost becomes a subject. Do not pick somewhere you have never been for a dinner that matters.",
    dishes: ["steak", "italian-food", "seafood", "japanese-food"],
    related: ["meeting-the-parents", "work-team-lunch", "job-interview-lunch"],
  },

  {
    s: "job-interview-lunch",
    h1: "What to eat at an interview lunch",
    title: "Interview Lunch — What to Order and How to Get Through It",
    desc:
      "An interview lunch is an interview. What to order, what to avoid, and how to handle the parts of the meal that can go wrong.",
    lede:
      "You are being assessed for the entire meal, including the parts that feel like a break from being assessed. That does not mean it is a trap — it means the sensible move is to remove as many variables as possible and put your attention on the conversation.",
    why: [
      "Almost everything that goes wrong at an interview lunch is mechanical. Food that requires both hands, food that can end up on a shirt, food that arrives too hot to start, and food that takes a long time to eat all take attention away from the thing you are there to do. Nobody has ever been rejected for ordering the chicken.",
      "The second thing is pacing. If you order something that arrives in two minutes and your interviewer orders something that takes twenty, you will finish early and spend the rest of the meal watching someone eat. Matching roughly what they order — in courses and in price — is not sycophancy, it is logistics.",
      "On alcohol: the safe answer is no, and it stays the safe answer even when they order one. Declining costs nothing. The only awkwardness comes from a long explanation, so decline briefly and order something else.",
    ],
    look: {
      intro: "Practical rules:",
      items: [
        ["Order something that needs one hand and a fork", "Grilled protein, a rice bowl, a simple pasta. Not ribs, not a burger stacked past mouth height, not soup as a main, not whole fish."],
        ["Match their course count and rough price", "If they order a starter, order a starter. If they order the cheapest main, do not order the most expensive one."],
        ["Nothing that needs concentration", "No shell-cracking, no deboning, nothing assembled at the table."],
        ["Skip the alcohol, briefly", "“I'm fine with water, thanks” and move on."],
        ["Decide fast", "Look at the menu online beforehand. Deliberating for four minutes is a worse signal than any dish you could order."],
      ],
    },
    query: "quiet, quick service, simple menu, mid-priced",
    avoid:
      "Anything with a sauce that travels, anything eaten with your hands, anything you have never eaten before, and the most expensive thing on the menu. Also do not pick the restaurant yourself if they offered to — let them.",
    dishes: ["salad", "sandwiches", "japanese-food", "mediterranean-food"],
    related: ["business-dinner", "work-team-lunch"],
  },

  {
    s: "with-a-toddler",
    h1: "Where to eat with a toddler",
    title: "Eating Out With a Toddler — Restaurants That Actually Work",
    desc:
      "What makes a restaurant genuinely workable with a small child: timing, noise, layout and the specific things to check before you go.",
    lede:
      "A restaurant that works with a toddler is not one that tolerates children. It is one where the layout, the noise and the speed happen to suit a person who has about forty minutes of patience and no interest in negotiating.",
    why: [
      "Speed is the whole thing. The clock starts when you sit down, and a kitchen that takes twenty-five minutes to bring the first plate has used most of your budget before the meal begins. Somewhere that can put bread, fruit or rice on the table within two minutes of sitting buys you the entire rest of the meal.",
      "Noise works backwards from adult logic again. A quiet restaurant is stressful with a small child because every sound they make is public; a moderately loud one absorbs it and lets you relax, which the child notices and mirrors. Aim for cheerful and busy, not calm.",
      "Layout matters more than the menu. A booth contains a toddler on three sides. A table in a walkway does not, and you will spend the meal intercepting. Somewhere with an outdoor area, or a corner, or anywhere with space to walk a restless child for ninety seconds, is worth more than a good kids' menu.",
    ],
    look: {
      intro: "What to check:",
      items: [
        ["Something on the table immediately", "Bread, rice, edamame, chips, fruit. The single highest-value property, and worth choosing a restaurant for on its own."],
        ["Booths or a corner", "Containment. A three-sided seat changes the whole meal."],
        ["Busy and a bit loud", "Your child is not the loudest thing in the room, and you stop monitoring the volume."],
        ["High chairs, actually available", "Worth confirming rather than assuming, particularly at small places."],
        ["A changing table", "Frequently absent and rarely mentioned anywhere. Reviews from parents are the only reliable source."],
        ["Somewhere you can leave quickly", "Counter service, or a card machine at the table. Waiting ten minutes for a bill during a meltdown is the worst part of the night."],
      ],
    },
    query: "family friendly, fast service, booths, something to snack on straight away",
    avoid:
      "Anywhere with a wait, anywhere quiet and formal, anywhere with a long kitchen. And go early — 5:30pm with a toddler is a different and far better restaurant than 7:30pm with a toddler, at the same address.",
    dishes: ["pizza", "dumplings", "mexican-food", "greek-food", "breakfast"],
    related: ["with-picky-eaters", "big-group", "sunday-night"],
  },

  {
    s: "vegetarians-and-meat-eaters",
    h1: "Where to eat when half the group is vegetarian",
    title: "Where to Eat With Vegetarians and Meat Eaters in One Group",
    desc:
      "How to find a restaurant where the vegetarians eat as well as everyone else, instead of one token pasta dish on a steak menu.",
    lede:
      "The usual compromise is a restaurant that is good for the meat eaters and survivable for everyone else, with one vegetarian main that has been on the menu unchanged for six years. Everyone notices. Nobody says anything.",
    why: [
      "The fix is to stop looking for restaurants with vegetarian options and start looking for cuisines where vegetables were never the afterthought. Indian, Lebanese, Turkish, Ethiopian, Sichuan, Thai and southern Italian cooking all have deep vegetable traditions that exist independently of anyone's dietary politics — which means the vegetarian dishes are not accommodations, they are the house specialities.",
      "This also solves the quieter problem. The awkwardness at a mixed table is rarely about food availability; it is about one person's meal being visibly a lesser version of everyone else's. At a mezze place or a South Indian restaurant, nobody's plate is the compromise plate, because the menu was not built around a central piece of meat.",
      "The one thing worth checking, which people routinely miss: plenty of nominally vegetarian dishes are cooked in chicken stock, finished with fish sauce, or fried in shared oil. If the vegetarian at the table is vegetarian for ethical or religious reasons rather than preference, that distinction matters and is worth asking about rather than assuming.",
    ],
    look: {
      intro: "How to pick:",
      items: [
        ["Cuisines with real vegetable traditions", "Indian, Lebanese, Turkish, Ethiopian, Sichuan, Thai, southern Italian. The vegetarian dishes are the specialities, not the substitutes."],
        ["Shared plates", "Mezze, dim sum, tapas, thali, injera. Everyone eats from the same table and the division disappears."],
        ["More than three vegetarian mains", "Below that it is an accommodation. Above it, somebody in the kitchen actually cares."],
        ["Vegan options as a proxy", "A menu with real vegan dishes is a menu somebody thought about. Useful signal even if nobody at the table is vegan."],
        ["Check the stock and the fryer", "Ask, if the reason is ethical or religious. Good kitchens answer this without irritation."],
      ],
    },
    query: "great vegetarian options, shared plates",
    avoid:
      "Steakhouses, barbecue joints, and anywhere whose entire identity is one animal. Also avoid choosing somewhere on the basis that it has a vegetarian section — check what is actually in it first.",
    dishes: ["indian-food", "mediterranean-food", "thai-food", "chinese-food", "italian-food"],
    related: ["with-picky-eaters", "big-group", "work-team-lunch"],
  },

  {
    s: "birthday-dinner",
    h1: "Where to go for a birthday dinner",
    title: "Where to Go for a Birthday Dinner — Picking the Right Room",
    desc:
      "How to choose a birthday restaurant that feels like an event without being stiff, and the logistics that quietly decide whether the night works.",
    lede:
      "A birthday dinner has to feel different from a normal dinner, which is a requirement about atmosphere rather than about food. Plenty of excellent restaurants are terrible at this, and plenty of ordinary ones are very good at it.",
    why: [
      "What makes a room feel like an occasion is mostly energy and permission — a place where a table can be loud, stay late, and take up space without anyone's disapproval. A hushed fine-dining room is the opposite of that, which is why expensive birthday dinners so often feel oddly flat.",
      "The logistics then decide whether the feeling survives. A birthday group is almost always larger than planned, arrives across a forty-minute window, and includes at least one person nobody else knows. A restaurant that can absorb two extra people and a late arrival is worth more than one with better food and a rigid booking.",
      "The last piece is the bit people forget until the moment arrives: whether you can bring a cake, and whether the staff will do something when it comes out. Most places will if asked in advance. Almost none will if asked on the night.",
    ],
    look: {
      intro: "What to sort out:",
      items: [
        ["A room with energy", "Somewhere a table can be loud and late without disapproval. This matters more than the cooking."],
        ["Flexible on numbers", "Book for more than you think and tell them it may shift. Restaurants that panic at this are the wrong ones."],
        ["Cake policy, confirmed in advance", "Ask when booking. Many will plate and bring it out; almost none will improvise on the night."],
        ["No hard table-turn time", "Being moved on at 9pm ends the evening whether or not anyone is ready."],
        ["Somewhere to go after", "The night usually wants a second act. Walking distance beats a drive."],
      ],
    },
    query: "lively room, takes big bookings, good for a celebration",
    avoid:
      "Hushed tasting-menu restaurants, anywhere with a strict two-hour limit, and anywhere that cannot take a booking. Do not surprise the birthday person with a cuisine they have never mentioned wanting.",
    group:
      "The birthday person should not be organising their own dinner, and the organiser should not be running a poll. A room with one veto each gets the whole group to a decision without the host having to arbitrate between five suggestions.",
    dishes: ["korean-food", "italian-food", "bbq", "mexican-food", "steak"],
    related: ["celebrating", "big-group", "first-date"],
  },

  {
    s: "celebrating",
    h1: "Where to eat when you're celebrating something",
    title: "Where to Eat to Celebrate — Promotions, Good News and Small Wins",
    desc:
      "Choosing a restaurant for a celebration: matching the room to the size of the news, and why the most expensive option is often the wrong one.",
    lede:
      "The mistake is assuming that celebrating means spending more. What it actually means is that the meal should feel deliberate — chosen rather than defaulted to — and price is only one of several ways to achieve that.",
    why: [
      "Good news has a scale, and the restaurant should match it. A promotion is not an anniversary. Overshooting produces a stiff evening where everyone is aware of the bill; undershooting produces a meal that felt like any Tuesday. The useful question is not how much to spend but how long you want the evening to last.",
      "The most reliable way to make a meal feel like an event, at any budget, is novelty. Somewhere neither of you has been beats somewhere expensive you both know. A new cuisine, a counter where you watch it cooked, a place you have walked past for a year — these register as occasions in a way a familiar upgrade does not.",
      "The other lever is sequence. Dinner that becomes a walk that becomes a drink somewhere else is structurally more memorable than one long sitting, and it costs less. Picking a restaurant in a neighbourhood you want to be in afterwards is doing more work than picking a better restaurant.",
    ],
    look: {
      intro: "What to aim at:",
      items: [
        ["Somewhere new to everyone at the table", "Novelty does more for the occasion than money does."],
        ["A room you want to sit in for three hours", "Comfort and pace over refinement. A restaurant that hurries you cannot hold a celebration."],
        ["Something to watch", "An open kitchen, a counter, a grill at the table. Participation makes a meal memorable."],
        ["A neighbourhood, not just an address", "Somewhere the evening can continue on foot."],
        ["Tell them what it is when you book", "Costs nothing, and most places do something small. The ones that do not were never going to."],
      ],
    },
    query: "somewhere special we haven't been, lively, open kitchen",
    avoid:
      "Booking the most expensive place available as a substitute for choosing, and anywhere with a rigid two-hour slot. Also avoid the restaurant you always go to — familiarity is the enemy of an occasion.",
    dishes: ["korean-food", "steak", "japanese-food", "seafood", "italian-food"],
    related: ["birthday-dinner", "first-date", "friends-visiting"],
  },

  {
    s: "sad",
    h1: "What to eat when you've had a bad day",
    title: "What to Eat When You've Had a Bad Day | Savor Scout",
    desc:
      "Comfort food, what actually makes it comforting, and how to pick somewhere that helps rather than somewhere you'll regret at 11pm.",
    lede:
      "There is a version of this where you order something enormous, eat a third of it, and feel worse. There is another version where you go somewhere warm and are fed by people who are good at feeding people. They are not the same and the difference is mostly the room.",
    why: [
      "Comfort food is a real category but it is badly defined. What makes food comforting is not fat or sugar — it is familiarity and low effort. Something you have eaten many times, that requires no decisions, arrives quickly, and does not need to be interpreted. That is why the comfort dish is different for everyone and why someone else's recommendation frequently misses.",
      "The setting does more work than the menu. Eating alone in a bright empty room at 9pm is a different experience from eating the same dish at a busy counter with people around you. On a bad day, being incidentally among people — without having to talk to any of them — is worth more than what is on the plate.",
      "Delivery is the tempting move and usually the wrong one, for one specific reason: it keeps you where you already are. The twenty-minute walk and the change of room is doing most of the work. If you genuinely cannot leave, that is fine — but the food is not the part that was going to help.",
    ],
    look: {
      intro: "What helps:",
      items: [
        ["Something you have eaten before", "This is not the night for novelty. Familiarity is the active ingredient."],
        ["Warm, soft and salty", "Noodles, rice, stew, melted cheese, roast chicken, dumplings. Almost every culture's version of this works."],
        ["A busy room you do not have to participate in", "A counter at a full restaurant. Company without obligation."],
        ["Fast, and no decisions", "A place with four things on the menu, or where you already know what you are ordering."],
        ["Somewhere you can walk to", "The walk is not incidental. It is frequently the part that helps most."],
      ],
    },
    query: "comfort food, warm and simple, walking distance",
    avoid:
      "Ordering more than you want because it feels like it should be a big meal. Anywhere that requires a reservation and a plan. And, gently, do not make this a nightly habit — the bad-day meal works because it is unusual.",
    dishes: ["ramen", "pizza", "fried-chicken", "noodles", "soup"],
    related: ["nothing-sounds-good", "stressed", "eating-alone"],
  },

  {
    s: "stressed",
    h1: "What to eat when you're stressed",
    title: "What to Eat When You're Stressed — And Where to Eat It",
    desc:
      "Picking a meal when you're wound up: why the restaurant's pace matters more than its menu, and what to look for when you have no attention to spare.",
    lede:
      "Stress does something specific to eating out: it removes your tolerance for friction. A wait, a complicated menu, a slow kitchen, a loud room — all things you would normally absorb without noticing become the thing you cannot deal with.",
    why: [
      "So the first move is to lower the number of decisions the meal requires. A sixty-item menu is genuinely worse than a six-item one tonight, not because the food is worse but because reading it is work. Places with a set plate, a daily special, or a single house dish remove that entirely.",
      "Pace is the second variable, and it runs in a specific direction: you want the meal to be unhurried but the ordering to be fast. Somewhere that gets food to you quickly and then leaves you alone is close to ideal. Somewhere with a twenty-five minute kitchen and a server who checks in six times is the opposite.",
      "There is a real case for eating somewhere you already know, which is the reverse of the advice on most of these pages. Novelty costs attention. If you have none spare, the familiar place where you know the menu, the noise level and where the bathroom is will be the better meal.",
    ],
    look: {
      intro: "What to prioritise:",
      items: [
        ["A short menu, or one you already know", "Fewer decisions is the entire objective."],
        ["Quick to arrive, unhurried afterwards", "Fast kitchen, relaxed floor. This combination is rarer than it sounds and worth seeking out."],
        ["No wait, and no reservation needed", "Anything with a queue or a booking is a second task."],
        ["Moderate noise", "Silence amplifies whatever you are chewing on mentally. A low hum is better."],
        ["Somewhere you can sit for a while", "Being moved on is the last thing you need."],
      ],
    },
    query: "short menu, no wait, quiet, nearby",
    avoid:
      "Anywhere new, anywhere with a queue, anywhere you have to be on time for, and the delivery app — the twenty minutes of scrolling is its own stressor and you will end up ordering the same thing you always do anyway.",
    dishes: ["ramen", "sandwiches", "pho", "curry", "breakfast"],
    related: ["sad", "nothing-sounds-good", "eating-alone"],
  },

  {
    s: "sick-with-a-cold",
    h1: "What to eat when you have a cold",
    title: "What to Eat When You Have a Cold — Soup, Spice and What's Open",
    desc:
      "What to order when you're stuffed up and nothing tastes like anything, why hot and sharp flavours cut through, and how to get it without leaving the house.",
    lede:
      "The specific problem with eating while congested is that most of what you call taste is smell, and yours has gone. Food is not bland because the kitchen under-seasoned it. It is bland because you are only getting salt, sweet, sour, bitter and heat — and those are the five things worth building the order around.",
    why: [
      "Which is genuinely useful information, because it tells you what to order. Chilli heat is not a taste at all — it is a pain response, and it works perfectly well when your nose does not. So does sour. So does salt. A bowl of tom yum, a hot and sour soup, a proper pho with plenty of lime and chilli, a bowl of congee with pickles: these all land when a subtly seasoned dish registers as warm nothing.",
      "The other half is steam and liquid, which is the reason every culture's sick-day food is a soup. Nobody needs to make a health claim about it for it to be true that a bowl of hot broth is pleasant to sit over when you feel terrible, and that a sandwich is not.",
      "The practical constraint is that you probably should not be in a restaurant. This is the one situation on this site where delivery or collection is the right answer, and it is worth choosing a restaurant on the basis that soup travels well — which it does, far better than anything fried.",
    ],
    look: {
      intro: "What to order:",
      items: [
        ["Hot, sour and spicy", "Tom yum, hot and sour soup, pho with extra lime and chilli, sinigang, menudo. These work through channels that congestion does not block."],
        ["Broth over solids", "Easy to eat with no appetite, and pleasant to hold."],
        ["Ginger, garlic, lime, chilli, black pepper", "Strong, simple flavours that do not rely on aroma to register."],
        ["Congee, jook or any rice porridge", "Mild, warm, and requires nothing of you. The one exception to the go-bold rule, for when even chewing is unappealing."],
        ["Something that travels", "Soup in a sealed container survives a delivery ride. Anything crisp does not."],
      ],
    },
    query: "hot and sour soup, delivery or pickup, open now",
    avoid:
      "Anything delicate or expensive — you will not taste it and the money is wasted. Anything fried, which arrives soft. And do not go and sit in a restaurant with a streaming cold; get it to go.",
    dishes: ["pho", "soup", "thai-food", "chinese-food", "ramen"],
    related: ["hungover", "sad", "stressed"],
  },

  {
    s: "after-a-workout",
    h1: "What to eat after a workout",
    title: "What to Eat After the Gym — Real Food, Not a Shake",
    desc:
      "Where to eat after training when you want an actual meal: what to look for on a menu, and the restaurants that handle it well.",
    lede:
      "The post-gym window gets talked about as a supplement problem. Treated as a restaurant problem it is simpler: you want a lot of protein, a real portion of carbohydrate, salt, and for it to arrive quickly, because you are hungrier than you expected and you are standing in a car park.",
    why: [
      "That combination is more common than it sounds, and it maps onto whole categories of restaurant rather than onto special “healthy” menus. A Korean bibimbap, a Turkish grill plate, a burrito bowl, a Japanese teishoku set, a Greek souvlaki plate, a rotisserie chicken with rice — all of these are a large grilled protein, a substantial starch and something sharp on the side, which is exactly the brief.",
      "What you generally do not want is the salad-bar version, which is priced as a health product and leaves you hungry ninety minutes later. The useful filter is whether the portion of carbohydrate is a real one. A protein bowl with a spoonful of quinoa is a snack with a marketing budget.",
      "Speed matters more than usual because appetite after training is sharp and short. A kitchen with a twenty-five minute wait will have you eating bread before the food arrives.",
    ],
    look: {
      intro: "What to look for:",
      items: [
        ["Grilled protein as the centre of the plate", "Not a garnish on a salad. Chicken, beef, lamb, fish, tofu, eggs — cooked simply and in quantity."],
        ["A real portion of rice, bread or potato", "The thing most “fitness” menus skimp on and the thing that actually ends the hunger."],
        ["Salt, and something sharp", "Pickles, lemon, hot sauce, kimchi, salsa. You have lost salt and dull food will not satisfy."],
        ["Fast and counter-service", "Appetite after training does not wait well."],
        ["Portion size mentioned in reviews", "“Huge portions” in a review is the most reliable signal you will get for this."],
      ],
    },
    query: "grilled protein and rice, big portion, fast",
    avoid:
      "Small-plates restaurants, anywhere described as delicate, and the pre-made protein bowl at the front of a cooler. Also avoid eating in gym clothes somewhere formal — you will rush, which defeats the purpose.",
    dishes: ["korean-food", "mediterranean-food", "mexican-food", "japanese-food", "bbq"],
    related: ["on-a-budget", "eating-alone", "work-team-lunch"],
  },

  {
    s: "finals-week",
    h1: "What to eat during finals week",
    title: "What to Eat During Finals Week — Cheap, Fast, and Open Late",
    desc:
      "Eating during exams without living on vending machines: what to look for when you're broke, out of time, and studying at 1am.",
    lede:
      "Finals week eating fails in a predictable way. You skip meals while you are working, then eat something enormous at midnight, then feel bad for the rest of the night. The fix is less about nutrition advice than about picking places that fit the shape of the week.",
    why: [
      "The shape is: unpredictable hours, no money, no time, and no capacity for decisions. That rules out almost everything that requires a plan and points hard at a small set of places — cheap, fast, open late, close to where you are studying, and consistent enough that you do not have to think about it.",
      "The single most useful move is to find two or three of those in advance and stop choosing. Decision-making is the scarce resource during exams, and spending it on dinner is a bad trade. A rotation of three places you already know is worth more than the best restaurant in town.",
      "The second is to eat something with vegetables in it at least once a day, which is easier as a restaurant decision than as a discipline decision. A banh mi, a burrito, a bowl of pho, a gyro, a curry with a side of greens — all of these deliver it incidentally, without requiring you to want it.",
    ],
    look: {
      intro: "What to optimise for:",
      items: [
        ["Open late, genuinely", "Check recent reviews rather than posted hours. A 2am close that is actually a midnight close will cost you a trip."],
        ["Under fifteen dollars, filling", "Rice plates, noodle soups, burritos, gyros, dosa, halal plates. Cheap because they are specialised, not because they are cutting corners."],
        ["Walking distance from where you study", "A place that requires a drive will not happen at 1am and you will eat crisps instead."],
        ["A short menu", "You have no decisions left. Somewhere with six things is a feature."],
        ["Something green in the dish by default", "Not a salad you have to order separately and will not."],
      ],
    },
    query: "cheap, filling, open late, walking distance",
    avoid:
      "Building the week around delivery, which is the fastest way to spend a month's food budget in nine days. Energy drinks as a meal. And do not save up all your eating for one enormous late dinner, which is the thing that makes the next morning worse.",
    dishes: ["pho", "sandwiches", "tacos", "noodles", "curry"],
    related: ["on-a-budget", "late-night", "stressed"],
  },

  {
    s: "friends-visiting",
    h1: "Where to take friends visiting from out of town",
    title: "Where to Take Out-of-Town Visitors to Eat",
    desc:
      "How to pick restaurants for visiting friends: showing them your city rather than the tourist version, without ending up somewhere you hate.",
    lede:
      "There is a trap here, and almost everyone falls into it: you take visitors to the famous place, which you do not actually like, because it is what the city is known for. Everyone has a fine time and nobody has seen anything.",
    why: [
      "The better frame is that visitors are not asking to eat the best food in your city. They are asking to see what it is like to live there, and dinner is the most efficient way to show them. That means your ordinary Tuesday place is frequently the better choice than the destination restaurant, because it is the true answer to the question they are actually asking.",
      "The exception is regional specificity. If your city genuinely has a dish — a style of barbecue, a sandwich, a chowder, a taco, a hot chicken, a cheesesteak — then it is worth going somewhere that does it properly, because that is a thing they cannot get at home. The test is whether the dish is regional, not whether the restaurant is famous.",
      "The other thing worth planning is variety across the visit. Three good dinners in the same register is less memorable than a cheap counter lunch, a neighbourhood dinner and one proper night out. Visitors remember the range, not the peak.",
    ],
    look: {
      intro: "How to plan it:",
      items: [
        ["One genuinely regional dish, done properly", "Whatever your city is actually known for, at a place locals go rather than the one on the brochure."],
        ["One place you go anyway", "Your normal spot. This is the one they will remember, because it is the real answer."],
        ["One neighbourhood, not one restaurant", "Somewhere you can walk around afterwards. Visitors want to see a place, not just eat in it."],
        ["Vary the price", "A cheap lunch and a proper dinner beats three mid-priced meals."],
        ["Ask what they cannot get at home", "Frequently produces a better answer than anything you would have suggested."],
      ],
    },
    query: "local speciality, somewhere locals actually go",
    avoid:
      "The rooftop place with the view and the mediocre food. Anywhere with a queue made mostly of visitors. And do not over-schedule — three planned meals across a weekend is plenty, and the unplanned one is usually the best.",
    dishes: ["bbq", "pizza", "tacos", "seafood", "sandwiches"],
    related: ["celebrating", "big-group", "road-trip"],
  },

  {
    s: "road-trip",
    h1: "Where to eat on a road trip",
    title: "Where to Eat on a Road Trip — Getting Off the Interstate",
    desc:
      "How to find decent food on a long drive: why the exit-ramp cluster is always the same, and how far you actually have to go to beat it.",
    lede:
      "Every interstate exit has the same six buildings. They exist because they are visible from the road, not because anyone chose them, and the entire trick to eating well on a drive is understanding that the good food is almost always about four minutes further.",
    why: [
      "The exit cluster is a real-estate outcome. Those slots are expensive because of visibility, which means they go to chains that can pay for visibility, which means the food is identical in every state you drive through. Nothing is wrong with it. It is simply not a reason to have stopped anywhere in particular.",
      "The rule that works is to drive toward the town rather than away from it. Most exits are one to three miles from an actual main street with actual restaurants, and the difference in quality across those three miles is larger than any other decision you will make that day. A diner on a main street has repeat customers; an exit-ramp franchise has none by design.",
      "The second rule is to time stops around the food rather than the fuel. Deciding to eat when you are already starving means taking whatever is at the next exit. Deciding forty minutes out lets you pick a town, which is the whole game.",
    ],
    look: {
      intro: "How to find the good stop:",
      items: [
        ["Look one to three miles off the ramp", "Toward the town, not the retail strip. This is nearly always where it is."],
        ["Main street, not frontage road", "Repeat local customers versus one-time through traffic. It shows in the cooking."],
        ["Somewhere with a regional dish", "A drive is the one time you are eating across regions. A local speciality is the point of stopping."],
        ["Open at odd hours, busy with locals", "Full car park of local plates at 2:30pm is the strongest signal on the road."],
        ["Decide forty minutes before you are hungry", "The only way to avoid defaulting to the next exit."],
      ],
    },
    query: "local diner off the highway, regional speciality",
    avoid:
      "Eating at the fuel stop because you are already there. Anywhere advertised on a billboard forty miles out. And avoid the enormous heavy meal at lunch if you have four hours left to drive.",
    dishes: ["bbq", "burgers", "breakfast", "sandwiches", "fried-chicken"],
    related: ["friends-visiting", "before-a-flight", "late-night"],
  },

  {
    s: "before-a-flight",
    h1: "Where to eat before a flight",
    title: "Where to Eat Before a Flight — Near the Airport, Not In It",
    desc:
      "Eating before you fly: what to order, what to avoid, and why the best meal is usually fifteen minutes before the airport rather than inside it.",
    lede:
      "Airport food is expensive and mediocre for structural reasons that have nothing to do with the operators — a captive audience, brutal rents, and a kitchen built around holding food rather than cooking it. The alternative is almost always a short detour before you park.",
    why: [
      "Most airports have a strip of genuinely good, cheap restaurants within ten or fifteen minutes, serving the people who work there. Airport staff eat somewhere, and it is not the terminal. That strip is usually the best value food for miles and is invisible to anyone who only ever drives straight to long-stay parking.",
      "What to order is a narrower question than usual, because cabin pressure and a small seat impose real constraints. Very salty food will leave you thirsty for four hours at a fixed price per bottle. Very heavy or greasy food sits badly when you are seated and still. Anything strongly aromatic is a consideration for the people around you, and garlic and fish are the two that carry.",
      "The one thing genuinely worth doing inside the terminal is buying water after security, which removes the main downside of having eaten something salty.",
    ],
    look: {
      intro: "Practical rules:",
      items: [
        ["Eat fifteen minutes out, not in the terminal", "Cheaper, better, and usually faster. Look for where the airport staff eat."],
        ["Moderate salt", "The single biggest determinant of how the flight feels. Salty food plus dry cabin air is a long afternoon."],
        ["Not too heavy, not too rich", "You are about to sit still for hours. A grill plate travels better than a deep-fried one."],
        ["Nothing strongly aromatic", "A courtesy, and a real one in a full cabin."],
        ["Give yourself the buffer first", "Work out your timing to the gate, then eat with what is left. Not the other way round."],
      ],
    },
    query: "quick, light, near the airport",
    avoid:
      "The terminal food court unless you are genuinely out of time. Anything enormous. Anything you have not eaten before, on the day you are trapped in a seat for six hours — this is the worst possible moment to try a new cuisine.",
    dishes: ["sandwiches", "vietnamese-food", "japanese-food", "salad", "breakfast"],
    related: ["road-trip", "eating-alone", "stressed"],
  },

  {
    s: "sunday-night",
    h1: "Where to eat on a Sunday night",
    title: "Where to Eat on a Sunday Night — What's Even Open",
    desc:
      "Sunday night is the hardest night to eat out: half of everything is closed, kitchens shut early, and the good places are booked. How to work around it.",
    lede:
      "Sunday evening has a specific and under-discussed problem: it is the night restaurants close. Staff need a day, Monday deliveries have not arrived, and the kitchens that do open frequently shut two hours earlier than they do the rest of the week.",
    why: [
      "The pattern is consistent enough to plan around. Independent, chef-driven restaurants are the most likely to be shut on Sunday or Monday. Family-run restaurants, particularly Chinese, Indian, Greek, Turkish, Vietnamese and Mexican places, are the most likely to be open — in many cases because Sunday is one of their busiest days.",
      "Early is also better than late, and by more than you would think. A kitchen that closes at 9pm on Sunday will stop taking orders at 8:30, and a 8:15 arrival gets a rushed meal from a team that wants to go home. Sunday dinner at 6pm is a genuinely different and better experience than the same restaurant at 8pm.",
      "There is a second thing going on, which is that Sunday evening carries a mood. Somewhere bright, busy and a bit loud works considerably better than a quiet room, which will amplify the feeling rather than interrupt it. This is the rare case for picking a restaurant on the basis of its energy rather than its food.",
    ],
    look: {
      intro: "How to make it work:",
      items: [
        ["Check the hours, then check them again", "Sunday hours differ from the rest of the week and listings are frequently stale. Recent reviews are more reliable."],
        ["Family-run restaurants", "Chinese, Indian, Greek, Turkish, Vietnamese, Mexican. Most likely to be open, and often at their busiest."],
        ["Go early", "6pm on a Sunday is a better meal than 8pm at the same place."],
        ["Somewhere busy", "A full room on a Sunday is doing something right, and the energy is half the point tonight."],
        ["Brunch as dinner", "Plenty of all-day places serve into the evening on Sundays, and it fits the mood better than a formal dinner."],
      ],
    },
    query: "open on Sunday evening, busy, nearby",
    avoid:
      "Assuming your favourite independent place is open. Arriving at 8:45 anywhere. And avoid anywhere quiet and dim tonight of all nights.",
    dishes: ["chinese-food", "indian-food", "greek-food", "brunch", "pizza"],
    related: ["with-a-toddler", "sad", "late-night"],
  },

  {
    s: "after-a-shift",
    h1: "Where to eat after a late shift",
    title: "Where to Eat After a Late Shift — Food at the End of the Day",
    desc:
      "Eating after work when work ends at midnight: what's open, what's worth it, and how shift workers find the good places everyone else misses.",
    lede:
      "If you finish at eleven or later, you are eating in a city that has mostly stopped serving, and the standard advice about restaurants is written for people whose evening starts when yours ends.",
    why: [
      "The compensation is that shift workers collectively know where the good late food is, and it is rarely where the nightlife is. Restaurants that serve hospital staff, market workers, drivers and kitchen crews are open late because that trade is reliable, and they tend to be fast, cheap and good — because their customers eat there several times a week and would notice if they were not.",
      "The other thing worth knowing is that people who work in restaurants eat after their shift too, and they do not eat at the tourist places. Anywhere with a visible after-midnight trade of people still in work clothes is showing you a signal that no rating captures.",
      "One practical point specific to this: eating a large meal immediately before sleeping is the thing most likely to make the next day worse. Something moderate and warm is a better end to the shift than the enormous meal that feels earned.",
    ],
    look: {
      intro: "How to find them:",
      items: [
        ["Near hospitals, markets and depots", "The reliable late-night geography in almost every city, and nothing to do with the bar strip."],
        ["Staff eating there in work clothes", "Cooks, nurses, drivers. The strongest possible signal at that hour."],
        ["Open by design, not reluctantly", "A kitchen that plans to be open at 1am cooks better at 1am than one that is waiting to close."],
        ["Fast, and not enormous", "A moderate bowl beats the full platter when you are going to sleep in an hour."],
        ["Somewhere you can sit down", "After a shift on your feet, this is worth more than the food."],
      ],
    },
    query: "open after midnight, sit down, close by",
    avoid:
      "The drive-through on the way home as a default. Anywhere attached to a nightlife strip at closing time, which is loud, slow and full of people at a different point in their evening than you.",
    dishes: ["pho", "korean-food", "tacos", "chinese-food", "breakfast"],
    related: ["late-night", "eating-alone", "on-a-budget"],
  },

  {
    s: "hot-day",
    h1: "What to eat when it's too hot to eat",
    title: "What to Eat When It's Too Hot — Cold Food Worth Leaving For",
    desc:
      "What to order in a heatwave, why hot food is not actually the wrong answer, and the cold dishes that work better than salad.",
    lede:
      "Appetite drops in heat, and the default response is a salad, which is why so many hot-weather meals are unsatisfying. The problem is not that salad is bad. It is that cold and light are being treated as the same thing when they are not.",
    why: [
      "What actually works in heat is a combination of cold, sharp and salty. Acid is the key one — lime, vinegar, tamarind, yoghurt, pickles — because it cuts through a flattened appetite in a way that a plain cold plate does not. A som tam, a ceviche, a plate of cold noodles with vinegar, a gazpacho, a bowl of cold soba: all of these are refreshing in a way that a bowl of leaves is not.",
      "It is also worth knowing that plenty of cultures in genuinely hot places eat hot, spicy food in the heat, and there is something to it: chilli makes you sweat, and sweating is how cooling works. A bowl of curry in July is less perverse than it sounds, provided the room has air conditioning.",
      "The last piece is salt, which matters more in heat than at any other time and is the thing an undressed salad conspicuously lacks. That is most of why it leaves you unsatisfied.",
    ],
    look: {
      intro: "What to order:",
      items: [
        ["Cold noodles", "Soba, naengmyeon, bun cha, liangpi, cold sesame noodles. The best category in this weather by a distance."],
        ["Sharp and acidic", "Ceviche, som tam, larb, gazpacho, anything with lime or vinegar doing the work."],
        ["Raw or barely cooked", "Sashimi, crudo, poke, tartare. Light without being thin."],
        ["Yoghurt-based dishes", "Cold, salty and substantial. Raita, tzatziki, doogh, cacik."],
        ["Or the opposite: hot and spicy, indoors", "A legitimate strategy, and how much of the hot world actually eats."],
      ],
    },
    query: "cold noodles or something sharp and citrusy",
    avoid:
      "Heavy cream, deep-fried anything, and an undressed salad. Also avoid outdoor seating you have been looking forward to all year — a table in direct sun at 1pm is not the experience it sounds like.",
    dishes: ["vietnamese-food", "korean-food", "japanese-food", "thai-food", "salad"],
    related: ["nothing-sounds-good", "cold-rainy-night", "on-a-budget"],
  },

  {
    s: "cold-rainy-night",
    h1: "What to eat on a cold rainy night",
    title: "What to Eat on a Cold Rainy Night — Somewhere Worth the Walk",
    desc:
      "The food that is actually worth going out in bad weather for, and how to pick a place when the deciding factor is how far you have to walk from the car.",
    lede:
      "On a bad-weather night the restaurant calculation changes shape. Distance from the door to the table becomes a real variable, and the quality bar for leaving the house at all goes up considerably.",
    why: [
      "What justifies the trip is food that is genuinely better in a restaurant than at home, and that is warm, slow and communal. Hotpot, Korean barbecue, a long-braised stew, a tagine, a bowl of ramen, a proper curry, raclette, birria: all things that are difficult or unpleasant to make for two people at home and excellent in a room that somebody else is heating.",
      "The second consideration is the room itself, and it is the one night where atmosphere legitimately outranks the menu. Somewhere warm, low-ceilinged, busy and slightly steamy is doing something a better-cooking, colder, emptier restaurant cannot. Basements are good. Windows fogged from the inside are the single best sign you have picked correctly.",
      "Practical bit: on a wet night, parking and walking distance genuinely matter, and the calculation flips from the usual one. The excellent place with a fifteen-minute walk from parking loses to the very good one you can park outside.",
    ],
    look: {
      intro: "What to look for:",
      items: [
        ["Cooked at the table", "Hotpot, Korean barbecue, shabu-shabu, raclette. Warmth and something to do, which is most of what you want tonight."],
        ["Long-braised anything", "Stew, tagine, birria, pot-au-feu, curry. The food that most rewards someone else having started it four hours ago."],
        ["A warm, enclosed room", "Low ceilings, soft light, busy. Steamed-up windows are the correct signal."],
        ["Close parking, short walk", "Worth more tonight than a better kitchen further away."],
        ["No queue outside", "Standing in the rain for forty minutes will define the evening more than the food will."],
      ],
    },
    query: "hot pot or something braised, warm room, park close",
    avoid:
      "Anywhere with a famous outdoor terrace, anywhere with a line, anywhere with a long walk from parking, and anything cold or delicate — this is the wrong night for a raw bar.",
    dishes: ["korean-food", "ramen", "curry", "soup", "chinese-food"],
    related: ["hot-day", "sad", "sunday-night"],
  },

  {
    s: "moving-day",
    h1: "What to eat on moving day",
    title: "What to Eat on Moving Day — Feeding Everyone Who Helped",
    desc:
      "Feeding a crew on moving day: what travels, what works without plates or a kitchen, and how to order for people who have been carrying boxes since eight.",
    lede:
      "Moving day food has a set of constraints no other meal has: no kitchen, no table, possibly no plates, several people who have been doing manual work for six hours, and a strict requirement that nobody needs a nap afterwards.",
    why: [
      "This is why pizza persists, and it genuinely is close to optimal — it needs no plates, no cutlery, stays edible at room temperature, and scales. The reason to consider anything else is that it is heavy, and a crew that still has two hours of lifting left will feel it.",
      "The better version of the same logic is food that is handheld, moderately substantial, and reheats or holds well: burritos, banh mi, sandwiches, gyros, kebab plates, fried chicken, tacos with the fillings separate. All of these arrive in a form that survives sitting on a box for twenty minutes while somebody finishes carrying a sofa.",
      "The timing point is worth more than the menu point: order before people are hungry, not after. On a moving day everyone works through the hunger and then stops all at once, and at that moment a forty-five minute delivery estimate is a genuinely miserable thing to announce.",
    ],
    look: {
      intro: "What actually works:",
      items: [
        ["Handheld, no plates", "Burritos, sandwiches, banh mi, gyros, tacos, pizza. Nothing that requires a fork and a flat surface."],
        ["Holds at room temperature", "It will sit for twenty minutes. Fried food goes soft; wrapped food does not."],
        ["Not so heavy it ends the day", "The main argument against ordering three large pizzas at 1pm."],
        ["Easy to order for a mixed group", "Somewhere with a vegetarian option that is not an afterthought, because you cannot check with everyone mid-lift."],
        ["Drinks, in quantity", "Consistently the thing that gets forgotten and the thing everyone actually wants."],
      ],
    },
    query: "big order to go, handheld food, delivers",
    avoid:
      "Waiting until everyone is starving to start ordering. Anything requiring cutlery, which you have packed. And do not attempt to cook in the new kitchen on the first day.",
    dishes: ["pizza", "sandwiches", "tacos", "fried-chicken", "mexican-food"],
    related: ["big-group", "on-a-budget", "work-team-lunch"],
  },
];
