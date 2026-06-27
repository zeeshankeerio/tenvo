/**
 * China brand catalog, domestic leaders + common import/export labels.
 */
export const CN_BRAND_CATALOG = {
  clothing: [
    'Li-Ning', 'Anta', 'Semir', 'Peacebird', 'Bosideng', 'Youngor', 'HLA',
    'Urban Revivo', 'Shein Supply', 'Uniqlo China',
  ],
  footwear: ['Anta', 'Li-Ning', 'Erke', '361°', 'Belle', 'Red Dragonfly', 'Skechers China'],
  electronics: [
    'Haier', 'Midea', 'Hisense', 'TCL', 'Xiaomi', 'Huawei', 'Lenovo',
    'DJI', 'Skyworth', 'Changhong',
  ],
  mobile: ['Huawei', 'Xiaomi', 'Oppo', 'Vivo', 'Honor', 'Realme', 'OnePlus', 'Apple'],
  food: [
    'Mengniu', 'Yili', 'Wahaha', 'Master Kong', 'Uni-President', 'Jinlongyu',
    'Shuanghui', 'Bright Dairy', 'Tingyi', 'Haidilao Retail',
  ],
  grocery: [
    'Mengniu', 'Yili', 'Wahaha', 'Master Kong', 'Jinlongyu', 'Shuanghui',
    'CR Vanguard', 'Yonghui', 'Hema (Freshhippo)', 'Sam\'s Club China',
  ],
  personalCare: [
    'Proya', 'Pehchaolin', 'Inoherb', 'Chando', 'Kans', 'L\'Oréal China',
    'P&G China', 'Unilever China', 'Colgate China',
  ],
  pharmaceutical: [
    'Sinopharm', 'CSPC', 'Hengrui', 'BeiGene', 'Jointown', 'Tong Ren Tang',
    'Yunnan Baiyao', 'Pfizer China', 'Roche China',
  ],
  textile: ['Ermenegildo Zegna CN', 'Youngor Textile', 'Huafu', 'Lu Thai', 'Ruyi'],
  bakery: ['Holiland', '85°C', 'Ganso', 'BreadTalk China', 'Paris Baguette CN'],
  designer: ['Shanghai Tang', 'Particle Fever', 'Uma Wang', 'Ms MIN'],
  autoparts: ['CATL', 'BYD Auto Parts', 'Wanxiang', 'Fuyao Glass', 'Bosch China'],
  paint: ['Nippon Paint China', 'SKSHU', 'Dulux China', 'BASF Coatings'],
  construction: ['CNBM', 'Anhui Conch', 'China Resources Cement', 'Orient Cement'],
  steel: ['Baowu', 'HBIS', 'Shagang', 'Angang Steel', 'Valin Steel'],
  general: [
    '国产品牌', 'Imported', 'OEM / 贴牌', 'Imported, USA', 'Imported, Japan',
    'Imported, Korea', 'Imported, Europe', 'Cross-border',
  ],
};

export function getChinaBrands(category) {
  return CN_BRAND_CATALOG[category] || CN_BRAND_CATALOG.general || [];
}
