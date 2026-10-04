const SESSION_TTL_MS = 30 * 60 * 1000;

type Entry = { studentId: string; expiresAt: number };

/**
 * Remembers which student opened each Tavus conversation so DELETE can only
 * end a session its owner created. In-memory, like the usage limiter: if the
 * instance restarts, the session simply expires on Tavus's own inactivity
 * timeout and the client sees a clean failure.
 */
export function createAvatarSessionRegistry(now: () => number = Date.now) {
  const sessions = new Map<string, Entry>();

  function prune() {
    const current = now();
    for (const [conversationId, entry] of sessions) {
      if (entry.expiresAt <= current) sessions.delete(conversationId);
    }
  }

  return {
    register(conversationId: string, studentId: string) {
      prune();
      sessions.set(conversationId, { studentId, expiresAt: now() + SESSION_TTL_MS });
    },
    isOwnedBy(conversationId: string, studentId: string): boolean {
      prune();
      return sessions.get(conversationId)?.studentId === studentId;
    },
    remove(conversationId: string) {
      sessions.delete(conversationId);
    },
    /** Removes and returns every live session a student still holds, so a new one can replace them. */
    takeAllFor(studentId: string): string[] {
      prune();
      const taken: string[] = [];
      for (const [conversationId, entry] of sessions) {
        if (entry.studentId === studentId) {
          taken.push(conversationId);
          sessions.delete(conversationId);
        }
      }
      return taken;
    },
  };
}

export const avatarSessionRegistry = createAvatarSessionRegistry();
