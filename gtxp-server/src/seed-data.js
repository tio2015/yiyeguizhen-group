import { today } from "./utils.js";

export const sopTemplates = [
  {
    id: "sop_open_discovery",
    name: "开放式潜爆发现",
    platform: "xhs",
    cadence: "daily",
    active: true,
    queries: [
      "刚发现 好物",
      "冷门但好用",
      "后悔没早点买",
      "小众好物",
      "救命好物",
      "最近新入",
      "没人推但好用",
      "无限回购",
      "包里常备",
      "出差必备"
    ]
  },
  {
    id: "sop_travel_scene",
    name: "高铁旅客场景",
    platform: "xhs",
    cadence: "daily",
    active: true,
    queries: [
      "商务出差 好物",
      "高铁必备 好物",
      "飞机高铁 必备",
      "通勤 小包必备",
      "办公室 必备好物",
      "开会前 好物",
      "见客户前 好物",
      "饭后 神器",
      "喝咖啡后 好物",
      "长途旅行 小物"
    ]
  },
  {
    id: "sop_need_pool",
    name: "需求池横向探索",
    platform: "xhs",
    cadence: "daily",
    active: true,
    queries: [
      "清新口气 好物",
      "低卡零食 推荐",
      "高蛋白零食",
      "便携清洁 好物",
      "除味 小物",
      "提神 好物",
      "助眠 旅行好物",
      "护眼 出差好物",
      "轻负担零食",
      "不脏手零食"
    ]
  }
];

export const seedState = {
  meta: {
    schemaVersion: 1,
    createdAt: today(),
    updatedAt: today()
  },
  candidates: [
    {
      id: "p_mouth_spray",
      name: "口喷 / 清新口气喷雾",
      category: "第二类",
      status: "供应链验证",
      action: "追",
      reason: "吃完盒饭、喝完咖啡、下车见客户或开会前，旅客有即时口气管理需求。",
      risk: "需确认普通口腔护理或化妆品备案边界，宣传不能出现治疗口臭、杀菌治病等医疗暗示。",
      scores: { xhs: 18, trend: 14, rail: 14, scene: 20, supply: 13, risk: 7 },
      createdAt: today(),
      updatedAt: today()
    },
    {
      id: "p_jelly_mouthwash",
      name: "果冻漱口水 / 便携漱口水",
      category: "第二类",
      status: "观察",
      action: "小测",
      reason: "饭后、咖啡后、长途旅行、下车见客户前都有明确使用场景。",
      risk: "半液体或液体包装可能有漏液风险，需要核查口腔护理资质、备案、检测材料和车上垃圾处理。",
      scores: { xhs: 20, trend: 13, rail: 14, scene: 19, supply: 12, risk: 6 },
      createdAt: today(),
      updatedAt: today()
    },
    {
      id: "p_freeze_fruit",
      name: "冻干水果脆",
      category: "第二类",
      status: "观察",
      action: "小测",
      reason: "轻、干净、无强气味、不脏手，女性和儿童同行场景友好。",
      risk: "即时痛点弱于口喷，容易与普通果干混同，需要靠包装和口味建立新鲜感。",
      scores: { xhs: 17, trend: 11, rail: 12, scene: 14, supply: 14, risk: 8 },
      createdAt: today(),
      updatedAt: today()
    }
  ],
  evidence: [],
  suppliers: [],
  sops: sopTemplates,
  tasks: [],
  runs: []
};
