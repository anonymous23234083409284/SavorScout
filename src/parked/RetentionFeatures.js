/* ===========================================================================
   PARKED — retention layer, temporarily out of the product

   Nothing here is deleted; it is unwired. The app was stripped back to the
   search tool, the streak and the verdict loop, and these are the pieces that
   came out: the daily prediction, the overnight seal, and the taste-map
   readouts (archetype, axes, signals, collection).

   This file is not imported anywhere, so it is neither bundled nor linted.
   To bring a piece back, move it into App.js and re-render it — the props
   each one expects are unchanged, and the backend endpoints that feed them
   are all still live.

   Depends on: familyLabel (./labels), TasteMap (./TasteMap), and the CSS
   blocks .pred-*, .seal-*, .arch-*, .ax-*, .sig-*, .coll/.slot, .climb-*
   which are all still present in App.css.
   =========================================================================== */

import React from "react";
import { familyLabel } from "../labels";
function Archetype({ archetype, choices }) {
  if (!archetype) return null;
  const share = archetype.share;
  return (
    <section className="arch">
      {share != null && share <= 0.25 && (
        <span className="arch-rare">{Math.max(1, Math.round(share * 100))}% of people</span>
      )}
      <span className="arch-tag">Your type</span>
      <h2 className="arch-name">{archetype.name}</h2>
      <p className="arch-line">{archetype.line}</p>
      {choices > 0 && (
        <p className="arch-from">From {choices.toLocaleString()} choices — you never answered a question about yourself.</p>
      )}
    </section>
  );
}

function AxisBar({ axis }) {
  const pct = Math.round(axis.position * 100);
  return (
    <div className="ax">
      <div className="ax-poles">
        <span className={pct < 45 ? "on" : ""}>{axis.left}</span>
        <span className={pct > 55 ? "on" : ""}>{axis.right}</span>
      </div>
      <div className="ax-rail">
        <div className="ax-track" />
        <div className="ax-dot" style={{ left: `${pct}%` }} />
      </div>
      <p className="ax-say">
        {axis.say}
        {axis.compare && <span className="ax-cmp"> {axis.compare}</span>}
      </p>
    </div>
  );
}

/* The open loop, in one line. Naming three specific unfinished things pulls
   harder than a progress bar, and costs the reader nothing to parse. */
function Measuring({ items }) {
  if (!items?.length) return null;
  const shown = items.slice(0, 3);
  const list = shown.length === 1
    ? shown[0]
    : `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
  return (
    <p className="soon">
      Still measuring — <b>{list}</b>. They appear here once we're sure.
    </p>
  );
}

function SignalList({ title, tone, nodes, empty }) {
  return (
    <div className="sig">
      <span className="sig-title">{title}</span>
      {nodes?.length ? (
        <ul className="sig-list">
          {nodes.map((n) => (
            <li className={`sig-item sig-item--${tone}`} key={n.id}>
              <span className="sig-name">{n.name}</span>
              <span className="sig-pct">{Math.round((n.affinity ?? 0) * 100)}%</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="sig-empty">{empty}</p>
      )}
    </div>
  );
}

/* Visible, countable gaps. Panini built a business on the fact that an empty
   slot you can point at pulls harder than "23% complete" ever will. */
function Collection({ collection }) {
  if (!collection?.found?.length) return null;
  return (
    <section className="card">
      <div className="card-head">
        <h2 className="card-title">Closest to complete</h2>
        <span className="card-sub">{familyLabel(collection.family)} · {collection.seen} of {collection.total}</span>
      </div>
      <div className="coll">
        {collection.found.map((c) => (
          <span className={`slot${c.rarity >= 3 ? " slot--rare" : " slot--got"}`} key={c.id}>
            {c.name}
          </span>
        ))}
        {Array.from({ length: collection.missing }).map((_, i) => (
          <span className="slot slot--fog" key={`f${i}`}>?</span>
        ))}
      </div>
    </section>
  );
}

function ReadScore({ record }) {
  if (!record?.total) return null;
  return (
    <span className="read-score" title={`${record.total} calls resolved`}>
      <span className="read-score-side">
        <span className="read-score-k">Model</span>
        <span className="read-score-n read-score-n--world">{record.model}</span>
      </span>
      <span className="read-score-div" />
      <span className="read-score-side">
        <span className="read-score-k">You</span>
        <span className="read-score-n read-score-n--you">{record.you}</span>
      </span>
    </span>
  );
}

function Seal({ seal, result, busy, onOpen, onDismiss }) {
  if (result) {
    const hit = result.correct;
    return (
      <section className={`seal seal--open seal--${hit ? "hit" : "miss"}`} role="status">
        <div className="seal-head">
          <span className="seal-tag">Last night's call</span>
          <ReadScore record={result.record} />
        </div>
        <p className="seal-outcome">{hit ? "We had you." : "You beat it."}</p>
        <p className="seal-sub">
          {hit
            ? <>Sealed yesterday, before you picked: <strong>{result.pickName}</strong>.</>
            : <>We'd written down <strong>{result.pickName}</strong>. You went the other way.</>}
        </p>
        <button className="seal-done" onClick={onDismiss}>{hit ? "Unsettling." : "Good."}</button>
      </section>
    );
  }

  if (!seal) return null;

  if (seal.state === "set") {
    return (
      <section className="seal seal--set">
        <span className="seal-wax" aria-hidden="true">✦</span>
        <div>
          <p className="seal-set-t">Sealed for tonight.</p>
          <p className="seal-set-s">What it said about you opens tomorrow morning.</p>
        </div>
      </section>
    );
  }

  if (seal.state !== "ready") return null;

  return (
    <section className="seal seal--ready">
      <div className="seal-head">
        <span className="seal-tag">Sealed {seal.sealedOn}</span>
      </div>
      <p className="seal-claim">We wrote down what you'd pick — before you picked it.</p>
      <div className="seal-pair">
        <span className={`seal-face${seal.chose === "left" ? " seal-face--yours" : ""}`}>
          {seal.left?.name}
        </span>
        <span className="seal-vs">vs</span>
        <span className={`seal-face${seal.chose === "right" ? " seal-face--yours" : ""}`}>
          {seal.right?.name}
        </span>
      </div>
      <p className="seal-chose">You took {seal.chose === "left" ? seal.left?.name : seal.right?.name}.</p>
      <button className="btn btn--hot seal-open" disabled={busy} onClick={() => onOpen(seal)}>
        {busy ? "Opening…" : "Open it"}
      </button>
    </section>
  );
}

function PredictionCard({ card }) {
  if (!card) return null;
  return (
    <div className="pc">
      {/* The raw family is internal taxonomy — "Handheld", "Constraint". */}
      <span className="pc-kind">{familyLabel(card.family) || card.kind}</span>
      <span className="pc-name">{card.name}</span>
      {card.rarity >= 3 && <span className="pc-rare">worth trying</span>}
    </div>
  );
}

function Prediction({ read, result, completed, total, busy, onAnswer, onDismiss }) {
  /* ---- resolved: the payoff, and the only place the warm/cool merge runs ---- */
  if (result) {
    const hit = result.correct;
    return (
      <section className={`pred pred--done pred--${hit ? "hit" : "miss"}`} role="status">
        <div className="pred-head">
          <span className="pred-tag">Called it</span>
          <ReadScore record={result.record} />
        </div>
        <p className="pred-outcome">{hit ? "We knew." : "You surprised us."}</p>
        <p className="pred-sub">
          {hit
            ? <>We had you down for <strong>{result.said}</strong> on {result.name}.</>
            : <>We said <strong>{result.said}</strong> on {result.name}. Noted — that's the answer that teaches us most.</>}
        </p>
        <button className="pred-next" disabled={busy} onClick={onDismiss}>
          {completed >= total ? "Done for today" : "Next"}
        </button>
      </section>
    );
  }

  if (!read) return null;

  if (read.state === "warming") {
    return (
      <section className="pred pred--warm">
        <div className="pred-head">
          <span className="pred-tag">Today's call</span>
          <ReadScore record={read.record} />
        </div>
        <p className="pred-claim pred-claim--quiet">We don't know you well enough to call it yet.</p>
        <p className="pred-sub">
          {typeof read.need === "number" && read.need > 0
            ? <><strong>{read.need}</strong> more {read.need === 1 ? "answer" : "answers"} before we start staking predictions on you.</>
            : <>Answer today's calls and we'll start staking predictions on you.</>}
        </p>
      </section>
    );
  }

  if (read.state === "spent") {
    return (
      <section className="pred pred--spent">
        <div className="pred-head">
          <span className="pred-tag">Today's calls</span>
          <ReadScore record={read.record} />
        </div>
        <p className="pred-claim pred-claim--quiet">All {total} answered.</p>
        <p className="pred-sub">New ones tomorrow morning — and your map keeps them.</p>
      </section>
    );
  }

  const staked = read.state === "staked";
  const pct = Math.round((read.confidence || 0) * 100);

  return (
    <section className="pred">
      <div className="pred-head">
        <span className="pred-tag">Today's call</span>
        <span className="pred-count">{completed}/{total}</span>
      </div>

      <p className="pred-claim">
        {staked ? "We've already written down whether you'll like this." : "No idea on this one. Teach us."}
      </p>

      {staked && (
        <div className="pred-stake">
          <div className="pred-stake-bar"><div className="pred-stake-fill" style={{ width: `${pct}%` }} /></div>
          <span className="pred-stake-n">{pct}% sure</span>
        </div>
      )}

      <PredictionCard card={read.card} />

      <div className="pred-acts">
        <button className="pred-btn pred-btn--match" disabled={busy}
                onClick={() => onAnswer(read, "left")}>
          <span className="pred-btn-k">Match</span>
          <span className="pred-btn-s">I'd like this</span>
        </button>
        <button className="pred-btn pred-btn--defy" disabled={busy}
                onClick={() => onAnswer(read, "right")}>
          <span className="pred-btn-k">Defy</span>
          <span className="pred-btn-s">Not for me</span>
        </button>
      </div>

      <button className="pred-skip" disabled={busy} onClick={() => onAnswer(read, "skip")}>
        Skip this one
      </button>

      {/* Stated plainly, every time. People give better answers when they know
          what the answer is for, and a mechanic that looks like a game but is
          quietly collecting data is the kind of thing that costs trust once
          someone works it out. Saying it costs nothing and buys the benefit
          of the doubt. */}
      <p className="pred-why">
        This is how we learn your taste — every answer makes the places we find you more personal.
      </p>
    </section>
  );
}

   thing this product sells. */
function TraitReveal({ trait, onClose }) {
  if (!trait) return null;
  return (
    <div className="reveal" role="status">
      <div className="reveal-card">
        <span className="reveal-tag">Something new about you</span>
        <h3 className="reveal-title">{trait.label}</h3>
        <p className="reveal-detail">{trait.detail}</p>
        <div className="reveal-conf">
          <div className="reveal-conf-bar"><div className="reveal-conf-fill" style={{ width: `${Math.round((trait.confidence || 0) * 100)}%` }} /></div>
          <span className="reveal-conf-n">{Math.round((trait.confidence || 0) * 100)}% confidence</span>
        </div>
        <button className="btn btn--cool" onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}
