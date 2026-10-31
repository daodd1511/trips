// Sample data and pure helpers shared by every design mock.
// Maps and TikTok links are illustrative placeholders, not real place links.

window.TRIP = {
  name: "Đà Lạt",
  currency: "VND",
  dates: "Nov 18 – 22",
};

window.CATEGORIES = [
  { id: "breakfast", name: "Breakfast" },
  { id: "lunch", name: "Lunch" },
  { id: "dinner", name: "Dinner" },
  { id: "snack", name: "Snack / street food" },
  { id: "cafe", name: "Café / drinks" },
  { id: "dessert", name: "Dessert" },
  { id: "gift", name: "Gift / souvenir" },
  { id: "sight", name: "Sightseeing" },
  { id: "night", name: "Night market" },
  { id: "other", name: "Other", system: true },
];

window.SHORT = {
  breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack",
  cafe: "Café", dessert: "Dessert", gift: "Gift", sight: "Sightseeing",
  night: "Night market", other: "Other",
};

window.STAYS = [
  {
    id: "s1",
    name: "Sương Mai Homestay",
    checkIn: "Nov 18",
    checkOut: "Nov 21",
    nights: 3,
    notes: "Booking 7K2Q-91 · door code 4471 · host Chị Lan 0903 112 845",
    maps: "#",
  },
  {
    id: "s2",
    name: "Cầu Đất Farm Stay",
    checkIn: "Nov 21",
    checkOut: "Nov 22",
    nights: 1,
    notes: "Pay at check-in, cash only",
    maps: "#",
  },
];

window.PLACES = [
  { id: "p1", name: "Bánh căn Nhà Chung", cats: ["breakfast"], status: "visited", rating: 9, notes: "Bánh căn trứng + xíu mại. Go before 8am, queue.", maps: "#", source: "#", spent: 70000 },
  { id: "p2", name: "Kem bơ Thanh Thảo", cats: ["snack", "dessert"], status: "visited", rating: 8, notes: "Kem bơ sầu riêng", maps: "#", source: "#", spent: 49000 },
  { id: "p3", name: "Bánh mì xíu mại Hoàng Diệu", cats: ["breakfast", "snack"], status: "want", rating: null, notes: "Xíu mại bowl on the side", maps: "#", source: "#", spent: 0 },
  { id: "p4", name: "Lẩu gà lá é Tao Ngộ", cats: ["dinner"], status: "want", rating: null, notes: "Order half chicken for 2", maps: "#", source: "#", spent: 0 },
  { id: "p5", name: "Chợ đêm Đà Lạt", cats: ["night", "snack"], status: "want", rating: null, notes: "Bánh tráng nướng, sữa đậu nành", maps: "#", source: null, spent: 0 },
  { id: "p6", name: "Túi Mơ To", cats: ["cafe", "sight"], status: "want", rating: null, notes: "Sunset view, go around 5pm", maps: "#", source: "#", spent: 0 },
  { id: "p7", name: "Đồi chè Cầu Đất", cats: ["sight"], status: "want", rating: null, notes: "", maps: "#", source: "#", spent: 0 },
  { id: "p8", name: "Mứt Đà Lạt Chợ Lớn", cats: ["gift"], status: "want", rating: null, notes: "Mứt dâu, atisô, hồng treo gió", maps: "#", source: null, spent: 0 },
  { id: "p9", name: "Bánh ướt lòng gà Trang", cats: ["breakfast", "lunch"], status: "skipped", rating: null, notes: "Closed on our day", maps: "#", source: "#", spent: 0 },
  { id: "p10", name: "Sữa đậu nành Hoa Sữa", cats: ["snack", "cafe"], status: "visited", rating: 7, notes: "", maps: "#", source: null, spent: 60000 },
];

window.EXPENSES = [
  { id: "e1", day: "Tue, Nov 18", name: "Taxi airport → homestay", amount: 250000, place: null },
  { id: "e2", day: "Tue, Nov 18", name: "Sữa đậu nành Hoa Sữa", amount: 60000, place: "p10" },
  { id: "e3", day: "Wed, Nov 19", name: "Bánh căn Nhà Chung", amount: 70000, place: "p1" },
  { id: "e4", day: "Wed, Nov 19", name: "Bánh mì", amount: 30000, place: null },
  { id: "e5", day: "Wed, Nov 19", name: "Kem", amount: 50000, place: null },
  { id: "e6", day: "Wed, Nov 19", name: "Kem bơ Thanh Thảo", amount: 49000, place: "p2" },
  { id: "e7", day: "Wed, Nov 19", name: "Xăng xe máy", amount: 50000, place: null },
];

/** Formats an integer amount in Vietnamese dong, for example 30.000 ₫. */
window.money = (n) => n.toLocaleString("vi-VN") + " ₫";

/** Formats an amount in short form, for example 30k or 1,5tr. */
window.moneyShort = (n) =>
  n >= 1000000 ? (n / 1000000).toLocaleString("vi-VN") + "tr" : n / 1000 + "k";

/**
 * Parses a price token such as 30k, 30000, or 1.5tr into an integer amount.
 * Returns { amount } or { error }. Never guesses.
 */
window.parsePrice = (token) => {
  const m = /^(\d+)(?:[.,](\d+))?(k|tr)?$/i.exec(token);
  if (!m || (m[2] !== undefined && !m[3])) {
    return { error: m ? "Use 30k or 30000, not 30.000" : "The last word must be a price, like 30k" };
  }
  const mult = !m[3] ? 1 : m[3].toLowerCase() === "k" ? 1000 : 1000000;
  const frac = m[2] || "";
  const scaled = (Number(m[1]) * 10 ** frac.length + Number(frac || 0)) * mult;
  if (scaled % 10 ** frac.length !== 0) return { error: "The price must be a whole number" };
  const amount = scaled / 10 ** frac.length;
  if (amount <= 0) return { error: "The price must be more than 0" };
  return { amount };
};

/** Parses one quick-entry line in the form "{name} {price}". */
window.parseQuick = (line) => {
  const text = line.trim();
  const cut = text.lastIndexOf(" ");
  if (cut < 1) return { error: "Write a name, then a price: banh mi 30k" };
  const name = text.slice(0, cut).trim();
  const price = parsePrice(text.slice(cut + 1));
  return price.error ? price : { name, amount: price.amount };
};

/** Groups expenses by day, preserving order, with a total per day. */
window.byDay = (list) => {
  const days = [];
  for (const e of list) {
    let d = days.find((x) => x.day === e.day);
    if (!d) days.push((d = { day: e.day, items: [], total: 0 }));
    d.items.push(e);
    d.total += e.amount;
  }
  return days;
};

window.total = (list) => list.reduce((s, e) => s + e.amount, 0);

/** Places matching the category set (OR), status, and search query. */
window.filterPlaces = (places, { cats, status, query }) =>
  places.filter(
    (p) =>
      (status === "all" || p.status === status) &&
      (!cats.size || p.cats.some((c) => cats.has(c))) &&
      (!query || (p.name + " " + p.notes).toLowerCase().includes(query.toLowerCase()))
  );

/** Lucide icon placeholder; call lucide.createIcons() after render. */
window.icon = (name, cls = "") => `<i data-lucide="${name}" class="ic ${cls}" aria-hidden="true"></i>`;

window.esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
