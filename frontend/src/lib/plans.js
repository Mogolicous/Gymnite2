export const PLAN_TIERS = {
  pesas: [
    { months: 1, price: 25, label: "1 mes", type: "pesas" },
    { months: 3, price: 69, label: "3 meses", type: "pesas" },
    { months: 6, price: 129, label: "6 meses", saving: "Ahorras $21", popular: true, type: "pesas" },
    { months: 12, price: 230, label: "1 año", saving: "Ahorras $70", type: "pesas" },
  ],
  clases: [
    { months: 1, price: 25, label: "1 mes", type: "clases" },
    { months: 3, price: 69, label: "3 meses", type: "clases" },
    { months: 6, price: 129, label: "6 meses", saving: "Ahorras $21", popular: true, type: "clases" },
    { months: 12, price: 230, label: "1 año", saving: "Ahorras $70", type: "clases" },
  ],
  premium: [
    { months: 1, price: 45, label: "1 mes", type: "premium" },
    { months: 3, price: 125, label: "3 meses", saving: "Ahorras $10", type: "premium" },
    { months: 6, price: 239, label: "6 meses", saving: "Ahorras $31", popular: true, type: "premium" },
    { months: 12, price: 440, label: "1 año", saving: "Ahorras $100", type: "premium" },
  ]
};

export const BANK_INFO = {
  bank: "Banco Pichincha",
  account_number: "2212128683",
  holder: "Yuleidy Ilaquiche Vega",
  email: "Yuleidytamiana56@outlook.com",
};

export const planByMonthsAndType = (m, type = "pesas") => {
  const category = PLAN_TIERS[type] || PLAN_TIERS.pesas;
  return category.find((p) => p.months === m) || null;
};
