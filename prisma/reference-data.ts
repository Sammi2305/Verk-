// Reference data seeded into every environment (production included).
// Categories and areas are editable afterwards from the admin dashboard.

export const categories: { slug: string; nameIs: string; nameEn: string; licenseRelevant: boolean; descriptionIs: string }[] = [
  { slug: "pipari", nameIs: "Pípari", nameEn: "Plumber", licenseRelevant: true, descriptionIs: "Lagnir, blöndunartæki, hitakerfi og vatnslagnir." },
  { slug: "rafvirki", nameIs: "Rafvirki", nameEn: "Electrician", licenseRelevant: true, descriptionIs: "Raflagnir, tenglar, ljós og rafmagnstöflur." },
  { slug: "smidur", nameIs: "Smiður", nameEn: "Carpenter", licenseRelevant: false, descriptionIs: "Smíðavinna, innréttingar, gluggar, hurðir og pallar." },
  { slug: "malari", nameIs: "Málari", nameEn: "Painter", licenseRelevant: false, descriptionIs: "Málun innanhúss og utan, sparsl og undirvinna." },
  { slug: "murari", nameIs: "Múrari", nameEn: "Mason", licenseRelevant: false, descriptionIs: "Múrverk, flotun, steypuviðgerðir og hleðsla." },
  { slug: "flisari", nameIs: "Flísari", nameEn: "Tiler", licenseRelevant: false, descriptionIs: "Flísalögn á gólf og veggi, baðherbergi og eldhús." },
  { slug: "duklagningamadur", nameIs: "Dúklagningamaður", nameEn: "Floor layer", licenseRelevant: false, descriptionIs: "Dúkar, parket og önnur gólfefni." },
  { slug: "pipulagningameistari", nameIs: "Pípulagningameistari", nameEn: "Master plumber", licenseRelevant: true, descriptionIs: "Löggiltur meistari sem ber ábyrgð á lagnaverki." },
  { slug: "rafvirkjameistari", nameIs: "Rafvirkjameistari", nameEn: "Master electrician", licenseRelevant: true, descriptionIs: "Löggiltur meistari sem ber ábyrgð á raflagnaverki." },
  { slug: "husasmidameistari", nameIs: "Húsasmíðameistari", nameEn: "Master carpenter", licenseRelevant: true, descriptionIs: "Löggiltur meistari fyrir byggingar- og smíðaverk." },
  { slug: "thakvidgerdir", nameIs: "Þakviðgerðir", nameEn: "Roof repairs", licenseRelevant: false, descriptionIs: "Þakleki, þakjárn, rennur og þakpappi." },
  { slug: "gardyrkja", nameIs: "Garðyrkja", nameEn: "Gardening", licenseRelevant: false, descriptionIs: "Garðsláttur, klipping, hellulögn og garðhönnun." },
  { slug: "jardvinna", nameIs: "Jarðvinna", nameEn: "Groundwork", licenseRelevant: false, descriptionIs: "Gröftur, jöfnun, drenlagnir og undirstöður." },
  { slug: "malmsmidi", nameIs: "Málmsmíði", nameEn: "Metalwork", licenseRelevant: false, descriptionIs: "Handrið, stigar, suða og sérsmíði úr málmi." },
  { slug: "velvirki", nameIs: "Vélvirki", nameEn: "Mechanic", licenseRelevant: false, descriptionIs: "Viðgerðir og viðhald á vélum og búnaði." },
  { slug: "heimilisvidhald", nameIs: "Almennt heimilisviðhald", nameEn: "General home maintenance", licenseRelevant: false, descriptionIs: "Smærri viðgerðir og verk heima fyrir." },
  { slug: "annad", nameIs: "Annað", nameEn: "Other", licenseRelevant: false, descriptionIs: "Verk sem passa ekki í aðra flokka." },
];

// Launch scope is höfuðborgarsvæðið; other areas are added (inactive) so that
// expansion is a configuration change, not a migration.
export const areas: { slug: string; name: string; region: string; active: boolean }[] = [
  { slug: "reykjavik", name: "Reykjavík", region: "Höfuðborgarsvæðið", active: true },
  { slug: "kopavogur", name: "Kópavogur", region: "Höfuðborgarsvæðið", active: true },
  { slug: "hafnarfjordur", name: "Hafnarfjörður", region: "Höfuðborgarsvæðið", active: true },
  { slug: "gardabaer", name: "Garðabær", region: "Höfuðborgarsvæðið", active: true },
  { slug: "mosfellsbaer", name: "Mosfellsbær", region: "Höfuðborgarsvæðið", active: true },
  { slug: "seltjarnarnes", name: "Seltjarnarnes", region: "Höfuðborgarsvæðið", active: true },
  { slug: "kjosarhreppur", name: "Kjósarhreppur", region: "Höfuðborgarsvæðið", active: true },
  { slug: "reykjanesbaer", name: "Reykjanesbær", region: "Suðurnes", active: false },
  { slug: "akranes", name: "Akranes", region: "Vesturland", active: false },
  { slug: "arborg", name: "Árborg (Selfoss)", region: "Suðurland", active: false },
  { slug: "akureyri", name: "Akureyri", region: "Norðurland eystra", active: false },
];

// Proposed launch prices. Admins can change them; they are not business rules.
export const plans = [
  { code: "BASIC" as const, nameIs: "Grunnleið", monthlyPriceIsk: 0, perJobFeeIsk: 990 },
  { code: "PRO" as const, nameIs: "Pro-leið", monthlyPriceIsk: 5990, perJobFeeIsk: 0 },
];
