export const PLAN_TIERS = [
  { months: 1, price: 25, label: "1 mes" },
  { months: 3, price: 69, label: "3 meses", saving: "Ahorras $6" },
  { months: 6, price: 129, label: "6 meses", popular: true },
  { months: 12, price: 230, label: "1 año", saving: "Ahorras $70" },
];

export const BANK_INFO = {
  bank: "Banco Pichincha",
  account_number: "2212128683",
  holder: "Yuleidy Ilaquiche Vega",
  email: "Yuleidytamiana56@outlook.com",
};

export const planByMonths = (m) => PLAN_TIERS.find((p) => p.months === m) || null;
