"""Read-only Mongo data access for the Validatier viz dashboard.

Field names mirror backend/models/*/*.ts exactly. All uatom amounts are stored
in Mongo as BigInt strings — they are parsed as Python int (arbitrary
precision) and only converted to float ATOM at the very end, for display.
"""
import os
from pathlib import Path
from functools import lru_cache
from typing import Optional

import pandas as pd
from dotenv import dotenv_values
from pymongo import MongoClient

REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND_ENV = REPO_ROOT / "backend" / ".env"
VIZ_ENV = REPO_ROOT / "viz" / ".env"


def _load_config() -> dict:
    if not BACKEND_ENV.exists():
        raise FileNotFoundError(
            f"backend/.env not found at {BACKEND_ENV} — this script reads "
            "MONGO_URI from the backend's own env file."
        )
    values = dotenv_values(BACKEND_ENV)
    if VIZ_ENV.exists():
        # viz/.env overrides backend/.env — lets you point the dashboard at a
        # separate copy DB without touching the live backend's config.
        values.update(dotenv_values(VIZ_ENV))
    mongo_uri = values.get("MONGO_URI") or os.environ.get("MONGO_URI")
    if not mongo_uri:
        raise ValueError(f"MONGO_URI not set in {BACKEND_ENV}")
    decimals = int(values.get("DECIMALS", "6"))
    denom = values.get("DENOM", "uatom")
    return {"mongo_uri": mongo_uri, "decimals": decimals, "denom": denom}


CONFIG = _load_config()
DECIMALS = CONFIG["decimals"]
DENOM = CONFIG["denom"]


@lru_cache(maxsize=1)
def get_client() -> MongoClient:
    return MongoClient(CONFIG["mongo_uri"], serverSelectionTimeoutMS=5000)


def get_db():
    client = get_client()
    client.admin.command("ping")  # fail fast with a clear error if Mongo is down
    return client.get_default_database()


def uatom_to_atom(value) -> float:
    """Convert a uatom BigInt-string (or None) to a float ATOM for display only."""
    if value is None:
        return 0.0
    return int(value) / (10**DECIMALS)


def format_number(value, prefix: str = "") -> str:
    """Format a number for display: 1.23B / 1.23M / 12.3K, else comma-separated."""
    if value is None or pd.isna(value):
        return "n/a"
    value = float(value)
    sign = "-" if value < 0 else ""
    value = abs(value)
    if value >= 1e9:
        text = f"{value / 1e9:.2f}B"
    elif value >= 1e6:
        text = f"{value / 1e6:.2f}M"
    elif value >= 1e3:
        text = f"{value / 1e3:.1f}K"
    else:
        text = f"{value:,.2f}" if value % 1 else f"{value:,.0f}"
    return f"{sign}{prefix}{text}"


def _to_df(cursor) -> pd.DataFrame:
    docs = list(cursor)
    for d in docs:
        d.pop("_id", None)
    return pd.DataFrame(docs)


def load_validators() -> pd.DataFrame:
    return _to_df(get_db()["validators"].find({}))


def load_meta() -> dict:
    doc = get_db()["meta"].find_one({})
    if not doc:
        return {}
    doc.pop("_id", None)
    return doc


def load_validator_stats(operator_address: Optional[str] = None) -> pd.DataFrame:
    query = {"operator_address": operator_address} if operator_address else {}
    df = _to_df(get_db()["validator_stats"].find(query))
    if df.empty:
        return df
    return _flatten_validator_stats(df)


def _flatten_validator_stats(df: pd.DataFrame) -> pd.DataFrame:
    """Each doc holds 31-length per-day arrays for one validator/month.
    Explode into one row per (operator_address, day-with-data)."""
    rows = []
    array_fields = [
        "timestamp",
        "block_height",
        "total_stake",
        "total_withdrawn_reward",
        "total_withdrawn_commission",
    ]
    for _, doc in df.iterrows():
        for i in range(31):
            ts = doc["timestamp"][i] if i < len(doc["timestamp"]) else None
            if ts is None:
                continue
            row = {
                "operator_address": doc["operator_address"],
                "year": doc["year"],
                "month": doc["month"],
                "day": i + 1,
                "timestamp": ts,
            }
            for f in array_fields:
                if f == "timestamp":
                    continue
                arr = doc[f]
                val = arr[i] if i < len(arr) else None
                row[f] = val
            rows.append(row)
    out = pd.DataFrame(rows)
    if out.empty:
        return out
    out["date"] = pd.to_datetime(out["timestamp"], unit="s")
    for f in ["total_stake", "total_withdrawn_reward", "total_withdrawn_commission"]:
        out[f + "_atom"] = out[f].apply(uatom_to_atom)
    return out.sort_values(["operator_address", "date"])


def load_fund_flow_edges(
    operator_address: Optional[str] = None, published_only: bool = True, latest_version_only: bool = True
) -> pd.DataFrame:
    query = {}
    if published_only:
        query["published"] = True
    if latest_version_only:
        version = load_latest_fund_flow_version()
        if version is None:
            return pd.DataFrame()
        query["version"] = version
    if operator_address:
        query["origin"] = operator_address
    df = _to_df(get_db()["fund_flow_edges"].find(query))
    if df.empty:
        return df
    df["weight_atom"] = df["weight"].apply(uatom_to_atom)
    df["weight_prefix_sum_atom"] = df["weight_prefix_sum"].apply(uatom_to_atom)
    return df


def load_latest_fund_flow_version() -> Optional[int]:
    doc = get_db()["fund_flow_edges"].find_one({"published": True}, sort=[("version", -1)])
    return doc["version"] if doc else None


def load_sink_registry() -> pd.DataFrame:
    return _to_df(get_db()["fund_flow_sink_registry"].find({}))


def load_sink_sales(operator_address: Optional[str] = None) -> pd.DataFrame:
    query = {"operator_address": operator_address} if operator_address else {}
    df = _to_df(get_db()["validator_sink_sales"].find(query))
    if df.empty:
        return df
    df["cumulative_sold_atom"] = df["cumulative_sold"].apply(uatom_to_atom)
    df["date"] = pd.to_datetime(df["timestamp"], unit="s")

    registry_df = load_sink_registry()
    if not registry_df.empty and "label" in registry_df.columns:
        label_map = registry_df.set_index("address")["label"]
        df["sink_name"] = df["sink_address"].map(label_map)
    else:
        df["sink_name"] = None

    return df.sort_values(["operator_address", "sink_address", "date"])


def load_exchange_summary() -> pd.DataFrame:
    """Network-wide: latest cumulative sold amount per (validator, exchange) pair,
    restricted to the curated Tier 1 registry (the known/registered exchange
    list) — excludes Tier 2 (discovered/structural, unverified) addresses.
    cumulative_sold is a running total, so the latest row per pair is the
    current total sold to that exchange — not a sum across the time series.
    """
    sales_df = load_sink_sales()
    if sales_df.empty:
        return sales_df

    registry_df = load_sink_registry()
    tier1_addresses = set(registry_df.loc[registry_df["tier"] == 1, "address"]) if not registry_df.empty else set()
    sales_df = sales_df[sales_df["sink_address"].isin(tier1_addresses)]
    if sales_df.empty:
        return sales_df

    latest_idx = sales_df.groupby(["operator_address", "sink_address"])["date"].idxmax()
    latest_df = sales_df.loc[latest_idx].copy()

    validators_df = load_validators()
    if not validators_df.empty:
        moniker_map = validators_df.set_index("operator_address")["moniker"]
        latest_df["moniker"] = latest_df["operator_address"].map(moniker_map)
    else:
        latest_df["moniker"] = None

    latest_df["sink_name"] = latest_df["sink_name"].fillna(latest_df["sink_address"])

    return latest_df[
        ["sink_address", "sink_name", "operator_address", "moniker", "cumulative_sold_atom"]
    ].rename(columns={"cumulative_sold_atom": "sold_atom"}).sort_values(
        "sold_atom", ascending=False
    )


def load_prices() -> pd.DataFrame:
    df = _to_df(get_db()["prices"].find({}))
    if df.empty:
        return df
    df["date"] = pd.to_datetime(df["timestamp"], unit="s")
    return df.sort_values("date")


def latest_price() -> Optional[float]:
    doc = get_db()["prices"].find_one({}, sort=[("timestamp", -1)])
    return doc["price"] if doc else None


def load_validator_summary() -> pd.DataFrame:
    """One row per validator with the same narrative the old dashboard told:
    total rewards withdrawn, amount actually sold, and the resulting sold%
    — plus a rank for sold% against peers.
    This is the join old `ValidatorWithMetricsInterface` used to provide
    directly from a single collection; here it's assembled from the new
    fund-flow schema (validators + validator_stats + fund_flow_edges).
    """
    validators = load_validators()
    if validators.empty:
        return validators

    stats_all = load_validator_stats()
    if not stats_all.empty:
        latest_stats = stats_all.sort_values("date").groupby("operator_address").tail(1)
        latest_stats = latest_stats.set_index("operator_address")[
            ["total_stake", "total_withdrawn_reward", "total_withdrawn_commission"]
        ]
    else:
        latest_stats = pd.DataFrame(
            columns=["total_stake", "total_withdrawn_reward", "total_withdrawn_commission"]
        )

    edges_all = load_fund_flow_edges()
    if not edges_all.empty:
        realized_by_origin = (
            edges_all[edges_all["status"] == "realized"]
            .groupby("origin")["weight"]
            .apply(lambda s: sum(int(x) for x in s))
        )
    else:
        realized_by_origin = pd.Series(dtype="int64")

    df = validators[["operator_address", "moniker", "commission_rate", "website", "delegator_address"]].copy()
    df = df.set_index("operator_address")
    df = df.join(latest_stats, how="left")
    df["sold_uatom"] = realized_by_origin.reindex(df.index).fillna(0).astype("int64")

    for col in ["total_stake", "total_withdrawn_reward", "total_withdrawn_commission"]:
        df[col] = df[col].apply(lambda v: int(v) if pd.notna(v) else 0)

    df["total_withdrawn_uatom"] = df["total_withdrawn_reward"] + df["total_withdrawn_commission"]

    # Drop validators that never withdrew a reward or commission in the
    # scanned range — otherwise the dashboard is dominated by empty rows
    # (sold_pct/sold_atom all None) for validators with no activity yet.
    df = df[df["total_withdrawn_uatom"] > 0]

    df["sold_pct"] = df.apply(
        lambda r: min(max(r["sold_uatom"] / r["total_withdrawn_uatom"] * 100, 0), 100)
        if r["total_withdrawn_uatom"] > 0
        else None,
        axis=1,
    )

    df["total_stake_atom"] = df["total_stake"].apply(uatom_to_atom)
    df["total_withdrawn_atom"] = df["total_withdrawn_uatom"].apply(uatom_to_atom)
    df["sold_atom"] = df["sold_uatom"].apply(uatom_to_atom)

    price = latest_price() or 0.0
    df["sold_usd"] = df["sold_atom"] * price

    df["sold_pct_rank"] = df["sold_pct"].rank(ascending=False, method="min").astype("Int64")
    df["total_validators"] = len(df)

    return df.reset_index().sort_values("total_stake_atom", ascending=False)


def collection_counts() -> dict:
    db = get_db()
    names = [
        "validators",
        "validator_stats",
        "fund_flow_edges",
        "fund_flow_sink_registry",
        "validator_sink_sales",
        "prices",
        "meta",
    ]
    return {name: db[name].count_documents({}) for name in names}


STATUS_COLORS = {"realized": "#2ecc71", "suspected": "#f39c12", "in_flight": "#95a5a6"}


def _short_addr(addr: str) -> str:
    return f"{addr[:10]}…{addr[-6:]}" if isinstance(addr, str) and len(addr) > 20 else str(addr)


def build_edges_sankey(edges_df: pd.DataFrame, moniker_map: Optional[dict] = None):
    """Sankey of origin->holder contracted edges. One node per distinct address;
    origin (validator) nodes are labeled distinctly from plain holder wallets so
    fan-out/fan-in and commingled holders (multiple inbound origins) are visible
    at a glance — this is a debug view of the contracted graph, not the raw
    on-chain hop-by-hop path (that information no longer exists post-contraction).
    """
    import plotly.graph_objects as go

    moniker_map = moniker_map or {}
    origins = set(edges_df["origin"])
    addresses = pd.concat([edges_df["origin"], edges_df["holder"]]).unique().tolist()
    index = {addr: i for i, addr in enumerate(addresses)}

    def label_for(addr: str) -> str:
        moniker = moniker_map.get(addr)
        return moniker if moniker else _short_addr(addr)

    node_labels = [label_for(a) for a in addresses]
    node_colors = ["#8e44ad" if a in origins else "#3498db" for a in addresses]

    link_colors = [STATUS_COLORS.get(s, "#bdc3c7") for s in edges_df["status"]]

    fig = go.Figure(
        go.Sankey(
            arrangement="snap",
            textfont=dict(color="#1a1a1a", size=12),
            node=dict(
                label=node_labels,
                color=node_colors,
                pad=12,
                thickness=14,
                line=dict(width=0.5, color="#1a1a1a"),
            ),
            link=dict(
                source=[index[o] for o in edges_df["origin"]],
                target=[index[h] for h in edges_df["holder"]],
                value=edges_df["weight_atom"].clip(lower=0.000001),
                color=link_colors,
                customdata=edges_df["status"],
                hovertemplate="%{source.label} → %{target.label}<br>%{value:.6f} ATOM<br>status: %{customdata}<extra></extra>",
            ),
        )
    )
    fig.update_layout(
        title="purple = origin (validator) · blue = holder wallet · edge color = status "
        "(green=realized, orange=suspected, gray=in_flight)",
        font=dict(color="#1a1a1a", size=12),
        paper_bgcolor="white",
        height=600,
    )
    return fig
