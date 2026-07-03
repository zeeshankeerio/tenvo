/**
 * Tenvo Gym & Fitness demo catalog — supplements from archive/fitness-products.html
 * (Synergize.pk reference) plus membership/class SKUs from archive/fitness.html.
 * Regenerate: node scripts/build-fitness-seed-catalog.mjs
 */
/** @type {string[]} */
export const FITNESS_SEED_CATEGORIES = [
  "Whey Protein",
  "Weight Gainer",
  "Creatine",
  "Pre Workout",
  "Amino Acids",
  "Vitamins & Minerals",
  "Omega 3 & Fish Oil",
  "Protein Bars",
  "Fitness Accessories",
  "Weight Loss",
  "Memberships",
  "Personal Training",
  "Classes",
  "Deals"
];

/** @type {Array<Record<string, unknown>>} */
export const FITNESS_SEED_PRODUCTS = [
  {
    "name": "Gents Gym Monthly Pass",
    "brand": "Tenvo Fitness",
    "category": "Memberships",
    "unit": "month",
    "price": 4995,
    "compare_price": 5995,
    "cost_price": 1399,
    "stock": 999,
    "sku": "TF-GYM-MEM-M-1M",
    "description": "30-day unlimited access to the main gym floor, free weights, machines, and cardio. Locker included.",
    "image_url": "https://assets.website-files.com/62258d7594580b9078cf9018/62259760973610c0a8578542_Group%20100.png",
    "imageCredit": "workoutwildandfree.webflow.io (archive)",
    "is_featured": true,
    "domain_data": {
      "gender": "male",
      "facility": "gents",
      "duration": "monthly",
      "membershiptype": "Monthly",
      "bookable": true,
      "supplementname": null
    }
  },
  {
    "name": "Gents Gym 3-Month Package",
    "brand": "Tenvo Fitness",
    "category": "Memberships",
    "unit": "package",
    "price": 13500,
    "compare_price": 14985,
    "cost_price": 3780,
    "stock": 999,
    "sku": "TF-GYM-MEM-M-3M",
    "description": "90-day gents membership with 1 complimentary PT intro session and member pricing on supplements.",
    "image_url": "https://assets.website-files.com/62258d7594580b9078cf9018/62259760973610c0a8578542_Group%20100.png",
    "imageCredit": "workoutwildandfree.webflow.io (archive)",
    "is_featured": false,
    "domain_data": {
      "gender": "male",
      "facility": "gents",
      "duration": "3month",
      "membershiptype": "Quarterly",
      "bookable": true,
      "supplementname": null
    }
  },
  {
    "name": "Gents Gym 6-Month Package",
    "brand": "Tenvo Fitness",
    "category": "Memberships",
    "unit": "package",
    "price": 24995,
    "compare_price": 29970,
    "cost_price": 6999,
    "stock": 999,
    "sku": "TF-GYM-MEM-M-6M",
    "description": "Six months unlimited access, 2 PT sessions, monthly guest pass, and steam room access.",
    "image_url": "https://assets.website-files.com/62258d7594580b9078cf9018/62259760973610c0a8578542_Group%20100.png",
    "imageCredit": "workoutwildandfree.webflow.io (archive)",
    "is_featured": false,
    "domain_data": {
      "gender": "male",
      "facility": "gents",
      "duration": "6month",
      "membershiptype": "Semi-Annual",
      "bookable": true,
      "supplementname": null
    }
  },
  {
    "name": "Gents Gym Annual Pass",
    "brand": "Tenvo Fitness",
    "category": "Memberships",
    "unit": "package",
    "price": 44995,
    "compare_price": 59940,
    "cost_price": 12599,
    "stock": 999,
    "sku": "TF-GYM-MEM-M-12M",
    "description": "Best value yearly plan: unlimited gym, 4 PT sessions, nutrition consult, and 15% off supplements.",
    "image_url": "https://assets.website-files.com/62258d7594580b9078cf9018/62259760973610c0a8578542_Group%20100.png",
    "imageCredit": "workoutwildandfree.webflow.io (archive)",
    "is_featured": false,
    "domain_data": {
      "gender": "male",
      "facility": "gents",
      "duration": "yearly",
      "membershiptype": "Annual",
      "bookable": true,
      "supplementname": null
    }
  },
  {
    "name": "Ladies Section Monthly Pass",
    "brand": "Tenvo Fitness",
    "category": "Memberships",
    "unit": "month",
    "price": 5995,
    "compare_price": 7495,
    "cost_price": 1679,
    "stock": 999,
    "sku": "TF-GYM-MEM-F-1M",
    "description": "30-day ladies-only floor access with female trainers on duty, cardio, and strength zones.",
    "image_url": "https://assets.website-files.com/62258d7594580b9078cf9018/62259760d15b8935f9abff2b_Group%20101.png",
    "imageCredit": "workoutwildandfree.webflow.io (archive)",
    "is_featured": true,
    "domain_data": {
      "gender": "female",
      "facility": "ladies",
      "duration": "monthly",
      "membershiptype": "Monthly",
      "bookable": true,
      "supplementname": null
    }
  },
  {
    "name": "Ladies Section 3-Month Package",
    "brand": "Tenvo Fitness",
    "category": "Memberships",
    "unit": "package",
    "price": 16200,
    "compare_price": 17985,
    "cost_price": 4536,
    "stock": 999,
    "sku": "TF-GYM-MEM-F-3M",
    "description": "90-day ladies membership with 1 PT intro, group class access, and secure locker.",
    "image_url": "https://assets.website-files.com/62258d7594580b9078cf9018/62259760d15b8935f9abff2b_Group%20101.png",
    "imageCredit": "workoutwildandfree.webflow.io (archive)",
    "is_featured": false,
    "domain_data": {
      "gender": "female",
      "facility": "ladies",
      "duration": "3month",
      "membershiptype": "Quarterly",
      "bookable": true,
      "supplementname": null
    }
  },
  {
    "name": "Ladies Section 6-Month Package",
    "brand": "Tenvo Fitness",
    "category": "Memberships",
    "unit": "package",
    "price": 29995,
    "compare_price": 35970,
    "cost_price": 8399,
    "stock": 999,
    "sku": "TF-GYM-MEM-F-6M",
    "description": "Six months ladies-only access, 2 PT sessions, yoga class pack add-on, and steam access.",
    "image_url": "https://assets.website-files.com/62258d7594580b9078cf9018/62259760d15b8935f9abff2b_Group%20101.png",
    "imageCredit": "workoutwildandfree.webflow.io (archive)",
    "is_featured": false,
    "domain_data": {
      "gender": "female",
      "facility": "ladies",
      "duration": "6month",
      "membershiptype": "Semi-Annual",
      "bookable": true,
      "supplementname": null
    }
  },
  {
    "name": "Ladies Section Annual Pass",
    "brand": "Tenvo Fitness",
    "category": "Memberships",
    "unit": "package",
    "price": 53995,
    "compare_price": 71940,
    "cost_price": 15119,
    "stock": 999,
    "sku": "TF-GYM-MEM-F-12M",
    "description": "Year-round ladies membership with 4 PT sessions, nutrition check-in, and 15% supplement discount.",
    "image_url": "https://assets.website-files.com/62258d7594580b9078cf9018/62259760d15b8935f9abff2b_Group%20101.png",
    "imageCredit": "workoutwildandfree.webflow.io (archive)",
    "is_featured": false,
    "domain_data": {
      "gender": "female",
      "facility": "ladies",
      "duration": "yearly",
      "membershiptype": "Annual",
      "bookable": true,
      "supplement_discount": 15,
      "supplementname": null
    }
  },
  {
    "name": "Rookie Trial Pass",
    "brand": "Tenvo Fitness",
    "category": "Memberships",
    "unit": "session",
    "price": 997,
    "compare_price": 1997,
    "cost_price": 200,
    "stock": 999,
    "sku": "TF-GYM-MEM-002",
    "description": "One-time intro pass with coach orientation and access to all main workout zones.",
    "image_url": "https://assets.website-files.com/62258d7594580b9078cf9018/62259760ab10d7619d303c29_Group%20102.png",
    "imageCredit": "workoutwildandfree.webflow.io (archive)",
    "is_featured": true,
    "domain_data": {
      "gender": "unisex",
      "duration": "trial",
      "membershiptype": "Trial",
      "bookable": true,
      "supplementname": null
    }
  },
  {
    "name": "Personal Training (5 Sessions)",
    "brand": "Tenvo Fitness",
    "category": "Personal Training",
    "unit": "pack",
    "price": 12500,
    "compare_price": 15000,
    "cost_price": 4500,
    "stock": 999,
    "sku": "TF-GYM-PT-001",
    "description": "Five one-on-one sessions with a certified strength or mobility coach.",
    "image_url": "https://assets.website-files.com/62258d7594580b9078cf9018/62259760ab10d7619d303c29_Group%20102.png",
    "imageCredit": "workoutwildandfree.webflow.io (archive)",
    "is_featured": true,
    "domain_data": {
      "membershiptype": "Monthly",
      "trainer": "Assigned on booking"
    }
  },
  {
    "name": "Yoga & Mobility Class Pack",
    "brand": "Tenvo Fitness",
    "category": "Classes",
    "unit": "pack",
    "price": 3500,
    "compare_price": 4200,
    "cost_price": 900,
    "stock": 999,
    "sku": "TF-GYM-CLS-001",
    "description": "Eight flexibility and recovery classes. Ideal for desk athletes and lifters.",
    "image_url": "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80&auto=format&fit=crop",
    "imageCredit": "Unsplash (demo)",
    "domain_data": {
      "membershiptype": "Quarterly",
      "supplementname": null
    }
  },
  {
    "name": "Nutrition Consultation",
    "brand": "Tenvo Fitness",
    "category": "Personal Training",
    "unit": "session",
    "price": 2500,
    "cost_price": 800,
    "stock": 999,
    "sku": "TF-GYM-NUT-001",
    "description": "45-minute consult to align protein, recovery, and supplement plan with your training block.",
    "image_url": "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=800&q=80&auto=format&fit=crop",
    "imageCredit": "Unsplash (demo)",
    "domain_data": {
      "supplementname": "Custom stack",
      "trainer": "Nutrition coach"
    }
  },
  {
    "name": "Labrada Multi Vitamins 60 Tabs",
    "brand": "Labrada",
    "category": "Vitamins & Minerals",
    "unit": "pack",
    "price": 5780,
    "compare_price": null,
    "cost_price": 3930,
    "stock": 12,
    "sku": "TF-GYM-001",
    "description": "Labrada Multi Vitamins 60 Tabs. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2026/06/labrada-multivitamin-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": true,
    "domain_data": {
      "supplementname": "Labrada Multi Vitamins 60 Tabs",
      "membershiptype": null
    }
  },
  {
    "name": "Xtend Whey Protein 30 Servings",
    "brand": "Xtend",
    "category": "Whey Protein",
    "unit": "tub",
    "price": 12980,
    "compare_price": null,
    "cost_price": 8826,
    "stock": 13,
    "sku": "TF-GYM-002",
    "description": "Xtend Whey Protein 30 Servings. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2026/06/xtend-whey-30-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": true,
    "domain_data": {
      "supplementname": "Xtend Whey Protein 30 Servings",
      "membershiptype": null
    }
  },
  {
    "name": "Nutrex T UP Max",
    "brand": "Nutrex",
    "category": "Amino Acids",
    "unit": "pcs",
    "price": 6480,
    "compare_price": null,
    "cost_price": 4406,
    "stock": 14,
    "sku": "TF-GYM-003",
    "description": "Nutrex T UP Max. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2026/06/nutrex-tup-max-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": true,
    "domain_data": {
      "supplementname": "Nutrex T UP Max",
      "membershiptype": null
    }
  },
  {
    "name": "Applied Nutrition Omega 3 100 Caps",
    "brand": "Applied Nutrition",
    "category": "Omega 3 & Fish Oil",
    "unit": "pack",
    "price": 5980,
    "compare_price": null,
    "cost_price": 4066,
    "stock": 15,
    "sku": "TF-GYM-004",
    "description": "Applied Nutrition Omega 3 100 Caps. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2026/06/applied-nutrition-omega3-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": true,
    "domain_data": {
      "supplementname": "Applied Nutrition Omega 3 100 Caps",
      "membershiptype": null
    }
  },
  {
    "name": "Nutrex Caffeine 60 Caps",
    "brand": "Nutrex",
    "category": "Pre Workout",
    "unit": "pack",
    "price": 4080,
    "compare_price": null,
    "cost_price": 2774,
    "stock": 16,
    "sku": "TF-GYM-005",
    "description": "Nutrex Caffeine 60 Caps. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2026/06/nutrex-caffeine-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": true,
    "domain_data": {
      "supplementname": "Nutrex Caffeine 60 Caps",
      "membershiptype": null
    }
  },
  {
    "name": "Skull Labz Ripped Mass 3kg",
    "brand": "Skull Labz",
    "category": "Weight Gainer",
    "unit": "tub",
    "price": 14980,
    "compare_price": null,
    "cost_price": 10186,
    "stock": 17,
    "sku": "TF-GYM-006",
    "description": "Skull Labz Ripped Mass 3kg. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2026/05/skull-labz-rippedmass-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": true,
    "domain_data": {
      "supplementname": "Skull Labz Ripped Mass 3kg",
      "membershiptype": null
    }
  },
  {
    "name": "Kevin Levrone Anabolic Mass 3kg",
    "brand": "Kevin Levrone",
    "category": "Weight Gainer",
    "unit": "tub",
    "price": 18980,
    "compare_price": null,
    "cost_price": 12906,
    "stock": 18,
    "sku": "TF-GYM-007",
    "description": "Kevin Levrone Anabolic Mass 3kg. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2022/08/kevin-levrone-anabolic-3kg-pakistan-2.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": true,
    "domain_data": {
      "supplementname": "Kevin Levrone Anabolic Mass 3kg",
      "membershiptype": null
    }
  },
  {
    "name": "Kevin Levrone Gold Lean Mass 3kg",
    "brand": "Kevin Levrone",
    "category": "Weight Gainer",
    "unit": "tub",
    "price": 18480,
    "compare_price": null,
    "cost_price": 12566,
    "stock": 19,
    "sku": "TF-GYM-008",
    "description": "Kevin Levrone Gold Lean Mass 3kg. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2024/12/kevin-levrone-gold-lean-mass3kg-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": true,
    "domain_data": {
      "supplementname": "Kevin Levrone Gold Lean Mass 3kg",
      "membershiptype": null
    }
  },
  {
    "name": "Optimum Nutrition Serious Mass 12Lbs in Pakistan",
    "brand": "Optimum Nutrition",
    "category": "Weight Gainer",
    "unit": "tub",
    "price": 33980,
    "compare_price": null,
    "cost_price": 23106,
    "stock": 20,
    "sku": "TF-GYM-009",
    "description": "Optimum Nutrition Serious Mass 12Lbs in Pakistan. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2016/06/OPTIMUM-NUTRITION-SERIOUS-MASS-12LBS-IN-karachi-lahore-PAKISTAN.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": true,
    "domain_data": {
      "supplementname": "Optimum Nutrition Serious Mass 12Lbs in Pakistan",
      "membershiptype": null
    }
  },
  {
    "name": "Rule 1 Mass Gainer 6lbs",
    "brand": "Rule 1",
    "category": "Weight Gainer",
    "unit": "tub",
    "price": 18980,
    "compare_price": null,
    "cost_price": 12906,
    "stock": 21,
    "sku": "TF-GYM-010",
    "description": "Rule 1 Mass Gainer 6lbs. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2021/03/rule1-mass-gainer-6lb-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": true,
    "domain_data": {
      "supplementname": "Rule 1 Mass Gainer 6lbs",
      "membershiptype": null
    }
  },
  {
    "name": "Kevin Levrone Anabolic Mass 7kg",
    "brand": "Kevin Levrone",
    "category": "Weight Gainer",
    "unit": "tub",
    "price": 30980,
    "compare_price": null,
    "cost_price": 21066,
    "stock": 22,
    "sku": "TF-GYM-011",
    "description": "Kevin Levrone Anabolic Mass 7kg. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2022/08/kevin-levrone-anabolic-mass-7kg-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": true,
    "domain_data": {
      "supplementname": "Kevin Levrone Anabolic Mass 7kg",
      "membershiptype": null
    }
  },
  {
    "name": "Rule 1 Whey Protein ISO 2lb",
    "brand": "Rule 1",
    "category": "Whey Protein",
    "unit": "tub",
    "price": 18980,
    "compare_price": null,
    "cost_price": 12906,
    "stock": 23,
    "sku": "TF-GYM-012",
    "description": "Rule 1 Whey Protein ISO 2lb. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2026/04/rule1-whey-isolate-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": true,
    "domain_data": {
      "supplementname": "Rule 1 Whey Protein ISO 2lb",
      "membershiptype": null
    }
  },
  {
    "name": "BPI Hydro HD 5lb",
    "brand": "Bpi",
    "category": "Whey Protein",
    "unit": "tub",
    "price": 27980,
    "compare_price": null,
    "cost_price": 19026,
    "stock": 24,
    "sku": "TF-GYM-013",
    "description": "BPI Hydro HD 5lb. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2026/04/bpi-hydro-hd-price-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": false,
    "domain_data": {
      "supplementname": "BPI Hydro HD 5lb",
      "membershiptype": null
    }
  },
  {
    "name": "Dymatize Nutrition ISO 100 5lb in Pakistan",
    "brand": "Dymatize",
    "category": "Supplements",
    "unit": "tub",
    "price": 45980,
    "compare_price": null,
    "cost_price": 31266,
    "stock": 25,
    "sku": "TF-GYM-014",
    "description": "Dymatize Nutrition ISO 100 5lb in Pakistan. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2016/10/Dymatize-Nutrition-ISO-100-5lb-in-Pakistan-1.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": false,
    "domain_data": {
      "supplementname": "Dymatize Nutrition ISO 100 5lb in Pakistan",
      "membershiptype": null
    }
  },
  {
    "name": "Nutrex EAA&#8217;s+Hydration 30 Servings",
    "brand": "Nutrex",
    "category": "Amino Acids",
    "unit": "tub",
    "price": 8280,
    "compare_price": null,
    "cost_price": 5630,
    "stock": 26,
    "sku": "TF-GYM-015",
    "description": "Nutrex EAA&#8217;s+Hydration 30 Servings. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2024/07/nutrex-eaas-pakisatn.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": false,
    "domain_data": {
      "supplementname": "Nutrex EAA&#8217;s+Hydration 30 Servings",
      "membershiptype": null
    }
  },
  {
    "name": "Scivation Xtend BCAA 90 Servings in Pakistan",
    "brand": "Scivation",
    "category": "Amino Acids",
    "unit": "tub",
    "price": 16980,
    "compare_price": null,
    "cost_price": 11546,
    "stock": 27,
    "sku": "TF-GYM-016",
    "description": "Scivation Xtend BCAA 90 Servings in Pakistan. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2017/08/xtend-bcaa-90-servings-pakistan-karachi-lahore.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": false,
    "domain_data": {
      "supplementname": "Scivation Xtend BCAA 90 Servings in Pakistan",
      "membershiptype": null
    }
  },
  {
    "name": "Scivation Xtend BCAA 30 Servings in Pakistan",
    "brand": "Scivation",
    "category": "Amino Acids",
    "unit": "tub",
    "price": 8500,
    "compare_price": null,
    "cost_price": 5780,
    "stock": 28,
    "sku": "TF-GYM-017",
    "description": "Scivation Xtend BCAA 30 Servings in Pakistan. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2017/03/xtend-bcaa-30-servings-in-pakistan-1.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": false,
    "domain_data": {
      "supplementname": "Scivation Xtend BCAA 30 Servings in Pakistan",
      "membershiptype": null
    }
  },
  {
    "name": "Bpi Best Bcaa 60 Servings",
    "brand": "Bpi",
    "category": "Amino Acids",
    "unit": "tub",
    "price": 9180,
    "compare_price": null,
    "cost_price": 6242,
    "stock": 29,
    "sku": "TF-GYM-018",
    "description": "Bpi Best Bcaa 60 Servings. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2025/11/bpi-best-bcaa-60servings-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": false,
    "domain_data": {
      "supplementname": "Bpi Best Bcaa 60 Servings",
      "membershiptype": null
    }
  },
  {
    "name": "Condemned Labz Confined EAA + BCAA",
    "brand": "Condemned Labz",
    "category": "Amino Acids",
    "unit": "pcs",
    "price": 7980,
    "compare_price": null,
    "cost_price": 5426,
    "stock": 12,
    "sku": "TF-GYM-019",
    "description": "Condemned Labz Confined EAA + BCAA. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2025/04/condemnedlabz-bcaa-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": false,
    "domain_data": {
      "supplementname": "Condemned Labz Confined EAA + BCAA",
      "membershiptype": null
    }
  },
  {
    "name": "MuscleTech Platinum Glutamine 300 grams",
    "brand": "Muscle Tech",
    "category": "Amino Acids",
    "unit": "pcs",
    "price": 7980,
    "compare_price": null,
    "cost_price": 5426,
    "stock": 13,
    "sku": "TF-GYM-020",
    "description": "MuscleTech Platinum Glutamine 300 grams. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2018/11/MuscleTech-Platinum-Glutamine-pakistan-price-1.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": false,
    "domain_data": {
      "supplementname": "MuscleTech Platinum Glutamine 300 grams",
      "membershiptype": null
    }
  },
  {
    "name": "ON Amino Energy 65 Servings",
    "brand": "Optimum Nutrition",
    "category": "Amino Acids",
    "unit": "tub",
    "price": 12980,
    "compare_price": null,
    "cost_price": 8826,
    "stock": 14,
    "sku": "TF-GYM-021",
    "description": "ON Amino Energy 65 Servings. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2025/11/optimum-nutrition-aminoenergy-65-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": false,
    "domain_data": {
      "supplementname": "ON Amino Energy 65 Servings",
      "membershiptype": null
    }
  },
  {
    "name": "Animal Pak 44 packs Price in Pakistan",
    "brand": "Universal Nutrition",
    "category": "Amino Acids",
    "unit": "pcs",
    "price": 15280,
    "compare_price": null,
    "cost_price": 10390,
    "stock": 15,
    "sku": "TF-GYM-022",
    "description": "Animal Pak 44 packs Price in Pakistan. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2017/04/Animal-pak-price-in-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": false,
    "domain_data": {
      "supplementname": "Animal Pak 44 packs Price in Pakistan",
      "membershiptype": null
    }
  },
  {
    "name": "GAT Mens Multi + Test Vitamins 60/150 Tabs",
    "brand": "Gat",
    "category": "T Boosters",
    "unit": "pack",
    "price": 5680,
    "compare_price": null,
    "cost_price": 3862,
    "stock": 16,
    "sku": "TF-GYM-023",
    "description": "GAT Mens Multi + Test Vitamins 60/150 Tabs. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2021/03/gat-multi-test-price-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": false,
    "domain_data": {
      "supplementname": "GAT Mens Multi + Test Vitamins 60/150 Tabs",
      "membershiptype": null
    }
  },
  {
    "name": "Optimum Nutrition OptiWomen 60/120 Tabs",
    "brand": "Optimum Nutrition",
    "category": "Vitamins & Minerals",
    "unit": "pack",
    "price": 6980,
    "compare_price": null,
    "cost_price": 4746,
    "stock": 17,
    "sku": "TF-GYM-024",
    "description": "Optimum Nutrition OptiWomen 60/120 Tabs. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2018/05/opti-women-60-price-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": false,
    "domain_data": {
      "supplementname": "Optimum Nutrition OptiWomen 60/120 Tabs",
      "membershiptype": null
    }
  },
  {
    "name": "Optimum Nutrition Opti-Men 90/150 Tablets in Pakistan",
    "brand": "Optimum Nutrition",
    "category": "Vitamins & Minerals",
    "unit": "pack",
    "price": 8580,
    "compare_price": null,
    "cost_price": 5834,
    "stock": 18,
    "sku": "TF-GYM-025",
    "description": "Optimum Nutrition Opti-Men 90/150 Tablets in Pakistan. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2017/01/optimum-nutrition-optimen-in-pakistan-150tabs.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": false,
    "domain_data": {
      "supplementname": "Optimum Nutrition Opti-Men 90/150 Tablets in Pakistan",
      "membershiptype": null
    }
  },
  {
    "name": "Rule 1 Daily Multi Vitamins 90/180 Tabs",
    "brand": "Rule 1",
    "category": "Vitamins & Minerals",
    "unit": "pack",
    "price": 8780,
    "compare_price": null,
    "cost_price": 5970,
    "stock": 19,
    "sku": "TF-GYM-026",
    "description": "Rule 1 Daily Multi Vitamins 90/180 Tabs. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2023/12/rule1-multi-vitamins-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": false,
    "domain_data": {
      "supplementname": "Rule 1 Daily Multi Vitamins 90/180 Tabs",
      "membershiptype": null
    }
  },
  {
    "name": "MuscleTech Mutli Vitamins 90 Capsules in Pakistan",
    "brand": "Muscle Tech",
    "category": "Vitamins & Minerals",
    "unit": "pack",
    "price": 6280,
    "compare_price": null,
    "cost_price": 4270,
    "stock": 20,
    "sku": "TF-GYM-027",
    "description": "MuscleTech Mutli Vitamins 90 Capsules in Pakistan. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2016/05/muscletech-multi-vitamin-price-in-pakistan-karachi-lahore-1.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": false,
    "domain_data": {
      "supplementname": "MuscleTech Mutli Vitamins 90 Capsules in Pakistan",
      "membershiptype": null
    }
  },
  {
    "name": "Insane Labz ZMA 90 Caps",
    "brand": "Insane Labz",
    "category": "Amino Acids",
    "unit": "pack",
    "price": 4680,
    "compare_price": null,
    "cost_price": 3182,
    "stock": 21,
    "sku": "TF-GYM-028",
    "description": "Insane Labz ZMA 90 Caps. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2025/08/insane-labz-zma-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": false,
    "domain_data": {
      "supplementname": "Insane Labz ZMA 90 Caps",
      "membershiptype": null
    }
  },
  {
    "name": "Nutrex l Arginine 120 Caps",
    "brand": "Nutrex",
    "category": "Amino Acids",
    "unit": "pack",
    "price": 5480,
    "compare_price": null,
    "cost_price": 3726,
    "stock": 22,
    "sku": "TF-GYM-029",
    "description": "Nutrex l Arginine 120 Caps. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2022/08/nutrex-larginine-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": false,
    "domain_data": {
      "supplementname": "Nutrex l Arginine 120 Caps",
      "membershiptype": null
    }
  },
  {
    "name": "Insane Labz Glutamine 200 Grams",
    "brand": "Insane Labz",
    "category": "Amino Acids",
    "unit": "pcs",
    "price": 4980,
    "compare_price": null,
    "cost_price": 3386,
    "stock": 23,
    "sku": "TF-GYM-030",
    "description": "Insane Labz Glutamine 200 Grams. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2025/11/insanelabz-glutamine-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": false,
    "domain_data": {
      "supplementname": "Insane Labz Glutamine 200 Grams",
      "membershiptype": null
    }
  },
  {
    "name": "Optimum Nutrition Amino Energy",
    "brand": "Optimum Nutrition",
    "category": "Amino Acids",
    "unit": "pcs",
    "price": 8480,
    "compare_price": null,
    "cost_price": 5766,
    "stock": 24,
    "sku": "TF-GYM-031",
    "description": "Optimum Nutrition Amino Energy. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2015/12/optimum-amino-energy-in-karachi-lahore-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": false,
    "domain_data": {
      "supplementname": "Optimum Nutrition Amino Energy",
      "membershiptype": null
    }
  },
  {
    "name": "Mutant Bcaa&#8217;s 30 Servings",
    "brand": "Mutant",
    "category": "Amino Acids",
    "unit": "tub",
    "price": 6480,
    "compare_price": null,
    "cost_price": 4406,
    "stock": 25,
    "sku": "TF-GYM-032",
    "description": "Mutant Bcaa&#8217;s 30 Servings. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2024/10/mutant-bcaa-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": false,
    "domain_data": {
      "supplementname": "Mutant Bcaa&#8217;s 30 Servings",
      "membershiptype": null
    }
  },
  {
    "name": "GAT Sport Tribulus 90 Caps",
    "brand": "Gat",
    "category": "Amino Acids",
    "unit": "pack",
    "price": 4680,
    "compare_price": null,
    "cost_price": 3182,
    "stock": 26,
    "sku": "TF-GYM-033",
    "description": "GAT Sport Tribulus 90 Caps. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2022/07/gat-tribulus-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": false,
    "domain_data": {
      "supplementname": "GAT Sport Tribulus 90 Caps",
      "membershiptype": null
    }
  },
  {
    "name": "Nutrex Tribulus 90 Caps",
    "brand": "Nutrex",
    "category": "Amino Acids",
    "unit": "pack",
    "price": 5180,
    "compare_price": null,
    "cost_price": 3522,
    "stock": 27,
    "sku": "TF-GYM-034",
    "description": "Nutrex Tribulus 90 Caps. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2025/08/nutrex-tribulus-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": false,
    "domain_data": {
      "supplementname": "Nutrex Tribulus 90 Caps",
      "membershiptype": null
    }
  },
  {
    "name": "Gat Testrol Gold ES 60 Tabs",
    "brand": "Gat",
    "category": "Amino Acids",
    "unit": "pack",
    "price": 7480,
    "compare_price": null,
    "cost_price": 5086,
    "stock": 28,
    "sku": "TF-GYM-035",
    "description": "Gat Testrol Gold ES 60 Tabs. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2025/01/gat-testrol-goldes-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": false,
    "domain_data": {
      "supplementname": "Gat Testrol Gold ES 60 Tabs",
      "membershiptype": null
    }
  },
  {
    "name": "GAT Sports ZMA 90 Caps",
    "brand": "Gat",
    "category": "Amino Acids",
    "unit": "pack",
    "price": 5980,
    "compare_price": null,
    "cost_price": 4066,
    "stock": 29,
    "sku": "TF-GYM-036",
    "description": "GAT Sports ZMA 90 Caps. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2022/08/gat-sport-zma-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": false,
    "domain_data": {
      "supplementname": "GAT Sports ZMA 90 Caps",
      "membershiptype": null
    }
  },
  {
    "name": "GAT Testrol Original 60 Caps",
    "brand": "Gat",
    "category": "T Boosters",
    "unit": "pack",
    "price": 7180,
    "compare_price": null,
    "cost_price": 4882,
    "stock": 12,
    "sku": "TF-GYM-037",
    "description": "GAT Testrol Original 60 Caps. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2024/10/gat-testrol-original-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": false,
    "domain_data": {
      "supplementname": "GAT Testrol Original 60 Caps",
      "membershiptype": null
    }
  },
  {
    "name": "Muscletech Celltech Creatine HCL",
    "brand": "Muscle Tech",
    "category": "Amino Acids",
    "unit": "pcs",
    "price": 10480,
    "compare_price": null,
    "cost_price": 7126,
    "stock": 13,
    "sku": "TF-GYM-038",
    "description": "Muscletech Celltech Creatine HCL. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2026/04/muscletech-creatine-hcl-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": true,
    "domain_data": {
      "supplementname": "Muscletech Celltech Creatine HCL",
      "membershiptype": null
    }
  },
  {
    "name": "Rule1 Omega Fish Oil 100 Softgels",
    "brand": "Rule 1",
    "category": "Omega 3 & Fish Oil",
    "unit": "pcs",
    "price": 5980,
    "compare_price": null,
    "cost_price": 4066,
    "stock": 14,
    "sku": "TF-GYM-039",
    "description": "Rule1 Omega Fish Oil 100 Softgels. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2026/02/rule1-fishoil-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": false,
    "domain_data": {
      "supplementname": "Rule1 Omega Fish Oil 100 Softgels",
      "membershiptype": null
    }
  },
  {
    "name": "Kevin Levrone Gold Super Mass 7kg",
    "brand": "Kevin Levrone",
    "category": "Weight Gainer",
    "unit": "tub",
    "price": 27980,
    "compare_price": null,
    "cost_price": 19026,
    "stock": 15,
    "sku": "TF-GYM-040",
    "description": "Kevin Levrone Gold Super Mass 7kg. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2026/01/kevinlevrone-goldsuper-mass-7kg-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": true,
    "domain_data": {
      "supplementname": "Kevin Levrone Gold Super Mass 7kg",
      "membershiptype": null
    }
  },
  {
    "name": "Kevin Levrone Gold Whey 500 Grams",
    "brand": "Kevin Levrone",
    "category": "Whey Protein",
    "unit": "pcs",
    "price": 7980,
    "compare_price": null,
    "cost_price": 5426,
    "stock": 16,
    "sku": "TF-GYM-041",
    "description": "Kevin Levrone Gold Whey 500 Grams. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2026/02/kevin-levrone-gold-whey-500grams-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": true,
    "domain_data": {
      "supplementname": "Kevin Levrone Gold Whey 500 Grams",
      "membershiptype": null
    }
  },
  {
    "name": "Kevin Levrone Gold Creatine 500gms | 100 Servings",
    "brand": "Kevin Levrone",
    "category": "Creatine",
    "unit": "tub",
    "price": 8980,
    "compare_price": null,
    "cost_price": 6106,
    "stock": 17,
    "sku": "TF-GYM-042",
    "description": "Kevin Levrone Gold Creatine 500gms | 100 Servings. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2026/01/kevin-levrone-gold-creatine-500grams-100servings-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": true,
    "domain_data": {
      "supplementname": "Kevin Levrone Gold Creatine 500gms | 100 Servings",
      "membershiptype": null
    }
  },
  {
    "name": "Kevin Levrone Gold Whey 2kg",
    "brand": "Kevin Levrone",
    "category": "Whey Protein",
    "unit": "tub",
    "price": 21480,
    "compare_price": null,
    "cost_price": 14606,
    "stock": 18,
    "sku": "TF-GYM-043",
    "description": "Kevin Levrone Gold Whey 2kg. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2023/07/kevin-levrone-gold-whey-2kg-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": true,
    "domain_data": {
      "supplementname": "Kevin Levrone Gold Whey 2kg",
      "membershiptype": null
    }
  },
  {
    "name": "Kevin Levrone Anabolic Prime Pro 2kg",
    "brand": "Kevin Levrone",
    "category": "Whey Protein",
    "unit": "tub",
    "price": 20980,
    "compare_price": null,
    "cost_price": 14266,
    "stock": 19,
    "sku": "TF-GYM-044",
    "description": "Kevin Levrone Anabolic Prime Pro 2kg. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2023/06/kevin-levrone-primepro-pakistan-2.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": false,
    "domain_data": {
      "supplementname": "Kevin Levrone Anabolic Prime Pro 2kg",
      "membershiptype": null
    }
  },
  {
    "name": "Kevin Levrone Anabolic ISO Whey 2kg",
    "brand": "Kevin Levrone",
    "category": "Whey Protein",
    "unit": "tub",
    "price": 26980,
    "compare_price": null,
    "cost_price": 18346,
    "stock": 20,
    "sku": "TF-GYM-045",
    "description": "Kevin Levrone Anabolic ISO Whey 2kg. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2023/02/kevin-levrone-anabolic-iso-2kg-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": true,
    "domain_data": {
      "supplementname": "Kevin Levrone Anabolic ISO Whey 2kg",
      "membershiptype": null
    }
  },
  {
    "name": "Kevin Levrone Gold Creatine 300g",
    "brand": "Kevin Levrone",
    "category": "Creatine",
    "unit": "tub",
    "price": 5980,
    "compare_price": null,
    "cost_price": 4066,
    "stock": 21,
    "sku": "TF-GYM-046",
    "description": "Kevin Levrone Gold Creatine 300g. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2021/10/kevin-levrone-gold-creatine-pakistan-1.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": true,
    "domain_data": {
      "supplementname": "Kevin Levrone Gold Creatine 300g",
      "membershiptype": null
    }
  },
  {
    "name": "Kevin Levrone Anabolic Creatine 60 Servings",
    "brand": "Kevin Levrone",
    "category": "Creatine",
    "unit": "tub",
    "price": 6480,
    "compare_price": null,
    "cost_price": 4406,
    "stock": 22,
    "sku": "TF-GYM-047",
    "description": "Kevin Levrone Anabolic Creatine 60 Servings. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2023/12/kevin-levrone-anabolic-creatine-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": true,
    "domain_data": {
      "supplementname": "Kevin Levrone Anabolic Creatine 60 Servings",
      "membershiptype": null
    }
  },
  {
    "name": "Kevin Levrone Gold Lean Mass 6kg",
    "brand": "Kevin Levrone",
    "category": "Weight Gainer",
    "unit": "tub",
    "price": 27980,
    "compare_price": null,
    "cost_price": 19026,
    "stock": 23,
    "sku": "TF-GYM-048",
    "description": "Kevin Levrone Gold Lean Mass 6kg. Authentic supplement with nationwide delivery.",
    "image_url": "https://www.synergize.pk/wp-content/uploads/2026/01/kevinlevrone-goldlean-mass-6kg-pakistan.png",
    "imageCredit": "synergize.pk (archive reference)",
    "is_featured": true,
    "domain_data": {
      "supplementname": "Kevin Levrone Gold Lean Mass 6kg",
      "membershiptype": null
    }
  }
];
