#!/usr/bin/env python3
"""Draw the fictional sample captures for the demo and the live check (plan d16-20 step 6).

    python3 scripts/make-sample-captures.py [--today YYYY-MM-DD]

Writes seed/captures/: noteforge-billing.png (billing page screenshot, no cycle stated),
gymbox-invoice.pdf (sparse text PDF: name and amount only), codepilot-receipt.txt and
readloop-trial-email.txt (the same texts as src/lib/seed/captures.ts). Dates use the offsets of
sampleCaptureText(), so redraw before recording the demo. All names, prices and addresses are fictional.
"""
import argparse
import datetime as dt
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent.parent / "seed" / "captures"


def font(size, bold=False):
    for path in ("/System/Library/Fonts/Helvetica.ttc", "/System/Library/Fonts/SFNS.ttf"):
        try:
            return ImageFont.truetype(path, size, index=1 if bold else 0)
        except OSError:
            continue
    return ImageFont.load_default(size)


def human(d: dt.date) -> str:
    return f"{d.strftime('%B')} {d.day}, {d.year}"


def noteforge_png(next_charge: dt.date):
    w, h = 1170, 1400
    img = Image.new("RGB", (w, h), "#f6f7fb")
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, w, 150], fill="#2b2f6b")
    d.text((60, 50), "NoteForge", font=font(56, True), fill="white")
    d.text((60, 210), "Billing", font=font(64, True), fill="#1b1d3a")
    d.rounded_rectangle([60, 320, w - 60, 900], radius=28, fill="white", outline="#dcdfeb", width=3)
    rows = [("Plan", "Pro"), ("Price", "$12.00"), ("Next charge", human(next_charge)), ("Payment", "Card on file")]
    y = 370
    for label, value in rows:
        d.text((110, y), label, font=font(40), fill="#6b6f8a")
        d.text((560, y), value, font=font(44, True), fill="#1b1d3a")
        y += 125
    d.rounded_rectangle([60, 960, w - 60, 1090], radius=28, fill="#2b2f6b")
    d.text((110, 1000), "Manage or cancel plan", font=font(42, True), fill="white")
    d.text((60, 1150), "noteforge.example/billing", font=font(36), fill="#4a4fa3")
    img.save(OUT / "noteforge-billing.png", optimize=True)


def pdf_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def gymbox_pdf():
    lines = [(72, 760, 28, "Gymbox"), (72, 720, 14, "Invoice"), (72, 660, 14, "Membership fee"),
             (400, 660, 14, "39.00"), (72, 620, 14, "Total due: 39.00"), (72, 560, 12, "Thank you.")]
    content = "BT\n" + "".join(f"/F1 {size} Tf 1 0 0 1 {x} {y} Tm ({pdf_escape(t)}) Tj\n" for x, y, size, t in lines) + "ET\n"
    objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        f"<< /Length {len(content.encode())} >>\nstream\n{content}endstream",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for i, obj in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n{obj}\nendobj\n".encode()
    xref = len(out)
    out += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode()
    out += "".join(f"{o:010d} 00000 n \n" for o in offsets).encode()
    out += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    (OUT / "gymbox-invoice.pdf").write_bytes(bytes(out))


def texts(today: dt.date):
    charge = today - dt.timedelta(days=3)
    trial = today + dt.timedelta(days=3)
    (OUT / "codepilot-receipt.txt").write_text(
        "From: billing@codepilot.example\nSubject: Your CodePilot Pro receipt\n\nThanks for your payment.\n"
        f"Date: {charge.isoformat()}\nPlan: CodePilot Pro, monthly\nAccount: me@example.com\nAmount: $25.00 USD\n"
        "Paid with: Business account\n"
    )
    (OUT / "readloop-trial-email.txt").write_text(
        "From: hello@readloop.example\nSubject: Your ReadLoop trial ends in 3 days\n\n"
        f"Your free trial ends on {trial.isoformat()}. After that ReadLoop Plus costs 6.99 EUR per month.\n"
        "Cancel anytime in Settings > Subscription.\n"
    )


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--today", type=dt.date.fromisoformat, default=dt.date.today())
    today = p.parse_args().today
    OUT.mkdir(parents=True, exist_ok=True)
    noteforge_png(today + dt.timedelta(days=28))
    gymbox_pdf()
    texts(today)
    print(f"Wrote {OUT} for today {today.isoformat()}")


if __name__ == "__main__":
    main()
