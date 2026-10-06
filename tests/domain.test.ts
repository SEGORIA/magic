import { test } from "node:test";
import assert from "node:assert/strict";
import {
  progress,
  latestEvaluations,
  nextCardIndex,
  Evaluation,
  Skill,
  TvCard,
} from "../src/lib/domain";
const skill: Skill = {
  id: "s",
  team_id: "t",
  name: "Skill",
  area: "Tumbling",
  criteria: ["A", "B", "C"],
  active: true,
};
const evaluation: Evaluation = {
  id: "e",
  athlete_id: "a",
  team_id: "t",
  skill_id: "s",
  author_id: "c",
  scores: [true, true, false],
  mastered: false,
  comment: "",
  next_goal: "",
  created_at: "2026-10-01",
  revision_of: null,
};
test("no evaluation is unknown, not a failed score", () =>
  assert.deepEqual(progress([skill], []), {
    percent: null,
    coverage: 0,
    mastered: 0,
    total: 1,
  }));
test("progress and coverage are separate measures", () =>
  assert.deepEqual(progress([skill, { ...skill, id: "s2" }], [evaluation]), {
    percent: 67,
    coverage: 50,
    mastered: 0,
    total: 2,
  }));
test("a revision replaces an earlier result without duplicate awards", () => {
  const revised = {
    ...evaluation,
    id: "r",
    revision_of: "e",
    scores: [true, true, true],
    mastered: true,
    created_at: "2026-10-02",
  };
  assert.equal(latestEvaluations([evaluation, revised]).length, 1);
  assert.equal(progress([skill], [evaluation, revised]).mastered, 1);
});
test("results from an unrelated curriculum are ignored", () =>
  assert.equal(
    progress([skill], [{ ...evaluation, skill_id: "other" }]).percent,
    null,
  ));
test("TV wraps around and tolerates removals", () => {
  const cards = [{ id: "1" }, { id: "2" }] as TvCard[];
  assert.equal(nextCardIndex(cards, "2"), 0);
  assert.equal(nextCardIndex([], null), 0);
  assert.equal(nextCardIndex(cards, "missing"), 0);
});
