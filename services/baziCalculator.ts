
import { Solar, Lunar, EightChar, LunarUtil, SolarUtil, DaYun as LunarDaYun } from 'lunar-javascript';
import { BaZiChart, Pillar, Gender, ElementType, DaYun, HiddenStem, LiuNian, CalendarType, UserInput } from '../types';
import { STEM_ELEMENTS, BRANCH_ELEMENTS, CITIES, GAN, ZHI } from '../constants';

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
    if (isKongWang) shenSha.push('空亡');
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

// --- Reverse Search Function ---

export interface MatchingDate {
  year: number;
  month: number;
  day: number;
  hour: number;
  ganZhi: string; // Full 8 char string for display
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
  const targetMonthGZ = mGan + mZhi;
  const targetDayGZ = dGan + dZhi;
  const targetHourGZ = hGan + hZhi;

  // Optimization: Check every year. 
  // The Year GanZhi repeats every 60 years.
  // But since solar/lunar year boundaries (Li Chun) shift, we iterate all years
  // and check the dominant GanZhi.
  
  for (let y = startYear; y <= endYear; y++) {
     // Check mid-year to get the main GanZhi of the year
     // A solar year might cover two GanZhi years at the start, but usually we are looking for the main one.
     const checkDate = Solar.fromYmd(y, 6, 1); 
     const lunarCheck = checkDate.getLunar();
     
     // If this year doesn't match the target Year GanZhi, skip (mostly)
     // However, Li Chun is around Feb 4. 
     // If the user wants a date in Jan 1984, it might be Gui Hai (1983's year pillar).
     // So we need to be careful. 
     // Brute force optimization:
     // Check if 'y' or 'y-1' could match.
     
     // To be absolutely safe and reasonably fast:
     // Iterate 12 months of every year. 
     // If Month GanZhi matches, then iterate days.
     
     // Further optimization:
     // Year GanZhi matches:
     // y = 1984 (Jia Zi). 
     // If target is Jia Zi, we look at 1984 (mostly) and Jan 1985 (tail) or Jan 1984 (head of prev).
     
     // Let's filter by Year GanZhi first to reduce search space by 60x.
     const yearPillarOfJun1 = lunarCheck.getYearInGanZhi();
     const prevYearPillar = Solar.fromYmd(y, 1, 15).getLunar().getYearInGanZhi();
     
     let candidateYear = false;
     if (yearPillarOfJun1 === targetYearGZ) candidateYear = true;
     if (prevYearPillar === targetYearGZ) candidateYear = true;
     
     if (!candidateYear) continue;

     // Iterate through months (approx 12 checks)
     for (let m = 1; m <= 12; m++) {
        // Check a day in the middle of the month to see Month GanZhi?
        // Month GanZhi changes at JieQi. 
        // It's safer to check two points in a month: 5th (often after Li Chun/Jing Zhe) and 25th.
        const daysToCheck = [5, 20];
        
        for (let dTry of daysToCheck) {
           const s = Solar.fromYmd(y, m, dTry);
           const l = s.getLunar();
           const e = l.getEightChar();
           e.setSect(2); // Standardize

           if (e.getYearGan() === yGan && e.getYearZhi() === yZhi &&
               e.getMonthGan() === mGan && e.getMonthZhi() === mZhi) {
               
               // Found matching Year & Month Pillar in this month.
               // Now iterate ALL days in this month to find the Day Pillar.
               const daysInMonth = SolarUtil.getDaysOfMonth(y, m);
               for (let d = 1; d <= daysInMonth; d++) {
                  const sDay = Solar.fromYmd(y, m, d);
                  const lDay = sDay.getLunar();
                  const eDay = lDay.getEightChar();
                  eDay.setSect(2);

                  if (eDay.getDayGan() === dGan && eDay.getDayZhi() === dZhi &&
                      eDay.getMonthGan() === mGan && eDay.getMonthZhi() === mZhi &&
                      eDay.getYearGan() === yGan && eDay.getYearZhi() === yZhi) {
                      
                      // Found matching Year, Month, Day.
                      // Now check Hour.
                      // Check standard hours: 0 (Zi), 1 (Zi), 3 (Chou), 5 (Yin)...
                      // Valid hours: 0, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23
                      const hoursToCheck = [0, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23];
                      for (let h of hoursToCheck) {
                          const sHour = Solar.fromYmdHms(y, m, d, h, 0, 0);
                          const lHour = sHour.getLunar();
                          const eHour = lHour.getEightChar();
                          eHour.setSect(2);

                          if (eHour.getTimeGan() === hGan && eHour.getTimeZhi() === hZhi) {
                              // FOUND IT!
                              matches.push({
                                  year: y,
                                  month: m,
                                  day: d,
                                  hour: h,
                                  ganZhi: `${yGan}${yZhi} ${mGan}${mZhi} ${dGan}${dZhi} ${hGan}${hZhi}`
                              });
                              
                              // Optimization: Once found for a day, usually only one hour matches unless it's Zi hour boundary.
                              // But we continue just in case.
                          }
                      }
                      // Break after finding the day? No, continue.
                  }
               }
               break; // Optimization: We checked this month fully once we found it contained the Month Pillar.
           }
        }
     }
  }
  return matches;
};

// --- Main Calculator ---

export const calculateBaZi = (input: UserInput): BaZiChart => {
  
  // 1. Calculate Date Object
  let solar: Solar;

  if (input.calendarType === CalendarType.LUNAR) {
    // Convert Lunar to Solar first
    // Lunar.fromYmdHms(year, month, day, hour, minute, second)
    // Note: 'month' input in lunar-javascript:
    // Positive for normal, negative for leap. 
    // e.g. If user selects Leap 4th Month, input should be -4.
    // We assume standard month for now unless input.isLeapMonth is added to UI.
    // For simplicity, we map UI month directly. 
    solar = Lunar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute, 0).getSolar();
  } else {
    solar = Solar.fromYmdHms(input.year, input.month, input.day, input.hour, input.minute, 0);
  }

  // 2. TRUE SOLAR TIME CORRECTION
  const longitude = CITIES[input.selectedCityKey] || 120.0;
  if (longitude !== 120.0) {
      const offsetMinutes = (longitude - 120.0) * 4;
      const date = new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay(), solar.getHour(), solar.getMinute());
      date.setMinutes(date.getMinutes() + offsetMinutes);
      solar = Solar.fromDate(date);
  }

  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();
  eightChar.setSect(2); // 2 = 晚子时归翌日

  const dayMaster = eightChar.getDayGan();
  const dayBranch = eightChar.getDayZhi();
  const yearBranch = eightChar.getYearZhi();

  // Pillars
  const yearPillar = createPillar(eightChar.getYearGan(), eightChar.getYearZhi(), eightChar, 'year', dayMaster, yearBranch, dayBranch);
  const monthPillar = createPillar(eightChar.getMonthGan(), eightChar.getMonthZhi(), eightChar, 'month', dayMaster, yearBranch, dayBranch);
  const dayPillar = createPillar(eightChar.getDayGan(), eightChar.getDayZhi(), eightChar, 'day', dayMaster, yearBranch, dayBranch);
  const hourPillar = createPillar(eightChar.getTimeGan(), eightChar.getTimeZhi(), eightChar, 'time', dayMaster, yearBranch, dayBranch);

  // Solar Term Logic
  const prevJie = lunar.getPrevJie();
  const daysAfterJie = Math.floor(Math.abs(solar.subtract(prevJie.getSolar())));
  const solarTermStr = `出生于${prevJie.getName()}后第${daysAfterJie}日`;

  // Da Yun
  const genderNum = input.gender === Gender.MALE ? 1 : 0;
  const yun = eightChar.getYun(genderNum);
  
  const daYunList: DaYun[] = [];
  const daYunArr = yun.getDaYun();
  
  const startLuckText = `约${yun.getStartYear()}年${yun.getStartMonth()}个月${yun.getStartDay()}日后上运`;

  // Years before Da Yun (Yun Qian)
  const yunQian: LiuNian[] = [];
  const birthYear = solar.getYear();
  
  for (let i = 1; i <= 8; i++) {
    const dy: LunarDaYun = daYunArr[i];
    if (!dy) break;
    
    const ganZhi = dy.getGanZhi();
    const stem = ganZhi.substring(0, 1);
    const branch = ganZhi.substring(1, 2);
    
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
    
    taiYuan: eightChar.getTaiYuan(),
    mingGong: eightChar.getMingGong(),
    shenGong: eightChar.getShenGong(),
    
    daYun: daYunList,
    yunQian: yunQian
  };
};
