/**
 * Storage-agnostic contract for resolving a free-text topic/subtopic (as
 * extracted by Router Agent, which has no formal taxonomy -- see M2-01's
 * open issue) into a concept ID. Deliberately separate from
 * KnowledgeProvider (see M5 design agreement): search can evolve
 * independently of how curriculum knowledge is stored and read by ID.
 *
 * M5B's implementation (TrigramConceptSearchProvider) uses Postgres
 * trigram similarity -- a real improvement over M3's exact-name
 * matching, but still not semantic search. A future implementation
 * backed by embeddings can replace it without any change to this
 * interface, Planning Agent, or KnowledgeProvider.
 */
export interface ConceptSearchProvider {
  findConceptIdByTopic(
    topic: string | undefined,
    subtopic?: string,
  ): Promise<string | null>;
}
