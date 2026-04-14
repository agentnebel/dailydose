# Designideen für w51-2026

## Zielbild
Die Navigation soll hochwertiger wirken, weniger nach Standard-Buttons aussehen und die Überschriften klar als Markenbestandteil inszenieren.

## 1) Buttons ersetzen: von "technisch" zu "markenstark"

### A. Primäre CTA-Buttons (z. B. "Fernwartung starten", "Kontakt")
- **Form:** Pill-Button (Border-Radius 999px)
- **Größe:** 48px Höhe Desktop, 44px Mobile
- **Typografie:** 600–700 Weight, leichtes Letter-Spacing (0.2px)
- **Look:** Verlauf in Markenfarbe (z. B. Blau -> Cyan) mit dezentem Inner-Glow
- **Hover:** +2px Lift, Schatten intensivieren
- **Active:** 0.98 Scale, Schatten reduzieren
- **Icon optional:** Pfeil oder Remote-Icon links

### B. Sekundäre Buttons (z. B. "Mehr erfahren")
- **Form:** Gleiche Geometrie wie Primärbutton (Konsistenz)
- **Look:** Transparenter Hintergrund + 1.5px Outline in Markenfarbe
- **Hover:** leichte Hintergrundtönung (8-12% Markenfarbe)

### C. Navigation statt klassischer Buttons
Für die Punkte **Über mich, Leistungen, Fernwartung, Partner**:
- Als **Text-Navigation mit Underline-Animation** statt Button-Kacheln
- Aktiver Zustand über farbigen 2px-Indikator unter dem Menüpunkt
- Auf Mobile als "Segmented Control" oder kompaktes Hamburger-Menü

---

## 2) Überschriften besser integrieren

### Hauptheadline: "IT Systemhaus aus Leidenschaft"
- Als **Hero-Headline** mit klarer Hierarchie über dem Fold
- Umsetzungsvorschlag:
  - Zeile 1: "IT Systemhaus"
  - Zeile 2 (Akzentfarbe): "aus Leidenschaft"
- Optional feiner Gradient nur auf dem Akzent-Teil, nicht auf der kompletten Headline
- Max-Breite: 12-14 Wörter pro Zeile für gute Lesbarkeit

### Abschnittsüberschriften
- "Über mich", "Leistungen", "Fernwartung", "Partner" als **Section Titles** im gleichen System:
  - H2: 36/40 (Desktop), 28/32 (Tablet), 24/30 (Mobile)
  - Subline darunter in neutraler Farbe für Kontext
  - Vorangestellte kleine Kategoriezeile (Eyebrow), z. B. "Service", "Profil", "Netzwerk"

### Rhythmus & Abstand
- 80-120px Abstand zwischen Sektionen Desktop, 56-72px Mobile
- Headline -> Subline: 12-16px
- Subline -> CTA: 24-32px

---

## 3) Konkretes Strukturkonzept (Startseite)

1. **Hero**
   - H1: IT Systemhaus aus Leidenschaft
   - Kurztext (Wertversprechen)
   - CTAs: "Fernwartung starten" (primär), "Leistungen" (sekundär)

2. **Über mich**
   - Persönliche Positionierung mit Bild
   - 3 Vertrauensargumente (z. B. Reaktionszeit, Zertifikate, Erfahrung)

3. **Leistungen**
   - Kartenlayout (3-6 Cards) statt langer Fließtexte
   - Pro Karte: Icon, Titel, kurzer Nutzen, Link

4. **Fernwartung**
   - Sehr klarer Prozess in 3 Schritten
   - Sicherheits-Hinweis visuell hervorgehoben
   - Primärbutton konstant sichtbar

5. **Partner**
   - Logo-Grid in Graustufen, Farbe nur bei Hover
   - Optional kurze Referenzzitate

---

## 4) Mini-Styleguide (schnell umsetzbar)
- **Farben:**
  - Primary: #126BFF
  - Accent: #00B8FF
  - Text: #0F172A
  - Muted: #64748B
  - Background: #F8FAFC
- **Typo:** Inter / Manrope
- **Eckenradius:** 14px (Cards), 999px (Buttons)
- **Schatten:** 0 8px 24px rgba(2, 8, 23, 0.12)
- **Transition:** 180ms ease

---

## 5) Drei Designrichtungen zur Auswahl

### Variante 1 – "Clean Corporate"
- Viel Weißraum, klare Linien, hoher Vertrauensfaktor
- Ideal für B2B und konservative Zielgruppen

### Variante 2 – "Tech Premium"
- Dunkler Hintergrund, leuchtende Akzentfarben, starke Kontraste
- Modern, innovativ, deutlich "IT-first"

### Variante 3 – "Persönlich & Nahbar"
- Heller Look, größere Fotos, softere Farben
- Stärkerer Fokus auf "Über mich" und persönliche Betreuung

---

## Empfehlung
Für ein **IT Systemhaus** mit Fokus auf Kompetenz + Vertrauen ist **Variante 1 (Clean Corporate) mit einzelnen Tech-Premium-Akzenten** am sinnvollsten.
So bleiben Seriosität und Conversion stark, ohne austauschbar zu wirken.
