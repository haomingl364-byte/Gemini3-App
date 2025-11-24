
export const APP_STORAGE_KEY = 'zen_bazi_records_v2';

// Matched to the reference image "BaZi PaiPan Bao"
export const ELEMENT_COLORS = {
  wood: 'text-green-600',  // 甲乙寅卯 - Green
  fire: 'text-red-600',    // 丙丁巳午 - Red
  earth: 'text-amber-700', // 戊己辰戌丑未 - Brown/Ochre
  metal: 'text-yellow-600', // 庚辛申酉 - Gold/Yellow-Ochre (Updated to match image)
  water: 'text-black',     // 壬癸亥子 - Black (Updated to match image)
};

export const STEM_ELEMENTS: {[key: string]: string} = {
  '甲': 'wood', '乙': 'wood',
  '丙': 'fire', '丁': 'fire',
  '戊': 'earth', '己': 'earth',
  '庚': 'metal', '辛': 'metal',
  '壬': 'water', '癸': 'water'
};

export const BRANCH_ELEMENTS: {[key: string]: string} = {
  '寅': 'wood', '卯': 'wood',
  '巳': 'fire', '午': 'fire',
  '辰': 'earth', '戌': 'earth', '丑': 'earth', '未': 'earth',
  '申': 'metal', '酉': 'metal',
  '亥': 'water', '子': 'water'
};

export const ELEMENT_CN: {[key: string]: string} = {
  'wood': '木',
  'fire': '火',
  'earth': '土',
  'metal': '金',
  'water': '水'
};

// Simplified list of major cities and their longitude for True Solar Time
export const CITIES: {[key: string]: number} = {
  '不参考出生地 (北京时间)': 120.0,
  '北京': 116.46,
  '上海': 121.48,
  '天津': 117.20,
  '重庆': 106.55,
  '广州': 113.23,
  '深圳': 114.06,
  '沈阳': 123.38,
  '南京': 118.78,
  '武汉': 114.31,
  '成都': 104.06,
  '西安': 108.95,
  '杭州': 120.19,
  '青岛': 120.33,
  '大连': 121.62,
  '郑州': 113.65,
  '长沙': 113.00,
  '福州': 119.30,
  '厦门': 118.10,
  '哈尔滨': 126.63,
  '长春': 125.35,
  '石家庄': 114.48,
  '济南': 117.00,
  '太原': 112.53,
  '合肥': 117.27,
  '南昌': 115.89,
  '昆明': 102.73,
  '贵阳': 106.71,
  '兰州': 103.73,
  '乌鲁木齐': 87.68,
  '南宁': 108.33,
  '海口': 110.35,
  '银川': 106.27,
  '西宁': 101.74,
  '呼和浩特': 111.65,
  '拉萨': 91.11,
  '香港': 114.17,
  '澳门': 113.54,
  '台北': 121.50,
};

export const GAN = '甲乙丙丁戊己庚辛壬癸'.split('');
export const ZHI = '子丑寅卯辰巳午未申酉戌亥'.split('');

export const LUNAR_MONTHS = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
export const LUNAR_DAYS = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
];

export const LUNAR_TIMES = [
    { name: '早子时 (00:00-01:00)', value: 0 },
    { name: '丑时 (01:00-03:00)', value: 1 },
    { name: '寅时 (03:00-05:00)', value: 3 },
    { name: '卯时 (05:00-07:00)', value: 5 },
    { name: '辰时 (07:00-09:00)', value: 7 },
    { name: '巳时 (09:00-11:00)', value: 9 },
    { name: '午时 (11:00-13:00)', value: 11 },
    { name: '未时 (13:00-15:00)', value: 13 },
    { name: '申时 (15:00-17:00)', value: 15 },
    { name: '酉时 (17:00-19:00)', value: 17 },
    { name: '戌时 (19:00-21:00)', value: 19 },
    { name: '亥时 (21:00-23:00)', value: 21 },
    { name: '晚子时 (23:00-00:00)', value: 23 },
];
