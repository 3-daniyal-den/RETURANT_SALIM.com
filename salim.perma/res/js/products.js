/**
 * Sweet Salim Restaurant & Confectionery - Products Engine
 * Manages product catalog, filtering, search, and dynamic card rendering.
 */

const DEFAULT_PRODUCTS = [
  // --- TRADITIONAL MITHAI ---
  {
    id: "prod-mithai-01",
    name: "Royal Gulab Jamun (Pure Khoya)",
    slug: "royal-gulab-jamun",
    category: "mithai",
    description: "Handcrafted soft golden spheres made from pure reduced milk khoya, infused with green cardamom and steeped in warm saffron rose-water sugar syrup. A Sweet Salim signature recipe since 1984.",
    price: 850,
    original_price: 950,
    image_url: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=800&q=80",
    in_stock: true,
    is_featured: true,
    is_bestseller: true,
    preparation_time: "Ready to pack",
    weight_or_portion: "1 kg Box (approx 16 pcs)",
    allergens: "Contains Dairy (Khoya, Pure Desi Ghee). May contain trace nuts."
  },
  {
    id: "prod-mithai-02",
    name: "Shahi Motichoor Ladoo (Desi Ghee)",
    slug: "shahi-motichoor-ladoo",
    category: "mithai",
    description: "Fine pearl gram-flour drops cooked in 100% pure desi ghee, kissed with Kashmiri saffron and studded with crunchy melon seeds and Iranian pistachios.",
    price: 920,
    original_price: 1050,
    image_url: "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=800&q=80",
    in_stock: true,
    is_featured: true,
    is_bestseller: true,
    preparation_time: "Ready to pack",
    weight_or_portion: "1 kg Box",
    allergens: "Contains Dairy (Desi Ghee), Tree Nuts (Pistachio)."
  },
  {
    id: "prod-mithai-03",
    name: "Silver Leaf Kaju Katli",
    slug: "silver-leaf-kaju-katli",
    category: "mithai",
    description: "Silky diamond-cut confectionery crafted from premium Goan cashews and raw cane sugar, crowned with edible pure certified silver vark.",
    price: 1650,
    original_price: 1850,
    image_url: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=800&q=80",
    in_stock: true,
    is_featured: true,
    is_bestseller: true,
    preparation_time: "Ready to pack",
    weight_or_portion: "1 kg Luxury Gift Box",
    allergens: "Contains Cashew Nuts."
  },
  {
    id: "prod-mithai-04",
    name: "Spongy Rasgulla in Kewra Chashni",
    slug: "spongy-rasgulla",
    category: "mithai",
    description: "Delicate, airy cottage cheese dumplings simmered to pillowy softness in light aromatic kewra and green cardamom chashni.",
    price: 780,
    original_price: 880,
    image_url: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80",
    in_stock: true,
    is_featured: false,
    is_bestseller: false,
    preparation_time: "Ready to pack",
    weight_or_portion: "1 kg Tin (approx 14 pcs)",
    allergens: "Contains Dairy (Milk Chenna)."
  },
  {
    id: "prod-mithai-05",
    name: "Pistachio Malai Barfi",
    slug: "pistachio-malai-barfi",
    category: "mithai",
    description: "Creamy layered fudge made from slow-cooked heavy buffalo milk cream, layered with crushed green pistachios and fragrant cardamom.",
    price: 1100,
    original_price: 1250,
    image_url: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=800&q=80",
    in_stock: true,
    is_featured: false,
    is_bestseller: false,
    preparation_time: "Ready to pack",
    weight_or_portion: "1 kg Box",
    allergens: "Contains Dairy, Pistachios."
  },

  // --- RESTAURANT MEALS & ROYAL SPECIALTIES ---
  {
    id: "prod-meal-01",
    name: "Shahi Dum Mutton Biryani",
    slug: "shahi-dum-mutton-biryani",
    category: "meals",
    description: "Aged long-grain basmati rice layered with tender mutton marinated in curd, fried onions, and whole spices, sealed with dough and slow-cooked on coals with saffron dew.",
    price: 1550,
    original_price: 1750,
    image_url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80",
    in_stock: true,
    is_featured: true,
    is_bestseller: true,
    preparation_time: "30 - 35 mins",
    weight_or_portion: "Single Handi (Serves 1-2)",
    allergens: "Contains Dairy (Curd, Ghee). Halal certified."
  },
  {
    id: "prod-meal-02",
    name: "Mutton Rogan Josh Special",
    slug: "mutton-rogan-josh",
    category: "meals",
    description: "Slow-braised prime mutton shank in a rich, deep-crimson Kashmiri gravy infused with rattan jot, fennel seeds, and roasted ginger.",
    price: 1850,
    original_price: 2100,
    image_url: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80",
    in_stock: true,
    is_featured: true,
    is_bestseller: false,
    preparation_time: "25 - 30 mins",
    weight_or_portion: "1 Full Karahi Portion",
    allergens: "Contains Dairy, Whole spices."
  },
  {
    id: "prod-meal-03",
    name: "Charcoal Paneer Tikka Platter",
    slug: "paneer-tikka-platter",
    category: "meals",
    description: "Succulent cubes of fresh house-made paneer marinated in hung curd, yellow mustard, and degi mirch, char-grilled over fragrant coals with crisp bell peppers.",
    price: 980,
    original_price: 1150,
    image_url: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80",
    in_stock: true,
    is_featured: false,
    is_bestseller: true,
    preparation_time: "20 mins",
    weight_or_portion: "8 Skewer Pieces with Mint Raita",
    allergens: "Contains Dairy (Paneer, Curd)."
  },
  {
    id: "prod-meal-04",
    name: "Royal Chicken Tikka Handi",
    slug: "chicken-tikka-handi",
    category: "meals",
    description: "Smoky boneless tandoori chicken chunks tossed in a velvety tomato-butter gravy, finished with fenugreek leaves (kasuri methi) and fresh cream.",
    price: 1350,
    original_price: 1490,
    image_url: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=800&q=80",
    in_stock: true,
    is_featured: true,
    is_bestseller: true,
    preparation_time: "25 mins",
    weight_or_portion: "Medium Handi (Serves 2)",
    allergens: "Contains Dairy, Cashew paste."
  },

  // --- ARTISANAL CAKES & DESSERTS ---
  {
    id: "prod-cake-01",
    name: "Belgian Chocolate Truffle Cake",
    slug: "belgian-chocolate-truffle-cake",
    category: "cakes",
    description: "Moist Dutch dark chocolate sponge layered with 70% Belgian chocolate ganache, finished with cocoa mirror glaze and hand-piped truffles.",
    price: 2450,
    original_price: 2800,
    image_url: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80",
    in_stock: true,
    is_featured: true,
    is_bestseller: true,
    preparation_time: "Freshly baked daily",
    weight_or_portion: "2 lbs (8-10 slices)",
    allergens: "Contains Gluten, Eggs, Dairy, Soy lecithin."
  },
  {
    id: "prod-cake-02",
    name: "Royal Pistachio Saffron Gateau",
    slug: "pistachio-saffron-gateau",
    category: "cakes",
    description: "Airy almond sponge soaked in saffron milk syrup, filled with pistachio mousse and mascarpone frosting, topped with toasted Iranian pistachios.",
    price: 2850,
    original_price: 3200,
    image_url: "https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=800&q=80",
    in_stock: true,
    is_featured: true,
    is_bestseller: false,
    preparation_time: "Freshly baked daily",
    weight_or_portion: "2 lbs (8-10 slices)",
    allergens: "Contains Gluten, Tree nuts, Dairy, Eggs."
  },
  {
    id: "prod-cake-03",
    name: "Heritage Red Velvet Truffle Cake",
    slug: "red-velvet-truffle-cake",
    category: "cakes",
    description: "Classic velvety crimson sponge with delicate cocoa undertones, frosted with creamy Madagascar vanilla bean cream cheese frosting.",
    price: 2250,
    original_price: 2600,
    image_url: "https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?auto=format&fit=crop&w=800&q=80",
    in_stock: true,
    is_featured: false,
    is_bestseller: false,
    preparation_time: "Freshly baked daily",
    weight_or_portion: "2 lbs (8-10 slices)",
    allergens: "Contains Dairy, Gluten, Eggs."
  },

  // --- SAVORIES & CHAAT ---
  {
    id: "prod-savory-01",
    name: "Sweet Salim Special Samosa Chaat",
    slug: "special-samosa-chaat",
    category: "savories",
    description: "Crispy Punjabi potato samosas crushed and layered with spicy chickpea curry, sweetened whipped yogurt, tamarind-jaggery chutney, and fresh pomegranate.",
    price: 480,
    original_price: 550,
    image_url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80",
    in_stock: true,
    is_featured: false,
    is_bestseller: true,
    preparation_time: "12 mins",
    weight_or_portion: "2 Samosas with full Chaat bowl",
    allergens: "Contains Gluten, Dairy."
  },

  // --- BEVERAGES & CHAI ---
  {
    id: "prod-bev-01",
    name: "Royal Cardamom Karak Chai",
    slug: "royal-karak-chai",
    category: "beverages",
    description: "Slow-simmered whole milk tea with premium Ceylon tea leaves, freshly crushed cardamom pods, and caramelized raw cane sugar.",
    price: 220,
    original_price: 250,
    image_url: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80",
    in_stock: true,
    is_featured: false,
    is_bestseller: true,
    preparation_time: "10 mins",
    weight_or_portion: "350 ml Clay Kulhad Cup",
    allergens: "Contains Dairy."
  },
  {
    id: "prod-bev-02",
    name: "Zafrani Badam Milk",
    slug: "zafrani-badam-milk",
    category: "beverages",
    description: "Pure milk simmered with crushed almonds, Kashmiri saffron threads, pistachios, and honey. Served chilled or piping hot upon request.",
    price: 390,
    original_price: 450,
    image_url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80",
    in_stock: true,
    is_featured: false,
    is_bestseller: false,
    preparation_time: "5 mins",
    weight_or_portion: "300 ml Glass Bottle",
    allergens: "Contains Dairy, Tree nuts (Almonds, Pistachio)."
  },
  {
    id: "prod-bev-03",
    name: "Fresh Mint Margarita Cooler",
    slug: "mint-margarita-cooler",
    category: "beverages",
    description: "Crushed garden mint leaves, fresh lime juice, black rock salt, and sparkling soda blended to ice-cold refreshing perfection.",
    price: 320,
    original_price: 380,
    image_url: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80",
    in_stock: true,
    is_featured: false,
    is_bestseller: false,
    preparation_time: "5 mins",
    weight_or_portion: "400 ml Tall Glass",
    allergens: "Vegetarian & Vegan friendly."
  }
];

const ProductsEngine = {
  products: [...DEFAULT_PRODUCTS],
  cachedCategories: ["all", "mithai", "meals", "cakes", "savories", "beverages"],

  /**
   * Initializes catalog, optionally fetching from Supabase if configured
   */
  async init() {
    if (window.CONFIG && window.CONFIG.isConfigured() && window.supabase) {
      try {
        const client = window.supabase.createClient(
          window.CONFIG.SUPABASE.url,
          window.CONFIG.SUPABASE.anonKey
        );
        const { data, error } = await client
          .from("products")
          .select("*")
          .order("created_at", { ascending: true });

        if (!error && data && data.length > 0) {
          this.products = data;
          console.log(`Loaded ${data.length} products live from Supabase.`);
        }
      } catch (err) {
        console.warn("Could not load products from Supabase, using local catalog:", err);
      }
    }
    return this.products;
  },

  getAll() {
    return this.products;
  },

  getById(id) {
    return this.products.find((p) => p.id === id);
  },

  getByCategory(category) {
    if (!category || category === "all") return this.products;
    return this.products.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  },

  getFeatured() {
    return this.products.filter((p) => p.is_featured);
  },

  getBestsellers() {
    return this.products.filter((p) => p.is_bestseller);
  },

  search(term, category = "all") {
    let list = this.getByCategory(category);
    if (!term || !term.trim()) return list;

    const q = term.trim().toLowerCase();
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  },

  /**
   * Generates HTML markup for a product card
   */
  renderCard(product) {
    const isOut = !product.in_stock;
    const currency = window.CONFIG ? window.CONFIG.BRAND.currencySymbol : "Rs. ";

    return `
      <article class="product-card" data-product-id="${product.id}">
        <div class="product-image-container">
          <img src="${product.image_url}" alt="${product.name}" loading="lazy" />
          
          <div class="product-badge-stack">
            ${isOut ? '<span class="badge badge-stock-out">Out of Stock</span>' : ""}
            ${product.is_bestseller && !isOut ? '<span class="badge badge-gold">Bestseller</span>' : ""}
            ${product.is_featured && !product.is_bestseller && !isOut ? '<span class="badge badge-burgundy">Chef Special</span>' : ""}
          </div>

          <button class="product-quick-view-btn" data-action="quickview" data-product-id="${product.id}" title="Quick View">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </div>

        <div class="product-details">
          <span class="product-category-meta">${product.category}</span>
          <h3 class="product-title">${product.name}</h3>
          <p class="product-description-snippet">${product.description}</p>
          
          <div class="product-card-footer">
            <div class="product-pricing">
              <span class="price-current">${currency}${product.price.toLocaleString()}</span>
              ${product.original_price ? `<span class="price-original">${currency}${product.original_price.toLocaleString()}</span>` : ""}
            </div>

            <button class="btn btn-primary btn-sm add-to-cart-btn" 
              data-action="add-to-cart" 
              data-product-id="${product.id}"
              ${isOut ? "disabled" : ""}>
              ${isOut ? "Sold Out" : `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                Add
              `}
            </button>
          </div>
        </div>
      </article>
    `;
  },

  /**
   * Renders a list of cards into an element with empty state handling
   */
  renderGrid(containerElement, productsList) {
    if (!containerElement) return;

    if (!productsList || productsList.length === 0) {
      containerElement.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 50px 20px; color: var(--charcoal-500);">
          <svg style="margin: 0 auto 16px; color: var(--gold-500);" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <h3 style="font-family: var(--font-serif); font-size: 1.3rem; margin-bottom: 8px;">No Royal Delicacies Found</h3>
          <p style="font-size: 0.9rem;">We couldn't find items matching your criteria. Try adjusting your search or category filter.</p>
        </div>
      `;
      return;
    }

    containerElement.innerHTML = productsList.map((p) => this.renderCard(p)).join("");
  }
};

window.ProductsEngine = ProductsEngine;
