// Plain-English HOW-TO-READ lines for dense surfaces.
// Written against the live app, not copied from DEMO-ONLY prototype blocks.

export const HOW_TO_READ = {
  pipeline: "Each card is one framework agent. The status line says whether it can run. Click a card to inspect it and launch.",
  export: "This is the client brief. Amber is the constraint. Each block below is a completed framework — empty roster slots are omitted.",
  exportPrint: "This is the printed brief. The constraint is in the lede. Each heading is a completed framework, written as sections rather than on-screen maps.",
  tocRoster: "Each column is a team from the signed org install. Empty seats are not invented.",
  evidence: "Each line is a source this map used.",
  bmc: "Nine boxes, one business. Each box is a part of how the company works. Click a box to read the full claim and its sources.",
  industrymap: "Read top to bottom: the market's parts, the companies on them, how technology and money and people move, then history and future.",
  fiveforces: "Five pressures on the market. Each card is one force. The score says how hard that force makes it to earn money here.",
  pestle: "Six kinds of weather outside the company. Each card is one macro force moving toward you or away.",
  swot: "Top grid: what you have and what you face. Bottom grid: those crossed into strategy options. Click a cell for the full list.",
  vrio: "Each row is a capability run through four gates. What survives the gates is actually defensible.",
  ansoff: "Four ways to grow. Rows are markets; columns are products. Click a quadrant to read the bet and its risk.",
  threehorizons: "Three time buckets for money and attention. Read across to see whether the future is being starved.",
  blueocean: "Four moves — eliminate, reduce, raise, create — plus the value curve. Each card is one way to redraw the market.",
  jtbd: "Each row is a job customers hire you for, with the outcome they want and the confidence attached.",
  vpc: "Left is what customers want. Right is what you ship. The gaps are the point.",
  kano: "Each row is a feature classed by how it actually changes satisfaction — must-be, performance, or delighter.",
  sevens: "Seven parts of the organization. Each card is a gap score: where the ship will silently refuse to turn.",
  bsc: "Each card is a live measure wired to a source. If a number stops moving, it should say so here.",
  toc: "The argument for the one constraint. Each card is a step in that argument, not a second diagnosis.",
  raci: "Rows are work. Columns are people. The letter says who does, who decides, who is consulted, who is informed.",
};

export function howToReadFor(id) {
  return HOW_TO_READ[id] || "";
}
