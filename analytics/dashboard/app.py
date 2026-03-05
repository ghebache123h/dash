
import json
import os
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
from streamlit_autorefresh import st_autorefresh

try:
    import psycopg
    from psycopg.rows import dict_row
except ImportError:  # pragma: no cover - sqlite local mode
    psycopg = None
    dict_row = None


st.set_page_config(
    page_title="WhatsApp AI Analytics",
    layout="wide",
    initial_sidebar_state="expanded",
)

# --- i18n Translations ---
TRANSLATIONS = {
    "en": {
        "login_title": "Login to Dashboard",
        "username": "Username",
        "password": "Password",
        "login_btn": "Login",
        "invalid_creds": "Invalid credentials",
        "logout": "Logout",
        "role_admin": "Admin",
        "role_user": "User",
        "language": "Language",
        "page_title": "WhatsApp AI Support Analytics",
        "page_subtitle": "Premium operations view for message flow, OTP performance, token usage, cost, and support escalations.",
        "control_center": "Control Center",
        "date_time": "Date & Time",
        "scope": "Scope",
        "pricing_cost": "Pricing & Cost",
        "from_date": "From date",
        "from_time": "From time",
        "to_date": "To date",
        "to_time": "To time",
        "channel": "Channel",
        "category": "Category",
        "apply": "Apply",
        "reset": "Reset",
        "save_pricing": "Save pricing",
        "presets": "Quick Presets",
        "today": "Today",
        "last_7": "Last 7 Days",
        "last_30": "Last 30 Days",
        "this_month": "This Month",
        "auto_refresh": "Auto-Refresh (Live)",
        "refresh_off": "Off",
        "refresh_30s": "Every 30s",
        "refresh_60s": "Every 60s",
        "op_overview": "Operational Overview",
        "total_messages": "Total Messages",
        "new_conversations": "New Conversations",
        "avg_msg_conv": "Avg Msg / Conversation",
        "support_escalations": "Support Escalations",
        "otp_perf": "OTP & Request Performance",
        "disney_customers": "Disney Customers",
        "disney_code_req": "Disney Code Requests",
        "otp_success": "OTP Success",
        "otp_failed": "OTP Failed",
        "otp_unconfirmed": "OTP Unconfirmed",
        "otp_not_sent": "OTP Not Sent",
        "token_usage": "Token Usage & Cost",
        "input_tokens": "Input Tokens",
        "output_tokens": "Output Tokens",
        "avg_input": "Avg Input / Conversation",
        "avg_output": "Avg Output / Conversation",
        "input_cost": "Input Cost",
        "output_cost": "Output Cost",
        "total_cost": "Total Cost",
        "trends": "Trends & Analytics",
        "msg_trend": "Messages Trend",
        "conv_trend": "New Conversations Trend",
        "otp_outcomes": "OTP Outcomes",
        "esc_trend": "Escalations Trend",
        "token_trend": "Token Trend (Input vs Output)",
        "cost_trend": "Cost Trend",
        "esc_monitoring": "Escalation / Support Monitoring",
        "event_stream": "Event Stream (Recent 200)",
        "tt_total_messages": "Total inbound & outbound messages.",
        "tt_otp_failed": "OTP failed. Usually due to maximum retries without correct code.",
        "tt_otp_unconfirmed": "OTP sent but the user never responded or confirmed.",
        "tt_otp_not_sent": "OTP fetch failed silently from email, blocked before sending to user.",
        "tt_escalations": "Sessions transferred to human agents.",
        "vs": "vs"
    },
    "ar": {
        "login_title": "تسجيل الدخول إلى لوحة القيادة",
        "username": "اسم المستخدم",
        "password": "كلمة المرور",
        "login_btn": "دخول",
        "invalid_creds": "بيانات الاعتماد غير صالحة",
        "logout": "تسجيل خروج",
        "role_admin": "مسؤول",
        "role_user": "مستخدم",
        "language": "اللغة",
        "page_title": "تحليلات دعم الذكاء الاصطناعي لواتساب",
        "page_subtitle": "عرض العمليات المتميز لتدفق الرسائل، أداء رمز التحقق OTP، استخدام الرموز، التكلفة، وتصعيد الدعم.",
        "control_center": "مركز التحكم",
        "date_time": "التاريخ والوقت",
        "scope": "النطاق",
        "pricing_cost": "التسعير والتكلفة",
        "from_date": "من تاريخ",
        "from_time": "من وقت",
        "to_date": "إلى تاريخ",
        "to_time": "إلى وقت",
        "channel": "القناة",
        "category": "الفئة",
        "apply": "تطبيق",
        "reset": "إعادة ضبط",
        "save_pricing": "حفظ التسعير",
        "presets": "إعدادات سريعة",
        "today": "اليوم",
        "last_7": "آخر 7 أيام",
        "last_30": "آخر 30 يوم",
        "this_month": "هذا الشهر",
        "auto_refresh": "تحديث تلقائي (مباشر)",
        "refresh_off": "إيقاف",
        "refresh_30s": "كل 30 ثانية",
        "refresh_60s": "كل 60 ثانية",
        "op_overview": "نظرة عامة على العمليات",
        "total_messages": "إجمالي الرسائل",
        "new_conversations": "محادثات جديدة",
        "avg_msg_conv": "متوسط الرسائل بالمحادثة",
        "support_escalations": "تصعيد الدعم",
        "otp_perf": "أداء رموز التحقق (OTP)",
        "disney_customers": "عملاء ديزني",
        "disney_code_req": "طلبات كود ديزني",
        "otp_success": "نجاح مع التأكيد",
        "otp_failed": "فشل الرمز",
        "otp_unconfirmed": "رمز غير مؤكد",
        "otp_not_sent": "رمز لم يُرسل",
        "token_usage": "الرموز والتكلفة الاستهلاكية",
        "input_tokens": "رموز الإدخال (المدخلة)",
        "output_tokens": "رموز الإخراج (المخرجة)",
        "avg_input": "متوسط رموز الإدخال/محادثة",
        "avg_output": "متوسط رموز الإخراج/محادثة",
        "input_cost": "تكلفة الإدخال",
        "output_cost": "تكلفة الإخراج",
        "total_cost": "التكلفة الإجمالية",
        "trends": "التحليلات والاتجاهات",
        "msg_trend": "اتجاه الرسائل",
        "conv_trend": "اتجاه المحادثات الجديدة",
        "otp_outcomes": "نتائج رموز التحقق",
        "esc_trend": "اتجاه التصعيد",
        "token_trend": "اتجاه الرموز (إدخال وإخراج)",
        "cost_trend": "اتجاه التكلفة",
        "esc_monitoring": "مراقبة التصعيد / الدعم",
        "event_stream": "تدفق الأحداث (أحدث 200)",
        "tt_total_messages": "إجمالي الرسائل الصادرة والواردة.",
        "tt_otp_failed": "فشل الرمز. عادة بسبب تخطي الحد الأقصى للمحاولات برموز خاطئة.",
        "tt_otp_unconfirmed": "تم إرسال الرمز للمستخدم لكن لم يقم بتأكيده أو الرد.",
        "tt_otp_not_sent": "تعذر جلب الرمز بصمت من البريد، تم إيقافه قبل الإرسال.",
        "tt_escalations": "الجلسات التي تم تحويلها للموظف البشري.",
        "vs": "مقارنة بـ",
    }
}

if "lang" not in st.session_state:
    st.session_state["lang"] = "en"

def t(key: str) -> str:
    return TRANSLATIONS[st.session_state["lang"]].get(key, key)

# --- Authentication Logic ---
USERS = {
    "admin": {"password": "adminpassword", "role": "admin"},
    "user": {"password": "userpassword", "role": "user"}
}

if "authenticated" not in st.session_state:
    st.session_state["authenticated"] = False
    st.session_state["role"] = None
    st.session_state["username"] = None

def render_login():
    st.markdown(
        """
        <style>
        .login-box {
            max-width: 400px;
            margin: 100px auto;
            padding: 30px;
            background: #0F1A30;
            border-radius: 12px;
            border: 1px solid #223556;
            text-align: center;
        }
        </style>
        """, 
        unsafe_allow_html=True
    )
    
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        st.markdown(f"<div class='login-box'>", unsafe_allow_html=True)
        st.markdown(f"<h2>{t('login_title')}</h2>", unsafe_allow_html=True)
        
        # Language toggle exactly on login screen
        lang_choice = st.selectbox("🌐", ["English", "العربية"], index=0 if st.session_state["lang"] == "en" else 1, label_visibility="collapsed")
        new_lang = "en" if lang_choice == "English" else "ar"
        if new_lang != st.session_state["lang"]:
            st.session_state["lang"] = new_lang
            st.rerun()

        with st.form("login_form"):
            username = st.text_input(t("username"))
            password = st.text_input(t("password"), type="password")
            submitted = st.form_submit_button(t("login_btn"), use_container_width=True)
            
            if submitted:
                if username in USERS and USERS[username]["password"] == password:
                    st.session_state["authenticated"] = True
                    st.session_state["role"] = USERS[username]["role"]
                    st.session_state["username"] = username
                    st.rerun()
                else:
                    st.error(t("invalid_creds"))
        st.markdown("</div>", unsafe_allow_html=True)

if not st.session_state["authenticated"]:
    # Apply RTL if Arabic is selected even on login screen
    if st.session_state["lang"] == "ar":
        st.markdown("<style>body, div, span, p, h1, h2, h3, h4, h5, h6, input, button { direction: rtl; text-align: right; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }</style>", unsafe_allow_html=True)
    apply_custom_css()
    render_login()
    st.stop()

EVENT_COLUMNS = [
    "event_time",
    "event_type",
    "conversation_id",
    "customer_id",
    "channel",
    "direction",
    "category",
    "intent",
    "otp_status",
    "escalation_reason",
    "token_input",
    "token_output",
    "metadata",
    "event_key",
]

CHART_COLORS = {
    "inbound": "#60A5FA",
    "outbound": "#34D399",
    "success": "#22C55E",
    "failed": "#EF4444",
    "unconfirmed": "#F59E0B",
    "not_sent": "#64748B",
    "escalation": "#F97316",
    "input_tokens": "#22D3EE",
    "output_tokens": "#A3E635",
    "input_cost": "#38BDF8",
    "output_cost": "#4ADE80",
    "total_cost": "#F59E0B",
}


def apply_custom_css() -> None:
    st.markdown(
        """
        <style>
        :root {
            --bg: #050B16;
            --bg-soft: #0B1426;
            --panel: #0F1A30;
            --panel-2: #111E36;
            --border: #223556;
            --text: #E6EEFF;
            --muted: #A8B6D8;
            --accent: #38BDF8;
            --good: #22C55E;
            --bad: #EF4444;
            --warn: #F59E0B;
        }

        [data-testid="stAppViewContainer"] {
            background:
              radial-gradient(1200px 500px at 90% -10%, rgba(56, 189, 248, 0.10), transparent 60%),
              radial-gradient(1000px 500px at -10% -20%, rgba(37, 99, 235, 0.12), transparent 60%),
              var(--bg);
            color: var(--text);
        }

        [data-testid="stSidebar"] {
            background: linear-gradient(180deg, #0A1325 0%, #08101F 100%);
            border-right: 1px solid rgba(148, 163, 184, 0.18);
        }

        [data-testid="stHeader"] {
            background: rgba(5, 11, 22, 0.6);
            backdrop-filter: blur(8px);
        }

        .page-hero {
            background: linear-gradient(135deg, rgba(56, 189, 248, 0.14), rgba(59, 130, 246, 0.10));
            border: 1px solid rgba(56, 189, 248, 0.35);
            border-radius: 16px;
            padding: 20px 22px;
            margin-bottom: 16px;
        }

        .page-title {
            margin: 0;
            font-size: 1.7rem;
            line-height: 1.2;
            letter-spacing: 0.2px;
            font-weight: 700;
            color: var(--text);
        }

        .page-subtitle {
            margin: 8px 0 0 0;
            font-size: 0.94rem;
            color: var(--muted);
        }

        .chip-row {
            margin-top: 12px;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }

        .chip {
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 0.77rem;
            color: #DBEAFE;
            border: 1px solid rgba(147, 197, 253, 0.34);
            background: rgba(37, 99, 235, 0.18);
        }

        .section-title {
            font-size: 1rem;
            margin: 16px 0 8px 0;
            font-weight: 600;
            color: #DCE7FF;
            letter-spacing: 0.2px;
        }
        .kpi-card {
            background: linear-gradient(180deg, rgba(17, 30, 54, 0.90), rgba(15, 24, 43, 0.95));
            border: 1px solid rgba(148, 163, 184, 0.20);
            border-radius: 14px;
            padding: 14px 14px;
            min-height: 128px;
            transition: all 0.18s ease;
            box-shadow: 0 6px 20px rgba(2, 6, 23, 0.26);
        }

        .kpi-card:hover {
            transform: translateY(-2px);
            border-color: rgba(56, 189, 248, 0.48);
            box-shadow: 0 10px 28px rgba(2, 6, 23, 0.36);
        }

        .kpi-head {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
        }

        .kpi-label {
            color: var(--muted);
            font-size: 0.8rem;
            letter-spacing: 0.2px;
        }

        .kpi-icon {
            font-size: 0.95rem;
            opacity: 0.9;
        }

        .kpi-value {
            font-size: 1.55rem;
            font-weight: 700;
            color: #F8FBFF;
            line-height: 1.2;
            margin: 2px 0 10px 0;
        }

        .delta-pill {
            display: inline-flex;
            align-items: center;
            border-radius: 999px;
            padding: 3px 8px;
            font-size: 0.74rem;
            border: 1px solid transparent;
        }

        .delta-up {
            color: #BBF7D0;
            background: rgba(34, 197, 94, 0.14);
            border-color: rgba(34, 197, 94, 0.35);
        }

        .delta-down {
            color: #FECACA;
            background: rgba(239, 68, 68, 0.16);
            border-color: rgba(239, 68, 68, 0.35);
        }

        .delta-neutral {
            color: #BFDBFE;
            background: rgba(59, 130, 246, 0.14);
            border-color: rgba(59, 130, 246, 0.35);
        }

        .panel-empty {
            border: 1px dashed rgba(148, 163, 184, 0.35);
            border-radius: 12px;
            padding: 22px 12px;
            text-align: center;
            color: var(--muted);
            font-size: 0.88rem;
        }

        [data-testid="stVerticalBlockBorderWrapper"] {
            border: 1px solid rgba(148, 163, 184, 0.18) !important;
            background: linear-gradient(180deg, rgba(15, 26, 48, 0.86), rgba(12, 21, 38, 0.94));
            border-radius: 14px;
        }

        [data-testid="stDataFrame"] div[role="grid"] {
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid rgba(148, 163, 184, 0.25);
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def get_database_url() -> str:
    return os.getenv("DATABASE_URL", "sqlite:///./analytics/local_analytics.db")


def is_sqlite() -> bool:
    return get_database_url().startswith("sqlite:///")


def sqlite_path() -> str:
    return get_database_url().removeprefix("sqlite:///")


def ensure_sqlite_schema() -> None:
    if not is_sqlite():
        return

    path = sqlite_path()
    parent = Path(path).parent
    if parent and str(parent) not in (".", ""):
        parent.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(path) as conn:
        cur = conn.cursor()
        cur.executescript(
            """
            CREATE TABLE IF NOT EXISTS analytics_events (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              event_key TEXT NOT NULL UNIQUE,
              event_type TEXT NOT NULL,
              event_time TEXT NOT NULL DEFAULT (datetime('now')),
              conversation_id TEXT,
              customer_id TEXT,
              channel TEXT NOT NULL DEFAULT 'whatsapp',
              direction TEXT,
              category TEXT,
              intent TEXT,
              otp_status TEXT,
              escalation_reason TEXT,
              token_input INTEGER NOT NULL DEFAULT 0,
              token_output INTEGER NOT NULL DEFAULT 0,
              metadata TEXT NOT NULL DEFAULT '{}',
              created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_analytics_events_time ON analytics_events (event_time);
            CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events (event_type);
            CREATE INDEX IF NOT EXISTS idx_analytics_events_conversation ON analytics_events (conversation_id);
            CREATE INDEX IF NOT EXISTS idx_analytics_events_customer ON analytics_events (customer_id);
            CREATE INDEX IF NOT EXISTS idx_analytics_events_category ON analytics_events (category);

            CREATE TABLE IF NOT EXISTS pricing_settings (
              id INTEGER PRIMARY KEY CHECK (id = 1),
              input_price_per_million REAL NOT NULL DEFAULT 0,
              output_price_per_million REAL NOT NULL DEFAULT 0,
              updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            INSERT OR IGNORE INTO pricing_settings (id, input_price_per_million, output_price_per_million)
            VALUES (1, 0, 0);
            """
        )
        conn.commit()

def empty_events_df() -> pd.DataFrame:
    return pd.DataFrame(columns=EVENT_COLUMNS)


def run_query(sql: str, params: Any | None = None) -> list[dict[str, Any]]:
    if is_sqlite():
        with sqlite3.connect(sqlite_path()) as conn:
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute(sql, params or {})
            rows = cur.fetchall()
            return [dict(row) for row in rows]

    if psycopg is None:
        raise RuntimeError("psycopg is required for PostgreSQL mode.")

    with psycopg.connect(get_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params or {})
            return cur.fetchall()


def run_execute(sql: str, params: Any | None = None) -> None:
    if is_sqlite():
        with sqlite3.connect(sqlite_path()) as conn:
            cur = conn.cursor()
            cur.execute(sql, params or {})
            conn.commit()
        return

    if psycopg is None:
        raise RuntimeError("psycopg is required for PostgreSQL mode.")

    with psycopg.connect(get_database_url(), row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params or {})
        conn.commit()


def to_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def parse_metadata(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if value is None:
        return {}
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


def load_distinct_values(column: str) -> list[str]:
    try:
        op = "!=" if is_sqlite() else "<>"
        rows = run_query(
            f"SELECT DISTINCT {column} AS value FROM analytics_events WHERE {column} IS NOT NULL AND {column} {op} '' ORDER BY 1"
        )
        return [row["value"] for row in rows if row.get("value")]
    except Exception as exc:
        if "does not exist" in str(exc) or "no such table" in str(exc):
            return []
        raise exc


def load_events_range(start_utc: datetime, end_utc: datetime) -> pd.DataFrame:
    try:
        if is_sqlite():
            rows = run_query(
                """
                SELECT
                  event_time, event_type, conversation_id, customer_id, channel, direction, category,
                  intent, otp_status, escalation_reason, token_input, token_output, metadata, event_key
                FROM analytics_events
                WHERE event_time >= :start_dt
                  AND event_time <= :end_dt
                ORDER BY event_time DESC
                """,
                {"start_dt": start_utc.isoformat(), "end_dt": end_utc.isoformat()},
            )
        else:
            rows = run_query(
                """
                SELECT
                  event_time, event_type, conversation_id, customer_id, channel, direction, category,
                  intent, otp_status, escalation_reason, token_input, token_output, metadata, event_key
                FROM analytics_events
                WHERE event_time >= %(start_dt)s
                  AND event_time <= %(end_dt)s
                ORDER BY event_time DESC
                """,
                {"start_dt": start_utc, "end_dt": end_utc},
            )
    except Exception as exc:
        if "does not exist" in str(exc) or "no such table" in str(exc):
            return empty_events_df()
        raise exc

    if not rows:
        return empty_events_df()

    df = pd.DataFrame(rows)
    df["event_time"] = pd.to_datetime(df["event_time"], utc=True, errors="coerce")
    df["token_input"] = pd.to_numeric(df["token_input"], errors="coerce").fillna(0).astype(int)
    df["token_output"] = pd.to_numeric(df["token_output"], errors="coerce").fillna(0).astype(int)
    return df

def load_inbound_all_time() -> pd.DataFrame:
    try:
        rows = run_query(
            """
            SELECT conversation_id, customer_id, channel, category, event_time
            FROM analytics_events
            WHERE event_type = 'inbound_message'
              AND conversation_id IS NOT NULL
            """
        )
    except Exception as exc:
        if "does not exist" in str(exc) or "no such table" in str(exc):
            return pd.DataFrame(columns=["conversation_id", "customer_id", "channel", "category", "event_time"])
        raise exc

    if not rows:
        return pd.DataFrame(columns=["conversation_id", "customer_id", "channel", "category", "event_time"])

    df = pd.DataFrame(rows)
    df["event_time"] = pd.to_datetime(df["event_time"], utc=True, errors="coerce")
    return df


def get_pricing_row() -> dict[str, float]:
    try:
        rows = run_query(
            """
            SELECT input_price_per_million, output_price_per_million
            FROM pricing_settings
            WHERE id = 1
            """
        )
    except Exception as exc:
        if "does not exist" in str(exc) or "no such table" in str(exc):
            return {"input_price_per_million": 0.0, "output_price_per_million": 0.0}
        raise exc

    if not rows:
        return {"input_price_per_million": 0.0, "output_price_per_million": 0.0}

    return {
        "input_price_per_million": float(rows[0]["input_price_per_million"] or 0),
        "output_price_per_million": float(rows[0]["output_price_per_million"] or 0),
    }


def save_pricing(input_price: float, output_price: float) -> None:
    if is_sqlite():
        run_execute(
            """
            INSERT INTO pricing_settings (id, input_price_per_million, output_price_per_million, updated_at)
            VALUES (1, :input_price, :output_price, datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
              input_price_per_million = excluded.input_price_per_million,
              output_price_per_million = excluded.output_price_per_million,
              updated_at = datetime('now')
            """,
            {"input_price": input_price, "output_price": output_price},
        )
        return

    run_execute(
        """
        INSERT INTO pricing_settings (id, input_price_per_million, output_price_per_million, updated_at)
        VALUES (1, %(input_price)s, %(output_price)s, NOW())
        ON CONFLICT (id) DO UPDATE
        SET
          input_price_per_million = EXCLUDED.input_price_per_million,
          output_price_per_million = EXCLUDED.output_price_per_million,
          updated_at = NOW()
        """,
        {"input_price": input_price, "output_price": output_price},
    )


def apply_filters(events_df: pd.DataFrame, channels: list[str], categories: list[str]) -> pd.DataFrame:
    if events_df.empty:
        return events_df
    filtered = events_df.copy()
    if channels:
        filtered = filtered[filtered["channel"].isin(channels)]
    if categories:
        filtered = filtered[filtered["category"].isin(categories)]
    return filtered

def compute_kpis(
    events_df: pd.DataFrame,
    all_inbound_df: pd.DataFrame,
    start_utc: datetime,
    end_utc: datetime,
    input_price: float,
    output_price: float,
) -> dict[str, float | int]:
    if not all_inbound_df.empty:
        first_inbound = all_inbound_df.groupby("conversation_id", dropna=True)["event_time"].min()
        new_conversations = int(
            ((first_inbound >= pd.Timestamp(start_utc)) & (first_inbound <= pd.Timestamp(end_utc))).sum()
        )
    else:
        new_conversations = 0

    if events_df.empty:
        return {
            "total_messages": 0,
            "new_conversations": new_conversations,
            "disney_customers": 0,
            "disney_code_requests": 0,
    "otp_success_count": 0,
    "otp_failed_count": 0,
    "otp_unconfirmed_count": 0,
    "otp_not_sent_count": 0,
    "support_escalation_count": 0,
            "avg_messages_per_conversation": 0.0,
            "input_tokens_total": 0,
            "output_tokens_total": 0,
            "avg_input_tokens_per_conversation": 0.0,
            "avg_output_tokens_per_conversation": 0.0,
            "input_cost": 0.0,
            "output_cost": 0.0,
            "total_cost": 0.0,
        }

    total_messages = int(events_df["event_type"].isin(["inbound_message", "outbound_message"]).sum())

    disney_customers = int(
        events_df[
            (events_df["category"] == "disney") & (events_df["event_type"] == "inbound_message")
        ]
        .assign(customer_key=lambda x: x["customer_id"].fillna(x["conversation_id"]))
        ["customer_key"]
        .nunique()
    )

    disney_code_requests = int((events_df["event_type"] == "otp_request").sum())
    otp_success_count = int(
        ((events_df["event_type"] == "otp_outcome") & (events_df["otp_status"] == "success")).sum()
    )
    otp_failed_count = int(
        ((events_df["event_type"] == "otp_outcome") & (events_df["otp_status"] == "failed")).sum()
    )
    otp_unconfirmed_count = int(
        ((events_df["event_type"] == "otp_outcome") & (events_df["otp_status"] == "unconfirmed")).sum()
    )
    otp_not_sent_count = int(
        ((events_df["event_type"] == "otp_outcome") & (events_df["otp_status"] == "not_sent")).sum()
    )
    support_escalation_count = int((events_df["event_type"] == "support_escalation").sum())

    conversation_count = int(events_df["conversation_id"].dropna().nunique())
    avg_messages_per_conversation = round(total_messages / conversation_count, 2) if conversation_count > 0 else 0.0

    input_tokens_total = int(events_df["token_input"].sum())
    output_tokens_total = int(events_df["token_output"].sum())

    input_conv_count = int(events_df[events_df["token_input"] > 0]["conversation_id"].dropna().nunique())
    output_conv_count = int(events_df[events_df["token_output"] > 0]["conversation_id"].dropna().nunique())
    avg_input_tokens_per_conversation = (
        round(input_tokens_total / input_conv_count, 2) if input_conv_count > 0 else 0.0
    )
    avg_output_tokens_per_conversation = (
        round(output_tokens_total / output_conv_count, 2) if output_conv_count > 0 else 0.0
    )

    input_cost = (input_tokens_total / 1_000_000) * input_price
    output_cost = (output_tokens_total / 1_000_000) * output_price
    total_cost = input_cost + output_cost

    return {
        "total_messages": total_messages,
        "new_conversations": new_conversations,
        "disney_customers": disney_customers,
        "disney_code_requests": disney_code_requests,
        "otp_success_count": otp_success_count,
        "otp_failed_count": otp_failed_count,
        "otp_unconfirmed_count": otp_unconfirmed_count,
        "otp_not_sent_count": otp_not_sent_count,
        "support_escalation_count": support_escalation_count,
        "avg_messages_per_conversation": avg_messages_per_conversation,
        "input_tokens_total": input_tokens_total,
        "output_tokens_total": output_tokens_total,
        "avg_input_tokens_per_conversation": avg_input_tokens_per_conversation,
        "avg_output_tokens_per_conversation": avg_output_tokens_per_conversation,
        "input_cost": input_cost,
        "output_cost": output_cost,
        "total_cost": total_cost,
    }


def infer_time_bucket(start_utc: datetime, end_utc: datetime) -> tuple[str, str]:
    duration = end_utc - start_utc
    if duration <= timedelta(days=2):
        return "H", "Hourly"
    if duration <= timedelta(days=62):
        return "D", "Daily"
    return "W", "Weekly"


def style_figure(fig: go.Figure, y_axis_title: str) -> go.Figure:
    fig.update_layout(
        template="plotly_dark",
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(12, 21, 38, 0.72)",
        margin=dict(l=24, r=18, t=36, b=24),
        height=320,
        hovermode="x unified",
        font=dict(color="#DDE7FF", size=13),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="left", x=0),
        xaxis=dict(
            title=None,
            showgrid=True,
            gridcolor="rgba(148, 163, 184, 0.15)",
            linecolor="rgba(148, 163, 184, 0.25)",
            tickfont=dict(color="#B7C6E8"),
        ),
        yaxis=dict(
            title=y_axis_title,
            showgrid=True,
            gridcolor="rgba(148, 163, 184, 0.15)",
            zeroline=False,
            tickfont=dict(color="#B7C6E8"),
            title_font=dict(color="#AFC3EE"),
        ),
    )
    return fig


def render_empty_panel(message: str) -> None:
    st.markdown(f"<div class='panel-empty'>{message}</div>", unsafe_allow_html=True)

def fmt_int(value: float | int) -> str:
    return f"{int(value):,}"


def fmt_float(value: float | int) -> str:
    return f"{float(value):,.2f}"


def fmt_currency(value: float | int) -> str:
    return f"${float(value):,.4f}"


def format_delta(delta: float, kind: str, delta_label: str) -> str:
    if kind in {"int", "token"}:
        return f"{delta:+,.0f} {delta_label}"
    if kind == "currency":
        return f"{delta:+,.4f} {delta_label}"
    return f"{delta:+,.2f} {delta_label}"


def render_kpi_card(
    title: str,
    value: float | int,
    delta: float | int,
    kind: str,
    icon: str,
    inverse_good: bool = False,
    tooltip: str = "",
    delta_label: str = "vs prev",
) -> None:
    if kind in {"int", "token"}:
        value_text = fmt_int(value)
    elif kind == "currency":
        value_text = fmt_currency(value)
    else:
        value_text = fmt_float(value)

    if delta > 0:
        is_positive = not inverse_good
    elif delta < 0:
        is_positive = inverse_good
    else:
        is_positive = None

    if is_positive is None:
        delta_class = "delta-neutral"
        arrow = "•"
    elif is_positive:
        delta_class = "delta-up"
        arrow = "▲"
    else:
        delta_class = "delta-down"
        arrow = "▼"

    delta_text = format_delta(float(delta), kind, delta_label)
    tooltip_html = f' title="{tooltip}"' if tooltip else ""
    st.markdown(
        f"""
        <div class="kpi-card"{tooltip_html}>
          <div class="kpi-head">
            <span class="kpi-label">{title}</span>
            <span class="kpi-icon">{icon}</span>
          </div>
          <div class="kpi-value">{value_text}</div>
          <span class="delta-pill {delta_class}">{arrow}&nbsp;{delta_text}</span>
        </div>
        """,
        unsafe_allow_html=True,
    )


def build_escalation_table(events_df: pd.DataFrame) -> pd.DataFrame:
    esc_df = events_df[events_df["event_type"] == "support_escalation"].copy()
    if esc_df.empty:
        return pd.DataFrame()

    esc_df["customer_id"] = esc_df["customer_id"].fillna("unknown")
    esc_df["conversation_id"] = esc_df["conversation_id"].fillna("unknown")
    esc_df["metadata_dict"] = esc_df["metadata"].apply(parse_metadata)
    esc_df["conversation_reference"] = esc_df["metadata_dict"].apply(lambda x: x.get("conversation_url", ""))

    grouped_rows: list[dict[str, Any]] = []
    grouped = esc_df.groupby(["customer_id", "conversation_id"], dropna=False)
    for (customer_id, conversation_id), group in grouped:
        reasons = sorted({str(v) for v in group["escalation_reason"].dropna().tolist() if str(v).strip()})
        references = [ref for ref in group["conversation_reference"].tolist() if ref]
        escalation_count = int(len(group))
        if escalation_count >= 3:
            priority = "🔴 High"
        elif escalation_count == 2:
            priority = "🟠 Medium"
        else:
            priority = "🟢 Low"

        grouped_rows.append(
            {
                "customer_id": customer_id,
                "conversation_id": conversation_id,
                "escalation_count": escalation_count,
                "priority": priority,
                "escalation_reason": ", ".join(reasons) if reasons else "unspecified",
                "first_escalation_at": group["event_time"].min(),
                "last_escalation_at": group["event_time"].max(),
                "repeated_support_requests": "🔁 Repeated" if escalation_count > 1 else "Single",
                "conversation_reference": references[-1] if references else "",
            }
        )

    table_df = pd.DataFrame(grouped_rows).sort_values("last_escalation_at", ascending=False)
    return table_df


def safe_selected(options: list[str], key: str) -> None:
    selected = st.session_state.get(key, options)
    selected = [item for item in selected if item in options]
    if not selected and options:
        selected = options
    st.session_state[key] = selected


def init_filters(channel_options: list[str], category_options: list[str]) -> tuple[datetime, datetime]:
    default_end = datetime.now()
    default_start = default_end - timedelta(days=7)

    if "filter_start_date" not in st.session_state:
        st.session_state["filter_start_date"] = default_start.date()
    if "filter_start_time" not in st.session_state:
        st.session_state["filter_start_time"] = default_start.time().replace(second=0, microsecond=0)
    if "filter_end_date" not in st.session_state:
        st.session_state["filter_end_date"] = default_end.date()
    if "filter_end_time" not in st.session_state:
        st.session_state["filter_end_time"] = default_end.time().replace(second=0, microsecond=0)
    if "filter_channels" not in st.session_state:
        st.session_state["filter_channels"] = channel_options
    if "filter_categories" not in st.session_state:
        st.session_state["filter_categories"] = category_options

    safe_selected(channel_options, "filter_channels")
    safe_selected(category_options, "filter_categories")

    return default_start, default_end

ensure_sqlite_schema()
apply_custom_css()

channel_options = load_distinct_values("channel")
category_options = load_distinct_values("category")
default_start, default_end = init_filters(channel_options, category_options)
pricing_row = get_pricing_row()
input_price = float(pricing_row["input_price_per_million"])
output_price = float(pricing_row["output_price_per_million"])

def set_preset(days: int | None = None, is_month: bool = False):
    now = datetime.now()
    if is_month:
        st.session_state["filter_start_date"] = now.replace(day=1).date()
        st.session_state["filter_start_time"] = datetime.min.time()
        st.session_state["filter_end_date"] = now.date()
        st.session_state["filter_end_time"] = now.time().replace(second=0, microsecond=0)
    elif days is not None:
        start = now - timedelta(days=days)
        st.session_state["filter_start_date"] = start.date()
        st.session_state["filter_start_time"] = start.time().replace(second=0, microsecond=0)
        st.session_state["filter_end_date"] = now.date()
        st.session_state["filter_end_time"] = now.time().replace(second=0, microsecond=0)

with st.sidebar:
    st.markdown(f"### {t('control_center')}")
    st.caption(t("page_subtitle"))

    # Language Switcher
    lang_choice = st.selectbox(
        t("language"), 
        ["English", "العربية"], 
        index=0 if st.session_state["lang"] == "en" else 1
    )
    new_lang = "en" if lang_choice == "English" else "ar"
    if new_lang != st.session_state["lang"]:
        st.session_state["lang"] = new_lang
        st.rerun()

    # Auto-Refresh
    refresh_option = st.selectbox(
        t("auto_refresh"),
        [t("refresh_off"), t("refresh_30s"), t("refresh_60s")],
        index=0
    )
    if refresh_option == t("refresh_30s"):
        st_autorefresh(interval=30000, key="data_refresh_30")
    elif refresh_option == t("refresh_60s"):
        st_autorefresh(interval=60000, key="data_refresh_60")

    st.markdown(f"#### {t('presets')}")
    col_p1, col_p2 = st.columns(2)
    col_p3, col_p4 = st.columns(2)
    with col_p1:
        if st.button(t("today"), use_container_width=True):
            set_preset(days=0)
            st.rerun()
    with col_p2:
        if st.button(t("last_7"), use_container_width=True):
            set_preset(days=7)
            st.rerun()
    with col_p3:
        if st.button(t("last_30"), use_container_width=True):
            set_preset(days=30)
            st.rerun()
    with col_p4:
        if st.button(t("this_month"), use_container_width=True):
            set_preset(is_month=True)
            st.rerun()

    with st.form("filters_form", clear_on_submit=False):
        st.markdown(f"#### {t('date_time')}")
        cols_dt_1 = st.columns(2)
        cols_dt_1[0].date_input(t("from_date"), key="filter_start_date")
        cols_dt_1[1].time_input(t("from_time"), key="filter_start_time", step=60)

        cols_dt_2 = st.columns(2)
        cols_dt_2[0].date_input(t("to_date"), key="filter_end_date")
        cols_dt_2[1].time_input(t("to_time"), key="filter_end_time", step=60)

        st.markdown(f"#### {t('scope')}")
        st.multiselect(t("channel"), options=channel_options, key="filter_channels")
        st.multiselect(t("category"), options=category_options, key="filter_categories")

        col_apply, col_reset = st.columns(2)
        apply_filters_btn = col_apply.form_submit_button(t("apply"), use_container_width=True)
        reset_filters_btn = col_reset.form_submit_button(t("reset"), use_container_width=True)

    if reset_filters_btn:
        st.session_state["filter_start_date"] = default_start.date()
        st.session_state["filter_start_time"] = default_start.time().replace(second=0, microsecond=0)
        st.session_state["filter_end_date"] = default_end.date()
        st.session_state["filter_end_time"] = default_end.time().replace(second=0, microsecond=0)
        st.session_state["filter_channels"] = channel_options
        st.session_state["filter_categories"] = category_options
        st.rerun()

    if apply_filters_btn:
        st.success("Filters applied." if st.session_state["lang"] == "en" else "تم تطبيق الفلاتر.")

    if st.session_state.get("role") == "admin":
        st.markdown("---")
        st.markdown(f"### {t('pricing_cost')}")
        with st.form("pricing_form", clear_on_submit=False):
            input_price = st.number_input(
                "Input price / 1M",
                min_value=0.0,
                value=float(pricing_row["input_price_per_million"]),
                step=0.01,
                format="%.6f",
            )
            output_price = st.number_input(
                "Output price / 1M",
                min_value=0.0,
                value=float(pricing_row["output_price_per_million"]),
                step=0.01,
                format="%.6f",
            )
            save_pricing_btn = st.form_submit_button(t("save_pricing"), use_container_width=True)
            if save_pricing_btn:
                save_pricing(input_price, output_price)
                st.success("Pricing updated." if st.session_state["lang"] == "en" else "تم تحديث التسعير.")

start_dt = datetime.combine(st.session_state["filter_start_date"], st.session_state["filter_start_time"])
end_dt = datetime.combine(st.session_state["filter_end_date"], st.session_state["filter_end_time"])
start_utc = to_utc(start_dt)
end_utc = to_utc(end_dt)

if end_utc <= start_utc:
    st.error("End datetime must be after start datetime.")
    st.stop()

selected_channels = st.session_state.get("filter_channels", channel_options)
selected_categories = st.session_state.get("filter_categories", category_options)

with st.spinner("Loading analytics data..."):
    events_df = apply_filters(load_events_range(start_utc, end_utc), selected_channels, selected_categories)
    if not events_df.empty:
        events_df = events_df.sort_values("event_time", ascending=False)

    all_inbound_df = apply_filters(load_inbound_all_time(), selected_channels, selected_categories)
    current_kpis = compute_kpis(events_df, all_inbound_df, start_utc, end_utc, input_price, output_price)

    prev_start_utc = start_utc - (end_utc - start_utc)
    prev_end_utc = start_utc
    previous_events_df = apply_filters(load_events_range(prev_start_utc, prev_end_utc), selected_channels, selected_categories)
    previous_kpis = compute_kpis(
        previous_events_df,
        all_inbound_df,
        prev_start_utc,
        prev_end_utc,
        input_price,
        output_price,
    )

    delta_label = f"{t('vs')} {prev_start_utc:%m/%d} - {prev_end_utc:%m/%d}"

bucket_rule, bucket_label = infer_time_bucket(start_utc, end_utc)

filter_chips = [
    f"Range: {start_dt:%Y-%m-%d %H:%M} → {end_dt:%Y-%m-%d %H:%M}",
    f"Bucket: {bucket_label}",
    f"Channels: {len(selected_channels) if selected_channels else 0}",
    f"Categories: {len(selected_categories) if selected_categories else 0}",
]

st.markdown(
    f"""
    <div class="page-hero">
      <h1 class="page-title">{t("page_title")}</h1>
      <p class="page-subtitle">
        {t("page_subtitle")}
      </p>
      <div class="chip-row">
        {''.join([f"<span class='chip'>{item}</span>" for item in filter_chips])}
      </div>
    </div>
    """,
    unsafe_allow_html=True,
)

st.markdown(f"<div class='section-title'>{t('op_overview')}</div>", unsafe_allow_html=True)
core_cards = [
    (t("total_messages"), current_kpis["total_messages"], current_kpis["total_messages"] - previous_kpis["total_messages"], "int", "💬", False, t("tt_total_messages")),
    (t("new_conversations"), current_kpis["new_conversations"], current_kpis["new_conversations"] - previous_kpis["new_conversations"], "int", "🧵", False, ""),
    (
        t("avg_msg_conv"),
        current_kpis["avg_messages_per_conversation"],
        current_kpis["avg_messages_per_conversation"] - previous_kpis["avg_messages_per_conversation"],
        "float",
        "📈",
        False,
        ""
    ),
    (
        t("support_escalations"),
        current_kpis["support_escalation_count"],
        current_kpis["support_escalation_count"] - previous_kpis["support_escalation_count"],
        "int",
        "🆘",
        True,
        t("tt_escalations")
    ),
]
core_cols = st.columns(len(core_cards))
for col, (title, value, delta, kind, icon, inverse_good, tooltip) in zip(core_cols, core_cards):
    with col:
        render_kpi_card(title, value, delta, kind, icon, inverse_good=inverse_good, tooltip=tooltip, delta_label=delta_label)

st.markdown(f"<div class='section-title'>{t('otp_perf')}</div>", unsafe_allow_html=True)
otp_cards = [
    (
        t("disney_customers"),
        current_kpis["disney_customers"],
        current_kpis["disney_customers"] - previous_kpis["disney_customers"],
        "int",
        "🎬",
        False,
        ""
    ),
    (
        t("disney_code_req"),
        current_kpis["disney_code_requests"],
        current_kpis["disney_code_requests"] - previous_kpis["disney_code_requests"],
        "int",
        "🔐",
        False,
        ""
    ),
    (
        t("otp_success"),
        current_kpis["otp_success_count"],
        current_kpis["otp_success_count"] - previous_kpis["otp_success_count"],
        "int",
        "✅",
        False,
        ""
    ),
    (
        t("otp_failed"),
        current_kpis["otp_failed_count"],
        current_kpis["otp_failed_count"] - previous_kpis["otp_failed_count"],
        "int",
        "❌",
        True,
        t("tt_otp_failed")
    ),
    (
        t("otp_unconfirmed"),
        current_kpis["otp_unconfirmed_count"],
        current_kpis["otp_unconfirmed_count"] - previous_kpis["otp_unconfirmed_count"],
        "int",
        "⏳",
        True,
        t("tt_otp_unconfirmed")
    ),
    (
        t("otp_not_sent"),
        current_kpis["otp_not_sent_count"],
        current_kpis["otp_not_sent_count"] - previous_kpis["otp_not_sent_count"],
        "int",
        "📭",
        True,
        t("tt_otp_not_sent")
    ),
]
otp_cols = st.columns(len(otp_cards))
for col, (title, value, delta, kind, icon, inverse_good, tooltip) in zip(otp_cols, otp_cards):
    with col:
        render_kpi_card(title, value, delta, kind, icon, inverse_good=inverse_good, tooltip=tooltip, delta_label=delta_label)

if st.session_state.get("role") == "admin":
    st.markdown(f"<div class='section-title'>{t('token_usage')}</div>", unsafe_allow_html=True)
    token_cards = [
        (t("input_tokens"), current_kpis["input_tokens_total"], current_kpis["input_tokens_total"] - previous_kpis["input_tokens_total"], "token", "⬇️", False, ""),
        (t("output_tokens"), current_kpis["output_tokens_total"], current_kpis["output_tokens_total"] - previous_kpis["output_tokens_total"], "token", "⬆️", False, ""),
        (
            t("avg_input"),
            current_kpis["avg_input_tokens_per_conversation"],
            current_kpis["avg_input_tokens_per_conversation"] - previous_kpis["avg_input_tokens_per_conversation"],
            "float",
            "🧠",
            False,
            ""
        ),
        (
            t("avg_output"),
            current_kpis["avg_output_tokens_per_conversation"],
            current_kpis["avg_output_tokens_per_conversation"] - previous_kpis["avg_output_tokens_per_conversation"],
            "float",
            "🗣️",
            False,
            ""
        ),
    ]
    token_cols = st.columns(len(token_cards))
    for col, (title, value, delta, kind, icon, inverse_good, tooltip) in zip(token_cols, token_cards):
        with col:
            render_kpi_card(title, value, delta, kind, icon, inverse_good=inverse_good, tooltip=tooltip, delta_label=delta_label)

    cost_cards = [
        (t("input_cost"), current_kpis["input_cost"], current_kpis["input_cost"] - previous_kpis["input_cost"], "currency", "💠", True, ""),
        (t("output_cost"), current_kpis["output_cost"], current_kpis["output_cost"] - previous_kpis["output_cost"], "currency", "💠", True, ""),
        (t("total_cost"), current_kpis["total_cost"], current_kpis["total_cost"] - previous_kpis["total_cost"], "currency", "💲", True, ""),
    ]
    cost_cols = st.columns(len(cost_cards))
    for col, (title, value, delta, kind, icon, inverse_good, tooltip) in zip(cost_cols, cost_cards):
        with col:
            render_kpi_card(title, value, delta, kind, icon, inverse_good=inverse_good, tooltip=tooltip, delta_label=delta_label)

st.markdown(f"<div class='section-title'>{t('trends_analytics')}</div>", unsafe_allow_html=True)

chart_config = {"displayModeBar": False, "responsive": True}

row_1_col_1, row_1_col_2 = st.columns([2, 1])
with row_1_col_1:
    with st.container(border=True):
        st.markdown(f"**{t('messages_trend')}**")
        messages_df = events_df[events_df["event_type"].isin(["inbound_message", "outbound_message"])].copy()
        if messages_df.empty:
            render_empty_panel("No message data in the selected period.")
        else:
            messages_df = messages_df.dropna(subset=["event_time"])
            messages_df["direction_group"] = messages_df["direction"].fillna("unknown").replace(
                {"inbound": "Inbound", "outbound": "Outbound"}
            )
            messages_trend = (
                messages_df.set_index("event_time")
                .groupby([pd.Grouper(freq=bucket_rule), "direction_group"])
                .size()
                .reset_index(name="messages")
            )
            fig_messages = px.area(
                messages_trend,
                x="event_time",
                y="messages",
                color="direction_group",
                color_discrete_map={"Inbound": CHART_COLORS["inbound"], "Outbound": CHART_COLORS["outbound"], "unknown": "#94A3B8"},
                labels={"event_time": "Time", "messages": "Messages", "direction_group": "Direction"},
            )
            fig_messages = style_figure(fig_messages, "Messages")
            st.plotly_chart(fig_messages, use_container_width=True, config=chart_config, on_select="rerun")

with row_1_col_2:
    with st.container(border=True):
        st.markdown(f"**{t('new_conv_trend')}**")
        if all_inbound_df.empty:
            render_empty_panel("No inbound conversations available.")
        else:
            first_contact = all_inbound_df.groupby("conversation_id", dropna=True)["event_time"].min()
            first_contact = first_contact[
                (first_contact >= pd.Timestamp(start_utc)) & (first_contact <= pd.Timestamp(end_utc))
            ]
            if first_contact.empty:
                render_empty_panel("No new conversations for this time range.")
            else:
                conv_trend = (
                    first_contact.to_frame(name="first_contact_at")
                    .set_index("first_contact_at")
                    .resample(bucket_rule)
                    .size()
                    .reset_index(name="new_conversations")
                )
                fig_conv = px.bar(
                    conv_trend,
                    x="first_contact_at",
                    y="new_conversations",
                    color_discrete_sequence=[CHART_COLORS["inbound"]],
                    labels={"first_contact_at": "Time", "new_conversations": "New conversations"},
                )
                fig_conv = style_figure(fig_conv, "New conversations")
                st.plotly_chart(fig_conv, use_container_width=True, config=chart_config, on_select="rerun")

row_2_col_1, row_2_col_2 = st.columns([1, 1])
with row_2_col_1:
    with st.container(border=True):
        st.markdown(f"**{t('otp_outcomes')}**")
        otp_df = events_df[events_df["event_type"] == "otp_outcome"].copy()
        if otp_df.empty:
            render_empty_panel("No OTP outcomes in the selected period.")
        else:
            status_counts = (
                otp_df["otp_status"]
                .fillna("unconfirmed")
                .value_counts()
                .reindex(["success", "failed", "unconfirmed", "not_sent"], fill_value=0)
                .rename_axis("status")
                .reset_index(name="count")
            )
            fig_otp = px.bar(
                status_counts,
                x="status",
                y="count",
                color="status",
                color_discrete_map={
                    "success": CHART_COLORS["success"],
                    "failed": CHART_COLORS["failed"],
                    "unconfirmed": CHART_COLORS["unconfirmed"],
                    "not_sent": CHART_COLORS["not_sent"],
                },
                labels={"status": "OTP status", "count": "Count"},
            )
            fig_otp = style_figure(fig_otp, "Outcomes")
            st.plotly_chart(fig_otp, use_container_width=True, config=chart_config, on_select="rerun")

with row_2_col_2:
    with st.container(border=True):
        st.markdown(f"**{t('escalations_trend')}**")
        escalation_df = events_df[events_df["event_type"] == "support_escalation"].copy()
        if escalation_df.empty:
            render_empty_panel("No escalations in the selected period.")
        else:
            escalation_trend = (
                escalation_df.dropna(subset=["event_time"])
                .set_index("event_time")
                .resample(bucket_rule)
                .size()
                .reset_index(name="escalations")
            )
            fig_esc = px.line(
                escalation_trend,
                x="event_time",
                y="escalations",
                markers=True,
                color_discrete_sequence=[CHART_COLORS["escalation"]],
                labels={"event_time": "Time", "escalations": "Escalations"},
            )
            fig_esc = style_figure(fig_esc, "Escalations")
            st.plotly_chart(fig_esc, use_container_width=True, config=chart_config, on_select="rerun")

if st.session_state.get("role") == "admin":
    row_3_col_1, row_3_col_2 = st.columns([1, 1])
    with row_3_col_1:
        with st.container(border=True):
            st.markdown(f"**{t('token_trend')}**")
            if events_df.empty:
                render_empty_panel("No token data for selected period.")
            else:
                token_trend = (
                    events_df.dropna(subset=["event_time"])
                    .set_index("event_time")
                    .resample(bucket_rule)[["token_input", "token_output"]]
                    .sum()
                    .reset_index()
                )
                if token_trend.empty:
                    render_empty_panel("No token data for selected period.")
                else:
                    token_long = token_trend.melt(
                        id_vars=["event_time"],
                        value_vars=["token_input", "token_output"],
                        var_name="token_type",
                        value_name="tokens",
                    )
                    token_long["token_type"] = token_long["token_type"].replace(
                        {"token_input": "Input tokens", "token_output": "Output tokens"}
                    )
                    fig_tokens = px.line(
                        token_long,
                        x="event_time",
                        y="tokens",
                        color="token_type",
                        markers=True,
                        color_discrete_map={
                            "Input tokens": CHART_COLORS["input_tokens"],
                            "Output tokens": CHART_COLORS["output_tokens"],
                        },
                        labels={"event_time": "Time", "tokens": "Tokens", "token_type": ""},
                    )
                    fig_tokens = style_figure(fig_tokens, "Tokens")
                    st.plotly_chart(fig_tokens, use_container_width=True, config=chart_config, on_select="rerun")

    with row_3_col_2:
        with st.container(border=True):
            st.markdown(f"**{t('cost_trend')}**")
            if events_df.empty:
                render_empty_panel("No cost data for selected period.")
            else:
                cost_trend = (
                    events_df.dropna(subset=["event_time"])
                    .set_index("event_time")
                    .resample(bucket_rule)[["token_input", "token_output"]]
                    .sum()
                    .reset_index()
                )
                if cost_trend.empty:
                    render_empty_panel("No cost data for selected period.")
                else:
                    cost_trend["input_cost"] = (cost_trend["token_input"] / 1_000_000) * input_price
                    cost_trend["output_cost"] = (cost_trend["token_output"] / 1_000_000) * output_price
                    cost_trend["total_cost"] = cost_trend["input_cost"] + cost_trend["output_cost"]
                    fig_cost = go.Figure()
                    fig_cost.add_trace(
                        go.Scatter(
                            x=cost_trend["event_time"],
                            y=cost_trend["input_cost"],
                            mode="lines+markers",
                            name="Input cost",
                            line=dict(color=CHART_COLORS["input_cost"], width=2.2),
                        )
                    )
                    fig_cost.add_trace(
                        go.Scatter(
                            x=cost_trend["event_time"],
                            y=cost_trend["output_cost"],
                            mode="lines+markers",
                            name="Output cost",
                            line=dict(color=CHART_COLORS["output_cost"], width=2.2),
                        )
                    )
                    fig_cost.add_trace(
                        go.Scatter(
                            x=cost_trend["event_time"],
                            y=cost_trend["total_cost"],
                            mode="lines+markers",
                            name="Total cost",
                            line=dict(color=CHART_COLORS["total_cost"], width=2.5),
                        )
                    )
                    fig_cost = style_figure(fig_cost, "Cost ($)")
                    st.plotly_chart(fig_cost, use_container_width=True, config=chart_config, on_select="rerun")

st.markdown(f"<div class='section-title'>{t('support_monitoring')}</div>", unsafe_allow_html=True)
with st.container(border=True):
    escalation_table = build_escalation_table(events_df)
    if escalation_table.empty:
        render_empty_panel("No escalated conversations found in the selected period.")
    else:
        st.dataframe(
            escalation_table,
            hide_index=True,
            use_container_width=True,
            column_config={
                "customer_id": st.column_config.TextColumn("Customer"),
                "conversation_id": st.column_config.TextColumn("Conversation ID"),
                "escalation_count": st.column_config.NumberColumn("Escalations", format="%d"),
                "priority": st.column_config.TextColumn("Priority"),
                "escalation_reason": st.column_config.TextColumn("Reason"),
                "first_escalation_at": st.column_config.DatetimeColumn("First escalation"),
                "last_escalation_at": st.column_config.DatetimeColumn("Last escalation"),
                "repeated_support_requests": st.column_config.TextColumn("Pattern"),
                "conversation_reference": st.column_config.LinkColumn("Conversation link"),
            },
        )

st.markdown(f"<div class='section-title'>{t('event_stream')}</div>", unsafe_allow_html=True)
with st.container(border=True):
    if events_df.empty:
        render_empty_panel("No events available for selected filters.")
    else:
        recent_df = events_df[
            [
                "event_time",
                "event_type",
                "conversation_id",
                "customer_id",
                "category",
                "intent",
                "otp_status",
                "escalation_reason",
                "token_input",
                "token_output",
                "event_key",
            ]
        ].head(200)

        event_label_map = {
            "inbound_message": "Inbound message",
            "outbound_message": "Outbound message",
            "conversation_created": "Conversation created",
            "otp_request": "OTP request",
            "otp_outcome": "OTP outcome",
            "support_escalation": "Support escalation",
            "ai_usage": "AI usage",
            "intent_classification": "Intent classified",
        }
        recent_df = recent_df.copy()
        recent_df["event_type"] = recent_df["event_type"].map(event_label_map).fillna(recent_df["event_type"])
        recent_df["otp_status"] = recent_df["otp_status"].fillna("-")
        recent_df["escalation_reason"] = recent_df["escalation_reason"].fillna("-")

        st.dataframe(
            recent_df,
            hide_index=True,
            use_container_width=True,
            column_config={
                "event_time": st.column_config.DatetimeColumn("Time"),
                "event_type": st.column_config.TextColumn("Event"),
                "conversation_id": st.column_config.TextColumn("Conversation ID"),
                "customer_id": st.column_config.TextColumn("Customer"),
                "category": st.column_config.TextColumn("Category"),
                "intent": st.column_config.TextColumn("Intent"),
                "otp_status": st.column_config.TextColumn("OTP status"),
                "escalation_reason": st.column_config.TextColumn("Escalation reason"),
                "token_input": st.column_config.NumberColumn("Input tokens", format="%d"),
                "token_output": st.column_config.NumberColumn("Output tokens", format="%d"),
                "event_key": st.column_config.TextColumn("Event key"),
            },
        )
