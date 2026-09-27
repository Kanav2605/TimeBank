import {
  User,
  LearningGoal,
  StudyPlan,
  PlanMilestone,
  TeamworkPod,
  TeamworkPodMember,
  SkillBoost,
} from './types.js';

export class LearningEngine {
  // 1. Learning Goals (/goal)
  static createGoal(
    userId: string,
    title: string,
    category: string,
    targetMinutes: number,
    targetDate: string,
    linkedSkill?: string
  ): LearningGoal {
    if (!userId || !title) {
      throw new Error('userId and title are required for a learning goal');
    }
    const safeTarget = Math.max(15, Number(targetMinutes) || 60);
    return {
      id: `goal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      title: title.trim(),
      category: category || 'Academics',
      targetMinutes: safeTarget,
      completedMinutes: 0,
      status: 'IN_PROGRESS',
      targetDate: targetDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      linkedSkill,
      createdAt: new Date().toISOString(),
    };
  }

  static addGoalProgress(goal: LearningGoal, minutesToAdd: number): LearningGoal {
    const mins = Math.max(0, Number(minutesToAdd) || 0);
    goal.completedMinutes += mins;
    if (goal.completedMinutes >= goal.targetMinutes) {
      goal.status = 'COMPLETED';
    }
    return goal;
  }

  // 2. Study & Exchange Plans (/plan)
  static generateStudyPlan(user: User, goalOrSkillName: string): StudyPlan {
    const cleanSkill = (goalOrSkillName || user.skillsNeeded?.[0]?.name || 'Web Development').trim();
    const milestones: PlanMilestone[] = [
      {
        id: `ms_${Date.now()}_1`,
        title: `Phase 1: ${cleanSkill} Fundamentals & Core Architecture`,
        targetMinutes: 30,
        completed: false,
        recommendedSkill: cleanSkill,
        notes: 'Interactive setup, fundamentals, syntax, and conceptual walkthrough.',
      },
      {
        id: `ms_${Date.now()}_2`,
        title: `Phase 2: Hands-on Practice & Guided Project Pairing`,
        targetMinutes: 45,
        completed: false,
        recommendedSkill: cleanSkill,
        notes: 'Pair program and work through exercises or real codebases.',
      },
      {
        id: `ms_${Date.now()}_3`,
        title: `Phase 3: Peer Code Review, Q&A & Retrospective`,
        targetMinutes: 30,
        completed: false,
        recommendedSkill: cleanSkill,
        notes: 'Review code quality, architecture patterns, and next steps.',
      },
    ];

    const targetDate = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return {
      id: `plan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      title: `${cleanSkill} Mastery Roadmap`,
      description: `Structured peer-to-peer study and reciprocal exchange plan for ${cleanSkill}.`,
      targetCompletionDate: targetDate,
      milestones,
      createdAt: new Date().toISOString(),
    };
  }

  // 3. Teamwork Pods & Study Groups (/teamwork-preview)
  static createTeamworkPod(
    title: string,
    topic: string,
    description: string,
    category: string,
    scheduledAt: string,
    durationMinutes: number,
    maxParticipants: number,
    creator: User
  ): TeamworkPod {
    if (!title || !topic) {
      throw new Error('Title and topic are required for teamwork pod');
    }
    const safeDuration = Math.max(15, Math.min(180, Number(durationMinutes) || 60));
    const safeMax = Math.max(2, Math.min(8, Number(maxParticipants) || 4));

    const initialMember: TeamworkPodMember = {
      userId: creator.id,
      name: creator.name,
      avatar: creator.avatar,
      role: 'Leader',
      pledgedMinutes: safeDuration,
    };

    return {
      id: `pod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      topic: topic.trim(),
      description: description || 'Collaborative campus study pod.',
      category: category || 'Tech',
      scheduledAt: scheduledAt || new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      durationMinutes: safeDuration,
      maxParticipants: safeMax,
      members: [initialMember],
      agenda: [
        `Sync on objectives & deliverables for ${topic}`,
        'Collaborative hands-on work & pair reviews',
        'Summary notes & reciprocal peer sign-offs',
      ],
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    };
  }

  static joinTeamworkPod(pod: TeamworkPod, user: User, role: 'Contributor' | 'Learner' = 'Contributor'): TeamworkPod {
    const alreadyJoined = pod.members.some((m) => m.userId === user.id);
    if (alreadyJoined) {
      throw new Error('User has already joined this study pod');
    }
    if (pod.members.length >= pod.maxParticipants) {
      throw new Error('Study pod is already full');
    }

    pod.members.push({
      userId: user.id,
      name: user.name,
      avatar: user.avatar,
      role,
      pledgedMinutes: pod.durationMinutes,
    });

    if (pod.members.length >= pod.maxParticipants) {
      pod.status = 'IN_PROGRESS';
    }

    return pod;
  }

  // 4. Priority Boost Engine (/boost)
  static toggleBoost(
    existingBoosts: SkillBoost[],
    userId: string,
    skillName: string,
    type: 'OFFERED' | 'NEEDED'
  ): { boosts: SkillBoost[]; activeBoost: SkillBoost } {
    const cleanName = skillName.trim();
    const idx = existingBoosts.findIndex(
      (b) => b.userId === userId && b.skillName.toLowerCase() === cleanName.toLowerCase() && b.type === type
    );

    if (idx !== -1) {
      const existing = existingBoosts[idx];
      existing.active = !existing.active;
      existing.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      return { boosts: existingBoosts, activeBoost: existing };
    }

    const newBoost: SkillBoost = {
      id: `boost_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      skillName: cleanName,
      type,
      boostLevel: 1,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      active: true,
      createdAt: new Date().toISOString(),
    };

    existingBoosts.push(newBoost);
    return { boosts: existingBoosts, activeBoost: newBoost };
  }
}
