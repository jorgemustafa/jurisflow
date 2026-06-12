const stateByCode: Record<string, string> = {
  "01": "AC",
  "02": "AL",
  "03": "AP",
  "04": "AM",
  "05": "BA",
  "06": "CE",
  "07": "DF",
  "08": "ES",
  "09": "GO",
  "10": "MA",
  "11": "MT",
  "12": "MS",
  "13": "MG",
  "14": "PA",
  "15": "PB",
  "16": "PR",
  "17": "PE",
  "18": "PI",
  "19": "RJ",
  "20": "RN",
  "21": "RS",
  "22": "RO",
  "23": "RR",
  "24": "SC",
  "25": "SE",
  "26": "SP",
  "27": "TO"
};

const militaryStateCourts: Record<string, CnjCourt> = {
  "13": { code: "tjmmg", label: "TJMMG" },
  "21": { code: "tjmrs", label: "TJMRS" },
  "26": { code: "tjmsp", label: "TJMSP" }
};

export type CnjCourt = {
  /** DataJud public API index alias suffix (api_publica_<code>) */
  code: string;
  label: string;
};

export const onlyDigits = (value: string) => value.replace(/\D/g, "");

export function formatCnjNumber(value: string) {
  const digits = onlyDigits(value);
  if (digits.length !== 20) return value;
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16)}`;
}

/**
 * Derives the court (DataJud index alias) from the CNJ unified numbering
 * (Resolução CNJ 65/2008): NNNNNNN-DD.AAAA.J.TR.OOOO where J is the judiciary
 * segment and TR identifies the court inside the segment.
 */
export function deriveCourtFromCnj(cnjNumber: string): CnjCourt | null {
  const digits = onlyDigits(cnjNumber);
  if (digits.length !== 20) return null;

  const segment = digits[13];
  const tr = digits.slice(14, 16);
  const trNumber = Number(tr);

  switch (segment) {
    case "3":
      return tr === "00" ? { code: "stj", label: "STJ" } : null;
    case "4":
      return trNumber >= 1 && trNumber <= 6 ? { code: `trf${trNumber}`, label: `TRF${trNumber}` } : null;
    case "5":
      if (tr === "00") return { code: "tst", label: "TST" };
      return trNumber >= 1 && trNumber <= 24 ? { code: `trt${trNumber}`, label: `TRT${trNumber}` } : null;
    case "6": {
      if (tr === "00") return { code: "tse", label: "TSE" };
      const state = stateByCode[tr];
      return state ? { code: `tre-${state.toLowerCase()}`, label: `TRE-${state}` } : null;
    }
    case "7":
      return tr === "00" ? { code: "stm", label: "STM" } : null;
    case "8": {
      if (tr === "07") return { code: "tjdft", label: "TJDFT" };
      const state = stateByCode[tr];
      return state ? { code: `tj${state.toLowerCase()}`, label: `TJ${state}` } : null;
    }
    case "9":
      return militaryStateCourts[tr] ?? null;
    default:
      return null;
  }
}
