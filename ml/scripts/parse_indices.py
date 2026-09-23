"""
Parse the raw ENSO (ONI), IOD (DMI), and MJO (RMM) index files downloaded
from NOAA CPC / NOAA PSL / BoM into a single tidy monthly dataframe.
"""

import pandas as pd
import numpy as np
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"

SEAS_TO_MONTH = {
    "DJF": 1, "JFM": 2, "FMA": 3, "MAM": 4, "AMJ": 5, "MJJ": 6,
    "JJA": 7, "JAS": 8, "ASO": 9, "SON": 10, "OND": 11, "NDJ": 12,
}


def parse_oni():
    df = pd.read_csv(DATA / "oni.txt", sep=r"\s+")
    df["month"] = df["SEAS"].map(SEAS_TO_MONTH)
    df = df.rename(columns={"YR": "year", "ANOM": "oni"})
    return df[["year", "month", "oni"]]


def parse_dmi():
    rows = []
    with open(DATA / "dmi.txt") as f:
        lines = f.readlines()
    for line in lines[1:]:
        parts = line.split()
        if len(parts) != 13:
            continue
        year = int(parts[0])
        if year < 1950:
            continue
        for m, v in enumerate(parts[1:], start=1):
            val = float(v)
            if val < -90:  # missing value sentinel
                continue
            rows.append({"year": year, "month": m, "dmi": val})
    return pd.DataFrame(rows)


def parse_mjo():
    # BoM RMM file: year month day RMM1 RMM2 phase amplitude
    df = pd.read_csv(
        DATA / "rmm_ua.txt",
        sep=r"\s+",
        skiprows=2,
        names=["year", "month", "day", "rmm1", "rmm2", "phase", "amplitude", "src"],
        engine="python",
        on_bad_lines="skip",
    )
    df = df[pd.to_numeric(df["year"], errors="coerce").notna()]
    df = df.astype({"year": int, "month": int, "day": int})
    df["amplitude"] = pd.to_numeric(df["amplitude"], errors="coerce")
    df["phase"] = pd.to_numeric(df["phase"], errors="coerce")
    # missing-value sentinels are documented as 1.E36 or 999
    df.loc[df["amplitude"].abs() > 100, "amplitude"] = np.nan
    df.loc[(df["phase"] < 1) | (df["phase"] > 8), "phase"] = np.nan
    def safe_mode(x):
        m = x.dropna()
        return m.mode().iloc[0] if len(m) else np.nan

    monthly = (
        df.groupby(["year", "month"])
        .agg(mjo_amplitude=("amplitude", "mean"), mjo_phase=("phase", safe_mode))
        .reset_index()
    )
    return monthly


def build_index_table():
    oni = parse_oni()
    dmi = parse_dmi()
    mjo = parse_mjo()

    df = oni.merge(dmi, on=["year", "month"], how="inner")
    df = df.merge(mjo, on=["year", "month"], how="left")
    df["mjo_amplitude"] = df["mjo_amplitude"].fillna(df["mjo_amplitude"].mean())
    df["mjo_phase"] = df["mjo_phase"].fillna(0)
    df = df.dropna(subset=["oni", "dmi"])
    return df.sort_values(["year", "month"]).reset_index(drop=True)


if __name__ == "__main__":
    table = build_index_table()
    out = DATA / "climate_indices_monthly.csv"
    table.to_csv(out, index=False)
    print(f"Wrote {len(table)} rows to {out}")
    print(table.tail(10))
