# WagStays — Localization Guide (TR design → EN-CA product)

The Stitch designs are Turkish ("PatiDostu", Istanbul, ₺). The product is **WagStays**, English (Canada),
launching in **Toronto only** (other Canadian cities are enabled later from an admin panel — never hard-code
"Toronto" in logic; read it from the `City` record, copy can say Toronto).

Keep layout, classes, colours, spacing and interactions **identical** to the design. Only text/data changes.
Write natural, warm, native English — not a literal translation. Keep copy length close to the original so
layouts don't shift. Canadian spelling: neighbourhood, colour, favourite, centre, cheque, behaviour, licence (noun).

## Brand terms
| Turkish | English |
|---|---|
| PatiDostu / Pati Dostu (brand) | WagStays |
| PatiKoruma (insurance) | WagShield |
| Pati Dostu Koruma Kalkanı | WagShield Protection |
| PatiPuan / PatiPuan Cüzdanı | WagPoints / WagPoints Wallet |
| Pati Akademi | Wag Academy |
| Aylık Pati Bülteni | The Monthly Wag (newsletter) |
| Süper Bakıcı | Super Sitter |
| Pati Sahibi / Pati Velisi | Pet Parent |
| "2 Pati Sahibi" badge | "2 Pets" |
| Bakıcı | Sitter |
| Bakıcı Ol | Become a Sitter |
| Bakıcı Bul | Find a Sitter |
| Nasıl Çalışır? | How It Works |
| Tanışma (Meet & Greet) | Meet & Greet |
| Takip Kodu #PD-84920 | Tracking code #WS-84920 |
| "Türkiye'nin En Sevilen Pati Platformu" | "Toronto's Most Loved Pet Care Platform" |

## Compliance / trust (Turkey → Canada)
| Turkish | English (Canada) |
|---|---|
| T.C. Kimlik Onaylı / Kimlik Kartı | Government ID Verified / Government-issued photo ID |
| Adli Sicil Kaydı (E-Devlet) | Police Vulnerable Sector Check (issued by your local police service) |
| İlk Yardım Sertifikalı | Pet First Aid & CPR Certified |
| KVKK Aydınlatma Metni | PIPEDA Privacy Notice |
| Kullanım Koşulları / Gizlilik Politikası | Terms of Service / Privacy Policy |
| KDV | HST (Ontario 13%) — prices are shown **before tax**, HST is a separate line |
| Güvenli Havuz Ödemesi | Secure Hold Payments (funds released after you confirm) |
| MasterCard / Visa / Troy | Visa / Mastercard / Amex |
| 3D Secure | 3D Secure (keep) |
| Telefon +90 (532) 412 89 00 | +1 (416) 555-0142 |
| © 2025 PatiDostu Teknolojileri A.Ş. | © 2026 WagStays Technologies Inc. All rights reserved. |
| TR / ₺ TRY (footer chip) | EN / $ CAD |

## Money
Format with `formatMoney()` from `src/lib/format.ts` (en-CA, CAD → "$32" or "$32.00"). Stored as integer cents.

| Design (₺) | WagStays (CAD) |
|---|---|
| Dog walking 180–250₺ / hour | $28–$35 / hour (Sarah: $32 / 60 min) |
| Boarding 450–480₺ / night | $65–$70 / night (Sarah: $70) |
| Day care 300–320₺ / day | $45–$48 / day (Sarah: $48) |
| Drop-in / cat visit 150–160₺ | $22–$24 / visit (Sarah: $24 / 30 min) |
| Vet coverage 35.000₺ / 50.000₺ / 10.000₺ | $5,000 WagShield vet care coverage (use $5,000 everywhere) |
| WagShield fee 25₺ | $3.50 |
| Platform service fee 15₺ | $2.25 |
| PatiPuan balance 50₺ / discount 20₺ | WagPoints balance $7.00 / apply $3.00 off |
| Sitter earnings 15.000–35.000₺ / month | $1,500 – $3,500 / month |
| Average monthly earnings 24.500₺ | $2,450 |
| "Ayda 35.000₺'ye varan" | "up to $3,500 a month" |
| Earnings estimator 28.400₺ (≈ +7.100 weekly) | $2,840 (≈ $710 / week) |
| Welcome bonus 100₺ | $15 |

## Places (Istanbul → Toronto)
| Istanbul | Toronto |
|---|---|
| İstanbul | Toronto, ON |
| Kadıköy / Moda (default search area) | The Beaches |
| Moda Sahil / Moda Sahil Parkı | Woodbine Beach / Kew Gardens |
| Moda & Yoğurtçu Parkı (popular routes) | Kew Gardens & Ashbridges Bay Park |
| Caddebostan | Leslieville |
| Göztepe Parkı | Ashbridges Bay Park |
| Moda İlkokulu | Kew Beach Public School |
| Beşiktaş, Akaretler | Liberty Village |
| Şişli, Bomonti | Roncesvalles |
| Ataşehir | Leaside |
| Caferağa / Fenerbahçe / Osmanağa / Kalamış | Upper Beaches / Leslieville / Riverside / East Danforth |
| Address "Moda Caddesi No:42 D:4, Caferağa / Kadıköy" | "1820 Queen St E, Unit 4, The Beaches, Toronto, ON M4L 1G9" |
| Dates "18 Eki - 22 Eki", "18 Mayıs 2025, Cumartesi" | "Oct 18 – Oct 22", "Saturday, Oct 18, 2026" |
| Times "10:00 - 11:00" | "10:00 – 11:00 AM" |

## People (keep the same photos, swap names)
| Design | WagStays | Notes |
|---|---|---|
| Ayşe Demir (main sitter) | Sarah Mitchell | slug `sarah-mitchell`, The Beaches, 4.99 (86), Super Sitter, certified positive-reinforcement trainer, dog Luna (Golden), U of T Biology grad, APDT + Pet First Aid |
| Mert & Zeynep | Liam & Priya | 4th-year veterinary students, Leslieville |
| Canan K. | Linda K. | full-time animal lover, near Kew Beach Public School |
| Burak Yılmaz | Marcus Bennett | running coach, Ashbridges Bay Park |
| Zeynep K. (home featured) | Olivia K. | vet technician, The Annex |
| Burak S. (home featured) | Ryan S. | first-aid certified, Liberty Village |
| Merve & Emre D. (home featured) | Chloe & Ethan D. | cat experts, Roncesvalles |
| Ece Y. (logged-in owner) | Emily Y. (Emily Young) | demo user, 2 pets |
| Bobi (Golden Retriever) | Maple | 2.5 yrs, male, neutered, microchip 981098103982 |
| Murat Yılmaz (emergency contact, brother) | Daniel Young | |
| Kadıköy Pati Kliniği, Dr. Kemal Aktaş | Kew Paws Veterinary Clinic, Dr. Kevin Walsh · (416) 555-0187 |
| Berk (onboarding consultant) | Jordan Lee | |
| Testimonial Elif Kaya | Jessica Park — "Maple's Mom (Golden Retriever, 3 yrs) • The Beaches" |
| Testimonial Cem Vardarlı (cat Mırmır) | Michael Brooks — "Whiskers' Dad (Tabby, 2 yrs) • Liberty Village" |
| Testimonial Selin & Arda T. (pug Çakıl) | Sophie & Noah T. — "Pebble's Family (Pug, 4 yrs) • Leaside" |
| Review Burak K. (Milo, French Bulldog) | Alex K. |
| Review Zeynep A. (Pamuk & Karamel, cats) | Hannah A. (Cotton & Caramel) |
| Review Murat D. (Rüzgar, Labrador) | David M. (Storm) |
| Sitter applicant Büşra K. (Kadıköy) | Megan R. (Leslieville) |

## Services
| Turkish | English |
|---|---|
| Köpek Gezdirme | Dog Walking |
| Yatılı Ev Bakımı / Yatılı Evde Bakım | Overnight Boarding / In-Home Boarding |
| Gündüz (Pati) Kreşi | Doggy Day Care |
| Kedi & Ev Ziyareti / Ev Ziyareti (Drop-in) | Drop-In Visits / Cat & Home Visits |
| İlaç / Medikal Takip | Medication & Medical Care |
| Pet Taksi | Pet Taxi |
| Küçük / Orta / Büyük / Dev (0–7, 8–18, 19–45, 45+ kg) | Small / Medium / Large / Giant (same kg ranges) |
