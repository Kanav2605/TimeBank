import { User, SkillItem, SkillMatchRecommendation, AvailabilitySlot } from './types.js';

export class MatchingEngine {
  private static getSkillMatchRank(offered: SkillItem, needed: SkillItem): number {
    const oName = offered.name.toLowerCase().trim();
    const nName = needed.name.toLowerCase().trim();
    if (oName === nName) return 3; // exact match
    if (oName.includes(nName) || nName.includes(oName)) return 2; // substring / partial match
    if (offered.category === needed.category) return 1; // domain / category match
    return 0;
  }

  /**
   * Calculate compatibility between learner and potential helper
   */
  public static calculateMatchScore(
    learner: User,
    helper: User,
    neededSkill: SkillItem,
    offeredSkill: SkillItem,
    learnerSlots: AvailabilitySlot[],
    helperSlots: AvailabilitySlot[]
  ): {
    score: number;
    reasons: string[];
    isDirectExchange: boolean;
    sharedSlots: string[];
  } {
    let score = 50; // base score
    const reasons: string[] = [];

    // 1. Skill Exactness / Category match
    const skillRank = this.getSkillMatchRank(offeredSkill, neededSkill);
    if (skillRank === 3) {
      score += 25;
      reasons.push(`Exact skill match for "${offeredSkill.name}"`);
    } else if (skillRank === 2) {
      score += 20;
      reasons.push(`Close skill match for "${offeredSkill.name}"`);
    } else if (skillRank === 1) {
      score += 15;
      reasons.push(`Related domain match in ${offeredSkill.category}`);
    }

    // 2. Direct bilateral exchange check (does helper need something learner offers?)
    let isDirectExchange = false;
    let bilateralMatchName: string | undefined;
    for (const hn of helper.skillsNeeded) {
      const match = learner.skillsOffered.find(
        (lo) => this.getSkillMatchRank(lo, hn) >= 2
      );
      if (match) {
        bilateralMatchName = match.name;
        break;
      }
    }

    if (bilateralMatchName) {
      isDirectExchange = true;
      score += 20;
      reasons.push(`Direct bilateral trade: ${helper.name} wants ${bilateralMatchName}, which you offer!`);
    } else {
      const catMatch = helper.skillsNeeded.some((hn) =>
        learner.skillsOffered.some((lo) => lo.category === hn.category)
      );
      if (catMatch) {
        score += 8;
        reasons.push(`Mutual interest in complementary domains`);
      }
    }

    // 3. Reliability & Rating bonus
    if (helper.reliabilityScore >= 95) {
      score += 8;
      reasons.push(`High reliability peer (${helper.reliabilityScore}% completion rate)`);
    } else if (helper.reliabilityScore >= 85) {
      score += 4;
    }

    if (helper.rating >= 4.8) {
      score += 7;
      reasons.push(`Top-rated mentor (${helper.rating.toFixed(1)}/5.0 stars)`);
    }

    // 4. Availability Overlap (parse minutes to avoid 9:00 vs 10:00 string collation errors)
    const sharedSlots: string[] = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const parseTime = (t: string): number => {
      const [h, m] = t.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    for (const hSlot of helperSlots) {
      const hStart = parseTime(hSlot.startTime);
      const hEnd = parseTime(hSlot.endTime);
      const match = learnerSlots.find((lSlot) => {
        if (lSlot.dayOfWeek !== hSlot.dayOfWeek) return false;
        const lStart = parseTime(lSlot.startTime);
        const lEnd = parseTime(lSlot.endTime);
        return lStart < hEnd && hStart < lEnd;
      });

      if (match) {
        sharedSlots.push(`${dayNames[hSlot.dayOfWeek]} around ${hSlot.startTime}-${hSlot.endTime}`);
      }
    }

    if (sharedSlots.length > 0) {
      score += 10;
      reasons.push(`Schedule compatibility: ${sharedSlots.length} overlapping time windows found`);
    }

    // Cap score at 100
    const finalScore = Math.min(100, Math.max(0, Math.round(score)));

    return {
      score: finalScore,
      reasons,
      isDirectExchange,
      sharedSlots,
    };
  }

  /**
   * Find best matching helpers for a given learner and their skill needs
   */
  public static findRecommendations(
    learner: User,
    allUsers: User[],
    allSlots: AvailabilitySlot[]
  ): SkillMatchRecommendation[] {
    const recommendations: SkillMatchRecommendation[] = [];
    const learnerSlots = allSlots.filter((s) => s.userId === learner.id);

    // Filter out learner themselves
    const potentialHelpers = allUsers.filter((u) => u.id !== learner.id);

    for (const neededSkill of learner.skillsNeeded) {
      for (const helper of potentialHelpers) {
        // Find best offered skill based on match quality (exact > substring > category)
        let bestOfferedSkill: SkillItem | undefined;
        let bestRank = 0;

        for (const o of helper.skillsOffered) {
          const rank = this.getSkillMatchRank(o, neededSkill);
          if (rank > bestRank) {
            bestRank = rank;
            bestOfferedSkill = o;
          }
        }

        if (!bestOfferedSkill) continue;

        const helperSlots = allSlots.filter((s) => s.userId === helper.id);
        const matchResult = this.calculateMatchScore(
          learner,
          helper,
          neededSkill,
          bestOfferedSkill,
          learnerSlots,
          helperSlots
        );

        // Find if learner offers something helper needs using aligned bilateral rank
        let matchedSkillNeeded: SkillItem | undefined;
        let bestReciprocalRank = 0;
        for (const hn of helper.skillsNeeded) {
          for (const lo of learner.skillsOffered) {
            const rank = this.getSkillMatchRank(lo, hn);
            if (rank > bestReciprocalRank && rank >= 2) {
              bestReciprocalRank = rank;
              matchedSkillNeeded = hn;
            }
          }
        }

        recommendations.push({
          user: helper,
          matchType: matchResult.isDirectExchange ? 'DIRECT_EXCHANGE' : (helper.rating >= 4.8 ? 'TOP_RATED' : 'SKILL_MATCH'),
          matchedSkillOffered: bestOfferedSkill,
          matchedSkillNeeded,
          compatibilityScore: matchResult.score,
          commonAvailability: matchResult.sharedSlots,
          reasons: matchResult.reasons,
        });
      }
    }

    // Sort by compatibility score descending
    return recommendations.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  }

  /**
   * Multi-way circular time-trade detector (A -> B -> C -> A)
   */
  public static findCircularTrades(users: User[]): Array<{
    cycle: Array<{ giver: string; receiver: string; skill: string }>;
    description: string;
  }> {
    const cycles: Array<{
      cycle: Array<{ giver: string; receiver: string; skill: string }>;
      description: string;
    }> = [];

    // Check 3-way cycles: u1 -> u2 -> u3 -> u1
    for (const u1 of users) {
      for (const u2 of users) {
        if (u1.id === u2.id) continue;
        // Does u1 offer something u2 needs?
        const u1GivesToU2 = u1.skillsOffered.find((o) =>
          u2.skillsNeeded.some(
            (n) =>
              n.name.toLowerCase().trim() === o.name.toLowerCase().trim() ||
              o.name.toLowerCase().includes(n.name.toLowerCase()) ||
              n.name.toLowerCase().includes(o.name.toLowerCase())
          )
        );
        if (!u1GivesToU2) continue;

        for (const u3 of users) {
          if (u3.id === u1.id || u3.id === u2.id) continue;

          // Deduplicate: each unique cycle is anchored at its lexicographically smallest user ID
          if (u1.id > u2.id || u1.id > u3.id) continue;

          // Does u2 offer something u3 needs?
          const u2GivesToU3 = u2.skillsOffered.find((o) =>
            u3.skillsNeeded.some(
              (n) =>
                n.name.toLowerCase().trim() === o.name.toLowerCase().trim() ||
                o.name.toLowerCase().includes(n.name.toLowerCase()) ||
                n.name.toLowerCase().includes(o.name.toLowerCase())
            )
          );
          if (!u2GivesToU3) continue;

          // Does u3 offer something u1 needs?
          const u3GivesToU1 = u3.skillsOffered.find((o) =>
            u1.skillsNeeded.some(
              (n) =>
                n.name.toLowerCase().trim() === o.name.toLowerCase().trim() ||
                o.name.toLowerCase().includes(n.name.toLowerCase()) ||
                n.name.toLowerCase().includes(o.name.toLowerCase())
            )
          );
          if (!u3GivesToU1) continue;

          // Found a 3-way cycle!
          cycles.push({
            cycle: [
              { giver: u1.name, receiver: u2.name, skill: u1GivesToU2.name },
              { giver: u2.name, receiver: u3.name, skill: u2GivesToU3.name },
              { giver: u3.name, receiver: u1.name, skill: u3GivesToU1.name },
            ],
            description: `${u1.name} (${u1GivesToU2.name}) → ${u2.name} (${u2GivesToU3.name}) → ${u3.name} (${u3GivesToU1.name}) → ${u1.name}`,
          });
        }
      }
    }

    return cycles;
  }
}
