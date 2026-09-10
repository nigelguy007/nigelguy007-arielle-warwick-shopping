import type { ProductSearchInput, ProductSearchResult } from "@/lib/types";
import type { ProductSearchProvider } from "./types";

interface MockTemplate {
  match: string[];
  title: string;
  description: string;
  retailer: string;
  price: number;
  previousPrice?: number;
  delivery: number;
  deliveryDays: number;
  rating: number;
  reviews: number;
  attributes: string[];
}

// Deterministic, clearly-labelled mock catalogue. Prices are illustrative only.
const CATALOGUE: MockTemplate[] = [
  { match: ["duvet"], title: "Single 10.5 Tog Duvet", description: "Hollowfibre, single 135x200cm, machine washable", retailer: "Dunelm", price: 14, delivery: 3.95, deliveryDays: 3, rating: 4.5, reviews: 2100, attributes: ["single", "10.5 tog"] },
  { match: ["duvet"], title: "Double 10.5 Tog Duvet", description: "Double 200x200cm anti-allergy duvet", retailer: "Argos", price: 18, delivery: 0, deliveryDays: 2, rating: 4.4, reviews: 900, attributes: ["double"] },
  { match: ["duvet"], title: "Single All-Season Duvet 13.5 Tog", description: "Warm single duvet 3ft 90x190 bed", retailer: "Amazon UK", price: 22.99, previousPrice: 29.99, delivery: 0, deliveryDays: 1, rating: 4.6, reviews: 5400, attributes: ["single", "13.5 tog"] },
  { match: ["duvet"], title: "Small Double 10.5 Tog Duvet", description: "Small double 120x190cm anti-allergy duvet", retailer: "Argos", price: 20, delivery: 0, deliveryDays: 2, rating: 4.3, reviews: 410, attributes: ["small double"] },
  { match: ["duvet"], title: "Small Double All-Season Duvet 13.5 Tog", description: "Warm small double duvet 4ft 120x190 bed", retailer: "Amazon UK", price: 24.99, previousPrice: 31.99, delivery: 0, deliveryDays: 1, rating: 4.5, reviews: 1800, attributes: ["small double", "13.5 tog"] },
  { match: ["duvet cover", "bedding set"], title: "Single Duvet Cover Set", description: "Single duvet cover with one pillowcase, polycotton", retailer: "Primark", price: 9, delivery: 0, deliveryDays: 0, rating: 4.2, reviews: 300, attributes: ["single"] },
  { match: ["duvet cover", "bedding set"], title: "Double Duvet Cover Set", description: "Double duvet set with two pillowcases", retailer: "Dunelm", price: 16, delivery: 3.95, deliveryDays: 3, rating: 4.3, reviews: 700, attributes: ["double"] },
  { match: ["duvet cover", "bedding set"], title: "Small Double Duvet Cover Set", description: "Small double (120cm) duvet cover with two pillowcases", retailer: "Dunelm", price: 17, delivery: 3.95, deliveryDays: 3, rating: 4.2, reviews: 260, attributes: ["small double"] },
  { match: ["fitted sheet", "sheet"], title: "Single Fitted Sheet", description: "Single 90 x 190cm easy-care fitted sheet", retailer: "Tesco", price: 6, delivery: 0, deliveryDays: 0, rating: 4.1, reviews: 250, attributes: ["single"] },
  { match: ["fitted sheet", "sheet"], title: "Small Double Fitted Sheet", description: "Small double 120 x 190cm easy-care fitted sheet", retailer: "Tesco", price: 8, delivery: 0, deliveryDays: 0, rating: 4.1, reviews: 140, attributes: ["small double"] },
  { match: ["pillow"], title: "Pillows 2 Pack", description: "Pair of hollowfibre pillows", retailer: "B&M", price: 6, delivery: 0, deliveryDays: 0, rating: 4.0, reviews: 180, attributes: [] },
  { match: ["pillow"], title: "Anti-Allergy Pillow Pair", description: "Two medium-support pillows", retailer: "Argos", price: 12, delivery: 0, deliveryDays: 2, rating: 4.5, reviews: 1200, attributes: [] },
  { match: ["mattress protector"], title: "Single Mattress Protector", description: "Quilted single mattress protector", retailer: "Dunelm", price: 8, delivery: 3.95, deliveryDays: 3, rating: 4.4, reviews: 640, attributes: ["single"] },
  { match: ["mattress protector"], title: "Small Double Mattress Protector", description: "Quilted small double (120cm) mattress protector", retailer: "Dunelm", price: 10, delivery: 3.95, deliveryDays: 3, rating: 4.3, reviews: 210, attributes: ["small double"] },
  { match: ["towel"], title: "Bath Towel 2 Pack", description: "Two 100% cotton bath towels", retailer: "Primark", price: 10, delivery: 0, deliveryDays: 0, rating: 4.3, reviews: 410, attributes: [] },
  { match: ["towel"], title: "Super Soft Bath Towel", description: "Large cotton bath towel", retailer: "Dunelm", price: 7, delivery: 3.95, deliveryDays: 3, rating: 4.6, reviews: 3300, attributes: [] },
  { match: ["towel"], title: "Bath Sheet Set of 2", description: "Quick-dry bath sheets", retailer: "Amazon UK", price: 15.99, delivery: 0, deliveryDays: 1, rating: 4.4, reviews: 2200, attributes: [] },
  { match: ["frying pan", "pan"], title: "Non-Stick Frying Pan 24cm", description: "Aluminium frying pan. Not suitable for induction hobs.", retailer: "B&M", price: 5, delivery: 0, deliveryDays: 0, rating: 3.9, reviews: 120, attributes: ["not induction"] },
  { match: ["frying pan", "pan"], title: "Induction Frying Pan 24cm", description: "Suitable for all hobs including induction", retailer: "Argos", price: 12, delivery: 0, deliveryDays: 2, rating: 4.5, reviews: 860, attributes: ["induction"] },
  { match: ["frying pan", "pan"], title: "Stainless Steel Frying Pan 26cm", description: "Induction compatible stainless steel pan", retailer: "IKEA", price: 10, delivery: 4.5, deliveryDays: 4, rating: 4.6, reviews: 1500, attributes: ["induction"] },
  { match: ["saucepan"], title: "Saucepan with Lid 18cm", description: "Induction-ready saucepan with glass lid", retailer: "Dunelm", price: 11, delivery: 3.95, deliveryDays: 3, rating: 4.4, reviews: 540, attributes: ["induction"] },
  { match: ["saucepan"], title: "Aluminium Saucepan 16cm", description: "Lightweight saucepan, gas and electric only", retailer: "Home Bargains", price: 4.99, delivery: 0, deliveryDays: 0, rating: 3.8, reviews: 60, attributes: ["not induction"] },
  { match: ["kettle"], title: "1.7L Jug Kettle", description: "Fast-boil kettle", retailer: "Argos", price: 12, delivery: 0, deliveryDays: 2, rating: 4.3, reviews: 3000, attributes: [] },
  { match: ["toaster"], title: "2 Slice Toaster", description: "Two-slot toaster", retailer: "Argos", price: 10, delivery: 0, deliveryDays: 2, rating: 4.2, reviews: 2100, attributes: [] },
  { match: ["extension lead", "extension"], title: "4 Gang Surge Protected Extension Lead 2m", description: "UK 3-pin, surge protection", retailer: "Currys", price: 9.99, delivery: 0, deliveryDays: 1, rating: 4.7, reviews: 4100, attributes: ["surge"] },
  { match: ["extension lead", "extension"], title: "6 Socket Extension Lead 3m with USB", description: "Surge protected, 2 USB ports", retailer: "Amazon UK", price: 14.99, delivery: 0, deliveryDays: 1, rating: 4.6, reviews: 12000, attributes: ["surge", "usb"] },
  { match: ["extension lead", "extension"], title: "4 Way Extension Lead 1m", description: "Basic extension lead, no surge protection", retailer: "Home Bargains", price: 3.99, delivery: 0, deliveryDays: 0, rating: 3.7, reviews: 90, attributes: [] },
  { match: ["plate", "dinner set", "bowl", "mug", "glass", "cutlery"], title: "12 Piece Dinner Set", description: "Four plates, bowls, side plates", retailer: "IKEA", price: 12, delivery: 4.5, deliveryDays: 4, rating: 4.5, reviews: 2600, attributes: [] },
  { match: ["plate", "dinner set", "bowl", "mug"], title: "Stoneware Dinner Set 12 Piece", description: "Dishwasher safe", retailer: "Argos", price: 15, delivery: 0, deliveryDays: 2, rating: 4.4, reviews: 900, attributes: [] },
  { match: ["cutlery"], title: "16 Piece Cutlery Set", description: "Stainless steel", retailer: "Dunelm", price: 8, delivery: 3.95, deliveryDays: 3, rating: 4.3, reviews: 700, attributes: [] },
  { match: ["cutlery"], title: "Cutlery Set 24 Piece", description: "Knives, forks, spoons and teaspoons", retailer: "IKEA", price: 6, delivery: 4.5, deliveryDays: 4, rating: 4.6, reviews: 5000, attributes: [] },
  { match: ["knife"], title: "Chef's Knife 20cm", description: "Stainless steel chef's knife", retailer: "IKEA", price: 7, delivery: 4.5, deliveryDays: 4, rating: 4.5, reviews: 1400, attributes: [] },
  { match: ["chopping board"], title: "Chopping Board Set of 3", description: "Colour-coded plastic boards", retailer: "Home Bargains", price: 3.49, delivery: 0, deliveryDays: 0, rating: 4.1, reviews: 200, attributes: [] },
  { match: ["laundry"], title: "Pop-Up Laundry Basket", description: "Collapsible mesh laundry basket", retailer: "B&M", price: 3, delivery: 0, deliveryDays: 0, rating: 4.2, reviews: 500, attributes: [] },
  { match: ["laundry"], title: "Laundry Bag with Handles", description: "Large laundry bag", retailer: "IKEA", price: 2.5, delivery: 4.5, deliveryDays: 4, rating: 4.4, reviews: 900, attributes: [] },
  { match: ["hanger"], title: "Coat Hangers 20 Pack", description: "Plastic hangers", retailer: "Tesco", price: 4, delivery: 0, deliveryDays: 0, rating: 4.0, reviews: 300, attributes: [] },
  { match: ["desk lamp", "lamp"], title: "LED Desk Lamp", description: "USB-powered LED desk lamp with dimmer", retailer: "IKEA", price: 12, delivery: 4.5, deliveryDays: 4, rating: 4.5, reviews: 1900, attributes: [] },
  { match: ["first aid"], title: "First Aid Kit 70 Piece", description: "Compact first aid kit", retailer: "Boots", price: 8, delivery: 3.75, deliveryDays: 2, rating: 4.6, reviews: 800, attributes: [] },
  { match: ["paracetamol"], title: "Paracetamol 16 Tablets", description: "500mg", retailer: "Superdrug", price: 0.45, delivery: 2.99, deliveryDays: 3, rating: 4.8, reviews: 50, attributes: [] },
  { match: ["toilet roll"], title: "Toilet Tissue 9 Rolls", description: "Own-brand toilet tissue", retailer: "Sainsbury's", price: 4.5, delivery: 0, deliveryDays: 0, rating: 4.3, reviews: 700, attributes: [] },
  { match: ["storage", "container"], title: "Food Storage Containers 5 Pack", description: "BPA-free with lids", retailer: "Tesco", price: 5, delivery: 0, deliveryDays: 0, rating: 4.2, reviews: 400, attributes: [] },
  { match: ["airer", "clothes airer"], title: "3 Tier Clothes Airer", description: "Folding indoor airer", retailer: "Argos", price: 11, delivery: 0, deliveryDays: 2, rating: 4.3, reviews: 2400, attributes: [] },
  { match: ["tea towel"], title: "Tea Towels 5 Pack", description: "Cotton tea towels", retailer: "Dunelm", price: 5, delivery: 3.95, deliveryDays: 3, rating: 4.5, reviews: 1100, attributes: [] },
  { match: ["caddy"], title: "Shower Caddy Basket", description: "Portable shower caddy with handle", retailer: "B&M", price: 2.5, delivery: 0, deliveryDays: 0, rating: 4.1, reviews: 150, attributes: [] },
  { match: ["ethernet"], title: "Ethernet Cable 5m Cat6", description: "Gigabit patch cable", retailer: "Currys", price: 6.99, delivery: 0, deliveryDays: 1, rating: 4.7, reviews: 3200, attributes: [] },
];

const RETAILER_URLS: Record<string, string> = {
  Argos: "https://www.argos.co.uk/search/",
  Dunelm: "https://www.dunelm.com/search?searchTerm=",
  IKEA: "https://www.ikea.com/gb/en/search/?q=",
  Tesco: "https://www.tesco.com/groceries/en-GB/search?query=",
  "Sainsbury's": "https://www.sainsburys.co.uk/gol-ui/SearchResults/",
  Boots: "https://www.boots.com/search?text=",
  Superdrug: "https://www.superdrug.com/search?text=",
  "B&M": "https://www.bmstores.co.uk/search?q=",
  "Home Bargains": "https://www.homebargains.co.uk/search?q=",
  Primark: "https://www.primark.com/en-gb/search?q=",
  "John Lewis": "https://www.johnlewis.com/search?search-term=",
  "Amazon UK": "https://www.amazon.co.uk/s?k=",
  Currys: "https://www.currys.co.uk/search?q=",
};

export function retailerSearchUrl(retailer: string, query: string): string {
  const base = RETAILER_URLS[retailer] ?? `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(retailer + " ")}`;
  return base + encodeURIComponent(query);
}

function tokens(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
}

function matches(template: MockTemplate, query: string): boolean {
  const q = query.toLowerCase();
  if (template.match.some((m) => q.includes(m))) return true;
  const qt = tokens(q);
  return template.match.some((m) => tokens(m).every((t) => qt.includes(t) || qt.includes(t.replace(/s$/, ""))));
}

export class MockProductProvider implements ProductSearchProvider {
  readonly name = "mock";

  async search(input: ProductSearchInput): Promise<ProductSearchResult[]> {
    const now = new Date().toISOString();
    const limit = input.limit ?? 8;
    const hits = CATALOGUE.filter((t) => matches(t, input.query));
    const locationLabel = input.location?.label ?? "United Kingdom";
    return hits
      .filter((t) => (input.maxPrice ? t.price + t.delivery <= input.maxPrice : true))
      .filter((t) => (input.retailerPreference?.length ? input.retailerPreference.includes(t.retailer) : true))
      .filter((t) => !(input.excludedAttributes ?? []).some((a) => t.attributes.includes(a)))
      .slice(0, limit)
      .map((t, i) => ({
        id: `mock-${t.retailer.toLowerCase().replace(/[^a-z]/g, "")}-${i}-${t.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        provider: "mock",
        retailer: t.retailer,
        title: `${t.title}`,
        description: t.description,
        currentPrice: t.price,
        previousPrice: t.previousPrice,
        currency: "GBP",
        deliveryPrice: t.delivery,
        totalPrice: Math.round((t.price + t.delivery) * 100) / 100,
        rating: t.rating,
        reviewCount: t.reviews,
        imageUrl: null,
        productUrl: retailerSearchUrl(t.retailer, t.title),
        merchantUrl: retailerSearchUrl(t.retailer, t.title),
        availability: t.delivery === 0 && t.deliveryDays === 0 ? "Mock: typically stocked in store" : "Mock: in stock online",
        attributes: t.attributes,
        locationContext: locationLabel,
        checkedAt: now,
        sourceConfidence: "mock" as const,
        deliveryDays: t.deliveryDays,
      }));
  }
}
