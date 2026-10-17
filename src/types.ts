export type StrategyId = '1-4' | '2-3' | '3-2' | '4-1';

export type TeamType = 'tanky' | 'magic' | 'physical' | 'other';

export type SkillType = 'T' | 'B';

export interface SkillOrderEntry {
  charIndex: number; // 0..4
  skillType: SkillType; // 'T' (บน) | 'B' (ล่าง)
  order: 1 | 2 | 3;
}

export interface CharacterEquip {
  sets?: string[]; // max 3
  rings?: string[]; // max 3
}

export interface TeamCharacterSlot {
  index: number; // 0..4
  name: string;
  description?: string;
  equip?: CharacterEquip;
}

export interface EnemyTeam {
  strategyId: StrategyId;
  teamType?: TeamType;
  skillOrder?: SkillOrderEntry[];
  front: {
    characters: TeamCharacterSlot[];
  };
  back: {
    characters: TeamCharacterSlot[];
  };
  pets: (string | null)[]; // length 5: [mainPet, sub1, sub2, sub3, sub4]
}

export interface CounterTeam {
  id: string;
  order: number;
  strategyId: StrategyId;
  skillOrder?: SkillOrderEntry[];
  front: {
    characters: TeamCharacterSlot[];
  };
  back: {
    characters: TeamCharacterSlot[];
  };
  pets: (string | null)[];
  note?: string;
}

export interface GuildCombo {
  id: string;
  enemyTeam: EnemyTeam;
  counterTeams: CounterTeam[];
  createdAt?: string;
  updatedAt?: string;
}

export interface GuildData {
  short_id: string;
  name: string;
  viewer_locked: boolean;
  viewer_key?: string;
  is_admin?: boolean;
  combos: GuildCombo[];
}

export interface CatalogCharacter {
  name: string;
  tier: string;
  tierLabel: string;
  imageUrl: string;
  aliases: string[];
}

export interface CatalogPet {
  name: string;
  tier: string;
  tierLabel: string;
  imageUrl: string;
  aliases: string[];
}

export interface CatalogEquipItem {
  name: string;
  hint: string;
  aliases: string[];
  imageUrl: string;
}
