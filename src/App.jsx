import { useState, useCallback } from "react";

/* ═══════════════════════════════════════════════════════
   MENU DATA STRUCTURE (future Firestore schema)
   
   Firestore planned structure:
   menu_config/
     categories: ["主餐", "小菜"]
   menu_items/
     {id}: { name, category, type, price, available, ... }
   combo_options/
     broth: [{id, name}]
     noodle: [{id, name}]
   
   Orders will be stored as:
   orders/{orderId}: {
     mode, table, name, reservationType, reservationTime,
     people, items: [{name, price, qty, comboDetail?}],
     total, status, createdAt
   }
═══════════════════════════════════════════════════════ */

const BROTH_OPTIONS = [
  { id: "original", name: "原味" },
  { id: "shrimp", name: "蝦醬" },
  { id: "miso", name: "味噌" },
];

const NOODLE_OPTIONS = [
  { id: "thin", name: "細麵" },
  { id: "handmade", name: "手打麵" },
  { id: "glass", name: "冬粉" },
];

const HIDDEN_MENU = [
  { id: "h1", name: "原味炒飯", price: 80, available: true },
  { id: "h2", name: "映竹麵", price: 85, available: true },
];

const SIDE_DISHES = [
  { id: "s1", name: "燙青菜", price: 30, available: true },
  { id: "s2", name: "滷蛋", price: 10, available: true },
  { id: "s3", name: "豆干", price: 15, available: true },
  { id: "s4", name: "小菜拼盤", price: 50, available: true },
];

const NOODLE_PRICE = 90;

const TABLES = Array.from({ length: 12 }, (_, i) => `${i + 1}`);

function generateTimeSlots() {
  const slots = [];
  for (let h = 10; h <= 21; h++) {
    for (let m = 0; m < 60; m += 5) {
      if (h === 21 && m > 0) break;
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}
const TIME_SLOTS = generateTimeSlots();

// ─── Wood / Artisan Design Tokens ───
const t = {
  bgPage: "#F5EDE3",
  bgCard: "#FFFBF6",
  primary: "#8B5E3C",
  primaryLight: "#C9A882",
  primaryDark: "#6B3F24",
  accent: "#B8860B",
  accentSoft: "#F0E4C8",
  text: "#3B2F2F",
  textLight: "#7A6A5E",
  textFaint: "#B0A090",
  border: "#DDD0C0",
  borderLight: "#EAE0D2",
  divider: "#E5D9CB",
  white: "#FFFBF6",
  shadow: "0 1px 8px rgba(80,50,20,0.07)",
  shadowMd: "0 3px 16px rgba(80,50,20,0.1)",
  radius: "12px",
  radiusSm: "8px",
  font: "'Noto Serif TC', 'Georgia', serif",
  fontSans: "'Noto Sans TC', sans-serif",
};

const woodGrainBg = `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`;

export default function App() {
  const [view, setView] = useState("customer");
  const [step, setStep] = useState("mode");
  const [orderMode, setOrderMode] = useState(null);
  const [reservationType, setReservationType] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [reservationTime, setReservationTime] = useState("");
  const [reservationPeople, setReservationPeople] = useState("2");
  const [menuSection, setMenuSection] = useState("main");
  const [mainSubSection, setMainSubSection] = useState(null);
  const [selectedBroth, setSelectedBroth] = useState(null);
  const [selectedNoodle, setSelectedNoodle] = useState(null);
  const [cart, setCart] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState(null);

  const addToCart = useCallback((item) => {
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.id === item.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
        return copy;
      }
      return [...prev, { ...item, qty: 1 }];
    });
  }, []);

  const updateCartQty = useCallback((id, delta) => {
    setCart((prev) =>
      prev.map((c) => (c.id === id ? { ...c, qty: c.qty + delta } : c)).filter((c) => c.qty > 0)
    );
  }, []);

  const totalItems = cart.reduce((s, c) => s + c.qty, 0);
  const totalPrice = cart.reduce((s, c) => s + c.price * c.qty, 0);

  const needsName = orderMode === "takeout" || orderMode === "reservation";
  const nameValid = !needsName || customerName.trim().length > 0;

  const canProceedToMenu = () => {
    if (!orderMode) return false;
    if (orderMode === "dinein") return selectedTable !== null;
    if (orderMode === "takeout") return nameValid;
    if (orderMode === "reservation") return reservationType !== null && reservationTime !== "" && nameValid;
    return false;
  };

  const modeLabel = () => {
    if (orderMode === "dinein") return `內用 — 桌號 ${selectedTable}`;
    if (orderMode === "takeout") return `外帶 — ${customerName}`;
    if (orderMode === "reservation")
      return `預約${reservationType === "dinein" ? "內用" : "外帶"} — ${reservationTime}`;
    return "";
  };

  const handleAddNoodleCombo = () => {
    if (!selectedBroth || !selectedNoodle) return;
    const broth = BROTH_OPTIONS.find((b) => b.id === selectedBroth);
    const noodle = NOODLE_OPTIONS.find((n) => n.id === selectedNoodle);
    const comboName = `${broth.name}${noodle.name}`;
    const comboId = `noodle_${selectedBroth}_${selectedNoodle}`;
    addToCart({ id: comboId, name: comboName, price: NOODLE_PRICE, detail: "招牌湯麵" });
    setSelectedBroth(null);
    setSelectedNoodle(null);
  };

  const handleSubmitOrder = () => {
    const order = {
      mode: orderMode,
      reservationType: orderMode === "reservation" ? reservationType : null,
      table: selectedTable,
      name: customerName || null,
      time: reservationTime || null,
      people: orderMode === "reservation" ? reservationPeople : null,
      items: cart,
      total: totalPrice,
      submittedAt: new Date().toLocaleTimeString("zh-TW"),
    };
    setSubmittedOrder(order);
    setShowConfirm(false);
    setStep("success");
  };

  const resetAll = () => {
    setStep("mode"); setOrderMode(null); setReservationType(null);
    setSelectedTable(null); setCustomerName(""); setReservationTime("");
    setReservationPeople("2"); setCart([]); setShowConfirm(false);
    setSubmittedOrder(null); setMenuSection("main"); setMainSubSection(null);
    setSelectedBroth(null); setSelectedNoodle(null);
  };

  // ─── Shared item renderer ───
  const renderItem = (item) => {
    const inCart = cart.find((c) => c.id === item.id);
    const qty = inCart ? inCart.qty : 0;
    return (
      <div key={item.id} style={{
        background: t.bgCard, borderRadius: t.radius, padding: "14px 16px", marginBottom: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: t.shadow, opacity: item.available ? 1 : 0.4, border: `1px solid ${t.borderLight}`,
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, fontFamily: t.font }}>{item.name}</div>
          <div style={{ fontSize: 13, color: t.textLight, marginTop: 2 }}>${item.price}</div>
          {!item.available && <div style={{ fontSize: 12, color: t.accent, fontWeight: 700, marginTop: 2 }}>已售完</div>}
        </div>
        {item.available && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {qty > 0 && (
              <>
                <button onClick={() => updateCartQty(item.id, -1)} style={{
                  width: 32, height: 32, borderRadius: "50%", border: `2px solid ${t.primary}`,
                  background: "transparent", color: t.primary, fontSize: 17, fontWeight: 700,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: t.fontSans, lineHeight: 1,
                }}>−</button>
                <span style={{ fontSize: 16, fontWeight: 700, minWidth: 18, textAlign: "center" }}>{qty}</span>
              </>
            )}
            <button onClick={() => addToCart({ id: item.id, name: item.name, price: item.price })} style={{
              width: 32, height: 32, borderRadius: "50%", border: `2px solid ${t.primary}`,
              background: qty > 0 ? t.primary : "transparent", color: qty > 0 ? t.white : t.primary,
              fontSize: 17, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", fontFamily: t.fontSans, lineHeight: 1,
            }}>+</button>
          </div>
        )}
      </div>
    );
  };

  const Header = ({ title, sub }) => (
    <div style={{
      background: `linear-gradient(135deg, ${t.primaryDark}, ${t.primary})`,
      color: t.white, padding: "18px 20px", display: "flex", alignItems: "center",
      justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100,
      borderBottom: `3px solid ${t.accent}`,
    }}>
      <div>
        <div style={{ fontSize: 19, fontWeight: 700, fontFamily: t.font, letterSpacing: 2 }}>{title}</div>
        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2, fontFamily: t.fontSans }}>{sub}</div>
      </div>
      <button onClick={() => setView(view === "chef" ? "customer" : "chef")} style={{
        background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
        color: t.white, padding: "7px 14px", borderRadius: t.radiusSm,
        fontSize: 12, cursor: "pointer", fontFamily: t.fontSans, fontWeight: 500,
      }}>
        {view === "chef" ? "切換顧客" : "切換內場"}
      </button>
    </div>
  );

  const SectionLabel = ({ children }) => (
    <div style={{
      fontSize: 13, fontWeight: 600, color: t.textLight, marginBottom: 10,
      letterSpacing: 1, fontFamily: t.font, borderBottom: `1px solid ${t.divider}`, paddingBottom: 6,
    }}>{children}</div>
  );

  // ═══════════ CHEF PANEL ═══════════
  if (view === "chef") {
    return (
      <div style={{ fontFamily: t.fontSans, background: t.bgPage, backgroundImage: woodGrainBg, minHeight: "100vh", color: t.text, maxWidth: 480, margin: "0 auto" }}>
        <Header title="內場管理" sub="廚師排程面板" />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "70vh", color: t.textLight, textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, color: t.primaryLight, marginBottom: 16, fontFamily: t.font }}>廚</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: t.font, marginBottom: 8, color: t.text }}>廚師面板開發中</div>
          <div style={{ fontSize: 14, lineHeight: 2, color: t.textLight }}>
            訂單排程自動排列<br />手動拖曳調整順序<br />每 30 秒自動更新<br />單號 / 姓名顯示<br />完成標記功能
          </div>
        </div>
      </div>
    );
  }

  // ═══════════ SUCCESS ═══════════
  if (step === "success" && submittedOrder) {
    return (
      <div style={{ fontFamily: t.fontSans, background: t.bgPage, backgroundImage: woodGrainBg, minHeight: "100vh", color: t.text, maxWidth: 480, margin: "0 auto" }}>
        <Header title="點餐系統" sub="訂單已送出" />
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: 48, color: t.accent, marginBottom: 12, fontFamily: t.font, fontWeight: 300 }}>— 完成 —</div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: t.font, marginBottom: 8 }}>訂單已送出</div>
          <div style={{ fontSize: 14, color: t.textLight, lineHeight: 1.8, marginBottom: 28 }}>
            {submittedOrder.mode === "dinein" && <>桌號：{submittedOrder.table}<br /></>}
            {submittedOrder.name && <>姓名：{submittedOrder.name}<br /></>}
            {submittedOrder.mode === "reservation" && (
              <>預約時間：{submittedOrder.time}<br />{submittedOrder.reservationType === "dinein" && <>預約人數：{submittedOrder.people} 人<br /></>}</>
            )}
            共 {submittedOrder.items.length} 項 / 合計 ${submittedOrder.total}<br />
            送單時間：{submittedOrder.submittedAt}
          </div>
          <button onClick={resetAll} style={{
            background: t.primary, color: t.white, border: "none", borderRadius: t.radiusSm,
            padding: "14px 36px", fontSize: 15, fontWeight: 700, cursor: "pointer",
            fontFamily: t.font, letterSpacing: 1,
          }}>開始新訂單</button>
        </div>
      </div>
    );
  }

  // ═══════════ MENU PAGE ═══════════
  if (step === "menu") {
    const noodleComboReady = selectedBroth && selectedNoodle;
    const comboPreviewName = noodleComboReady
      ? `${BROTH_OPTIONS.find((b) => b.id === selectedBroth).name}${NOODLE_OPTIONS.find((n) => n.id === selectedNoodle).name}`
      : null;

    return (
      <div style={{ fontFamily: t.fontSans, background: t.bgPage, backgroundImage: woodGrainBg, minHeight: "100vh", color: t.text, maxWidth: 480, margin: "0 auto", position: "relative", paddingBottom: 100 }}>
        <Header title="點餐系統" sub={modeLabel()} />
        <div style={{ padding: "20px 16px" }}>
          {/* Top bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <button onClick={() => { setStep("mode"); setMenuSection("main"); setMainSubSection(null); }} style={{
              background: "none", border: "none", color: t.primary, fontSize: 14, fontWeight: 600,
              cursor: "pointer", fontFamily: t.fontSans, padding: "4px 0",
            }}>← 返回</button>
            {totalItems > 0 && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4, background: t.accentSoft,
                color: t.primaryDark, borderRadius: 20, padding: "5px 12px", fontSize: 12, fontWeight: 600,
              }}>{totalItems} 項 / ${totalPrice}</span>
            )}
          </div>

          {/* Tabs: 主餐 | 小菜 */}
          <div style={{ display: "flex", gap: 0, marginBottom: 20, borderRadius: t.radiusSm, overflow: "hidden", border: `1.5px solid ${t.border}` }}>
            {[{ key: "main", label: "主餐" }, { key: "sides", label: "小菜" }].map((tab, i) => (
              <button key={tab.key} onClick={() => { setMenuSection(tab.key); if (tab.key === "main") setMainSubSection(null); }} style={{
                flex: 1, padding: "12px", textAlign: "center",
                background: menuSection === tab.key ? t.primary : t.bgCard,
                color: menuSection === tab.key ? t.white : t.text,
                fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: t.font,
                transition: "all 0.15s", border: "none",
                borderRight: i === 0 ? `1px solid ${t.border}` : "none",
              }}>{tab.label}</button>
            ))}
          </div>

          {/* 主餐 — sub-section selection */}
          {menuSection === "main" && !mainSubSection && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              <div onClick={() => setMainSubSection("noodle")} style={{
                background: t.bgCard, border: `2px solid ${t.border}`, borderRadius: t.radius,
                padding: "18px 12px", textAlign: "center", cursor: "pointer", boxShadow: t.shadow,
                transition: "all 0.2s",
              }}>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: t.font }}>招牌湯麵</div>
                <div style={{ fontSize: 12, color: t.textLight, marginTop: 4 }}>自選湯頭 + 麵體</div>
                <div style={{ fontSize: 13, color: t.accent, fontWeight: 700, marginTop: 6 }}>${NOODLE_PRICE}</div>
              </div>
              <div onClick={() => setMainSubSection("hidden")} style={{
                background: t.bgCard, border: `2px solid ${t.border}`, borderRadius: t.radius,
                padding: "18px 12px", textAlign: "center", cursor: "pointer", boxShadow: t.shadow,
                transition: "all 0.2s",
              }}>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: t.font }}>隱藏菜單</div>
                <div style={{ fontSize: 12, color: t.textLight, marginTop: 4 }}>限定特製料理</div>
              </div>
            </div>
          )}

          {/* 招牌湯麵 combo builder */}
          {menuSection === "main" && mainSubSection === "noodle" && (
            <>
              <button onClick={() => setMainSubSection(null)} style={{
                background: "none", border: "none", color: t.primary, fontSize: 14, fontWeight: 600,
                cursor: "pointer", fontFamily: t.fontSans, padding: "4px 0", marginBottom: 12,
              }}>← 回主餐選單</button>
              <div style={{
                background: t.bgCard, borderRadius: t.radius, padding: "18px",
                border: `1.5px solid ${t.border}`, marginBottom: 16, boxShadow: t.shadow,
              }}>
                <div style={{ fontSize: 15, fontWeight: 700, fontFamily: t.font, marginBottom: 4 }}>招牌湯麵</div>
                <div style={{ fontSize: 12, color: t.textLight, marginBottom: 14 }}>選擇湯頭與麵體，組合您的專屬湯麵</div>

                <div style={{ fontSize: 13, fontWeight: 600, color: t.textLight, marginBottom: 6, fontFamily: t.font }}>第一步：選擇湯頭</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
                  {BROTH_OPTIONS.map((b) => (
                    <button key={b.id} onClick={() => setSelectedBroth(b.id)} style={{
                      background: selectedBroth === b.id ? t.primary : "transparent",
                      color: selectedBroth === b.id ? t.white : t.text,
                      border: `1.5px solid ${selectedBroth === b.id ? t.primary : t.border}`,
                      borderRadius: t.radiusSm, padding: "10px 6px", fontSize: 14, fontWeight: 600,
                      cursor: "pointer", fontFamily: t.fontSans, transition: "all 0.15s", textAlign: "center",
                    }}>{b.name}</button>
                  ))}
                </div>

                <div style={{ fontSize: 13, fontWeight: 600, color: t.textLight, marginBottom: 6, fontFamily: t.font }}>第二步：選擇麵體</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
                  {NOODLE_OPTIONS.map((n) => (
                    <button key={n.id} onClick={() => setSelectedNoodle(n.id)} style={{
                      background: selectedNoodle === n.id ? t.primary : "transparent",
                      color: selectedNoodle === n.id ? t.white : t.text,
                      border: `1.5px solid ${selectedNoodle === n.id ? t.primary : t.border}`,
                      borderRadius: t.radiusSm, padding: "10px 6px", fontSize: 14, fontWeight: 600,
                      cursor: "pointer", fontFamily: t.fontSans, transition: "all 0.15s", textAlign: "center",
                    }}>{n.name}</button>
                  ))}
                </div>

                {noodleComboReady && (
                  <div style={{
                    background: t.accentSoft, borderRadius: t.radiusSm, padding: "10px 14px",
                    display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12,
                  }}>
                    <span style={{ fontSize: 15, fontWeight: 700, fontFamily: t.font, color: t.primaryDark }}>{comboPreviewName}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: t.accent }}>${NOODLE_PRICE}</span>
                  </div>
                )}

                <button disabled={!noodleComboReady} onClick={handleAddNoodleCombo} style={{
                  width: "100%", background: !noodleComboReady ? t.borderLight : t.accent,
                  color: !noodleComboReady ? t.textFaint : t.white,
                  border: "none", borderRadius: t.radiusSm, padding: "12px",
                  fontSize: 15, fontWeight: 700, cursor: !noodleComboReady ? "not-allowed" : "pointer",
                  fontFamily: t.font, letterSpacing: 1,
                }}>加入訂單</button>
              </div>
            </>
          )}

          {/* 隱藏菜單 */}
          {menuSection === "main" && mainSubSection === "hidden" && (
            <>
              <button onClick={() => setMainSubSection(null)} style={{
                background: "none", border: "none", color: t.primary, fontSize: 14, fontWeight: 600,
                cursor: "pointer", fontFamily: t.fontSans, padding: "4px 0", marginBottom: 12,
              }}>← 回主餐選單</button>
              {HIDDEN_MENU.map(renderItem)}
            </>
          )}

          {/* 小菜 */}
          {menuSection === "sides" && SIDE_DISHES.map(renderItem)}

          {/* Cart summary */}
          {cart.length > 0 && (
            <>
              <div style={{ height: 1, background: t.divider, margin: "18px 0" }} />
              <SectionLabel>已點餐點</SectionLabel>
              {cart.map((c) => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", fontSize: 14, borderBottom: `1px solid ${t.borderLight}` }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    {c.detail && <span style={{ fontSize: 11, color: t.textLight, marginLeft: 6 }}>({c.detail})</span>}
                    <span style={{ color: t.textLight }}> x{c.qty}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontWeight: 700 }}>${c.price * c.qty}</span>
                    <button onClick={() => updateCartQty(c.id, -1)} style={{
                      width: 24, height: 24, borderRadius: "50%", border: `1.5px solid ${t.border}`,
                      background: "transparent", color: t.textLight, fontSize: 14, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
                    }}>−</button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "100%", maxWidth: 480, background: t.bgCard, borderTop: `2px solid ${t.divider}`,
          padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
          zIndex: 200, boxShadow: "0 -2px 12px rgba(80,50,20,0.06)", boxSizing: "border-box",
        }}>
          <div>
            <div style={{ fontSize: 13, color: t.textLight }}>{totalItems > 0 ? `${totalItems} 項商品` : "尚未選餐"}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: t.primaryDark, fontFamily: t.font }}>${totalPrice}</div>
          </div>
          <button disabled={totalItems === 0} onClick={() => setShowConfirm(true)} style={{
            background: totalItems === 0 ? t.borderLight : t.primary,
            color: totalItems === 0 ? t.textFaint : t.white,
            border: "none", borderRadius: t.radiusSm, padding: "13px 24px",
            fontSize: 15, fontWeight: 700, cursor: totalItems === 0 ? "not-allowed" : "pointer",
            fontFamily: t.font, letterSpacing: 0.5,
          }}>確認送出</button>
        </div>

        {/* Confirm Modal */}
        {showConfirm && (
          <div onClick={() => setShowConfirm(false)} style={{
            position: "fixed", inset: 0, background: "rgba(40,25,15,0.45)",
            zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}>
            <div onClick={(e) => e.stopPropagation()} style={{
              background: t.bgCard, borderRadius: t.radius, padding: "26px 22px",
              maxWidth: 400, width: "100%", maxHeight: "80vh", overflowY: "auto",
              boxShadow: "0 8px 40px rgba(60,30,10,0.18)", border: `2px solid ${t.border}`,
            }}>
              <div style={{ fontSize: 19, fontWeight: 800, textAlign: "center", fontFamily: t.font }}>確認訂單</div>
              <div style={{ fontSize: 13, color: t.textLight, textAlign: "center", marginBottom: 18 }}>
                {modeLabel()}{customerName ? ` / ${customerName}` : ""}
              </div>
              {cart.map((c) => (
                <div key={c.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${t.borderLight}`, fontSize: 14 }}>
                    <span>{c.name} x{c.qty}</span>
                    <span style={{ fontWeight: 700 }}>${c.price * c.qty}</span>
                  </div>
                  {c.detail && <div style={{ fontSize: 11, color: t.textLight }}>{c.detail}</div>}
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", fontWeight: 800, fontSize: 17, fontFamily: t.font }}>
                <span>合計</span>
                <span style={{ color: t.primaryDark }}>${totalPrice}</span>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                <button onClick={() => setShowConfirm(false)} style={{
                  flex: 1, background: t.bgPage, color: t.text, border: `1.5px solid ${t.border}`,
                  borderRadius: t.radiusSm, padding: "13px", fontSize: 14, fontWeight: 600,
                  cursor: "pointer", fontFamily: t.fontSans,
                }}>返回修改</button>
                <button onClick={handleSubmitOrder} style={{
                  flex: 1, background: t.primary, color: t.white, border: "none",
                  borderRadius: t.radiusSm, padding: "13px", fontSize: 14, fontWeight: 700,
                  cursor: "pointer", fontFamily: t.font, letterSpacing: 1,
                }}>確認送出</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════ MODE SELECTION ═══════════
  return (
    <div style={{ fontFamily: t.fontSans, background: t.bgPage, backgroundImage: woodGrainBg, minHeight: "100vh", color: t.text, maxWidth: 480, margin: "0 auto" }}>
      <Header title="點餐系統" sub="歡迎光臨，請選擇用餐方式" />
      <div style={{ padding: "20px 16px" }}>
        <SectionLabel>用餐方式</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
          {[
            { key: "dinein", label: "內用", sub: "店內用餐" },
            { key: "takeout", label: "外帶", sub: "帶走享用" },
            { key: "reservation", label: "預約", sub: "提前預訂" },
          ].map((m) => (
            <div key={m.key} onClick={() => { setOrderMode(m.key); setReservationType(null); if (m.key !== "dinein") setSelectedTable(null); setCustomerName(""); }} style={{
              background: orderMode === m.key ? t.primary : t.bgCard,
              color: orderMode === m.key ? t.white : t.text,
              border: `2px solid ${orderMode === m.key ? t.primary : t.border}`,
              borderRadius: t.radius, padding: "22px 10px 16px", textAlign: "center",
              cursor: "pointer", transition: "all 0.2s ease",
              boxShadow: orderMode === m.key ? t.shadowMd : t.shadow,
            }}>
              <div style={{ fontSize: 12, opacity: 0.7, fontFamily: t.font, marginBottom: 4 }}>{m.sub}</div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: t.font }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* Dine-in: Table */}
        {orderMode === "dinein" && (
          <>
            <SectionLabel>選擇桌號</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20 }}>
              {TABLES.map((tb) => (
                <button key={tb} onClick={() => setSelectedTable(tb)} style={{
                  background: selectedTable === tb ? t.accent : t.bgCard,
                  color: selectedTable === tb ? t.white : t.text,
                  border: `1.5px solid ${selectedTable === tb ? t.accent : t.border}`,
                  borderRadius: t.radiusSm, padding: "14px 8px", fontSize: 16, fontWeight: 700,
                  fontFamily: t.font, boxShadow: t.shadow, cursor: "pointer", textAlign: "center",
                }}>{tb}</button>
              ))}
            </div>
          </>
        )}

        {/* Takeout: Name required */}
        {orderMode === "takeout" && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: t.textLight, marginBottom: 6, display: "block", fontFamily: t.font }}>
              姓名<span style={{ color: t.accent, fontSize: 12, marginLeft: 4 }}>*必填</span>
            </label>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="請輸入您的姓名" style={{
              width: "100%", padding: "11px 14px", borderRadius: t.radiusSm,
              border: `1.5px solid ${t.border}`, fontSize: 15, fontFamily: t.fontSans,
              background: t.bgCard, boxSizing: "border-box", outline: "none", color: t.text,
            }} />
          </div>
        )}

        {/* Reservation */}
        {orderMode === "reservation" && (
          <>
            <SectionLabel>預約類型</SectionLabel>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              {[{ key: "dinein", label: "預約內用" }, { key: "takeout", label: "預約外帶" }].map((sub) => (
                <button key={sub.key} onClick={() => setReservationType(sub.key)} style={{
                  flex: 1, background: reservationType === sub.key ? t.primary : t.bgCard,
                  color: reservationType === sub.key ? t.white : t.text,
                  border: `1.5px solid ${reservationType === sub.key ? t.primary : t.border}`,
                  borderRadius: t.radiusSm, padding: "12px 16px", fontSize: 14, fontWeight: 600,
                  cursor: "pointer", fontFamily: t.fontSans, transition: "all 0.2s ease", textAlign: "center",
                }}>{sub.label}</button>
              ))}
            </div>

            {reservationType && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: t.textLight, marginBottom: 6, display: "block", fontFamily: t.font }}>
                    預約時間<span style={{ color: t.accent, fontSize: 12, marginLeft: 4 }}>*必填</span>
                  </label>
                  <select value={reservationTime} onChange={(e) => setReservationTime(e.target.value)} style={{
                    width: "100%", padding: "11px 14px", borderRadius: t.radiusSm,
                    border: `1.5px solid ${t.border}`, fontSize: 15, fontFamily: t.fontSans,
                    background: t.bgCard, boxSizing: "border-box", outline: "none",
                    appearance: "none", WebkitAppearance: "none", color: t.text,
                  }}>
                    <option value="">請選擇時間</option>
                    {TIME_SLOTS.map((ts) => <option key={ts} value={ts}>{ts}</option>)}
                  </select>
                </div>
                {reservationType === "dinein" && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: t.textLight, marginBottom: 6, display: "block", fontFamily: t.font }}>用餐人數</label>
                    <select value={reservationPeople} onChange={(e) => setReservationPeople(e.target.value)} style={{
                      width: "100%", padding: "11px 14px", borderRadius: t.radiusSm,
                      border: `1.5px solid ${t.border}`, fontSize: 15, fontFamily: t.fontSans,
                      background: t.bgCard, boxSizing: "border-box", outline: "none",
                      appearance: "none", WebkitAppearance: "none", color: t.text,
                    }}>
                      {[1,2,3,4,5,6,7,8,9,10].map((n) => <option key={n} value={String(n)}>{n} 人</option>)}
                    </select>
                  </div>
                )}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: t.textLight, marginBottom: 6, display: "block", fontFamily: t.font }}>
                    姓名<span style={{ color: t.accent, fontSize: 12, marginLeft: 4 }}>*必填</span>
                  </label>
                  <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="請輸入您的姓名" style={{
                    width: "100%", padding: "11px 14px", borderRadius: t.radiusSm,
                    border: `1.5px solid ${t.border}`, fontSize: 15, fontFamily: t.fontSans,
                    background: t.bgCard, boxSizing: "border-box", outline: "none", color: t.text,
                  }} />
                </div>
              </>
            )}
          </>
        )}

        {/* Proceed CTA */}
        {orderMode && (
          <button disabled={!canProceedToMenu()} onClick={() => { if (canProceedToMenu()) setStep("menu"); }} style={{
            width: "100%", marginTop: 8,
            background: !canProceedToMenu() ? t.borderLight : t.primary,
            color: !canProceedToMenu() ? t.textFaint : t.white,
            border: "none", borderRadius: t.radiusSm, padding: "14px",
            fontSize: 16, fontWeight: 700, cursor: !canProceedToMenu() ? "not-allowed" : "pointer",
            fontFamily: t.font, letterSpacing: 1, transition: "all 0.2s",
          }}>前往點餐</button>
        )}
      </div>
    </div>
  );
}
