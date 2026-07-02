// Derives the DataJud public API court alias (api_publica_<alias>) from a CNJ number.
//
// CNJ layout (20 digits): NNNNNNN DD AAAA J TR OOOO
//   - 7 sequential digits
//   - 2 check digits
//   - 4 year digits
//   - 1 judiciary segment digit (J)        -> index 13
//   - 2 court digits (TR)                   -> index 14..15
//   - 4 origin digits
//
// See docs/processes/process-updates.md for the full mapping rationale.

export class DataJudCourtUnsupportedError extends Error {
  constructor(readonly cnjNumber: string) {
    super(`Could not derive a DataJud court endpoint from CNJ ${cnjNumber}`);
  }
}

// CNJ tribunal codes for state (J=8), electoral (J=6) and military-state (J=9) justice.
const ufByCourtCode: Record<string, string> = {
  "01": "ac",
  "02": "al",
  "03": "ap",
  "04": "am",
  "05": "ba",
  "06": "ce",
  "07": "df",
  "08": "es",
  "09": "go",
  "10": "ma",
  "11": "mt",
  "12": "ms",
  "13": "mg",
  "14": "pa",
  "15": "pb",
  "16": "pr",
  "17": "pe",
  "18": "pi",
  "19": "rj",
  "20": "rn",
  "21": "rs",
  "22": "ro",
  "23": "rr",
  "24": "sc",
  "25": "se",
  "26": "sp",
  "27": "to"
};

const militaryStateAlias: Record<string, string> = {
  "13": "tjmmg",
  "21": "tjmrs",
  "26": "tjmsp"
};

const onlyDigits = (value: string) => value.replace(/\D/g, "");

export function courtCodeFromCnj(cnjNumber: string): string {
  const digits = onlyDigits(cnjNumber);
  if (digits.length !== 20) throw new DataJudCourtUnsupportedError(cnjNumber);

  const segment = digits[13];
  const court = digits.slice(14, 16);

  switch (segment) {
    case "3":
      return "stj";
    case "4": {
      const region = Number(court);
      if (region >= 1 && region <= 6) return `trf${region}`;
      break;
    }
    case "5": {
      if (court === "00") return "tst";
      const region = Number(court);
      if (region >= 1 && region <= 24) return `trt${region}`;
      break;
    }
    case "6": {
      const uf = ufByCourtCode[court];
      if (uf) return `tre-${uf}`;
      break;
    }
    case "7":
      return "stm";
    case "8": {
      const uf = ufByCourtCode[court];
      if (uf) return uf === "df" ? "tjdft" : `tj${uf}`;
      break;
    }
    case "9": {
      const alias = militaryStateAlias[court];
      if (alias) return alias;
      break;
    }
    default:
      break;
  }

  throw new DataJudCourtUnsupportedError(cnjNumber);
}
