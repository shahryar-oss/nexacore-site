// Demo sample data for Fa Schadde van Dooren - Container Dashboard
// NOTE: this is fictional demonstration data only. In the live product this is
// pulled automatically from OMS4Business. Coordinates are real town locations
// (with small offsets per address) so the map renders without a geocoding step.
//
// Service area: Katwijk en omstreken (Bollenstreek / regio Leiden, Zuid-Holland).
// Container types match Schadde van Dooren's actual catalog:
//   Afvalcontainer 3,5 m3 / 6 m3 / 10 m3, Gesloten container 10 m3, Opslagcontainer.
//
// status (boekingsstatus / lifecycle):
//   geboekt -> ingepland -> onderweg -> geleverd -> opgehaald -> afgerond
//   geleverd = container staat op locatie (actieve verhuur).
// agreedDays = afgesproken huurperiode. Een GELEVERDE container waarvan
//   leverdatum + agreedDays in het verleden ligt is "te laat" (nog niet opgehaald).

// Fixed reference "today" so durations stay stable whenever the demo is shown.
const REF_DATE = new Date("2026-06-22T08:00:00");

// Town centre coordinates for the service area - used to place a new booking on
// the map without a geocoding step (the live product geocodes the exact address).
const TOWN_COORDS = {
  "Katwijk": [52.2036, 4.4009],
  "Rijnsburg": [52.1900, 4.4470],
  "Valkenburg": [52.1690, 4.4290],
  "Leiden": [52.1601, 4.4970],
  "Oegstgeest": [52.1786, 4.4700],
  "Noordwijk": [52.2406, 4.4297],
  "Noordwijkerhout": [52.2680, 4.4960],
  "Sassenheim": [52.2230, 4.5210],
  "Voorhout": [52.2230, 4.4870],
  "Warmond": [52.1960, 4.4900],
  "Wassenaar": [52.1450, 4.4020],
  "Voorschoten": [52.1280, 4.4490],
  "Lisse": [52.2580, 4.5570],
  "Leiderdorp": [52.1620, 4.5380],
  "Hillegom": [52.2920, 4.5870],
};

const CONTAINER_TYPES = [
  "Afvalcontainer 3,5 m3",
  "Afvalcontainer 6 m3",
  "Afvalcontainer 10 m3",
  "Gesloten container 10 m3",
  "Opslagcontainer",
];

const CONTAINERS = [
  // ---- Op locatie (geleverd) ----
  { id: "VH-2041", customer: "Bouwbedrijf Van der Plas B.V.", segment: "zakelijk", type: "Afvalcontainer 10 m3", street: "Ambachtsweg 18", postcode: "2222 AH", place: "Katwijk", lat: 52.2061, lng: 4.4061, checkIn: "2026-05-28", agreedDays: 30, status: "geleverd", checkOut: null },
  { id: "VH-2042", customer: "Familie Haasnoot", segment: "particulier", type: "Afvalcontainer 6 m3", street: "Boulevard 92", postcode: "2225 HA", place: "Katwijk", lat: 52.2009, lng: 4.3961, checkIn: "2026-06-15", agreedDays: 3, status: "geleverd", checkOut: null },
  { id: "VH-2043", customer: "Aannemersbedrijf Ouwehand", segment: "zakelijk", type: "Gesloten container 10 m3", street: "Sandtlaan 40", postcode: "2223 GG", place: "Katwijk", lat: 52.2031, lng: 4.4301, checkIn: "2026-06-02", agreedDays: 21, status: "geleverd", checkOut: null },
  { id: "VH-2044", customer: "Familie Van Duijn", segment: "particulier", type: "Afvalcontainer 3,5 m3", street: "Voorstraat 55", postcode: "2225 ER", place: "Katwijk", lat: 52.2042, lng: 4.4012, checkIn: "2026-06-18", agreedDays: 7, status: "geleverd", checkOut: null },
  { id: "VH-2045", customer: "Hoveniersbedrijf De Mooij", segment: "zakelijk", type: "Afvalcontainer 10 m3", street: "Sandtlaan 110", postcode: "2231 CH", place: "Rijnsburg", lat: 52.1901, lng: 4.4471, checkIn: "2026-06-10", agreedDays: 7, status: "geleverd", checkOut: null },
  { id: "VH-2046", customer: "Jeroen van Beelen", segment: "particulier", type: "Afvalcontainer 6 m3", street: "Kanaalstraat 12", postcode: "2231 JA", place: "Rijnsburg", lat: 52.1922, lng: 4.4441, checkIn: "2026-06-20", agreedDays: 3, status: "geleverd", checkOut: null },
  { id: "VH-2047", customer: "Bouwgroep Leiden B.V.", segment: "zakelijk", type: "Afvalcontainer 10 m3", street: "Haarlemmerweg 20", postcode: "2321 JH", place: "Leiden", lat: 52.1601, lng: 4.4901, checkIn: "2026-05-12", agreedDays: 60, status: "geleverd", checkOut: null },
  { id: "VH-2048", customer: "Marloes Schaap", segment: "particulier", type: "Afvalcontainer 3,5 m3", street: "Breestraat 130", postcode: "2311 CV", place: "Leiden", lat: 52.1581, lng: 4.4931, checkIn: "2026-06-16", agreedDays: 14, status: "geleverd", checkOut: null },
  { id: "VH-2049", customer: "Installatiebedrijf Guijt", segment: "zakelijk", type: "Gesloten container 10 m3", street: "Lammenschansweg 140", postcode: "2321 JX", place: "Leiden", lat: 52.1481, lng: 4.4861, checkIn: "2026-04-30", agreedDays: 90, status: "geleverd", checkOut: null },
  { id: "VH-2050", customer: "Kwekerij Van Zonneveld", segment: "zakelijk", type: "Afvalcontainer 10 m3", street: "Sportlaan 8", postcode: "2342 BH", place: "Oegstgeest", lat: 52.1787, lng: 4.4701, checkIn: "2026-06-08", agreedDays: 21, status: "geleverd", checkOut: null },
  { id: "VH-2051", customer: "Sander Kuijt", segment: "particulier", type: "Afvalcontainer 6 m3", street: "Rhijngeesterstraatweg 30", postcode: "2341 BV", place: "Oegstgeest", lat: 52.1801, lng: 4.4671, checkIn: "2026-06-19", agreedDays: 7, status: "geleverd", checkOut: null },
  { id: "VH-2052", customer: "Dakdekkersbedrijf Noordwijk", segment: "zakelijk", type: "Afvalcontainer 10 m3", street: "Gooweg 25", postcode: "2201 EH", place: "Noordwijk", lat: 52.2407, lng: 4.4321, checkIn: "2026-05-22", agreedDays: 45, status: "geleverd", checkOut: null },
  { id: "VH-2053", customer: "Anouk Plug", segment: "particulier", type: "Opslagcontainer", street: "Quarles van Uffordstraat 9", postcode: "2202 NA", place: "Noordwijk", lat: 52.2381, lng: 4.4281, checkIn: "2026-06-13", agreedDays: 30, status: "geleverd", checkOut: null },
  { id: "VH-2054", customer: "Bloembollenbedrijf Van der Zon", segment: "zakelijk", type: "Afvalcontainer 10 m3", street: "Delfweg 14", postcode: "2211 VM", place: "Noordwijkerhout", lat: 52.2681, lng: 4.4961, checkIn: "2026-06-04", agreedDays: 21, status: "geleverd", checkOut: null },
  { id: "VH-2055", customer: "Tom Varkevisser", segment: "particulier", type: "Afvalcontainer 3,5 m3", street: "Zeestraat 41", postcode: "2211 XC", place: "Noordwijkerhout", lat: 52.2661, lng: 4.4991, checkIn: "2026-06-17", agreedDays: 7, status: "geleverd", checkOut: null },
  { id: "VH-2056", customer: "Metselbedrijf Sassenheim", segment: "zakelijk", type: "Gesloten container 10 m3", street: "Hoofdstraat 200", postcode: "2171 BC", place: "Sassenheim", lat: 52.2231, lng: 4.5211, checkIn: "2026-06-01", agreedDays: 14, status: "geleverd", checkOut: null },
  { id: "VH-2057", customer: "Familie Van Rijn", segment: "particulier", type: "Afvalcontainer 6 m3", street: "Herenstraat 7", postcode: "2215 KA", place: "Voorhout", lat: 52.2231, lng: 4.4871, checkIn: "2026-06-21", agreedDays: 5, status: "geleverd", checkOut: null },
  { id: "VH-2058", customer: "Schildersbedrijf Wassenaar", segment: "zakelijk", type: "Afvalcontainer 6 m3", street: "Langstraat 50", postcode: "2242 KN", place: "Wassenaar", lat: 52.1451, lng: 4.4021, checkIn: "2026-05-19", agreedDays: 30, status: "geleverd", checkOut: null },
  { id: "VH-2059", customer: "Rick Hoek", segment: "particulier", type: "Afvalcontainer 3,5 m3", street: "Voorstraat 22", postcode: "2251 BN", place: "Voorschoten", lat: 52.1281, lng: 4.4491, checkIn: "2026-06-14", agreedDays: 14, status: "geleverd", checkOut: null },
  { id: "VH-2060", customer: "Renovatiebedrijf Lisse", segment: "zakelijk", type: "Afvalcontainer 10 m3", street: "Heereweg 80", postcode: "2161 BR", place: "Lisse", lat: 52.2581, lng: 4.5571, checkIn: "2026-06-09", agreedDays: 21, status: "geleverd", checkOut: null },
  { id: "VH-2061", customer: "Bouwbedrijf Van der Bent", segment: "zakelijk", type: "Gesloten container 10 m3", street: "Industrieweg 5", postcode: "2222 BG", place: "Katwijk", lat: 52.2081, lng: 4.4081, checkIn: "2026-03-28", agreedDays: 120, status: "geleverd", checkOut: null },
  { id: "VH-2062", customer: "Lisa Guijt", segment: "particulier", type: "Afvalcontainer 6 m3", street: "Tjalmaweg 3", postcode: "2235 CA", place: "Valkenburg", lat: 52.1691, lng: 4.4291, checkIn: "2026-06-12", agreedDays: 7, status: "geleverd", checkOut: null },

  // ---- Geplande boekingen (nog te leveren) ----
  { id: "VH-2063", customer: "Familie Van der Meij", segment: "particulier", type: "Afvalcontainer 6 m3", street: "Sluisweg 12", postcode: "2225 GP", place: "Katwijk", lat: 52.2049, lng: 4.4039, checkIn: "2026-06-25", agreedDays: 7, status: "geboekt", checkOut: null },
  { id: "VH-2064", customer: "Hoveniersbedrijf Noordwijk Groen", segment: "zakelijk", type: "Afvalcontainer 10 m3", street: "Beeklaan 60", postcode: "2201 BE", place: "Noordwijk", lat: 52.2399, lng: 4.4339, checkIn: "2026-06-24", agreedDays: 14, status: "ingepland", checkOut: null },
  { id: "VH-2065", customer: "Aannemersbedrijf De Bruijn", segment: "zakelijk", type: "Gesloten container 10 m3", street: "Morsweg 110", postcode: "2332 BB", place: "Leiden", lat: 52.1611, lng: 4.4691, checkIn: "2026-06-22", agreedDays: 21, status: "onderweg", checkOut: null },

  // ---- Historisch (opgehaald / afgerond) ----
  { id: "VH-1980", customer: "Bouwbedrijf Van der Plas B.V.", segment: "zakelijk", type: "Afvalcontainer 10 m3", street: "Tramstraat 14", postcode: "2225 CK", place: "Katwijk", lat: 52.2051, lng: 4.4031, checkIn: "2026-02-10", agreedDays: 21, status: "afgerond", checkOut: "2026-03-04" },
  { id: "VH-1981", customer: "Familie Haasnoot", segment: "particulier", type: "Afvalcontainer 6 m3", street: "Zeeweg 60", postcode: "2224 ES", place: "Katwijk", lat: 52.2021, lng: 4.3991, checkIn: "2026-01-22", agreedDays: 14, status: "afgerond", checkOut: "2026-02-05" },
  { id: "VH-1982", customer: "Aannemersbedrijf Ouwehand", segment: "zakelijk", type: "Gesloten container 10 m3", street: "Heerenweg 100", postcode: "2231 CH", place: "Rijnsburg", lat: 52.1881, lng: 4.4451, checkIn: "2025-11-14", agreedDays: 30, status: "afgerond", checkOut: "2025-12-19" },
  { id: "VH-1983", customer: "Mark van Beelen", segment: "particulier", type: "Afvalcontainer 3,5 m3", street: "Kerkstraat 8", postcode: "2225 BX", place: "Katwijk", lat: 52.2038, lng: 4.4002, checkIn: "2026-03-01", agreedDays: 21, status: "afgerond", checkOut: "2026-03-18" },
  { id: "VH-1984", customer: "Bouwgroep Leiden B.V.", segment: "zakelijk", type: "Afvalcontainer 10 m3", street: "Hoge Rijndijk 200", postcode: "2314 AM", place: "Leiden", lat: 52.1561, lng: 4.5101, checkIn: "2025-12-02", agreedDays: 45, status: "afgerond", checkOut: "2026-01-15" },
  { id: "VH-1985", customer: "Installatiebedrijf Guijt", segment: "zakelijk", type: "Gesloten container 10 m3", street: "Vondellaan 50", postcode: "2332 AA", place: "Leiden", lat: 52.1471, lng: 4.4811, checkIn: "2026-02-18", agreedDays: 45, status: "afgerond", checkOut: "2026-04-02" },
  { id: "VH-1986", customer: "Karin van der Plas", segment: "particulier", type: "Afvalcontainer 6 m3", street: "Hoofdstraat 33", postcode: "2201 EA", place: "Noordwijk", lat: 52.2391, lng: 4.4301, checkIn: "2026-04-08", agreedDays: 14, status: "afgerond", checkOut: "2026-04-22" },
  { id: "VH-1987", customer: "Bloembollenbedrijf Van der Zon", segment: "zakelijk", type: "Afvalcontainer 10 m3", street: "Victoriberg 5", postcode: "2211 EX", place: "Noordwijkerhout", lat: 52.2701, lng: 4.4941, checkIn: "2025-10-20", agreedDays: 30, status: "afgerond", checkOut: "2025-11-30" },
  { id: "VH-1988", customer: "Bas Schaap", segment: "particulier", type: "Afvalcontainer 3,5 m3", street: "Dorpsstraat 12", postcode: "2215 KL", place: "Voorhout", lat: 52.2241, lng: 4.4861, checkIn: "2026-03-22", agreedDays: 14, status: "afgerond", checkOut: "2026-04-09" },
  { id: "VH-1989", customer: "Dakdekkersbedrijf Noordwijk", segment: "zakelijk", type: "Afvalcontainer 10 m3", street: "Schoolstraat 18", postcode: "2202 HD", place: "Noordwijk", lat: 52.2421, lng: 4.4261, checkIn: "2025-09-15", agreedDays: 30, status: "afgerond", checkOut: "2025-10-28" },
  { id: "VH-1990", customer: "Familie Van Rijn", segment: "particulier", type: "Afvalcontainer 6 m3", street: "Jacoba van Beierenweg 40", postcode: "2215 KW", place: "Voorhout", lat: 52.2211, lng: 4.4901, checkIn: "2026-04-15", agreedDays: 14, status: "afgerond", checkOut: "2026-05-06" },
];
