export type Size = "S" | "M" | "L" | "XL";

export type ProductSlug = "kohl" | "dhool" | "reeh";

export type Product = {
  slug: ProductSlug;
  series: number;
  name: string;
  deva: string;
  devaMeaning: string;
  fit: "tailored" | "straight" | "pleated";
  swatch: string;
  price: number; // rupees, integer
  fabric: string;
  weight: string;
  mill: string;
  description: string;
  fabricStory: string;
  care: string[];
  sizes: Size[];
  images: string[];
  drop: string;
};

export const SIZES: Size[] = ["S", "M", "L", "XL"];

export const PRODUCTS: Product[] = [
  {
    slug: "kohl",
    series: 1,
    name: "KOHL",
    deva: "कोहल",
    devaMeaning: "kohl, deep black",
    fit: "tailored",
    swatch: "#121416",
    price: 2999,
    fabric: "Cotton twill",
    weight: "280 GSM",
    mill: "Tirupur, Tamil Nadu",
    description:
      "A clean leg with a single break. Heavyweight twill holds the line; the cut sits flat on the hip.",
    fabricStory:
      "The twill is woven in Tirupur from long-staple cotton and finished without a resin coat, so it softens instead of going slack. At 280 GSM it is heavy enough to hang straight off the hip without a press, and dense enough that the diagonal weave reads as texture rather than sheen. Lighter cloth collapses at the knee by the third wear. This does not. The black is piece-dyed, so it fades along the seams rather than patching.",
    care: ["Cold wash, inside out.", "Hang dry. No tumble.", "Iron on reverse."],
    sizes: ["S", "M", "L", "XL"],
    images: [
      "/products/kohl/01.webp",
      "/products/kohl/02.webp",
      "/products/kohl/03.webp",
      "/products/kohl/04.webp",
      "/products/kohl/05.webp",
      "/products/kohl/06.webp",
    ],
    drop: "the-trouser-trio",
  },
  {
    slug: "dhool",
    series: 2,
    name: "DHOOL",
    deva: "धूल",
    devaMeaning: "dust, dry earth",
    fit: "straight",
    swatch: "#4A4F54",
    price: 2999,
    fabric: "Cotton drill",
    weight: "300 GSM",
    mill: "Erode, Tamil Nadu",
    description:
      "Straight from hip to hem, no taper. Cut wide enough to sit over a boot. The waistband is faced, not elasticated.",
    fabricStory:
      "Drill is a steeper twill than the cloth in Series 1 — the diagonal runs closer to vertical, which is why it creases along the leg instead of across it. Woven in Erode at 300 GSM and washed once before cutting, so the shrink is already out of it. The grey is yarn-dyed: two tones in the warp and weft that read flat at a distance and mottled up close. It gets lighter at the thigh with wear.",
    care: [
      "Cold wash, inside out.",
      "Hang dry. No tumble.",
      "Iron on reverse.",
      "Wash separately for the first three cycles.",
    ],
    sizes: ["S", "M", "L", "XL"],
    images: [
      "/products/dhool/01.webp",
      "/products/dhool/02.webp",
      "/products/dhool/03.webp",
      "/products/dhool/04.webp",
      "/products/dhool/05.webp",
      "/products/dhool/06.webp",
    ],
    drop: "the-trouser-trio",
  },
  {
    slug: "reeh",
    series: 3,
    name: "REEH",
    deva: "रीह",
    devaMeaning: "sand, desert wind",
    fit: "pleated",
    swatch: "#B5A183",
    price: 3299,
    fabric: "Cotton-linen blend",
    weight: "240 GSM",
    mill: "Bhilwara, Rajasthan",
    description:
      "Two forward pleats, deep rise, tapered from the knee. The pleats stay shut when you stand and open when you sit.",
    care: [
      "Cold wash, inside out.",
      "Hang dry. No tumble.",
      "Iron on reverse, pleats last.",
    ],
    fabricStory:
      "Sixty-forty cotton to linen, woven in Bhilwara. The linen is what makes the pleats hold a fold and what makes the cloth wrinkle — you get one without the other. At 240 GSM it is the lightest of the three, cut that way so the pleats have room to move rather than standing off the waistband. The sand tone comes from the undyed linen showing through a light cotton dye. It will lighten a shade in the first year.",
    sizes: ["S", "M", "L", "XL"],
    images: [
      "/products/reeh/01.webp",
      "/products/reeh/02.webp",
      "/products/reeh/03.webp",
      "/products/reeh/04.webp",
      "/products/reeh/05.webp",
      "/products/reeh/06.webp",
    ],
    drop: "the-trouser-trio",
  },
];

export const getProduct = (slug: string) => PRODUCTS.find((p) => p.slug === slug);
