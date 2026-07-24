/**
 * Storage-agnostic contract for teacher-facing curriculum browsing
 * (Epic G5, docs/15_Phase2_Roadmap.md's Phase 6 "Platform Integrations").
 *
 * Deliberately a new, separate interface from KnowledgeProvider
 * (lib/knowledge/knowledge-provider.ts, Planning Agent's per-ID concept
 * lookup) and ConceptSearchProvider (lib/knowledge/concept-search-provider.ts,
 * chat's fuzzy topic-to-concept routing) -- neither is modified or
 * extended by this file. Those two exist to serve the student pipeline;
 * this one exists so Curriculum Explorer (G6) can query MentorOS's own
 * curriculum and, later, Learning Commons' broader graph through the
 * same shape, side by side, always source-attributed.
 *
 * Kept to one method on purpose: `search()` is the only capability
 * 10_API_Contracts.md's `GET /api/teacher/curriculum` actually needs.
 * Learning Commons' three MCP tools (Find Academic Standard Statement,
 * Find Learning Components, Find Learning Progressions) aren't reflected
 * here -- that provider isn't designed yet, and this interface shouldn't
 * guess at its shape ahead of that work.
 */

export type CurriculumSource = "postgres" | "learning-commons";

export type CurriculumSearchResult = {
  id: string;
  name: string;
  source: CurriculumSource;
  standardCode?: string;
};

export interface CurriculumProvider {
  readonly source: CurriculumSource;
  search(query: string): Promise<CurriculumSearchResult[]>;
}
