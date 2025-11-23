
import { Solar, Lunar, EightChar, LunarUtil, SolarUtil, DaYun as LunarDaYun } from 'lunar-javascript';
import { BaZiChart, Pillar, Gender, ElementType, DaYun, HiddenStem, LiuNian, CalendarType, UserInput } from '../types';
import { STEM_ELEMENTS, BRANCH_ELEMENTS, ELEMENT_CN, CITIES, GAN, ZHI } from '../constants';

const getElement = (char: string): ElementType => {
  const type = STEM_ELEMENTS[char] || BRANCH_ELEMENTS[char] || 'earth';
  return type as ElementType;
};

// --- Local Helpers for robustness ---
const CHANG_SHENG = '长生,沐浴,冠带,临官,帝旺,衰,病,死,墓,绝,胎,养'.split(',');

const getLifeStage = (gan: string, zhi: string): string => {
  const ganIndex = GAN.indexOf(gan);
  const zhiIndex = ZHI.indexOf(zhi);
  if (ganIndex === -1 || zhiIndex === -1) return '';

  let startZhiIndex = 0;
  let forward = true;

  switch (gan) {
    case '甲': startZhiIndex = 11; break; // Hai
    case '乙': startZhiIndex = 6; forward = false; break; // Wu
    case '丙': startZhiIndex = 2; break; // Yin
    case '丁': startZhiIndex = 9; forward = false; break; // You
    case '戊': startZhiIndex = 2; break; // Yin
    case '己': startZhiIndex = 9; forward = false; break; // You
    case '庚': startZhiIndex = 5; break; // Si
    case '辛': startZhiIndex = 0; forward = false; break; // Zi
    case '壬': startZhiIndex = 8; break; // Shen
    case '癸': startZhiIndex = 3; forward = false; break; // Mao
  }

  let offset = 0;
  if (forward) {
    offset = zhiIndex - startZhiIndex;
  } else {
    offset = startZhiIndex - zhiIndex;
  }

  if (offset < 0) offset += 12;
  
  return CHANG_SHENG[offset % 12];
};

const getShenSha = (pillarBranch: string, yearBranch: string, dayBranch: string, dayStem: string): string[] => {
  const list: string[] = [];
  const zhi = pillarBranch;

  const isYiMa = (base: string) => {
    if (['申', '子', '辰'].includes(base) && zhi === '寅') return true;
    if (['寅', '午', '戌'].includes(base) && zhi === '申') return true;
    if (['亥', '卯', '未'].includes(base) && zhi === '巳') return true;
    if (['巳', '酉', '丑'].includes(base) && zhi === '亥') return true;
    return false;
  };
  if (isYiMa(yearBranch) || isYiMa(dayBranch)) list.push('驿马');

  const isTaoHua = (base: string) => {
    if (['申', '子', '辰'].includes(base) && zhi === '酉') return true;
    if (['寅', '午', '戌'].includes(base) && zhi === '卯') return true;
    if (['亥', '卯', '未'].includes(base) && zhi === '子') return true;
    if (['巳', '酉', '丑'].includes(base) && zhi === '午') return true;
    return false;
  };
  if (isTaoHua(yearBranch) || isTaoHua(dayBranch)) list.push('咸池');

  const isTianYi = (stem: string) => {
     if (['甲', '戊', '庚'].includes(stem) && ['丑', '未'].includes(zhi)) return true;
     if (['乙', '己'].includes(stem) && ['子', '申'].includes(zhi)) return true;
     if (['丙', '丁'].includes(stem) && ['亥', '酉'].includes(zhi)) return true;
     if (['壬', '癸'].includes(stem) && ['巳', '卯'].includes(zhi)) return true;
     if (['辛'].includes(stem) && ['午', '寅'].includes(zhi)) return true;
     return false;
  };
  if (isTianYi(dayStem)) list.push('天乙');

  const wenChangMap: {[key:string]: string} = {'甲':'巳', '乙':'午', '丙':'申', '戊':'申', '丁':'酉', '己':'酉', '庚':'亥', '辛':'子', '壬':'寅', '癸':'卯'};
  if (wenChangMap[dayStem] === zhi) list.push('文昌');

  const luMap: {[key:string]: string} = {'甲':'寅', '乙':'卯', '丙':'巳', '戊':'巳', '丁':'午', '己':'午', '庚':'申', '辛':'酉', '壬':'亥', '癸':'子'};
  if (luMap[dayStem] === zhi) list.push('禄神');

  const renMap: {[key:string]: string} = {'甲':'卯', '乙':'辰', '丙':'午', '戊':'午', '丁':'未', '己':'未', '庚':'酉', '辛':'戌', '壬':'子', '癸':'丑'};
  if (renMap[dayStem] === zhi) list.push('羊刃');

  return list;
};

const createPillar = (
  stem: string, 
  branch: string, 
  eightChar: any, 
  pillarType: 'year' | 'month' | 'day' | 'time',
  dayMaster: string,
  yearBranch: string,
  dayBranch: string
): Pillar => {
  
  let tenGod = '';
  let naYin = '';
  let lifeStage = '';
  let hiddenStems: HiddenStem[] = [];
  let isKongWang = false;
  let shenSha: string[] = [];

  if (eightChar) {
    switch(pillarType) {
      case 'year':
        tenGod = eightChar.getYearShiShenGan();
        naYin = eightChar.getYearNaYin();
        lifeStage = eightChar.getYearDiShi(); 
        break;
      case 'month':
        tenGod = eightChar.getMonthShiShenGan();
        naYin = eightChar.getMonthNaYin();
        lifeStage = eightChar.getMonthDiShi();
        break;
      case 'day':
        tenGod = '日主';
        naYin = eightChar.getDayNaYin();
        lifeStage = eightChar.getDayDiShi();
        break;
      case 'time':
        tenGod = eightChar.getTimeShiShenGan();
        naYin = eightChar.getTimeNaYin();
        lifeStage = eightChar.getTimeDiShi();
        break;
    }

    let hiddenGans: string[] = [];
    let hiddenShiShens: string[] = [];
    
    if (pillarType === 'year') {
      hiddenGans = eightChar.getYearHideGan();
      hiddenShiShens = eightChar.getYearShiShenZhi();
    } else if (pillarType === 'month') {
      hiddenGans = eightChar.getMonthHideGan();
      hiddenShiShens = eightChar.getMonthShiShenZhi();
    } else if (pillarType === 'day') {
      hiddenGans = eightChar.getDayHideGan();
      hiddenShiShens = eightChar.getDayShiShenZhi();
    } else {
      hiddenGans = eightChar.getTimeHideGan();
      hiddenShiShens = eightChar.getTimeShiShenZhi();
    }

    hiddenStems = hiddenGans.map((gan, idx) => ({
      stem: gan,
      tenGod: hiddenShiShens[idx] || '',
      element: getElement(gan)
    }));

    shenSha = getShenSha(branch, yearBranch, dayBranch, dayMaster);
    const kongWangList = eightChar.getDayXunKong();
    isKongWang = kongWangList.includes(branch);
    // We do not add '空亡' to shenSha list here to avoid clutter, handled by UI externally if needed, 
    // but PillarDisplay uses the isKongWang boolean.
  }

  return {
    stem,
    stemTenGod: tenGod,
    stemElement: getElement(stem),
    branch,
    branchElement: getElement(branch),
    hiddenStems,
    naYin,
    lifeStage,
    shenSha,
    kongWang: isKongWang
  };
};

// --- Ren Yuan Si Ling Logic ---

interface CommanderRule {
  gan: string;
  days: number;
}

const COMMANDER_TABLE: {[key: string]: CommanderRule[]} = {
  '寅': [{gan: '己', days: 7}, {gan: '丙', days: 5}, {gan: '甲', days: 18}],
  '卯': [{gan: '甲', days: 9}, {gan: '癸', days: 3}, {gan: '乙', days: 18}],
  '辰': [{gan: '乙', days: 7}, {gan: '癸', days: 5}, {gan: '戊', days: 18}],
  '巳': [{gan: '戊', days: 7}, {gan: '庚', days: 5}, {gan: '丙', days: 18}],
  '午': [{gan: '丙', days: 9}, {gan: '己', days: 3}, {gan: '丁', days: 18}],
  '未': [{gan: '丁', days: 7}, {gan: '乙', days: 5}, {gan: '己', days: 18}],
  '申': [{gan: '己', days: 7}, {gan: '壬', days: 5}, {gan: '庚', days: 18}], 
  '酉': [{gan: '庚', days: 2}, {gan: '己', days: 1}, {gan: '辛', days: 27}],
  '戌': [{gan: '辛', days: 7}, {gan: '丁', days: 5}, {gan: '戊', days: 18}],
  '亥': [{gan: '戊', days: 7}, {gan: '甲', days: 5}, {gan: '壬', days: 18}],
  '子': [{gan: '壬', days: 9}, {gan: '辛', days: 3}, {gan: '癸', days: 18}],
  '丑': [{gan: '癸', days: 7}, {gan: '辛', days: 5}, {gan: '己', days: 18}],
};

const getRenYuanCommander = (monthBranch: string, daysSinceJie: number): string => {
  const rules = COMMANDER_TABLE[monthBranch];
  if (!rules) return '未知';

  const currentDay = daysSinceJie + 1;
  
  let accumulatedDays = 0;
  let matchedGan = '';
  
  for (const rule of rules) {
    accumulatedDays += rule.days;
    if (currentDay <= accumulatedDays) {
      matchedGan = rule.gan;
      break;
    }
  }
  if (!matchedGan) matchedGan = rules[rules.length - 1].gan;

  const elementKey = STEM_ELEMENTS[matchedGan];
  const elementCn = ELEMENT_CN[elementKey] || '';

  return `${matchedGan}${elementCn}司令`;
};


// --- Reverse Search Function ---

export interface MatchingDate {
  year: number;
  month: number;
  day: number;
  hour: number;
  ganZhi: string; 
}

export const findDatesFromPillars = (
  yGan: string, yZhi: string,
  mGan: string, mZhi: string,
  dGan: string, dZhi: string,
  hGan: string, hZhi: string
): MatchingDate[] => {
  const matches: MatchingDate[] = [];
  const startYear = 1900;
  const endYear = 2050;
  
  const targetYearGZ = yGan + yZhi;
  
  for (let y = startYear; y <= endYear; y++) {
     const checkDate = Solar.fromYmd(y, 6, 1); 
     const lunarCheck = checkDate.getLunar();
     const yearPillarOfJun1 = lunarCheck.getYearInGanZhi();
     const prevYearPillar = Solar.fromYmd(y, 1, 15).getLunar().getYearInGanZhi();
     
     let candidateYear = false;
     if (yearPillarOfJun1 === targetYearGZ) candidateYear = true;
     if (prevYearPillar === targetYearGZ) candidateYear = true;
     
     if (!candidateYear) continue;

     for (let m = 1; m <= 12; m++) {
        const daysToCheck = [5, 20];
        for (let dTry of daysToCheck) {
           const s = Solar.fromYmd(y, m, dTry);
           const l = s.getLunar();
           const e = l.getEightChar();
           e.setSect(2); 

           if (e.getYearGan() === yGan && e.getYearZhi() === yZhi &&
               e.getMonthGan() === mGan && e.getMonthZhi() === mZhi) {
               
               const daysInMonth = SolarUtil.getDaysOfMonth(y, m);
               for (let d = 1; d <= daysInMonth; d++) {
                  const sDay = Solar.fromYmd(y, m, d);
                  const lDay = sDay.getLunar();
                  const eDay = lDay.getEightChar();
                  eDay.setSect(2);

                  if (eDay.getDayGan() === dGan && eDay.getDayZhi() === dZhi &&
                      eDay.getMonthGan() === mGan && eDay.getMonthZhi() === mZhi &&
                      eDay.getYearGan() === yGan && eDay.getYearZhi() === yZhi) {
                      
                      const hoursToCheck = [0, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23];
                      for (let h of hoursToCheck) {
                          const sHour = Solar.fromYmdHms(y, m, d, h, 0, 0);
                          const lHour = sHour.getLunar();
                          const eHour = lHour.getEightChar();
                          eHour.setSect(2);

                          if (eHour.getTimeGan() === hGan && eHour.getTimeZhi() === hZhi) {
                              matches.push({
                                  year: y,
                                  month: m,
                                  day: d,
                                  hour: h,
                                  ganZhi: `${yGan}${yZhi} ${mGan}${mZhi} ${dGan}${dZhi} ${hGan}${hZhi}`
                              });
                          }
                      }
                  }
               }
               break; 
           }
        }
     }
  }
  return matches;
};

// --- Main Calculator ---

export const calculateBaZi = (input: UserInput): BaZiChart => {
  
  let solar: Solar;

  if (input.calendarType === CalendarType.LUNAR) {
    solar = Lunar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute, 0).getSolar();
  } else {
    solar = Solar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute, 0);
  }

  const longitude = CITIES[input.selectedCityKey] || 120.0;
  if (longitude !== 120.0) {
      const offsetMinutes = (longitude - 120.0) * 4;
      const date = new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay(), solar.getHour(), solar.getMinute());
      date.setMinutes(date.getMinutes() + offsetMinutes);
      solar = Solar.fromDate(date);
  }

  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();
  
  // Set Sect based on Early/Late Rat preference
  // Sect 2: 23:00 is late rat of current day, 00:00 is early rat of next day (Distinguish enabled)
  // Sect 1: 23:00 is Zi hour of next day (Distinguish disabled / Standard)
  eightChar.setSect(input.processEarlyLateRat ? 2 : 1); 

  const dayMaster = eightChar.getDayGan();
  const dayBranch = eightChar.getDayZhi();
  const yearBranch = eightChar.getYearZhi();

  const yearPillar = createPillar(eightChar.getYearGan(), eightChar.getYearZhi(), eightChar, 'year', dayMaster, yearBranch, dayBranch);
  const monthPillar = createPillar(eightChar.getMonthGan(), eightChar.getMonthZhi(), eightChar, 'month', dayMaster, yearBranch, dayBranch);
  const dayPillar = createPillar(eightChar.getDayGan(), eightChar.getDayZhi(), eightChar, 'day', dayMaster, yearBranch, dayBranch);
  const hourPillar = createPillar(eightChar.getTimeGan(), eightChar.getTimeZhi(), eightChar, 'time', dayMaster, yearBranch, dayBranch);
  
  const dayKongWang = eightChar.getDayXunKong(); // returns string e.g. "戌亥"

  const prevJie = lunar.getPrevJie();
  const daysAfterJie = Math.floor(Math.abs(solar.subtract(prevJie.getSolar())));
  const solarTermStr = `出生于${prevJie.getName()}后第${daysAfterJie}日`;
  
  const renYuanSiLing = getRenYuanCommander(eightChar.getMonthZhi(), daysAfterJie);

  const genderNum = input.gender === Gender.MALE ? 1 : 0;
  const yun = eightChar.getYun(genderNum);
  
  const daYunList: DaYun[] = [];
  const daYunArr = yun.getDaYun();
  
  const startLuckText = `约${yun.getStartYear()}年${yun.getStartMonth()}个月${yun.getStartDay()}日后上运`;

  const yunQian: LiuNian[] = [];
  const birthYear = solar.getYear();
  
  for (let i = 1; i <= 8; i++) {
    const dy: LunarDaYun = daYunArr[i];
    if (!dy) break;
    
    const ganZhi = dy.getGanZhi();
    const stem = ganZhi.substring(0, 1);
    const branch = ganZhi.substring(1, 2);
    
    // Calculate Ten God of Da Yun Stem relative to Day Master
    let stemTenGod = '';
    try {
        stemTenGod = LunarUtil.getShiShen(dayMaster, stem);
    } catch (e) {
        stemTenGod = '';
    }

    const liuNianList: LiuNian[] = [];
    const liuNianArr = dy.getLiuNian(); 
    
    for (let k=0; k<liuNianArr.length; k++) {
        const ln = liuNianArr[k];
        liuNianList.push({
            year: ln.getYear(),
            ganZhi: ln.getGanZhi()
        });
    }

    const yunLifeStage = getLifeStage(dayMaster, branch);
    
    let yunNaYin = '';
    try { yunNaYin = LunarUtil.getNaYin(ganZhi); } catch(e) { yunNaYin = '未知'; }

    daYunList.push({
      index: i,
      startAge: dy.getStartAge(),
      startYear: dy.getStartYear(),
      stem,
      stemTenGod,
      stemElement: getElement(stem),
      branch,
      branchElement: getElement(branch),
      ganZhi,
      lifeStage: yunLifeStage,
      naYin: yunNaYin,
      liuNian: liuNianList
    });
  }

  const firstLuckYear = daYunList[0]?.startYear || (birthYear + 10);
  for (let y = birthYear; y < firstLuckYear; y++) {
      const l = Solar.fromYmdHms(y, 6, 1, 0,0,0).getLunar();
      yunQian.push({
          year: y,
          ganZhi: l.getYearInGanZhi()
      });
  }

  return {
    type: 'calculated',
    solarDateStr: `阳历${solar.getYear()}年${solar.getMonth()}月${solar.getDay()}日 ${solar.getHour()}时${solar.getMinute()}分`,
    lunarDateStr: `农历${lunar.getYearInGanZhi()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}, ${lunar.getTimeZhi()}时`,
    solarTermStr,
    startLuckText,
    
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
    
    dayKongWang, // Pass to chart
    renYuanSiLing, 
    
    daYun: daYunList,
    yunQian: yunQian
  };
};