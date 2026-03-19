/**
 * RelationshipStore — manages family relationships and delegation permissions.
 *
 * Provides permission checks (canActOnBehalf), relationship lookups,
 * and delegated action logging.
 */

import type {
  FamilyRelationship,
  Household,
  DelegatedAction,
  PermissionScope,
  RelationshipType,
} from "./citizen-data-model";

/** Default permission scopes for each relationship type */
const DEFAULT_PERMISSIONS: Record<RelationshipType, PermissionScope[]> = {
  parent_of: ["full_authority"],
  spouse: ["view_status", "receive_alerts"],
  partner: [],
  child_of: [],
  guardian_of: ["full_authority"],
  executor_of: ["view_data", "submit_on_behalf", "make_payments", "correspond"],
  carer_of: ["view_status", "receive_alerts"],
  attorney_of: ["view_data", "submit_on_behalf", "manage_consent", "make_payments", "correspond"],
  representative_of: ["view_status", "view_data", "correspond"],
};

/** All scopes that full_authority expands to */
const FULL_AUTHORITY_SCOPES: PermissionScope[] = [
  "view_status",
  "view_data",
  "submit_on_behalf",
  "receive_alerts",
  "manage_consent",
  "make_payments",
  "appeal_decisions",
  "correspond",
];

export class RelationshipStore {
  private relationships: Map<string, FamilyRelationship[]> = new Map();
  private households: Map<string, Household> = new Map();
  private actions: DelegatedAction[] = [];

  /** Load relationships for a user (from persona JSON) */
  loadRelationships(userId: string, rels: FamilyRelationship[]): void {
    this.relationships.set(userId, rels);
  }

  /** Load a household definition */
  loadHousehold(household: Household): void {
    this.households.set(household.id, household);
  }

  /** Get all relationships where this user is the actor (fromUserId) */
  getRelationships(userId: string): FamilyRelationship[] {
    return this.relationships.get(userId) ?? [];
  }

  /** Get a specific relationship by ID */
  getRelationship(relationshipId: string): FamilyRelationship | undefined {
    for (const rels of this.relationships.values()) {
      const found = rels.find((r) => r.id === relationshipId);
      if (found) return found;
    }
    return undefined;
  }

  /** Get a household by ID */
  getHousehold(householdId: string): Household | undefined {
    return this.households.get(householdId);
  }

  /** Get all members of a user's household */
  getHouseholdMembers(userId: string): string[] {
    for (const household of this.households.values()) {
      if (household.members.some((m) => m.userId === userId)) {
        return household.members.map((m) => m.userId);
      }
    }
    return [userId];
  }

  /**
   * Check whether actorId can perform a specific scope on subjectId.
   * Returns true if any active relationship grants the required permission.
   */
  canActOnBehalf(
    actorId: string,
    subjectId: string,
    scope: PermissionScope,
  ): boolean {
    const rels = this.getRelationships(actorId);
    for (const rel of rels) {
      if (rel.toUserId !== subjectId || !rel.active) continue;
      for (const perm of rel.permissions) {
        // Check expiry
        if (perm.expiresAt && new Date(perm.expiresAt) < new Date()) continue;
        // Check service filter if applicable
        // (service filter is checked at action-logging time, not here)
        if (perm.scope === "full_authority") return true;
        if (perm.scope === scope) return true;
      }
    }
    return false;
  }

  /** Get all permission scopes an actor has over a subject */
  getPermissions(actorId: string, subjectId: string): PermissionScope[] {
    const scopes = new Set<PermissionScope>();
    const rels = this.getRelationships(actorId);
    for (const rel of rels) {
      if (rel.toUserId !== subjectId || !rel.active) continue;
      for (const perm of rel.permissions) {
        if (perm.expiresAt && new Date(perm.expiresAt) < new Date()) continue;
        if (perm.scope === "full_authority") {
          for (const s of FULL_AUTHORITY_SCOPES) scopes.add(s);
        } else {
          scopes.add(perm.scope);
        }
      }
    }
    return Array.from(scopes);
  }

  /** Get all users that this actor can act on behalf of */
  getSubjects(actorId: string): Array<{ userId: string; type: RelationshipType }> {
    const rels = this.getRelationships(actorId);
    return rels
      .filter((r) => r.active && r.permissions.length > 0)
      .map((r) => ({ userId: r.toUserId, type: r.type }));
  }

  /** Log a delegated action */
  logDelegatedAction(action: DelegatedAction): void {
    this.actions.push(action);
  }

  /** Get all actions taken on behalf of a subject */
  getActionsOnBehalf(subjectId: string): DelegatedAction[] {
    return this.actions.filter((a) => a.subjectUserId === subjectId);
  }

  /** Get all actions performed by an actor */
  getActionsByActor(actorId: string): DelegatedAction[] {
    return this.actions.filter((a) => a.actorUserId === actorId);
  }

  /** Get default permissions for a relationship type */
  static getDefaultPermissions(type: RelationshipType): PermissionScope[] {
    return [...(DEFAULT_PERMISSIONS[type] ?? [])];
  }
}
