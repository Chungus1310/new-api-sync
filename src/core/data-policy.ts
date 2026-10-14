import {
  DATA_POLICY_PROMPTS,
  DATA_POLICY_TRANSFER,
  type AnyProviderConfig,
  type DataPolicyPrompts,
  type DataPolicyTransfer,
} from "@core/validations/config";

interface DataPolicyFields {
  seatCountry?: string;
  prompts?: DataPolicyPrompts;
  transfer?: DataPolicyTransfer;
}

// The gateway's channel setting.data_policy shape.
export interface DataPolicy {
  seat_country?: string;
  prompts?: DataPolicyPrompts;
  transfer?: DataPolicyTransfer;
}

const cn: DataPolicyFields = {
  seatCountry: "CN",
  prompts: "unknown",
  transfer: "none",
};
const hk: DataPolicyFields = {
  seatCountry: "HK",
  prompts: "unknown",
  transfer: "none",
};
const sg: DataPolicyFields = {
  seatCountry: "SG",
  prompts: "unknown",
  transfer: "none",
};
const usNone: DataPolicyFields = {
  seatCountry: "US",
  prompts: "unknown",
  transfer: "none",
};
const usScc: DataPolicyFields = {
  seatCountry: "US",
  prompts: "unknown",
  transfer: "scc",
};
const usUnknown: DataPolicyFields = {
  seatCountry: "US",
  prompts: "unknown",
  transfer: "unknown",
};
const usDpfTrains: DataPolicyFields = {
  seatCountry: "US",
  prompts: "trains",
  transfer: "dpf",
};
const gbAdequacy: DataPolicyFields = {
  seatCountry: "GB",
  prompts: "unknown",
  transfer: "adequacy",
};
const unknownSeat: DataPolicyFields = { prompts: "unknown", transfer: "none" };

// Defaults per provider name, kept in the repo so the cluster config (a7, ih,
// si only) carries them too. A field set on the provider block in config.yml
// wins over the default. Providers absent here publish no data_policy.
// prettier-ignore
const BY_NAME: Record<string, DataPolicyFields> = {
  no1: cn, fish: cn, gg: cn, a7: cn, pol: cn, kdy1: cn, nbi1: cn, ts1: cn, qnn1: cn, bcf1: cn,
  axz1: cn, wuh1: cn, art1: cn, shu1: cn, ah1: cn, amd1: cn, sense1: cn, akiyo: cn, fvg1: cn, lmh1: cn,
  qwen1: { seatCountry: "CN", prompts: "trains", transfer: "none" },
  cent: hk, yjs1: hk, lkp1: hk, lnk1: hk,
  duck: sg, zai1: sg, zm1: sg, sl1: sg, ms1: sg, easyrouter: sg,
  tph1: { seatCountry: "TH", prompts: "unknown", transfer: "none" },
  si: usNone, br1: usNone, ltr1: usNone, pu1: usNone, fa1: usNone,
  dsg1: { prompts: "trains", transfer: "none" },
  open1: usScc, open2: usScc, open3: usScc, gq1: usScc, pls1: usScc,
  kilo1: usUnknown, mx1: usUnknown, mdl1: usUnknown,
  gnk1: unknownSeat,
  htz1: { seatCountry: "DE", prompts: "none", transfer: "adequacy" },
  jn1: { seatCountry: "DE", prompts: "none", transfer: "adequacy" },
  bb1: { seatCountry: "DE", prompts: "unknown", transfer: "adequacy" },
  pm1: { seatCountry: "DE", prompts: "none", transfer: "adequacy" },
  cfr1: { seatCountry: "PL", prompts: "none", transfer: "adequacy" },
  mist1: { seatCountry: "FR", prompts: "unknown", transfer: "adequacy" },
  rw1: gbAdequacy, rqst1: gbAdequacy, trp1: gbAdequacy,
  llm71: { seatCountry: "GB", prompts: "unknown", transfer: "unknown" },
  ih: unknownSeat, hd1: unknownSeat, rtw1: unknownSeat, ng1: unknownSeat, aaw1: unknownSeat,
  nio1: unknownSeat, xk1: unknownSeat, tkr1: unknownSeat, unt1: unknownSeat,
};

// Numbered shard families, so a new shard inherits its family's policy.
// prettier-ignore
const BY_FAMILY: Array<[RegExp, DataPolicyFields]> = [
  [/^chat\d+$/, { seatCountry: "CN", prompts: "trains", transfer: "none" }],
  [/^k2h\d+$/, { seatCountry: "AE", prompts: "unknown", transfer: "none" }],
  [/^any\d+$/, usNone],
  [/^cat\d+$/, usNone],
  [/^cf\d+$/, { seatCountry: "US", prompts: "none", transfer: "dpf" }],
  [/^nvda\d+$/, usDpfTrains],
  [/^gem\d+$/, usDpfTrains],
  [/^gm\d+$/, usDpfTrains],
  [/^kl\d+$/, usUnknown],
  [/^ws\d+$/, usUnknown],
  [/^dahl\d+$/, { seatCountry: "EE", prompts: "unknown", transfer: "none" }],
  [/^cfp\d+$/, usNone],
  [/^ey\d+$/, unknownSeat],
  [/^atr\d+$/, unknownSeat],
];

function defaultsFor(name: string): DataPolicyFields | undefined {
  return BY_NAME[name] ?? BY_FAMILY.find((entry) => entry[0].test(name))?.[1];
}

export function withDataPolicyDefaults(
  provider: AnyProviderConfig,
): AnyProviderConfig {
  const defaults = defaultsFor(provider.name);
  if (!defaults) return provider;
  return {
    ...provider,
    seatCountry: provider.seatCountry ?? defaults.seatCountry,
    prompts: provider.prompts ?? defaults.prompts,
    transfer: provider.transfer ?? defaults.transfer,
  };
}

export function dataPolicyOf(
  provider: DataPolicyFields,
): DataPolicy | undefined {
  const policy: DataPolicy = {
    ...(provider.seatCountry ? { seat_country: provider.seatCountry } : {}),
    ...(provider.prompts ? { prompts: provider.prompts } : {}),
    ...(provider.transfer ? { transfer: provider.transfer } : {}),
  };
  return Object.keys(policy).length > 0 ? policy : undefined;
}

// Channel tag -> policy, for the providers this config declares. A tag the
// config does not declare is absent, so callers leave those channels alone.
export function dataPolicyByTag(
  providers: AnyProviderConfig[],
): Map<string, DataPolicy> {
  const byTag = new Map<string, DataPolicy>();
  for (const provider of providers) {
    const policy = dataPolicyOf(provider);
    if (!policy) continue;
    byTag.set(provider.name, policy);
    if ("channelTag" in provider && provider.channelTag)
      byTag.set(provider.channelTag, policy);
  }
  return byTag;
}

// Fixed key order, so a policy the gateway re-serialised compares equal.
export function readDataPolicy(value: unknown): DataPolicy | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  const raw = new Map(Object.entries(value));
  const pick = (key: string) => {
    const v = raw.get(key);
    return typeof v === "string" && v !== "" ? v : undefined;
  };
  const seat = pick("seat_country");
  const prompts = pick("prompts");
  const transfer = pick("transfer");
  const policy = {
    ...(seat ? { seat_country: seat } : {}),
    ...(prompts && isPrompts(prompts) ? { prompts } : {}),
    ...(transfer && isTransfer(transfer) ? { transfer } : {}),
  };
  return Object.keys(policy).length > 0 ? policy : undefined;
}

const PROMPTS = new Set<string>(DATA_POLICY_PROMPTS);
const TRANSFER = new Set<string>(DATA_POLICY_TRANSFER);

function isPrompts(v: string): v is DataPolicyPrompts {
  return PROMPTS.has(v);
}

function isTransfer(v: string): v is DataPolicyTransfer {
  return TRANSFER.has(v);
}

export function sameDataPolicy(a?: DataPolicy, b?: DataPolicy): boolean {
  return (
    a?.seat_country === b?.seat_country &&
    a?.prompts === b?.prompts &&
    a?.transfer === b?.transfer
  );
}

// Adds data_policy to a channel setting JSON, keeping every other key.
export function settingWithDataPolicy(
  setting: string | undefined,
  policy: DataPolicy,
): string | undefined {
  let parsed: Record<string, unknown> = {};
  if (setting) {
    try {
      const value: unknown = JSON.parse(setting);
      if (!value || typeof value !== "object" || Array.isArray(value))
        return setting;
      parsed = Object.fromEntries(Object.entries(value));
    } catch {
      return setting;
    }
  }
  parsed.data_policy = policy;
  return JSON.stringify(parsed);
}
