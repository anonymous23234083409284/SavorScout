"""Words for the daily posts: TikTok captions, X threads and Threads threads.

Every line is built from the same facts the video shows (walking times measured
on the street network, counts within a mile, the streets with the most spots,
the share that are local rather than chains), never "best", "cheap" or "open
now", which the data cannot back. Templates rotate by seed so the account does
not post the same sentence shape every day, which reads as a bot to readers
and to ranking systems alike.

Reach habits baked in:
  * X: no hashtags, the link goes in a reply rather than the post itself.
  * Threads: one topic tag, the link in a reply.
  * TikTok: a question to invite comments, a "save this" nudge, four or five
    specific hashtags and no URL (TikTok captions are not clickable).
"""
import re

EMOJI = {"pizza": "\U0001F355", "coffee": "☕", "mexican-food": "\U0001F32E", "asian-food": "\U0001F35C",
         "sushi": "\U0001F363", "burgers": "\U0001F354", "sandwiches": "\U0001F96A", "deli": "\U0001F96A",
         "italian-food": "\U0001F35D", "chinese-food": "\U0001F961", "bakery": "\U0001F950", "dessert": "\U0001F370",
         "seafood": "\U0001F990", "thai-food": "\U0001F35C", "indian-food": "\U0001F35B", "japanese-food": "\U0001F371",
         "vietnamese-food": "\U0001F35C", "korean-food": "\U0001F372", "breakfast": "\U0001F95E", "bbq": "\U0001F356"}
QUESTION = {"pizza": "Which slice wins?", "coffee": "Which one's your study spot?", "mexican-food": "Which one are you picking?",
            "asian-food": "What are we getting?", "sushi": "Where are you getting sushi?", "burgers": "Whose burger is it?"}
RUN = {"pizza": "pizza run", "coffee": "coffee run", "mexican-food": "taco run", "asian-food": "noodle run",
       "sushi": "sushi night", "burgers": "burger run", "sandwiches": "lunch break", "deli": "lunch break",
       "bakery": "morning", "dessert": "dessert run", "breakfast": "Sunday morning"}
FOOD_TAG = {"pizza": "pizza", "coffee": "coffee", "mexican-food": "tacos", "asian-food": "asianfood", "sushi": "sushi",
            "burgers": "burgers", "sandwiches": "sandwiches", "deli": "deli", "italian-food": "italianfood",
            "chinese-food": "chinesefood", "bakery": "bakery", "dessert": "dessert", "seafood": "seafood",
            "thai-food": "thaifood", "indian-food": "indianfood", "japanese-food": "japanesefood",
            "vietnamese-food": "vietnamesefood", "korean-food": "koreanfood", "breakfast": "brunch", "bbq": "bbq"}

# Evergreen questions for the day's conversation post: no data claim, just an
# invitation to reply, which is what earns reach on X and Threads.
QUESTIONS = [
    "What's the one spot near campus you'd send a freshman to first?",
    "Name a place near your campus that deserves way more hype.",
    "Late night near campus: pizza, tacos, or ramen?",
    "What's the best thing you can get near campus for under ten bucks? School + spot.",
    "Which campus has the best food within walking distance? Make your case.",
    "Where near campus do you actually get work done? Coffee shop, library, or somewhere weird?",
    "The food spot near campus you'll miss most after graduating. Go.",
    "What's the most underrated restaurant within a 10-minute walk of your dorm?",
    "First week on campus: where should a new student eat? School + spot.",
    "Group dinner near campus, 6 people, no reservation. Where are you going?",
    "Coffee near campus: chain or local? And which one?",
    "What's a near-campus spot that's been there forever and is still good?",
    "Rate your campus food scene out of 10. School + score.",
    "If you could bring one restaurant from home to your college town, what would it be?",
    "What's the walk you'd make in the rain for food near campus?",
    "Best study-break snack within a 5-minute walk of your library?",
    "Which near-campus spot is better than the hype says?",
    "Breakfast near campus: where are you going on a Saturday?",
    "What's your post-exam celebration meal near campus?",
    "Visiting a friend at another school: what's the one place they have to take you?",
    "Dining hall or walk off campus? What's the move at your school?",
    "What near-campus spot should every alum visit when they come back?",
    "Most reliable takeout near campus during finals week?",
    "Which street near your campus has the best food? Name it.",
    "The perfect near-campus food crawl: three stops. What are they?",
    "What's one dish near your campus you'd put up against anywhere?",
    "Cheap eats near campus are getting rarer. Who's still holding it down?",
    "Where do you take visiting parents to eat near campus?",
]


def u16(s):
    return len(s.encode("utf-16-le")) // 2


def x_len(s):
    return u16(re.sub(r"https?://\S+", "x" * 23, s))   # X counts every link as 23


# The tag people use for a city's food, where it is not simply <city>food.
CITY_TAG = {"New York": "nycfood", "Los Angeles": "lafood", "University Park": "statecollegefood",
            "Washington": "dcfood", "San Francisco": "sffood", "Philadelphia": "phillyfood",
            "Las Vegas": "vegasfood", "New Orleans": "nolafood", "Saint Louis": "stlfood", "St Louis": "stlfood"}


def tag_of(short):
    return re.sub(r"[^a-z0-9]", "", short.lower())


def a_an(n):
    """'an 8-minute walk', 'an 11-minute walk', 'a 4-minute walk'."""
    return "an" if str(n).startswith("8") or n in (11, 18) else "a"


def facts(c):
    """Short, true sentences from the page data, best first."""
    out = []
    st = c.get("streets") or []
    n, noun = c["count"], c["foodNoun"]
    if len(st) >= 2 and st[0][1] == st[1][1]:
        out.append(f"{st[0][0]} and {st[1][0]} have {st[0][1]} {noun} each.")
    elif st:
        out.append(f"{st[0][1]} of the {n} are on {st[0][0]}.")
    if c.get("localPct") and c["localPct"] >= 60:
        out.append(f"{c['localPct']}% are local, not chains.")
    if c.get("withinHalfMile") and 5 <= c["withinHalfMile"] < n:
        out.append(f"{c['withinHalfMile']} are within half a mile.")
    return out


def listing(spots, sep=" · "):
    return "\n".join(f"{s['name']}{sep}{s['walk_min']} min" for s in spots)


def x_thread(c, spots, seed):
    """[post, reply] for X, the post under 280."""
    head = c["headNoun"]
    q = QUESTION.get(c["food"], "Which one's your go-to?")
    f = facts(c)
    shapes = [
        lambda: f"There are {c['count']} {c['foodNoun']} within a mile of {c['short']}.\n\nThe 5 closest on foot:\n{listing(spots)}\n\n{q}",
        lambda: f"{head} you can walk to from {c['short']}, closest first:\n\n{listing(spots)}\n\n{f[0] if f else q}",
        lambda: f"{c['count']} {c['foodNoun']} within a mile of {c['short']}. {f[0] if f else ''}\n\nClosest on foot:\n{listing(spots)}",
    ]
    for i in range(len(shapes)):
        text = re.sub(r" +\n", "\n", shapes[(seed + i) % len(shapes)]()).strip()
        if x_len(text) <= 280:
            break
    else:
        text = f"{head} you can walk to from {c['short']}:\n\n{listing(spots[:4])}"
    reply = [f"All {c['count']}, closest first, with walking distance: {c['url']}",
             f"The full list with addresses: {c['url']}",
             f"All {c['count']} on one map: {c['url']}"][seed % 3]
    return [text, reply]


def threads_thread(c, spots, seed):
    head = c["headNoun"]
    q = QUESTION.get(c["food"], "Which one's your go-to?")
    f = facts(c)
    extra = " ".join(f[:2])
    shapes = [
        lambda: f"{head} you can walk to from {c['short']}, closest first:\n\n{listing(spots)}\n\nThere are {c['count']} {c['foodNoun']} within a mile of campus. {extra} Who did we miss?",
        lambda: f"{c['count']} {c['foodNoun']} within a mile of {c['short']}. We mapped the walk to the closest five:\n\n{listing(spots)}\n\n{extra} {q}",
        lambda: f"{c['short']} students, these are the {c['foodNoun']} closest to campus on foot:\n\n{listing(spots)}\n\n{c['count']} within a mile in all. {extra} {q}",
    ]
    text = re.sub(r" +", " ", shapes[seed % len(shapes)]()).replace(" \n", "\n").strip()
    if u16(text) > 500:
        text = f"{head} you can walk to from {c['short']}, closest first:\n\n{listing(spots)}\n\n{q}"
    reply = [f"Every one of the {c['count']}, closest first: {c['url']}", f"The full list: {c['url']}",
             f"All {c['count']} on one map: {c['url']}"][seed % 3]
    topic = re.sub(r"[&.]", "", c["short"]).strip()[:50] or "College Food"
    return [text, reply], topic


def tiktok_caption(c, spots, seed):
    emoji = EMOJI.get(c["food"], "\U0001F37D️")
    q = QUESTION.get(c["food"], "Which one's your go-to?")
    run = RUN.get(c["food"], "next food run")
    lo, hi = spots[0]["walk_min"], spots[-1]["walk_min"]
    shapes = [
        f"5 {c['foodNoun']} you can walk to from {c['short']} {emoji} The closest is {a_an(lo)} {lo}-minute walk from campus. Save this for your next {run}. {q}",
        f"{c['count']} {c['foodNoun']} within a mile of {c['short']} {emoji} These 5 are {lo} to {hi} minutes from campus on foot. Save it for later. {q}",
        f"{c['headNoun']} near {c['short']}, measured on foot {emoji} All 5 are within {a_an(hi)} {hi}-minute walk of campus. Save this one. {q}",
    ]
    city = CITY_TAG.get(c.get("city")) or (tag_of(c["city"]) + "food" if c.get("city") else None)
    tags = [tag_of(c["short"]), city, FOOD_TAG.get(c["food"]), "collegefood", "campusfood"]
    tags = [t for t in dict.fromkeys(tags) if t][:5]
    return shapes[seed % len(shapes)] + "\n\n" + " ".join("#" + t for t in tags)


def question(seed, used):
    pool = [q for q in QUESTIONS if q not in used] or QUESTIONS
    return pool[seed % len(pool)]
