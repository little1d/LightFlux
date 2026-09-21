// 今日诗词：本地内置精选，按日期每天确定性轮换一首，离线可用。
// 仅在今日任务全部完成后的卡片中展示；内容为中文，不做英文翻译。

export interface DailyPoem {
  id: string;
  dynasty: string;
  author: string;
  title: string;
  verses: string[];
  translation: string;
  analysis: string;
}

// 顺序经过安排，使 2026-09-21 当天展示谢逸《江城子》。
export const DAILY_POEMS: DailyPoem[] = [
  {
    id: 'ouyangxiu-tasuoxing',
    dynasty: '宋',
    author: '欧阳修',
    title: '踏莎行',
    verses: ['平芜尽处是春山，', '行人更在春山外。'],
    translation:
      '原野尽头是春山，而远行的人，还在春山之外。',
    analysis:
      '空间一层远过一层：望穿平芜、望断春山，终是望不见归人，离愁由此无尽。',
  },
  {
    id: 'wangwei-luchar',
    dynasty: '唐',
    author: '王维',
    title: '鹿柴',
    verses: ['空山不见人，但闻人语响。', '返景入深林，复照青苔上。'],
    translation:
      '空寂的山中不见人影，只听见人语回响；落日余晖斜入深林，又静静洒在青苔上。',
    analysis:
      '以人语响衬空山之静，以一抹夕照衬深林之幽，诗中有画，禅意自现。',
  },
  {
    id: 'wentingyun-wangjiangnan',
    dynasty: '唐',
    author: '温庭筠',
    title: '望江南',
    verses: ['过尽千帆皆不是，', '斜晖脉脉水悠悠。'],
    translation:
      '上千张帆都过去了，都不是我等待的人；唯有夕阳含情、江水悠悠。',
    analysis:
      '“皆不是”三字写尽一日的失望；脉脉斜晖与悠悠流水，皆是说不尽的等待。',
  },
  {
    id: 'qinguan-queshaoxian',
    dynasty: '宋',
    author: '秦观',
    title: '鹊桥仙',
    verses: ['两情若是久长时，', '又岂在朝朝暮暮。'],
    translation: '只要两情天长地久，又何必贪求朝夕相守。',
    analysis:
      '翻写牛郎织女的短暂相会，于聚少离多中翻出“久长”二字，意境顿时高远。',
  },
  {
    id: 'sushi-dingfengbo',
    dynasty: '宋',
    author: '苏轼',
    title: '定风波',
    verses: ['回首向来萧瑟处，归去，', '也无风雨也无晴。'],
    translation:
      '回头望过刚才风雨萧瑟之处，信步归去——既无所谓风雨，也无所谓天晴。',
    analysis:
      '借途中遇雨写人生态度：风雨晴晦皆不萦怀，自有一份从容旷达。',
  },
  {
    id: 'xieyi-jiangchengzi',
    dynasty: '宋',
    author: '谢逸',
    title: '江城子',
    verses: [
      '夕阳楼外晚烟笼。',
      '粉香融，淡眉峰。',
      '记得年时，相见画屏中。',
      '只有关山今夜月，千里外，素光同。',
    ],
    translation:
      '夕阳下，楼外暮霭笼罩。她脂粉馨香，淡眉如远山。还记得当年在画屏旁相见；今夜唯有关山明月，虽隔千里，却与我共此清辉。',
    analysis:
      '“千里外，素光同”化用天涯共月之意，不直言相思，只借同一轮明月，写尽相隔千里的深情。',
  },
  {
    id: 'baijuyi-wenliushijiu',
    dynasty: '唐',
    author: '白居易',
    title: '问刘十九',
    verses: ['晚来天欲雪，', '能饮一杯无？'],
    translation: '天晚了像是要下雪，要不要来共饮一杯？',
    analysis:
      '新醅绿酒、红泥小炉，暖意融融；天欲雪的寒，更衬出友情与相邀的温。',
  },
  {
    id: 'libai-yujieyuan',
    dynasty: '唐',
    author: '李白',
    title: '玉阶怨',
    verses: ['却下水晶帘，', '玲珑望秋月。'],
    translation:
      '回房放下水晶帘，仍隔着帘子凝望着那一轮皎洁秋月。',
    analysis:
      '不下一个“怨”字，只在久立、下帘、望月的动作里，写尽幽独与深情。',
  },
];

// Deterministic daily selection: the same date always yields the same poem,
// neighbouring dates yield different ones.
export const selectDailyPoem = (dateKey: string): DailyPoem => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const dayIndex = Math.floor(Date.UTC(year, month - 1, day) / 86400000);
  return DAILY_POEMS[((dayIndex % DAILY_POEMS.length) +
    DAILY_POEMS.length) %
    DAILY_POEMS.length];
};
