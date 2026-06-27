/* NexaCore bilingual layer (EN default / NL Dutch).
 * Runtime text translation + a header EN|NL toggle, persisted in localStorage.
 * Also exposes window.nxcLang() so Nexa replies in the active language. */
(function () {
  "use strict";

  // Exact English string  ->  Dutch (Netherlands). Brand names, emails, phone,
  // KvK/BTW and proper names are intentionally left untranslated.
  var DICT = {
    "Say \"I'll send it Friday\" and Nexa tracks it as a commitment with the deadline — and closes it when you follow through.": "Zeg \"Ik stuur het vrijdag\" en Nexa houdt het bij als toezegging met de deadline — en sluit het af zodra u het nakomt.",
    "Search your whole mailbox or run commands just by asking — \"find Alex's emails about the budget\", \"plan my day\".": "Doorzoek uw hele mailbox of voer opdrachten uit door het simpelweg te vragen — \"vind Alex' e-mails over het budget\", \"plan mijn dag\".",
    "“Whether you need dependable IT support, powerful development, or AI that actually works in the real world,": "“Of u nu betrouwbare IT-ondersteuning, krachtige ontwikkeling of AI nodig heeft die echt werkt in de praktijk,",
    "is your long-term technology partner.“": "is uw langdurige technologiepartner.“",
    "Let’s Build What’s Next": "Laten we bouwen aan wat komt",
    "What’s the the type of your company:": "Wat voor soort bedrijf heeft u:",
    // page title
    "NexaCore — Custom Software, AI & Web Development in Rotterdam": "NexaCore — Maatwerksoftware, AI & Webontwikkeling in Rotterdam",
    "NexaCore — Custom Software, AI & Web Development | Rotterdam": "NexaCore — Maatwerksoftware, AI & Webontwikkeling | Rotterdam",
    // top bar
    "Based in the Netherlands,": "Gevestigd in Nederland,",
    "Rotterdam": "Rotterdam",
    // nav
    "Home": "Home",
    "Why NexaCore": "Waarom NexaCore",
    "Pricing": "Tarieven",
    "Feedback": "Ervaringen",
    "Contact": "Contact",
    // hero
    "Technology that works for you — not the other way around.": "Technologie die voor u werkt — niet andersom.",
    "Tell us what you want to build — a dashboard, an app, an automation, an AI tool — and we . One partner for custom development, AI, and the support to keep it all running.": "Vertel ons wat u wilt bouwen — een dashboard, een app, een automatisering, een AI-tool — en wij . Eén partner voor maatwerkontwikkeling, AI en de ondersteuning om alles draaiende te houden.",
    "design, build, and run it for you in the cloud": "ontwerpen, bouwen en beheren het voor u in de cloud",
    "powering the core of your digital future": "de kern van uw digitale toekomst",
    "Next-Gen Digital Core": "Digitale kern van de nieuwe generatie",
    "Let's Connect": "Neem contact op",
    // why
    "We bridge the gap between and . Whether you’re a startup, a growing company, or an established organization, we meet you where you are — and help you move forward with clarity.": "Wij overbruggen de kloof tussen en . Of u nu een startup, een groeiend bedrijf of een gevestigde organisatie bent — wij sluiten aan bij waar u staat en helpen u met helderheid vooruit.",
    "day-to-day tech needs": "dagelijkse technische behoeften",
    "future-ready innovation": "toekomstbestendige innovatie",
    "Business-first mindset": "Bedrijfsgerichte aanpak",
    "Clear communication, no jargon": "Heldere communicatie, geen jargon",
    "Scalable solutions that grow with you": "Schaalbare oplossingen die met u meegroeien",
    "AI that’s practical, ethical, and effective": "AI die praktisch, ethisch en effectief is",
    // orb
    "Let Nexa inspect your business": "Laat Nexa uw bedrijf inspecteren",
    "Our AI reads your entire website in seconds — technical health, your message, and where AI & automation could help your business. Free and instant.": "Onze AI leest uw hele website in seconden — technische gezondheid, uw boodschap en waar AI en automatisering uw bedrijf kunnen helpen. Gratis en direct.",
    "Inspect my website": "Inspecteer mijn website",
    // philosophy
    "Our Philosophy": "Onze filosofie",
    "At NexaCore, we believe technology should be: • Reliable enough to trust • Flexible enough to adapt • Intelligent enough to create impact We don’t just fix problems — we build systems that prevent them, improve workflows, and unlock new opportunities.": "Bij NexaCore geloven wij dat technologie moet zijn: • Betrouwbaar genoeg om op te vertrouwen • Flexibel genoeg om mee te bewegen • Intelligent genoeg om impact te maken. Wij lossen niet alleen problemen op — wij bouwen systemen die ze voorkomen, werkprocessen verbeteren en nieuwe kansen ontsluiten.",
    "What We Do": "Wat wij doen",
    "IT Support & Infrastructure": "IT-ondersteuning & Infrastructuur",
    "Reliable, proactive support that keeps your business running smoothly and securely. We manage the foundation so you can focus on the future.": "Betrouwbare, proactieve ondersteuning die uw bedrijf soepel en veilig laat draaien. Wij beheren de basis, zodat u zich op de toekomst kunt richten.",
    "Software & Web Development": "Software- & Webontwikkeling",
    "Clean, scalable solutions tailored to your goals. We don't use templates; we build custom digital engines from the ground up.": "Strakke, schaalbare oplossingen afgestemd op uw doelen. Wij gebruiken geen sjablonen; wij bouwen digitale maatwerkoplossingen vanaf de grond op.",
    "AI Training & Automation": "AI-training & Automatisering",
    "Real-world AI implementation that saves time, boosts productivity, and creates a measurable competitive advantage for your team.": "Praktische AI-implementatie die tijd bespaart, de productiviteit verhoogt en uw team een meetbaar concurrentievoordeel geeft.",
    "Brand & Interface Engineering": "Merk- & Interface-engineering",
    "Premium identity and UI/UX design. We align your visual presence with your technical power.": "Premium identiteit en UI/UX-ontwerp. Wij brengen uw visuele uitstraling in lijn met uw technische kracht.",
    // pricing
    "PRICING PLANS": "TARIEVEN",
    "IT Support, Development": "IT-ondersteuning, ontwikkeling",
    "AI Training": "AI-training",
    "Whether you're a startup looking for a boost or an established brand aiming to elevate your presence, we have a plan that fits your goals and budget.": "Of u nu een startup bent die een boost zoekt of een gevestigd merk dat zijn aanwezigheid wil versterken — wij hebben een pakket dat past bij uw doelen en budget.",
    "Essential Plans": "Essentiële pakketten",
    "Advanced Plans": "Geavanceerde pakketten",
    "/month": "/maand",
    "For individuals, startups & small teams": "Voor particulieren, startups en kleine teams",
    "5h Dedicated Remote IT Support": "5 uur toegewijde IT-ondersteuning op afstand",
    "Email & Ticket-Based Support System": "Ondersteuning via e-mail en ticketsysteem",
    "Routine System Maintenance & Updates": "Routinematig systeemonderhoud en updates",
    "Standard Security Best-Practice Guidance": "Standaard advies over beveiliging (best practices)",
    "Minor Website Updates & Bug Fixing": "Kleine website-updates en het oplossen van bugs",
    "Basic CMS & Content Management": "Basis CMS- en contentbeheer",
    "Small-Scale Feature Optimizations": "Kleinschalige functie-optimalisaties",
    "Monthly Introductory AI Consultation": "Maandelijks introducerend AI-consult",
    "Essential AI Tools Overview (ChatGPT/Basics)": "Overzicht van essentiële AI-tools (ChatGPT/basis)",
    "Prompt Engineering Fundamentals": "Basis van prompt-engineering",
    "Guaranteed 48h Response Time": "Gegarandeerde reactietijd van 48 uur",
    "Let’s design a solution": "Laten we een oplossing ontwerpen",
    "For growing businesses that need reliability": "Voor groeiende bedrijven die betrouwbaarheid nodig hebben",
    "15h Priority Remote IT Support": "15 uur IT-ondersteuning op afstand met prioriteit",
    "Proactive System Monitoring & Optimization": "Proactieve systeembewaking en -optimalisatie",
    "Secure Backup & Disaster Recovery Setup": "Veilige back-up en noodherstel-inrichting",
    "Comprehensive Cybersecurity & Health Checks": "Uitgebreide cyberbeveiliging en gezondheidscontroles",
    "Mid-Scope Feature & Web Development": "Middelgrote functie- en webontwikkeling",
    "Advanced API & System Integrations": "Geavanceerde API- en systeemintegraties",
    "Monthly Code Review & UX Enhancements": "Maandelijkse codereview en UX-verbeteringen",
    "Hands-on AI Business Workflow Setup": "Praktische inrichting van AI-werkprocessen",
    "Custom AI Automation (Reports & Emails)": "AI-automatisering op maat (rapporten en e-mails)",
    "AI Strategy for Customer Support": "AI-strategie voor klantenservice",
    "Team AI Training (Up to 5 Members)": "AI-training voor het team (tot 5 personen)",
    "Guaranteed 24h Incident Response": "Gegarandeerde incidentrespons binnen 24 uur",
    "For companies that want full tech & AI leverage": "Voor bedrijven die maximaal willen profiteren van technologie en AI",
    "40h Dedicated Expert Support": "40 uur toegewijde expertondersteuning",
    "Private Dedicated Support Engineer": "Eigen toegewijde support-engineer",
    "24/7 Infrastructure & Incident Monitoring": "24/7 infrastructuur- en incidentbewaking",
    "Advanced Cyber-Compliance & Security": "Geavanceerde cybercompliance en beveiliging",
    "Strategic Infrastructure Planning & Scaling": "Strategische infrastructuurplanning en opschaling",
    "High-End Full-Stack Development": "Hoogwaardige full-stack ontwikkeling",
    "Custom Dashboards & Internal Business Tools": "Dashboards op maat en interne bedrijfstools",
    "Advanced API & Third-Party Architecture": "Geavanceerde API- en externe-integratiearchitectuur",
    "Continuous DevOps & Deployment Support": "Doorlopende DevOps- en deployment-ondersteuning",
    "Bespoke AI Models & Workflow Engineering": "AI-modellen op maat en workflow-engineering",
    "Strategic AI Roadmap & Implementation": "Strategische AI-roadmap en implementatie",
    "Internal AI Assistants (Sales, HR, Ops)": "Interne AI-assistenten (sales, HR, operatie)",
    "Advanced Prompt Engineering & Fine-Tuning": "Geavanceerde prompt-engineering en fine-tuning",
    "Company-Wide AI Training Sessions": "Bedrijfsbrede AI-trainingssessies",
    "Absolute Priority: Same Day / Immediate": "Absolute prioriteit: dezelfde dag / direct",
    "Contact Us": "Neem contact op",
    "For enterprises & special requirements": "Voor ondernemingen en bijzondere wensen",
    "Fully customized IT, development & AI solutions": "Volledig op maat gemaakte IT-, ontwikkel- en AI-oplossingen",
    "On-site support (if required)": "Ondersteuning op locatie (indien nodig)",
    "SLA-based support agreements": "Ondersteuningsovereenkomsten op basis van SLA",
    "Dedicated AI & development team": "Toegewijd AI- en ontwikkelteam",
    "Enterprise security & compliance": "Beveiliging en compliance op ondernemingsniveau",
    "Long-term AI transformation programs": "Langlopende AI-transformatieprogramma's",
    // Ascend
    "★ New · AI career coach": "★ Nieuw · AI-loopbaancoach",
    "Your personal AI career coach. listens, understands where you want to go, and guides you from zero to hero — turning ambition into tracked goals, clear next steps, and visible progress. Built on the evidence for what actually makes coaching work.": "Uw persoonlijke AI-loopbaancoach. luistert, begrijpt waar u naartoe wilt en begeleidt u van nul naar held — ambitie wordt omgezet in concrete doelen, heldere vervolgstappen en zichtbare voortgang. Gebouwd op het bewijs voor wat coaching écht laat werken.",
    "Real coaching conversations": "Echte coachgesprekken",
    "Strengths & values discovery": "Ontdek uw sterke punten & waarden",
    "Goal tracking that works": "Doelen bijhouden die werkt",
    "Your progress, A to Z": "Uw voortgang, van A tot Z",
    "Explore Ascend →": "Ontdek Ascend →",
    "Evidence-based · free to start": "Onderbouwd · gratis te starten",
    // NexaMails
    "★ Our flagship product": "★ Ons vlaggenschipproduct",
    "Meet": "Maak kennis met",
    "Email with an assistant that actually does the work. triages your inbox, drafts replies in your voice, runs your morning briefing, and keeps every promise you make — by click or by voice.": "E-mail met een assistent die het werk écht doet. triageert uw inbox, stelt antwoorden op in uw eigen stijl, verzorgt uw ochtendbriefing en bewaakt elke belofte die u maakt — met één klik of via spraak.",
    "Smart triage": "Slimme triage",
    "Drafts in your voice": "Concepten in uw stijl",
    "Voice mode": "Spraakmodus",
    "Morning brief": "Ochtendbriefing",
    "Explore NexaMails →": "Ontdek NexaMails →",
    "Works with Gmail · 7-day free trial": "Werkt met Gmail · 7 dagen gratis proberen",
    "NexaMails — Inbox": "NexaMails — Inbox",
    "Inbox": "Postvak IN",
    "Starred": "Met ster",
    "Sent": "Verzonden",
    "Drafts": "Concepten",
    "Archive": "Archief",
    "Invoice #2041 is overdue": "Factuur #2041 is verlopen",
    "Urgent": "Urgent",
    "Nexa drafted a reply ✓": "Nexa heeft een antwoord opgesteld ✓",
    "Q3 proposal — your review": "Q3-voorstel — uw beoordeling",
    "Task · Fri": "Taak · vr",
    "Re: kickoff call notes": "Re: notities startgesprek",
    "Reply needed": "Antwoord nodig",
    "Product updates — June": "Productupdates — juni",
    "FYI": "Ter info",
    "Ask Nexa to plan your day…": "Vraag Nexa uw dag te plannen…",
    // reviews
    "OUR REVIEWS": "ONZE REVIEWS",
    "Showing Up": "Tevreden klanten",
    "\"NexaCore ended our downtime issues. Their proactive approach is a game-changer for our stability.\"": "\"NexaCore maakte een einde aan onze storingen. Hun proactieve aanpak is een doorbraak voor onze stabiliteit.\"",
    "COO of a Logistics Startup": "COO van een logistieke startup",
    "\"Practical AI that delivers ROI. We saved 20+ hours a week thanks to their custom automation.\"": "\"Praktische AI die rendement oplevert. Wij besparen 20+ uur per week dankzij hun automatisering op maat.\"",
    "Growth Lead": "Growth Lead",
    "\"They finally gave our tech a visual soul. A brand identity that looks as powerful as our code.\"": "\"Ze gaven onze technologie eindelijk een visuele ziel. Een merkidentiteit die net zo krachtig oogt als onze code.\"",
    // contact
    "Whether you have a question, or want to discuss a potential project, our team at NexaCore is here to help. Please fill out the form below. Visit us at Weena 690, 3012 CN Rotterdam, The Netherlands.": "Of u nu een vraag heeft of een mogelijk project wilt bespreken — ons team bij NexaCore staat voor u klaar. Vul het onderstaande formulier in. Bezoek ons op Weena 690, 3012 CN Rotterdam, Nederland.",
    "Send Message": "Bericht versturen",
    // footer
    "COMPANY": "BEDRIJF",
    "Stories": "Verhalen",
    "© 2026 ALL RIGHTS RESERVED": "© 2026 ALLE RECHTEN VOORBEHOUDEN",
    "REACH OUT TO US": "NEEM CONTACT OP",
    "— a trade name of": "— een handelsnaam van",
    "Privacy": "Privacy",
    "Terms & Conditions / Algemene voorwaarden": "Algemene voorwaarden",
    // chat widget (static parts)
    "New chat": "Nieuw gesprek",
    "Hi, this is Nexa from NexaCore. Thinking of building something? Let's talk it through.": "Hallo, dit is Nexa van NexaCore. Wilt u iets laten bouwen? Laten we het samen bespreken.",
    "Send": "Versturen",
    "✦ Start my project": "✦ Start mijn project",
    "✦ Review my website": "✦ Beoordeel mijn website",
    "What does NexaCore do?": "Wat doet NexaCore?",
    "Tell me about NexaMails": "Vertel me over NexaMails",
    "Service plans": "Servicepakketten",
    "Nexa can scope your project and brief our team. For anything else, email info@nxcore.nl.": "Nexa kan uw project in kaart brengen en ons team informeren. Voor al het andere: e-mail info@nxcore.nl.",
    // --- Elementor-split sentence fragments (each is a separate text node) ---
    "Tell us what you want to build — a dashboard, an app, an automation, an AI tool — and we": "Vertel ons wat u wilt bouwen — een dashboard, een app, een automatisering, een AI-tool — en wij",
    ". One partner for custom development, AI, and the support to keep it all running.": ". Eén partner voor maatwerkontwikkeling, AI en de ondersteuning om alles draaiende te houden.",
    "We bridge the gap between": "Wij overbruggen de kloof tussen",
    "and": "en",
    ". Whether you’re a startup, a growing company, or an established organization, we meet you where you are — and help you move forward with clarity.": ". Of u nu een startup, een groeiend bedrijf of een gevestigde organisatie bent — wij sluiten aan bij waar u staat en helpen u met helderheid vooruit.",
    "Whether you're a startup looking for a boost or an established brand aiming to elevate your presence,": "Of u nu een startup bent die een boost zoekt of een gevestigd merk dat zijn aanwezigheid wil versterken,",
    "we have a plan that fits your goals and budget.": "wij hebben een pakket dat past bij uw doelen en budget.",
    "Email with an assistant that actually does the work.": "E-mail met een assistent die het werk écht doet.",
    "triages your inbox, drafts replies in your voice, runs your morning briefing, and keeps every promise you make — by click or by voice.": "triageert uw inbox, stelt antwoorden op in uw eigen stijl, verzorgt uw ochtendbriefing en bewaakt elke belofte die u maakt — met één klik of via spraak.",
    "Let’s": "Neem",
    "Connect": "contact op",
    "©  2026 ALL RIGHTS RESERVED": "©  2026 ALLE RECHTEN VOORBEHOUDEN",
    "Team Newsletter": "Teamnieuwsbrief",
    "Weena 690, 3012 CN Rotterdam, The Netherlands": "Weena 690, 3012 CN Rotterdam, Nederland",
    "Capabilities": "Mogelijkheden",
    "What's included": "Wat is inbegrepen",
    "Process": "Werkwijze",
    "How we work": "Hoe wij werken",
    "Ready to start?": "Klaar om te beginnen?",
    "Tell us what you have in mind — we'll take it from there.": "Vertel ons wat u in gedachten heeft — wij nemen het vanaf daar over.",
    "More services": "Meer diensten",
    "We build it for you.": "Wij bouwen het voor u.",
    "Custom software and websites, built around your business — never a template.": "Maatwerksoftware en websites, gebouwd rond uw bedrijf — nooit een sjabloon.",
    "Let's build it": "Laten we het bouwen",
    "Tell us what you need to build — a website, a web app, a client portal, an internal dashboard, an automation — and we design, build, and launch it in the cloud. Clean, scalable, and made to fit the way you actually work.": "Vertel ons wat u wilt laten bouwen — een website, een webapp, een klantportaal, een intern dashboard, een automatisering — en wij ontwerpen, bouwen en lanceren het in de cloud. Strak, schaalbaar en gemaakt om aan te sluiten op hoe u werkt.",
    "Custom websites & landing pages": "Websites & landingspagina's op maat",
    "Web applications & dashboards": "Webapplicaties & dashboards",
    "Internal business tools & portals": "Interne bedrijfstools & portalen",
    "API & third-party integrations": "API- & externe integraties",
    "E-commerce & online payments": "E-commerce & online betalingen",
    "Ongoing maintenance & iteration": "Doorlopend onderhoud & doorontwikkeling",
    "We listen & scope": "Wij luisteren & bepalen de scope",
    "We start by understanding your goals, users, and constraints — then map a clear plan.": "We beginnen met inzicht in uw doelen, gebruikers en randvoorwaarden — en stellen dan een helder plan op.",
    "We design & build": "Wij ontwerpen & bouwen",
    "We craft and develop your solution in the cloud, with quality and scalability built in.": "We ontwerpen en ontwikkelen uw oplossing in de cloud, met kwaliteit en schaalbaarheid ingebouwd.",
    "We launch & support": "Wij lanceren & ondersteunen",
    "We ship it, hand it over, and keep it running and improving over time.": "We leveren het op, dragen het over en houden het draaiend en verbeteren het in de loop van de tijd.",
    "Practical AI that saves real hours.": "Praktische AI die echt uren bespaart.",
    "Down-to-earth AI — automating the repetitive work and training your team to use it well.": "Nuchtere AI — het automatiseren van repetitief werk en uw team trainen om het goed te gebruiken.",
    "Let's put AI to work": "Laten we AI aan het werk zetten",
    "We bring AI back to reality: automating repetitive work, building assistants around your processes, and training your team to use modern tools confidently. Measurable results, ethically implemented — not hype.": "Wij brengen AI terug naar de realiteit: repetitief werk automatiseren, assistenten bouwen rond uw processen en uw team trainen om moderne tools met vertrouwen te gebruiken. Meetbare resultaten, ethisch geïmplementeerd — geen hype.",
    "Workflow automation (reports, emails, data)": "Workflow-automatisering (rapporten, e-mails, data)",
    "Custom AI assistants for your business": "AI-assistenten op maat voor uw bedrijf",
    "Process & document automation": "Proces- & documentautomatisering",
    "Hands-on team training & workshops": "Praktische teamtraining & workshops",
    "AI strategy & roadmap": "AI-strategie & roadmap",
    "Responsible, practical implementation": "Verantwoorde, praktische implementatie",
    "Find the time-sinks": "Vind de tijdvreters",
    "We map where AI can save your team the most time and effort.": "We brengen in kaart waar AI uw team de meeste tijd en moeite kan besparen.",
    "Build & integrate": "Bouwen & integreren",
    "We build the automations and assistants into your real workflow.": "We bouwen de automatiseringen en assistenten in uw echte workflow in.",
    "Train & measure": "Trainen & meten",
    "We train your team and track the hours and value you get back.": "We trainen uw team en houden de uren en waarde bij die u terugkrijgt.",
    "Technology that just works.": "Technologie die gewoon werkt.",
    "Reliable, proactive IT — so you can focus on your business, not your systems.": "Betrouwbare, proactieve IT — zodat u zich op uw bedrijf kunt richten, niet op uw systemen.",
    "Let's stabilize your tech": "Laten we uw techniek stabiliseren",
    "We manage the technology foundation your business runs on: proactively, securely, and around the clock. From day-to-day support to cloud infrastructure, we keep your systems stable so problems are prevented, not patched.": "Wij beheren de technologische basis waarop uw bedrijf draait: proactief, veilig en de klok rond. Van dagelijkse ondersteuning tot cloudinfrastructuur — we houden uw systemen stabiel, zodat problemen worden voorkomen in plaats van opgelapt.",
    "Proactive monitoring & maintenance": "Proactieve monitoring & onderhoud",
    "Helpdesk & ticket-based support": "Helpdesk & ondersteuning via tickets",
    "Security, backups & disaster recovery": "Beveiliging, back-ups & noodherstel",
    "Cloud setup & management": "Cloud-inrichting & beheer",
    "System updates & patching": "Systeemupdates & patching",
    "Performance & cost optimization": "Prestatie- & kostenoptimalisatie",
    "Audit": "Audit",
    "We review your current setup and find the gaps, risks, and quick wins.": "We beoordelen uw huidige opzet en vinden de hiaten, risico's en quick wins.",
    "Stabilize & secure": "Stabiliseren & beveiligen",
    "We harden, back up, and bring everything to a reliable baseline.": "We verstevigen, maken back-ups en brengen alles naar een betrouwbaar basisniveau.",
    "Monitor & support": "Monitoren & ondersteunen",
    "We keep watch continuously and are there when you need us.": "We houden continu de wacht en zijn er wanneer u ons nodig heeft.",
    "Look as powerful as you are.": "Oog zo krachtig als u bent.",
    "A premium identity and interface that matches the strength of your technology.": "Een premium identiteit en interface die past bij de kracht van uw technologie.",
    "Let's elevate your brand": "Laten we uw merk naar een hoger niveau tillen",
    "We align how your business looks with how it works — crafting brand identity and clean, modern UI/UX so your product and presence feel as capable as they truly are.": "Wij brengen hoe uw bedrijf eruitziet in lijn met hoe het werkt — met merkidentiteit en strak, modern UI/UX-ontwerp, zodat uw product en uitstraling net zo capabel aanvoelen als ze werkelijk zijn.",
    "Brand identity & visual systems": "Merkidentiteit & visuele systemen",
    "UI/UX & product design": "UI/UX- & productontwerp",
    "Website & app interface design": "Website- & app-interfaceontwerp",
    "Design systems & guidelines": "Designsystemen & richtlijnen",
    "Interactive prototyping": "Interactief prototypen",
    "Visual content & assets": "Visuele content & assets",
    "Understand": "Begrijpen",
    "We get to know your brand, your audience, and what sets you apart.": "We leren uw merk, uw publiek en uw onderscheidend vermogen kennen.",
    "Design & prototype": "Ontwerpen & prototypen",
    "We craft the identity and interfaces, and prototype the experience.": "We maken de identiteit en interfaces en prototypen de ervaring.",
    "Deliver & evolve": "Opleveren & doorontwikkelen",
    "We hand over polished assets and refine as you grow.": "We dragen verzorgde assets over en verfijnen naarmate u groeit.",
    "A NexaCore Product": "Een NexaCore-product",
    "Start your free trial": "Start uw gratis proefperiode",
    "See what it does": "Bekijk wat het doet",
    "7 days of Ultimate, free · cancel anytime": "7 dagen Ultimate, gratis · altijd opzegbaar",
    "Works with Gmail today — more inboxes coming soon": "Werkt vandaag met Gmail — meer inboxen volgen binnenkort",
    "Already have an account?": "Heeft u al een account?",
    "Sign in": "Inloggen",
    "NexaMails is an": "NexaMails is een",
    "AI-powered, executive-assistant email client": "AI-gedreven e-mailclient als persoonlijke assistent",
    "— an Outlook-style three-pane inbox with": "— een Outlook-achtige inbox met drie panelen met",
    ", an assistant that knows your contacts, learns your writing, and helps you reply faster and stay on top of everything. Built for Gmail today, with more providers on the way.": ", een assistent die uw contacten kent, uw schrijfstijl leert en u helpt sneller te antwoorden en overal grip op te houden. Vandaag gebouwd voor Gmail, met meer providers op komst.",
    "What NexaMails does for you": "Wat NexaMails voor u doet",
    "Smart inbox triage": "Slimme inbox-triage",
    "Nexa reads every email and colour-codes it — Urgent, Reply needed, Task, FYI, Receipt, Newsletter — so what matters is obvious at a glance.": "Nexa leest elke e-mail en geeft hem een kleurcode — Urgent, Antwoord nodig, Taak, Ter info, Bon, Nieuwsbrief — zodat in één oogopslag duidelijk is wat belangrijk is.",
    "One tap and Nexa writes a reply that sounds like you, with instant tone controls — shorter, warmer, more formal, or translated.": "Eén tik en Nexa schrijft een antwoord dat klinkt als u, met directe toonregeling — korter, warmer, formeler of vertaald.",
    "Talk to it — voice mode": "Praat ermee — spraakmodus",
    "Have a real two-way conversation. Draft replies, create tasks, schedule meetings hands-free — in your language.": "Voer een echt tweegesprek. Stel antwoorden op, maak taken aan en plan vergaderingen handsfree — in uw taal.",
    "Daily morning brief": "Dagelijkse ochtendbriefing",
    "Open Nexa and get a head-start: overnight mail, today's meetings, open tasks and due promises in one short brief.": "Open Nexa en begin met een voorsprong: nachtelijke mail, de vergaderingen van vandaag, openstaande taken en vervallende beloftes in één korte briefing.",
    "Never drop a promise": "Laat nooit een belofte vallen",
    "Tasks, Calendar & Contacts": "Taken, Agenda & Contacten",
    "A full To-Do manager, your Google Calendar, and an auto-built contact book — all in one place, all aware of your mail.": "Een volledige takenbeheerder, uw Google Agenda en een automatisch opgebouwd adresboek — allemaal op één plek, allemaal op de hoogte van uw mail.",
    "Ask in plain English": "Vraag het in gewone taal",
    "Learns you over time": "Leert u na verloop van tijd kennen",
    "Nexa remembers the facts you tell it and learns your writing style, getting more useful the longer you use it.": "Nexa onthoudt de feiten die u deelt en leert uw schrijfstijl — en wordt nuttiger naarmate u het langer gebruikt.",
    "Private & honest": "Privé & eerlijk",
    "Your mailbox is yours — never shared. Nexa won't invent facts or send anything on its own, and every draft shows its sources.": "Uw mailbox is van u — wordt nooit gedeeld. Nexa verzint geen feiten en verstuurt niets uit zichzelf, en elk concept toont zijn bronnen.",
    "How it works": "Hoe het werkt",
    "Up and running in minutes": "Binnen enkele minuten startklaar",
    "Connect your inbox": "Koppel uw inbox",
    "Sign in with Google in seconds — Gmail and Calendar are wired in instantly.": "Log in seconden in met Google — Gmail en Agenda worden direct gekoppeld.",
    "Nexa gets to work": "Nexa gaat aan de slag",
    "It triages your inbox, learns your style, and surfaces what needs you.": "Het triageert uw inbox, leert uw stijl en haalt naar voren wat uw aandacht nodig heeft.",
    "Fly through your day": "Vlieg door uw dag",
    "Reply in your voice, track promises, run your morning brief — by voice or click.": "Antwoord in uw eigen stijl, volg beloftes en draai uw ochtendbriefing — met spraak of klik.",
    "Choose your plan": "Kies uw pakket",
    "Card required upfront.": "Creditcard vooraf vereist.",
    "7 days of Ultimate, free.": "7 dagen Ultimate, gratis.",
    "Cancel anytime.": "Altijd opzegbaar.",
    "/ month": "/ maand",
    "Email plus an assistant that actually knows your inbox.": "E-mail plus een assistent die uw inbox écht kent.",
    "Chat with Nexa about your email, calendar & contacts": "Chat met Nexa over uw e-mail, agenda & contacten",
    "Nexa drafts replies in your voice": "Nexa stelt antwoorden op in uw eigen stijl",
    "Create meetings just by typing": "Plan vergaderingen door simpelweg te typen",
    "Outlook-style 3-pane inbox with instant search": "Outlook-achtige inbox met 3 panelen en directe zoekfunctie",
    "Pin your VIPs so they never get lost": "Pin uw VIP's zodat ze nooit verloren gaan",
    "Snooze threads for later": "Stel gesprekken uit voor later",
    "Start 7-day trial": "Start proefperiode van 7 dagen",
    "Most popular": "Meest gekozen",
    "Everything in Basic, plus Nexa keeps you accountable.": "Alles uit Basic, plus Nexa houdt u bij de les.",
    "Everything in Basic": "Alles uit Basic",
    "To-dos pulled out of your email automatically": "Taken automatisch uit uw e-mail gehaald",
    "Promises tracker — never miss a commitment you made": "Beloftestracker — mis nooit een toezegging die u heeft gedaan",
    "Daily morning briefing, delivered at 7am": "Dagelijkse ochtendbriefing, geleverd om 7 uur",
    "Smart folders — save any search as one click": "Slimme mappen — sla elke zoekopdracht op als één klik",
    "Everything in Pro, plus Nexa reads attachments & talks back.": "Alles uit Pro, plus Nexa leest bijlagen & praat terug.",
    "Everything in Pro": "Alles uit Pro",
    "Nexa reads your attachments — PDF, Word, Excel, CSV": "Nexa leest uw bijlagen — PDF, Word, Excel, CSV",
    "Deep search across your whole mail history": "Diepe zoekfunctie door uw hele mailgeschiedenis",
    "Voice mode — talk to Nexa hands-free": "Spraakmodus — praat handsfree met Nexa",
    "Priority support, answered same business day": "Ondersteuning met prioriteit, dezelfde werkdag beantwoord",
    "Prices in EUR, billed monthly. VAT added at checkout where required.": "Prijzen in euro's, maandelijks gefactureerd. Btw wordt waar nodig bij het afrekenen toegevoegd.",
    "Your 7-day Ultimate trial starts immediately — you won't be charged until day 8.": "Uw gratis Ultimate-proefperiode van 7 dagen start direct — u wordt pas op dag 8 in rekening gebracht.",
    "Ready to tame your inbox?": "Klaar om uw inbox te temmen?",
    "Try NexaMails free for 7 days — your inbox, with an assistant that does the heavy lifting.": "Probeer NexaMails 7 dagen gratis — uw inbox, met een assistent die het zware werk doet.",
    "powering the core of your digital future.": "de kern van uw digitale toekomst.",
    "First Name:": "Voornaam:",
    "Last Name:": "Achternaam:",
    "Email:": "E-mail:",
    "What's the the type of your company:": "Wat voor soort bedrijf heeft u:",
    "Banking": "Bankwezen",
    "Agency": "Bureau",
    "Business": "Bedrijf",
    "Other": "Anders",
    "What do you need from us?": "Wat heeft u van ons nodig?",
    "Cloud Services": "Clouddiensten",
    "Budget:": "Budget:",
    "Message:": "Bericht:",
    "Click the box and agree to our terms and condition": "Vink het vakje aan en ga akkoord met onze algemene voorwaarden",
    "Get Started": "Aan de slag",
    "Common Inquiries,": "Veelgestelde vragen,",
    "Core Answers": "Kernantwoorden",
    "Explore how NexaCore synchronizes IT infrastructure, custom development, and AI intelligence to power your digital momentum.": "Ontdek hoe NexaCore IT-infrastructuur, maatwerkontwikkeling en AI-intelligentie samenbrengt om uw digitale vaart te versnellen.",
    "How does NexaCore integrate AI into existing business workflows?": "Hoe integreert NexaCore AI in bestaande bedrijfsprocessen?",
    "We don't just provide tools; we engineer custom AI roadmaps. Our process starts with identifying repetitive bottlenecks and then deploying tailored automation and internal AI assistants that work alongside your team, not against them.": "We leveren niet zomaar tools; we bouwen AI-roadmaps op maat. Ons proces begint met het identificeren van repetitieve knelpunten en vervolgens het inzetten van automatisering op maat en interne AI-assistenten die met uw team meewerken, niet ertegen.",
    "What makes your \"Identity Engineering\" different from a standard design agency?": "Wat maakt uw \"Identity Engineering\" anders dan een standaard ontwerpbureau?",
    "Most agencies focus only on aesthetics. At NexaCore, we align your visual brand with your technical infrastructure. We ensure your UI/UX is as high-performance as the backend code powering it, creating a unified \"Digital Core.\"": "De meeste bureaus richten zich alleen op esthetiek. Bij NexaCore brengen we uw visuele merk in lijn met uw technische infrastructuur. We zorgen dat uw UI/UX net zo presteert als de backendcode erachter, en creëren zo één verenigde \"Digital Core.\"",
    "Do I need technical expertise to benefit from your AI Training plans?": "Heb ik technische kennis nodig om te profiteren van uw AI-trainingspakketten?",
    "Not at all. Our plans are designed for various levels—from founders who need a strategic overview to technical teams requiring advanced prompt engineering. We translate complex AI concepts into practical, jargon-free business advantages.": "Helemaal niet. Onze pakketten zijn ontworpen voor verschillende niveaus — van oprichters die een strategisch overzicht nodig hebben tot technische teams die geavanceerde prompt-engineering vereisen. We vertalen complexe AI-concepten naar praktische, jargonvrije zakelijke voordelen.",
    "How do you handle custom development without using templates?": "Hoe pakt u maatwerkontwikkeling aan zonder sjablonen te gebruiken?",
    "Every project starts from a clean slate. We build scalable, custom digital engines using modern stacks that are specifically optimized for your business goals, ensuring you aren't limited by the constraints of \"one-size-fits-all\" templates.": "Elk project begint met een schone lei. We bouwen schaalbare, digitale maatwerkoplossingen met moderne technologie die specifiek is geoptimaliseerd voor uw bedrijfsdoelen, zodat u niet wordt beperkt door \"one-size-fits-all\"-sjablonen.",
    "Can I upgrade or customize my plan as my company grows?": "Kan ik mijn pakket upgraden of aanpassen naarmate mijn bedrijf groeit?",
    "Growth is part of our DNA. NexaCore is built to be scalable. You can shift between plans or request a \"Custom Architecture\" as your infrastructure needs and AI ambitions evolve.": "Groei zit in ons DNA. NexaCore is gebouwd om schaalbaar te zijn. U kunt wisselen tussen pakketten of een \"Custom Architecture\" aanvragen naarmate uw infrastructuurbehoeften en AI-ambities evolueren.",
  };
  // suggestion-chip prompts (the actual message sent when a chip is clicked) —
  // must be translated too, else clicking a Dutch chip sends English and Nexa replies in English.
  var PROMPTS = {
    "I'd like to build something — can you help me figure out what I need?": "Ik wil graag iets laten bouwen — kunnen jullie me helpen uitzoeken wat ik nodig heb?",
    "Can you take a look at my website and tell me what to improve and where AI could help my business?": "Kunnen jullie naar mijn website kijken en me vertellen wat ik kan verbeteren en waar AI mijn bedrijf kan helpen?",
    "What does NexaCore do?": "Wat doet NexaCore?",
    "Tell me about NexaMails.": "Vertel me over NexaMails.",
    "What are your service plans?": "Wat zijn jullie servicepakketten?"
  };
  // placeholder attribute translations
  var PH = {
    "Name": "Naam", "E-mail": "E-mail", "Phone": "Telefoon", "Message": "Bericht",
    "Tell me what you'd like to build, or ask anything…": "Vertel ons wat u wilt bouwen, of stel een vraag…",
    "Reply to Nexa…": "Antwoord Nexa…",
    "John": "Jan",
    "Carter": "Jansen",
    "Johncarter@gmail.com": "janjansen@gmail.com"
  };

  // Some elements (e.g. the animated "Our Philosophy" text) split every CHARACTER
  // into its own span, so per-text-node matching can't work. Translate those as
  // whole blocks: match the element by its normalized full text, swap innerHTML.
  var BLOCKS = [
    {
      en: "At NexaCore, we believe technology should be: • Reliable enough to trust • Flexible enough to adapt • Intelligent enough to create impact We don’t just fix problems — we build systems that prevent them, improve workflows, and unlock new opportunities.",
      nl: "Bij NexaCore geloven wij dat technologie moet zijn: • Betrouwbaar genoeg om op te vertrouwen • Flexibel genoeg om mee te bewegen • Intelligent genoeg om impact te maken. Wij lossen niet alleen problemen op — wij bouwen systemen die ze voorkomen, werkprocessen verbeteren en nieuwe kansen ontsluiten."
    }
  ];
  function norm(s) { return String(s || "").replace(/\s+/g, " ").trim(); }
  function blocksNL() {
    BLOCKS.forEach(function (b) {
      var enN = norm(b.en);
      var els = document.querySelectorAll("p,div,span,h1,h2,h3,h4");
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        if (el.hasAttribute("data-nxc-blk")) continue;
        if (norm(el.textContent) !== enN) continue;
        var childMatch = false;
        for (var c = 0; c < el.children.length; c++) { if (norm(el.children[c].textContent) === enN) { childMatch = true; break; } }
        if (childMatch) continue; // not the tightest container
        el.setAttribute("data-nxc-blk", "1");
        el.__blkEN = el.innerHTML;
        el.textContent = b.nl;
        break;
      }
    });
  }
  function blocksEN() {
    document.querySelectorAll("[data-nxc-blk]").forEach(function (el) {
      if (el.__blkEN !== undefined) { el.innerHTML = el.__blkEN; el.__blkEN = undefined; }
      el.removeAttribute("data-nxc-blk");
    });
  }

  var LS = "nxc_lang";
  function current() { try { return localStorage.getItem(LS) === "nl" ? "nl" : "en"; } catch (e) { return "en"; } }
  window.nxcLang = current;

  // Whitespace-normalized lookup so nodes with internal newlines/tabs still match.
  var NDICT = {};
  for (var k in DICT) if (DICT.hasOwnProperty(k)) NDICT[k.replace(/\s+/g, " ").trim()] = DICT[k];

  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, CODE: 1 };
  function walkText(fn) {
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.parentNode || SKIP[n.parentNode.nodeName]) return NodeFilter.FILTER_REJECT;
        // skip live chat messages (dynamic Nexa replies)
        if (n.parentNode.closest && n.parentNode.closest("#nexaMessages")) return NodeFilter.FILTER_REJECT;
        return n.nodeValue && n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var node; while ((node = w.nextNode())) fn(node);
  }

  function toNL() {
    walkText(function (n) {
      var raw = n.nodeValue;
      var norm = raw.replace(/\s+/g, " ").trim();
      if (NDICT[norm] != null && n.__en === undefined) {
        n.__en = raw;
        var lead = (raw.match(/^\s*/) || [""])[0], trail = (raw.match(/\s*$/) || [""])[0];
        n.nodeValue = lead + NDICT[norm] + trail;
      }
    });
    document.querySelectorAll("[placeholder]").forEach(function (el) {
      var v = el.getAttribute("placeholder"); if (PH[v] != null) { el.__enPh = v; el.setAttribute("placeholder", PH[v]); }
    });
    document.querySelectorAll('input[type="submit"]').forEach(function (el) {
      var v = el.value; if (DICT[v] != null) { el.__enVal = v; el.value = DICT[v]; }
    });
    document.querySelectorAll("[data-prompt]").forEach(function (el) {
      var v = el.getAttribute("data-prompt"); if (PROMPTS[v] != null) { el.__enPrompt = v; el.setAttribute("data-prompt", PROMPTS[v]); }
    });
    if (DICT[document.title]) { document.title = DICT[document.title]; }
    document.documentElement.setAttribute("lang", "nl");
  }
  function toEN() {
    walkText(function (n) { if (n.__en !== undefined) { n.nodeValue = n.__en; n.__en = undefined; } });
    document.querySelectorAll("[placeholder]").forEach(function (el) { if (el.__enPh !== undefined) { el.setAttribute("placeholder", el.__enPh); el.__enPh = undefined; } });
    document.querySelectorAll('input[type="submit"]').forEach(function (el) { if (el.__enVal !== undefined) { el.value = el.__enVal; el.__enVal = undefined; } });
    document.querySelectorAll("[data-prompt]").forEach(function (el) { if (el.__enPrompt !== undefined) { el.setAttribute("data-prompt", el.__enPrompt); el.__enPrompt = undefined; } });
    document.documentElement.setAttribute("lang", "en");
  }

  function syncNexa(lang) {
    // Tell Nexa which language to start in (it still mirrors whatever the visitor writes).
    if (window.NEXA && typeof window.NEXA === "object") window.NEXA.rest = "/api/nexa?lang=" + lang;
  }
  // Legal pages (privacy/terms) ship with both languages in .nxc-legal[data-lang]
  // containers + their own EN/NL switch. Drive them from the site-wide language.
  function syncLegal(lang) {
    document.querySelectorAll(".nxc-legal[data-lang]").forEach(function (root) {
      root.style.display = "";                 // undo any earlier bad inline hide
      root.setAttribute("data-lang", lang);    // the page's CSS shows the matching language
      root.querySelectorAll(".nxc-lang button[data-lang]").forEach(function (b) { b.classList.toggle("is-active", b.getAttribute("data-lang") === lang); });
    });
  }
  // The ".reveal-type" heading is split into per-character spans by the theme
  // (SplitType + GSAP scroll-fill). Capture its plain text in both languages
  // BEFORE the theme splits it, so an in-place toggle can re-create the effect.
  function captureReveal() {
    document.querySelectorAll(".reveal-type").forEach(function (el) {
      if (el.__txtEN !== undefined) return;
      var en = el.textContent;
      el.__txtEN = en;
      el.__txtNL = NDICT[en.replace(/\s+/g, " ").trim()] || en;
    });
  }
  // Re-run the scroll-fill effect on the chosen language (used on toggle only —
  // at first load the theme's own main.js does the initial split).
  function reinitReveal(lang) {
    if (!window.SplitType || !window.gsap) return;
    document.querySelectorAll(".reveal-type").forEach(function (el) {
      var want = (lang === "nl") ? el.__txtNL : el.__txtEN;
      if (want === undefined) return;
      // Replace with a FRESH clone: SplitType caches an element's original text,
      // so re-splitting the same node would revert to the load-time language.
      var fresh = el.cloneNode(false);
      fresh.__txtEN = el.__txtEN; fresh.__txtNL = el.__txtNL;
      fresh.textContent = want;
      if (window.ScrollTrigger) window.ScrollTrigger.getAll().forEach(function (st) { if (st.trigger === el) st.kill(); });
      el.parentNode.replaceChild(fresh, el);
      var t = new window.SplitType(fresh, { types: "chars, words" });
      window.gsap.from(t.chars, {
        scrollTrigger: { opacity: 1, trigger: fresh, start: "top 80%", end: "top -10%", scrub: true, marker: false },
        opacity: 0.2, stagger: 0.5,
      });
    });
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  function apply(lang) { if (lang === "nl") toNL(); else toEN(); paintToggle(lang); syncNexa(lang); syncLegal(lang); }

  // Instant in-place language switch (no page reload).
  function setLang(lang) {
    try { localStorage.setItem(LS, lang); } catch (e) {}
    toEN();                       // restore EN baseline for all normal text
    if (lang === "nl") toNL();    // then apply target language
    paintToggle(lang); syncNexa(lang); syncLegal(lang);
    reinitReveal(lang);           // re-create the scroll-fill effect in the new language
  }

  // ---- toggle UI ----
  function buildToggle() {
    var wrap = document.createElement("div");
    wrap.id = "nxcLang";
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", "Language");
    var FLAG_US = '<svg class="nxc-flag" viewBox="0 0 18 12" aria-hidden="true">' +
      '<rect width="18" height="12" fill="#fff"/>' +
      '<g fill="#B22234"><rect width="18" height="1.7"/><rect y="3.4" width="18" height="1.7"/><rect y="6.8" width="18" height="1.7"/><rect y="10.3" width="18" height="1.7"/></g>' +
      '<rect width="8" height="6.8" fill="#3C3B6E"/>' +
      '<g fill="#fff"><circle cx="2" cy="1.6" r=".5"/><circle cx="4" cy="1.6" r=".5"/><circle cx="6" cy="1.6" r=".5"/><circle cx="3" cy="3.4" r=".5"/><circle cx="5" cy="3.4" r=".5"/><circle cx="2" cy="5.2" r=".5"/><circle cx="4" cy="5.2" r=".5"/><circle cx="6" cy="5.2" r=".5"/></g></svg>';
    var FLAG_NL = '<svg class="nxc-flag" viewBox="0 0 18 12" aria-hidden="true">' +
      '<rect width="18" height="12" fill="#fff"/><rect width="18" height="4" fill="#AE1C28"/><rect y="8" width="18" height="4" fill="#21468B"/></svg>';
    wrap.innerHTML =
      '<button data-l="en" type="button">' + FLAG_US + 'EN</button>' +
      '<span class="nxc-l-sep">/</span>' +
      '<button data-l="nl" type="button">' + FLAG_NL + 'NL</button>';
    var css = document.createElement("style");
    css.textContent =
      '#nxcLang{display:inline-flex;align-items:center;gap:2px;font-family:inherit;vertical-align:middle;margin-left:14px}' +
      '#nxcLang button{display:inline-flex;align-items:center;gap:6px;background:none;border:0;cursor:pointer;font:inherit;font-size:13px;font-weight:600;letter-spacing:.04em;color:#9aa3b2;padding:4px 6px;line-height:1;transition:color .15s}' +
      '#nxcLang button:hover{color:#fff}' +
      '#nxcLang button.on{color:#fff}' +
      '#nxcLang .nxc-flag{width:18px;height:12px;border-radius:2px;display:block;box-shadow:0 0 0 1px rgba(255,255,255,.25);opacity:.55;transition:opacity .15s}' +
      '#nxcLang button:hover .nxc-flag,#nxcLang button.on .nxc-flag{opacity:1}' +
      '#nxcLang button.on{text-decoration:underline;text-underline-offset:5px;text-decoration-thickness:2px;text-decoration-color:#b18cff}' +
      '#nxcLang .nxc-l-sep{color:#555c6b;font-size:12px}' +
      '#nxcLang.nxc-fixed{position:fixed;top:16px;right:16px;z-index:9999;background:rgba(11,11,18,.7);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:4px 10px;margin:0}';
    document.head.appendChild(css);
    wrap.querySelector('[data-l="en"]').addEventListener("click", function () { setLang("en"); });
    wrap.querySelector('[data-l="nl"]').addEventListener("click", function () { setLang("nl"); });

    // Prefer to sit in the header next to the phone; fall back to a fixed pill.
    var host = document.querySelector(".header-right-info") || document.querySelector("header .navbar") || document.querySelector("header");
    if (host) host.appendChild(wrap); else { wrap.classList.add("nxc-fixed"); document.body.appendChild(wrap); }
    return wrap;
  }
  var toggleEl = null;
  function paintToggle(lang) {
    if (!toggleEl) return;
    toggleEl.querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-l") === lang); });
  }

  function init() {
    toggleEl = buildToggle();
    captureReveal();        // record reveal-type text (EN + NL) before the theme splits it
    apply(current());
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
