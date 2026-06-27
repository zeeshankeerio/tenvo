/**
 * UAE / GCC brand catalog, local distributors + common imports.
 */
export const AE_BRAND_CATALOG = {
  clothing: [
    'Splash', 'Centrepoint', 'Max Fashion', 'Namshi', 'Riva', 'Iconic',
    'H&M UAE', 'Zara UAE', 'Mango UAE', 'Landmark Group', 'Apparel Group',
  ],
  footwear: ['Bata UAE', 'Clarks', 'Aldo', 'Dune London', 'Nine West', 'Skechers'],
  electronics: [
    'Samsung', 'LG', 'Sony', 'TCL', 'Hisense', 'Panasonic', 'Philips',
    'Emax', 'Sharaf DG', 'Jumbo Electronics',
  ],
  mobile: [
    'Apple', 'Samsung', 'Huawei', 'Xiaomi', 'Oppo', 'Vivo', 'Realme',
    'OnePlus', 'Honor', 'Nokia',
  ],
  food: [
    'Al Islami', 'Al Ain', 'Al Rawabi', 'Baladna', 'Almarai', 'Lulu Private Label',
    'Emirates Food', 'National Food', 'Majid Al Futtaim', 'Americana',
  ],
  grocery: [
    'Al Islami', 'Al Ain', 'Al Rawabi', 'Baladna', 'Almarai', 'Lulu',
    'Carrefour UAE', 'Spinneys', 'Choithrams', 'Union Coop', 'Nestlé', 'Unilever',
  ],
  personalCare: [
    'Dove', 'Pantene', 'Head & Shoulders', 'Nivea', 'L\'Oréal', 'Garnier',
    'Himalaya', 'Dettol', 'Colgate', 'Palmolive',
  ],
  pharmaceutical: [
    'Julphar', 'Neopharma', 'Gulf Pharmaceutical (Julphar)', 'Pfizer',
    'GSK', 'Sanofi', 'Novartis', 'Abbott', 'AstraZeneca', 'Bayer',
  ],
  textile: ['Gul Ahmed Export', 'Al Karam Textiles', 'Nishat Linen', 'Imported Fabric'],
  bakery: ['Almarai Bakery', 'Modern Bakery', 'Choithrams Bakery', 'Lulu Bakery'],
  designer: ['Riva', 'Iconic', 'Bouguessa', 'Muse Dubai', 'All Things Mochi'],
  autoparts: ['Bosch', 'Denso', 'NGK', 'Bridgestone', 'Michelin', 'Total', 'Shell', 'ADNOC'],
  paint: ['Jotun', 'National Paints', 'Dulux', 'Berger', 'Caparol'],
  construction: ['Emirates Steel', 'Gulf Cement', 'Union Cement', 'RAK Ceramics'],
  steel: ['Emirates Steel', 'Conares', 'Hamriyah Steel'],
  general: [
    'Local UAE', 'Imported, Pakistan', 'Imported, India', 'Imported, China',
    'Imported, Turkey', 'Imported, USA', 'Imported, Europe', 'GCC Private Label',
  ],
};

export function getUaeBrands(category) {
  return AE_BRAND_CATALOG[category] || AE_BRAND_CATALOG.general || [];
}
