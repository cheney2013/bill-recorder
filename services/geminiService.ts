import { NewTransaction, Category } from '../types';
import { CATEGORIES } from '../constants';

// Heuristics: Map convenience stores to Food (餐饮)
const isConvenienceStore = (nameRaw: unknown): boolean => {
  const name = String(nameRaw || '').toLowerCase();
  if (!name) return false;
  const patterns: RegExp[] = [
    /便利店|便利商店|便利超市|便利門店|便利门店/,
    /7\s*-?\s*11|seven\s*-?\s*eleven|7\s*eleven/i,
    /family\s*mart|全家/i,
    /lawson|罗森|羅森/i,
    /mini\s*stop|ミニストップ/i,
    /ok便利|c-?store|喜士多/i,
    /美宜佳|天福便利|today便利|易捷|usmile/i,
  /コンビニ|セブン|セブン[-‐]イレブン|ファミマ|ファミリーマート|ローソン|デイリーヤマザキ|seicomart|セイコーマート|ポプラ|new\s*days/i,
  ];
  return patterns.some((re) => re.test(name));
};

// Heuristics: Supermarkets / grocery → Food (餐饮)
const isSupermarket = (nameRaw: unknown): boolean => {
  const name = String(nameRaw || '').toLowerCase();
  if (!name) return false;
  const patterns: RegExp[] = [
  /超市|生鲜|生鮮|食品館|食品馆|スーパー|業務スーパー|マート|マーケット|market/i,
    /家乐福|家樂福|carrefour/i,
    /沃尔玛|沃爾瑪|walmart/i,
    /大润发|大潤發|rt[-\s]?mart/i,
    /物美|永辉|永輝/i,
    /华润万家|華潤萬家|vanguard/i,
    /世纪联华|世紀聯華|联华|聯華|lianhua/i,
    /欧尚|歐尚|auchan/i,
    /麦德龙|麥德龍|metro\s*(cash|)\b/i,
    /山姆|sam'?s\s*club|sam\s*club/i,
    /盒马|盒馬|hema|freshippo/i,
  /成城石井/i,
    /ole'?\b/,
  /永旺|aeon(\s*mall)?|イオン|イオンスタイル|イオンフード|イオンフードスタイル|イオンスーパー/i,
  /西友|seiyu/i,
  /イトーヨーカドー|伊藤洋华堂|伊藤洋華堂|ito[-\s]?yokado/i,
  /ライフ|life\s*super/i,
  /サミット|summit\s*store/i,
  /マルエツ|maruetsu/i,
  /コープ|生協|coop/i,
  /オーケー|ok\s*store|ＯＫ\s*ストア/i,
  /ビッグエー|big\s*-?\s*a/i,
  /まいばすけっと|mybasket/i,
  ];
  return patterns.some((re) => re.test(name));
};

// Heuristics: Shopping centers / malls → Shopping (购物)
const isShoppingCenter = (nameRaw: unknown): boolean => {
  const name = String(nameRaw || '').toLowerCase();
  if (!name) return false;
  const patterns: RegExp[] = [
    // Generic malls and shopping centers (keep these as Shopping)
    /购物中心|購物中心|商场|商場|广场|廣場|mall|plaza|アウトレット|ショッピング|ショッピングモール|ショッピングセンター|モール/i,
    /万达|wanda/i,
    /万象城|the\s*mixc|mixc/i,
    /大悦城/i,
    /龙湖天街|天街/i,
    /恒隆|hanglung/i,
    /太古|swire|taikoo/i,
    /来福士|來福士|raffles/i,
    /凯德|capita\s*mall/i,
    /ifs|国金|國金/i,
    /吾悦|新城控股/i,
    /宝龙|寶龍|powerlong/i,
  /イオンモール|aeon\s*mall/i,
  /parco|パルコ/i,
  /ヨドバシ|yodobashi|bic\s*camera|ビックカメラ/i,
  /ドン[・･.]?キホーテ|don\s*quijote|donki/i,
  /ちいかわ|chiikawa/i
  ];
  return patterns.some((re) => re.test(name));
};

// Heuristics: Department stores (百货/百貨/デパート) → Food (餐饮)
const isDepartmentStore = (nameRaw: unknown): boolean => {
  const name = String(nameRaw || '').toLowerCase();
  if (!name) return false;
  const patterns: RegExp[] = [
    /百货|百貨|百貨店|デパート|デパートメント/i,
    /髙?島屋|takashimaya/i,
    /三越|mitsukoshi/i,
    /伊勢丹|isetan/i,
    /そごう|sogo|西武|seibu/i,
    /阪急|hankyu/i,
    /阪神|hanshin/i,
    /大丸|daimaru/i,
    /松坂屋|matsuzakaya/i,
    /0101|丸井|marui/i,
    /银泰|銀泰|intime/i,
    /東急\s*(department|百貨)/i,
  ];
  return patterns.some((re) => re.test(name));
};

// Heuristics: Pharmacies / Drugstores → Medical (医疗)
const isPharmacy = (nameRaw: unknown): boolean => {
  const name = String(nameRaw || '').toLowerCase();
  if (!name) return false;
  const patterns: RegExp[] = [
    /药店|藥店|药房|藥房|医药|醫藥|大药房|大藥房/,
    /薬局|ドラッグストア|調剤|ドラッグ|ドラッグス/i,
    /マツモトキヨシ|松本清|matsumoto\s*kiyoshi/i,
    /ウエルシア|welcia/i,
    /スギ薬局|sugi/i,
    /ツルハドラッグ|tsuruha/i,
    /サンドラッグ|sun\s*drug|sundrug/i,
    /ココカラファイン|cocokara/i,
    /クリエイトsd|create\s*sd/i,
    /カワチ薬品|kawachi/i,
    /老百姓|同仁堂|一心堂|大参林|益丰|益豐|海王/i,
    /pharmacy|drug\s*store/i,
  ];
  return patterns.some((re) => re.test(name));
};

export async function analyzeBill(base64Image, mimeType) {
  const res = await fetch('https://bill-recorder-server.fly.dev/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Image, mimeType }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  const { data } = await res.json(); // data: NewTransaction[]
  const validTransactions: NewTransaction[] = [];
    for (const item of data) {
      // Apply overrides before validation (priority: pharmacy > conv./supermarket/department → Food; malls and other retail → Shopping)
      let category: Category | undefined = item.category as Category | undefined;
      if (isPharmacy(item.name)) {
        category = Category.Medical;
      } else if (
        isConvenienceStore(item.name) ||
        isSupermarket(item.name) ||
        isDepartmentStore(item.name)
      ) {
        category = Category.Food;
      } else if (isShoppingCenter(item.name)) {
        category = Category.Shopping;
      }
      if (
        item.name &&
        item.date &&
        typeof item.amount === 'number' &&
        category && CATEGORIES.includes(category)
      ) {
        validTransactions.push({
          name: item.name,
          date: item.date,
      amount: Math.abs(Number(item.amount)),
          location: item.location,
          category,
        } as NewTransaction);
      } else {
        console.warn('Skipping invalid item from AI:', item);
      }
    }

    if (validTransactions.length === 0 && data.length > 0) {
        throw new Error('AI 返回的数据中没有有效的交易条目。');
    }
    
    return validTransactions;
}