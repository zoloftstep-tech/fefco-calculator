/**
 * Param cascade inspired by open-dieline resolveParams:
 * user override > derivedDefault(resolvedSoFar) > static default.
 * Reimplemented (not copied) to keep PolyForm NC code out of this tree.
 */

export type ParamValue = number | boolean | string;
export type ResolvedParams = Readonly<Record<string, ParamValue>>;

export type ParamDef = {
  key: string;
  unit: "mm" | "deg" | "bool";
  default: number | boolean;
  min?: number;
  max?: number;
  /** May only read keys that appear earlier in the defs list. */
  derivedDefault?: (resolved: ResolvedParams) => number;
};

export type OverrideMap = Partial<Record<string, ParamValue>>;

export function resolveParams(defs: readonly ParamDef[], overrides: OverrideMap = {}): ResolvedParams {
  const known = new Set(defs.map((d) => d.key));
  for (const key of Object.keys(overrides)) {
    if (!known.has(key)) {
      throw new Error(`Unknown param override: ${key}`);
    }
  }

  const out: Record<string, ParamValue> = {};
  const resolvedKeys = new Set<string>();

  for (const def of defs) {
    const override = overrides[def.key];
    if (override !== undefined) {
      out[def.key] = override;
      resolvedKeys.add(def.key);
      continue;
    }

    if (def.derivedDefault) {
      const proxy = new Proxy(out, {
        get(target, prop: string) {
          if (!resolvedKeys.has(prop)) {
            throw new Error(`derivedDefault for "${def.key}" read unresolved "${prop}"`);
          }
          return target[prop];
        },
      }) as ResolvedParams;
      out[def.key] = def.derivedDefault(proxy);
      resolvedKeys.add(def.key);
      continue;
    }

    out[def.key] = def.default;
    resolvedKeys.add(def.key);
  }

  return out;
}

export function asNumber(params: ResolvedParams, key: string): number {
  const value = params[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Expected number for ${key}`);
  }
  return value;
}
