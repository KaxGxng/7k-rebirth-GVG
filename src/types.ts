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

export type TargetStatus = 'unattacked' | 'cleared' | 'failed';

export interface TargetCounterTeam extends CounterTeam {
  likes?: number;
  userLiked?: boolean;
}

export interface TargetHouse {
  id: string;
  houseNo: number; // 1..30
  customName?: string; // e.g. ชื่อผู้เล่นศัตรู หรือชื่อป้อม
  isFortress?: boolean; // ป้อมปราการ (ป้อม 1, 2, 3)
  stars: 0 | 1 | 2 | 3;
  status: TargetStatus;
  tags: string[]; // e.g. 'กายภาพ', 'เวท', 'แทงก์', 'สปีด'
  note?: string;
  enemyTeam: EnemyTeam;
  counters: TargetCounterTeam[];
  assignedTo?: string; // สมาชิกกิลด์ที่จองตี
  createdAt?: string;
  updatedAt?: string;
}

export interface WarPlanSlot {
  slotNumber: 1 | 2 | 3; // ไม้ 1, ไม้ 2, ไม้ 3
  targetHouseId?: string; // รหัสบ้านศัตรู
  chosenCounterId?: string;
  note?: string;
  starsWon?: 0 | 1 | 2 | 3;
  status?: 'pending' | 'success' | 'failed';
}

export interface WarPlan {
  id: string;
  memberName: string;
  slots: WarPlanSlot[];
  updatedAt?: string;
}

export interface GuildSchedule {
  warDays: string[]; // e.g. ['จันทร์', 'พุธ', 'ศุกร์', 'เสาร์']
  warStartTime: string; // '12:00'
  warEndTime: string; // '23:59'
  currentSeasonName?: string;
  announcement?: string;
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
  targets?: TargetHouse[];
  plans?: WarPlan[];
  schedule?: GuildSchedule;
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
