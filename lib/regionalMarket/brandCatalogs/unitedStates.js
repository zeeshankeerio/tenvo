/**
 * United States brand catalog, national + private-label staples.
 */
export const US_BRAND_CATALOG = {
  clothing: [
    'Nike', 'Levi\'s', 'Gap', 'Old Navy', 'Hanes', 'Carhartt', 'Columbia',
    'Under Armour', 'Calvin Klein', 'Ralph Lauren',
  ],
  footwear: ['Nike', 'Adidas', 'New Balance', 'Skechers', 'Timberland', 'Crocs', 'Birkenstock'],
  electronics: [
    'Apple', 'Samsung', 'LG', 'Sony', 'HP', 'Dell', 'Lenovo', 'Microsoft',
    'Bose', 'Whirlpool', 'GE Appliances',
  ],
  mobile: ['Apple', 'Samsung', 'Google Pixel', 'Motorola', 'OnePlus', 'T-Mobile', 'Verizon'],
  food: [
    'Kraft Heinz', 'General Mills', 'Kellogg\'s', 'Campbell\'s', 'Hormel',
    'Tyson', 'Smithfield', 'Nestlé USA', 'PepsiCo', 'Coca-Cola',
  ],
  grocery: [
    'Great Value', 'Kirkland', '365 by Whole Foods', 'Trader Joe\'s',
    'Kraft', 'General Mills', 'Kellogg\'s', 'Campbell\'s', 'Nestlé', 'Unilever',
  ],
  personalCare: [
    'Procter & Gamble', 'Unilever', 'Johnson & Johnson', 'Colgate-Palmolive',
    'L\'Oréal USA', 'Estée Lauder', 'Clorox', 'Church & Dwight',
  ],
  pharmaceutical: [
    'Pfizer', 'Johnson & Johnson', 'Merck', 'AbbVie', 'Bristol Myers Squibb',
    'Eli Lilly', 'Amgen', 'Gilead', 'Moderna', 'CVS Health',
  ],
  textile: ['Hanes', 'Fruit of the Loom', 'Gildan', 'Milliken', 'Invista'],
  bakery: ['Pepperidge Farm', 'Entenmann\'s', 'Sara Lee', 'Thomas\'', 'Arnold'],
  designer: ['Coach', 'Michael Kors', 'Kate Spade', 'Ralph Lauren', 'Calvin Klein'],
  autoparts: [
    'AutoZone', 'Advance Auto Parts', 'NAPA', 'Bosch', 'Denso', 'ACDelco',
    'Mobil 1', 'Goodyear', 'Michelin', 'Bridgestone',
  ],
  paint: ['Sherwin-Williams', 'Benjamin Moore', 'Behr', 'PPG', 'Valspar'],
  construction: ['USG', 'CertainTeed', 'Georgia-Pacific', 'Quikrete', 'Owens Corning'],
  steel: ['Nucor', 'U.S. Steel', 'Cleveland-Cliffs', 'Steel Dynamics'],
  general: [
    'Store Brand', 'Imported', 'Private Label', 'Made in USA', 'Imported, China',
    'Imported, Mexico', 'Imported, Canada', 'Imported, Europe',
  ],
};

export function getUnitedStatesBrands(category) {
  return US_BRAND_CATALOG[category] || US_BRAND_CATALOG.general || [];
}
