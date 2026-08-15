"""Validatier DB viz — read-only Streamlit dashboard for sanity-checking
fund-flow data in MongoDB. Run with: streamlit run app.py

Layout borrows its narrative from the old (main-branch) frontend: the
headline story per validator is "how much of withdrawn rewards got sold
vs. kept" (sold%), ranked against peers, alongside stake and price context.
"""
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

import data

st.set_page_config(page_title="Validatier Demo", layout="wide")


def fmt_amount_columns(df, cols):
    """Return a display copy of df[cols] with *_atom/*_usd/sold_pct columns
    human-formatted (1.2M ATOM, $1.2M, 12.3%) instead of raw floats."""
    out = df[cols].copy()
    for col in cols:
        if col.endswith("_usd"):
            out[col] = df[col].apply(lambda v: data.format_number(v, prefix="$"))
        elif col.endswith("_atom"):
            out[col] = df[col].apply(lambda v: f"{data.format_number(v)} ATOM")
        elif col == "sold_pct":
            out[col] = df[col].apply(lambda v: f"{v:.1f}%" if pd.notna(v) else "n/a")
        elif col == "commission_rate":
            out[col] = df[col].apply(lambda v: f"{float(v) * 100:.2f}%" if pd.notna(v) else "n/a")
    return out


@st.cache_data(ttl=30)
def cached_validators():
    return data.load_validators()


@st.cache_data(ttl=30)
def cached_summary():
    return data.load_validator_summary()


@st.cache_data(ttl=30)
def cached_meta():
    return data.load_meta()


@st.cache_data(ttl=30)
def cached_counts():
    return data.collection_counts()


@st.cache_data(ttl=30)
def cached_validator_stats(operator_address):
    return data.load_validator_stats(operator_address)


@st.cache_data(ttl=30)
def cached_edges(operator_address):
    return data.load_fund_flow_edges(operator_address)


@st.cache_data(ttl=30)
def cached_sink_sales(operator_address):
    return data.load_sink_sales(operator_address)


@st.cache_data(ttl=30)
def cached_latest_price():
    return data.latest_price()


@st.cache_data(ttl=30)
def cached_exchange_summary():
    return data.load_exchange_summary()


try:
    validators_df = cached_validators()
    summary_df = cached_summary()
except Exception as e:
    st.error(f"Could not connect to MongoDB: {e}")
    st.stop()

st.sidebar.title("Validatier Demo")

validator_options = ["All"] + [
    f"{row.moniker} ({row.operator_address})"
    for row in validators_df.sort_values("moniker").itertuples()
]


def validator_selector(key):
    """Local validator picker for a single tab — returns (operator_address, moniker)."""
    selected = st.selectbox("Validator", validator_options, key=key)
    if selected == "All":
        return None, None
    operator_address = selected.split("(")[-1].rstrip(")")
    moniker = selected.split(" (")[0]
    return operator_address, moniker


price = cached_latest_price()
if price:
    st.sidebar.caption(f"Latest ATOM price: ${price:.4f}")

debug = st.query_params.get("debug") == "1"

tab_labels = ["Overview", "Validator Detail", "Validators", "Exchanges"]
if debug:
    tab_labels += ["Fund Flow Edges", "Sanity Checks"]
tabs = st.tabs(tab_labels)

# ---------------------------------------------------------------- Overview
with tabs[0]:
    st.header("Network Summary")
    st.caption(
        "Headline story from the old dashboard: how much of each validator's withdrawn "
        "rewards got sold (sold%) vs. kept. This tab derives the same story "
        "from the new fund-flow schema."
    )

    if summary_df.empty:
        st.info("No data available yet to summarize.")
    else:
        total_sold = summary_df["sold_atom"].sum()
        total_withdrawn = summary_df["total_withdrawn_atom"].sum()
        avg_sold_pct = summary_df["sold_pct"].dropna().mean()

        c1, c2, c3 = st.columns(3)
        c1.metric("Total Withdrawn Rewards", f"{data.format_number(total_withdrawn)} ATOM")
        c2.metric("Total Sold", f"{data.format_number(total_sold)} ATOM")
        c3.metric("Average Sold %", f"{avg_sold_pct:.1f}%" if pd.notna(avg_sold_pct) else "n/a")

        if price:
            st.metric("Total Sold (USD)", data.format_number(total_sold * price, prefix="$"))

        st.subheader("Leaderboard — Top Sellers (sold%)")
        top_sellers = summary_df.dropna(subset=["sold_pct"]).sort_values("sold_pct", ascending=False).head(10)
        st.dataframe(
            fmt_amount_columns(top_sellers, ["moniker", "sold_pct", "sold_atom", "total_withdrawn_atom"]),
            width="stretch",
        )

        st.subheader("Leaderboard — Lowest Sellers (sold%)")
        bottom_sellers = summary_df.dropna(subset=["sold_pct"]).sort_values("sold_pct", ascending=True).head(10)
        st.dataframe(
            fmt_amount_columns(bottom_sellers, ["moniker", "sold_pct", "sold_atom", "total_withdrawn_atom"]),
            width="stretch",
        )

        st.subheader("Leaderboard — Highest Sold Amount (ATOM)")
        top_sold_amount = summary_df.sort_values("sold_atom", ascending=False).head(10)
        st.dataframe(
            fmt_amount_columns(top_sold_amount, ["moniker", "sold_atom", "sold_usd", "sold_pct"]),
            width="stretch",
        )

    if debug:
        st.header("Pipeline Status")
        meta = cached_meta()
        counts = cached_counts()

        c1, c2, c3, c4 = st.columns(4)
        c1.metric("scanned_up_to_height", meta.get("scanned_up_to_height", "-"))
        c2.metric("fund_flow_current_version", meta.get("fund_flow_current_version", "-"))
        c3.metric("fund_flow_edge_count", meta.get("fund_flow_edge_count", "-"))
        c4.metric("is_genesis_saved", str(meta.get("is_genesis_saved", "-")))

        totals = meta.get("fund_flow_totals", {})
        t1, t2, t3 = st.columns(3)
        t1.metric("in_flight (ATOM)", f"{data.uatom_to_atom(totals.get('in_flight')):.2f}")
        t2.metric("realized (ATOM)", f"{data.uatom_to_atom(totals.get('realized')):.2f}")
        t3.metric("suspected (ATOM)", f"{data.uatom_to_atom(totals.get('suspected')):.2f}")

        st.subheader("Collection Sizes")
        st.dataframe(pd.DataFrame([counts]).T.rename(columns={0: "document count"}))

        latest_version = data.load_latest_fund_flow_version()
        st.caption(f"Latest published fund_flow_edges version: {latest_version}")

# ---------------------------------------------------------------- Validator Detail
with tabs[1]:
    selected_operator_address, selected_moniker = validator_selector(key="validator_detail_select")
    if not selected_operator_address:
        st.info("Select a validator above to see its detail page.")
    else:
        row = summary_df[summary_df["operator_address"] == selected_operator_address]
        if row.empty:
            st.warning("No summary row found for this validator.")
        else:
            row = row.iloc[0]
            st.header(row["moniker"])
            st.caption(f"`{selected_operator_address}`")
            if row.get("website"):
                st.caption(row["website"])

            c1, c2, c3 = st.columns(3)
            c1.metric(
                "Sold %",
                f"{row['sold_pct']:.1f}%" if pd.notna(row["sold_pct"]) else "n/a",
            )
            if pd.notna(row["sold_pct_rank"]):
                c1.caption(f"rank {int(row['sold_pct_rank'])} of {int(row['total_validators'])}")
            c2.metric("Total Sold", f"{data.format_number(row['sold_atom'])} ATOM")
            c3.metric(
                "Commission",
                f"{float(row['commission_rate']) * 100:.2f}%" if pd.notna(row["commission_rate"]) else "n/a",
            )

            stats_df = cached_validator_stats(selected_operator_address)
            if not stats_df.empty:
                st.subheader("Stake Time Series")
                fig = go.Figure()
                fig.add_trace(go.Scatter(x=stats_df["date"], y=stats_df["total_stake_atom"], mode="lines+markers", name="total_stake"))
                fig.update_layout(title="Total Stake (ATOM)")
                st.plotly_chart(fig, use_container_width=True)

            sales_df = cached_sink_sales(selected_operator_address)
            if not sales_df.empty:
                st.subheader("Sales Time Series (Total Sold Amount)")
                agg = sales_df.groupby("date")["cumulative_sold_atom"].sum().reset_index()
                fig2 = px.area(agg, x="date", y="cumulative_sold_atom", title="Cumulative sold — total across all exchanges (ATOM)")
                fig2.update_traces(mode="lines+markers")
                st.plotly_chart(fig2, use_container_width=True)

                st.subheader("Sold to Exchanges")
                latest_idx = sales_df.groupby("sink_name")["date"].idxmax()
                by_exchange = sales_df.loc[latest_idx, ["sink_name", "cumulative_sold_atom"]].sort_values(
                    "cumulative_sold_atom", ascending=False
                )
                by_exchange_display = by_exchange.rename(columns={"sink_name": "Exchange"}).copy()
                by_exchange_display["Sold"] = by_exchange_display["cumulative_sold_atom"].apply(
                    lambda v: f"{data.format_number(v)} ATOM"
                )
                st.dataframe(
                    by_exchange_display[["Exchange", "Sold"]], width="stretch", hide_index=True
                )
            else:
                st.info("No sales data yet for this validator.")

            with st.expander("Raw validator_stats data"):
                st.dataframe(stats_df, width="stretch")

# ---------------------------------------------------------------- Validators
with tabs[2]:
    st.header("Validators — Sortable Table")
    st.caption("Click column headers to sort (like the sortable table in the old dashboard).")
    display_df = summary_df.sort_values("sold_pct_rank")
    table_df = fmt_amount_columns(
        display_df,
        [
            "sold_pct_rank",
            "moniker",
            "operator_address",
            "total_stake_atom",
            "total_withdrawn_atom",
            "sold_atom",
            "sold_pct",
            "commission_rate",
        ],
    ).rename(
        columns={
            "sold_pct_rank": "rank",
            "total_stake_atom": "total_stake",
            "total_withdrawn_atom": "total_withdrawn",
            "sold_atom": "sold",
            "sold_pct": "sold %",
        }
    )
    st.dataframe(table_df, width="stretch")

    with st.expander("Raw validators collection (all fields)"):
        st.dataframe(validators_df, width="stretch")

# ---------------------------------------------------------------- Exchanges
with tabs[3]:
    st.header("Exchanges")
    st.caption("How much each exchange received across all validators, and who sold there.")
    exchange_df = cached_exchange_summary()
    if exchange_df.empty:
        st.info("No exchange sales data yet.")
    else:
        by_exchange = exchange_df.groupby("sink_name")["sold_atom"].sum().reset_index().sort_values(
            "sold_atom", ascending=False
        )
        fig = px.bar(by_exchange, x="sink_name", y="sold_atom", title="Total sold per exchange (ATOM)")
        st.plotly_chart(fig, use_container_width=True)

        display_df = by_exchange.rename(columns={"sink_name": "Exchange"}).copy()
        display_df["Total Sold"] = display_df["sold_atom"].apply(lambda v: f"{data.format_number(v)} ATOM")
        st.dataframe(display_df[["Exchange", "Total Sold"]], width="stretch", hide_index=True)

        st.subheader("Validator breakdown per exchange")
        exchange_options = list(by_exchange["sink_name"])
        chosen_exchange = st.selectbox("Exchange", exchange_options)
        breakdown = exchange_df[exchange_df["sink_name"] == chosen_exchange].sort_values(
            "sold_atom", ascending=False
        )
        breakdown_display = breakdown.rename(columns={"moniker": "Validator"}).copy()
        breakdown_display["Sold"] = breakdown_display["sold_atom"].apply(lambda v: f"{data.format_number(v)} ATOM")
        st.dataframe(breakdown_display[["Validator", "Sold"]], width="stretch", hide_index=True)

if debug:
    # ---------------------------------------------------------------- Fund Flow Edges
    with tabs[4]:
        st.header("Fund Flow Edges (latest published version)")
        edges_operator_address, _ = validator_selector(key="fund_flow_edges_select")
        edges_df = cached_edges(edges_operator_address)
        if edges_df.empty:
            st.info("No published fund_flow_edges data for this filter.")
        else:
            status_filter = st.multiselect(
                "status", options=sorted(edges_df["status"].unique()), default=list(edges_df["status"].unique())
            )
            filtered = edges_df[edges_df["status"].isin(status_filter)]

            by_status = filtered.groupby("status")["weight_atom"].sum().reset_index()
            fig = px.bar(by_status, x="status", y="weight_atom", title="Total weight per status (ATOM)")
            st.plotly_chart(fig, use_container_width=True)

            st.subheader("Flow Graph (contracted edges)")
            st.caption(
                "Each edge here is already contracted: origin (validator) → holder, one edge, "
                "no matter how many real on-chain hops the money took to get there. This view is "
                "for debugging the graph structure itself — spot cycles, unexpected fan-out, or "
                "wallets holding money from multiple origins (commingled, haircut candidates)."
            )
            max_edges = st.slider(
                "max edges shown (largest weight first)", min_value=10, max_value=300,
                value=min(150, len(filtered)), step=10,
            )
            graph_df = filtered.sort_values("weight_atom", ascending=False).head(max_edges)
            if graph_df.empty:
                st.info("No edges to plot for this filter.")
            else:
                label_map = dict(zip(validators_df["operator_address"], validators_df["moniker"]))
                sink_registry_df = data.load_sink_registry()
                if not sink_registry_df.empty:
                    label_map.update(dict(zip(sink_registry_df["address"], sink_registry_df["label"])))
                st.plotly_chart(data.build_edges_sankey(graph_df, label_map), use_container_width=True)
                if len(filtered) > max_edges:
                    st.caption(f"showing top {max_edges} of {len(filtered)} edges by weight.")

                commingled = (
                    filtered.groupby("holder")["origin"].nunique().reset_index(name="distinct_origins")
                )
                commingled = commingled[commingled["distinct_origins"] > 1].sort_values(
                    "distinct_origins", ascending=False
                )
                if not commingled.empty:
                    st.warning(f"{len(commingled)} holder wallet(s) hold money from multiple origins (commingled — pro-rata haircut applies here).")
                    with st.expander("Commingled holders"):
                        st.dataframe(commingled, width="stretch")

            st.dataframe(
                filtered[
                    [
                        "origin",
                        "holder",
                        "depth",
                        "weight_atom",
                        "status",
                        "sink_tier",
                        "sink_kind",
                        "last_update_timestamp",
                    ]
                ],
                width="stretch",
            )

    # ---------------------------------------------------------------- Sanity Checks
    with tabs[5]:
        st.header("Sanity Checks")
        selected_operator_address, _ = validator_selector(key="sanity_checks_select")
        if not selected_operator_address:
            st.info("Select a validator above to run sanity checks.")
        else:
            row = summary_df[summary_df["operator_address"] == selected_operator_address]
            stats_df = cached_validator_stats(selected_operator_address)
            sales_df = cached_sink_sales(selected_operator_address)

            if row.empty or stats_df.empty:
                st.info("No validator_stats data — cannot run sanity checks.")
            else:
                row = row.iloc[0]
                total_withdrawn = int(row["total_withdrawn_uatom"])
                realized = int(row["sold_uatom"])
                sold_pct = row["sold_pct"]

                c1, c2, c3 = st.columns(3)
                c1.metric("total_withdrawn (reward+commission, ATOM)", f"{total_withdrawn / 10**data.DECIMALS:.2f}")
                c2.metric("realized (fund_flow, ATOM)", f"{realized / 10**data.DECIMALS:.2f}")
                c3.metric("sold %", f"{sold_pct:.1f}%" if pd.notna(sold_pct) else "n/a")

                if pd.notna(sold_pct) and (sold_pct < 0 or sold_pct > 100):
                    st.error(f"sold% out of range ({sold_pct:.1f}%) — should be between 0-100, possible data issue.")

                # monotonic withdrawn check
                sorted_stats = stats_df.sort_values("date")
                reward_diffs = sorted_stats["total_withdrawn_reward"].apply(int).diff()
                commission_diffs = sorted_stats["total_withdrawn_commission"].apply(int).diff()
                if (reward_diffs < 0).any() or (commission_diffs < 0).any():
                    st.error(
                        "total_withdrawn_reward/commission decreased over time — cumulative fields must be "
                        "monotonically increasing, this indicates a data inconsistency."
                    )
                else:
                    st.success("total_withdrawn_reward/commission is monotonically increasing. ✓")

                if not sales_df.empty:
                    latest_sold = int(sales_df.sort_values("date").iloc[-1]["cumulative_sold"] or 0)
                    if latest_sold > total_withdrawn:
                        st.error(
                            f"cumulative_sold ({latest_sold}) > total_withdrawn ({total_withdrawn}) — "
                            "sold amount cannot exceed withdrawn amount."
                        )
                    else:
                        st.success("cumulative_sold ≤ total_withdrawn. ✓")
