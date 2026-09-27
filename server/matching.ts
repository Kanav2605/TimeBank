import { User, SkillItem, SkillMatchRecommendation, AvailabilitySlot } from './types.js';

export class MatchingEngine {
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
    const skillNameA = neededSkill.name.toLowerCase().trim();
    const skillNameB = offeredSkill.name.toLowerCase().trim();

    if (skillNameA === skillNameB) {
      score += 25;
      reasons.push(`Exact skill match for "${offeredSkill.name}"`);
    } else if (
      skillNameA.includes(skillNameB) ||
      skillNameB.includes(skillNameA) ||
      neededSkill.category === offeredSkill.category
    ) {
      score += 15;
      reasons.push(`Related domain match in ${offeredSkill.category}`);
    }

    // 2. Direct bilateral exchange check (does helper need something learner offers?)
    let isDirectExchange = false;
    let bilateralMatchName: string | undefined;
    for (const hn of helper.skillsNeeded) {
      const match = learner.skillsOffered.find((lo) =>
        lo.name.toLowerCase().trim() === hn.name.toLowerCase().trim() ||
        lo.name.toLowerCase().includes(hn.name.toLowerCase()) ||
        hn.name.toLowerCase().includes(lo.name.toLowerCase())
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

    // 4. Availability Overlap
    const sharedSlots: string[] = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (const hSlot of helperSlots) {
      // Find matching learner slot on same day
      const match = learnerSlots.find((lSlot) => {
        if (lSlot.dayOfWeek !== hSlot.dayOfWeek) return false;
        // Overlap test: startA < endB and startB < endA
        return lSlot.startTime < hSlot.endTime && hSlot.startTime < lSlot.endTime;
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
        // Find if helper offers this skill or related category
        const offeredSkill = helper.skillsOffered.find(
          (o) =>
            o.name.toLowerCase().trim() === neededSkill.name.toLowerCase().trim() ||
            o.name.toLowerCase().includes(neededSkill.name.toLowerCase()) ||
            neededSkill.name.toLowerCase().includes(o.name.toLowerCase()) ||
            o.category === neededSkill.category
        );

        if (!offeredSkill) continue;

        const helperSlots = allSlots.filter((s) => s.userId === helper.id);
        const matchResult = this.calculateMatchScore(
          learner,
          helper,
          neededSkill,
          offeredSkill,
          learnerSlots,
          helperSlots
        );

        // Find if learner offers something helper needs
        const matchedSkillNeeded = helper.skillsNeeded.find((hn) =>
          learner.skillsOffered.some((lo) => lo.name.toLowerCase() === hn.name.toLowerCase())
        );

        recommendations.push({
          user: helper,
          matchType: matchResult.isDirectExchange ? 'DIRECT_EXCHANGE' : (helper.rating >= 4.8 ? 'TOP_RATED' : 'SKILL_MATCH'),
          matchedSkillOffered: offeredSkill,
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
