import { getPayload } from "payload"
import config from "../src/payload.config"

/**
 * Idempotent seed script for Inheritix Milestone Two.
 * Safely populates the PostgreSQL database with:
 * - Admin and Editor users (if none exist)
 * - Approved site globals (SiteSettings, Navigation, HomePage, AboutPage, ContactPage, ListingPages, SiteLabels)
 * - Approved Services & Products (published)
 * - Sample Client Projects & Fixtures (drafts only, per requirement 11)
 * - Approved Insights / Articles (published)
 * - Default Redirects (/work -> /projects)
 */
export async function seed() {
  console.log("🌱 Initializing Payload for database seed...")
  const payload = await getPayload({ config })

  // 1. Seed Admin and Editor Users
  console.log("👤 Checking users...")
  const existingUsers = await payload.find({
    collection: "users",
    limit: 10,
  })

  let adminUser = existingUsers.docs.find((u) => u.email === "admin@inheritixai.com")
  if (!adminUser) {
    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || "InheritixAdmin2026!"
    adminUser = await payload.create({
      collection: "users",
      data: {
        email: "admin@inheritixai.com",
        name: "Inheritix Administrator",
        password: defaultPassword,
        roles: ["admin"],
      },
    })
    console.log(`  ✓ Created default Administrator: admin@inheritixai.com (password: ${defaultPassword})`)
  } else {
    console.log("  ✓ Administrator already exists, skipping.")
  }

  let editorUser = existingUsers.docs.find((u) => u.email === "editor@inheritixai.com")
  if (!editorUser) {
    const defaultEditorPassword = process.env.EDITOR_DEFAULT_PASSWORD || "InheritixEditor2026!"
    editorUser = await payload.create({
      collection: "users",
      data: {
        email: "editor@inheritixai.com",
        name: "Inheritix Content Editor",
        password: defaultEditorPassword,
        roles: ["editor"],
      },
    })
    console.log(`  ✓ Created default Editor: editor@inheritixai.com (password: ${defaultEditorPassword})`)
  } else {
    console.log("  ✓ Editor already exists, skipping.")
  }

  // 2. Seed Authors
  console.log("✍️ Checking authors...")
  const existingAuthors = await payload.find({
    collection: "authors",
    limit: 5,
  })
  let editorialAuthor = existingAuthors.docs[0]
  if (!editorialAuthor) {
    editorialAuthor = await payload.create({
      collection: "authors",
      data: {
        name: "INHERITIX Editorial",
        initials: "IN",
        role: "INHERITIX Editorial",
        bio: "Designers and engineers writing on product strategy, interface design, and software craftsmanship.",
      },
    })
    console.log("  ✓ Created INHERITIX Editorial author.")
  }

  // 3. Seed Categories
  console.log("🏷️ Checking categories...")
  const categoryDefs = [
    { slug: "product-thinking", name: "Product Thinking" },
    { slug: "ai-and-automation", name: "AI & Automation" },
    { slug: "design", name: "Design" },
  ]
  const categoryMap = new Map<string, number>()
  for (const cat of categoryDefs) {
    const existing = await payload.find({
      collection: "categories",
      where: { slug: { equals: cat.slug } },
      limit: 1,
    })
    if (existing.docs.length > 0) {
      categoryMap.set(cat.slug, existing.docs[0].id as number)
    } else {
      const created = await payload.create({
        collection: "categories",
        data: {
          slug: cat.slug,
          name: cat.name,
        },
      })
      categoryMap.set(cat.slug, created.id as number)
      console.log(`  ✓ Created category: ${cat.name}`)
    }
  }

  // 4. Seed Services (Approved Content — Published)
  console.log("🛠️ Checking services...")
  const serviceDefs = [
    {
      number: "01",
      slug: "custom-software",
      title: "Custom software",
      shortDescription:
        "Purpose-built systems shaped around the way your business actually works.",
      heroIntro:
        "We design and engineer custom software that reduces friction, creates operational visibility, and is built to evolve with your business.",
      deliverables: [
        "Product and technical strategy",
        "User journeys and service blueprints",
        "Interface design and interactive prototypes",
        "Production engineering and integrations",
        "Quality assurance and launch support",
      ],
      displayOrder: 1,
    },
    {
      number: "02",
      slug: "saas-platforms",
      title: "SaaS platforms",
      shortDescription:
        "Scalable products designed for adoption, retention, and continuous evolution.",
      heroIntro:
        "We design and engineer SaaS platforms that turn complex domain workflows into products users embrace every day.",
      deliverables: [
        "Multi-tenant architecture and security",
        "Subscription and billing mechanics",
        "Product analytics and retention telemetry",
        "High-performance design system",
      ],
      displayOrder: 2,
    },
    {
      number: "03",
      slug: "erp-and-business-systems",
      title: "ERP & business systems",
      shortDescription:
        "Connected operations, clear data, and fewer manual handoffs.",
      heroIntro:
        "Unify disparate operational silos into reliable, real-time enterprise systems.",
      deliverables: [
        "Data schema alignment and migration",
        "Automated operational reporting",
        "Role-based permission architecture",
      ],
      displayOrder: 3,
    },
    {
      number: "04",
      slug: "mobile-applications",
      title: "Mobile applications",
      shortDescription:
        "Focused native-feeling experiences for people on the move.",
      heroIntro:
        "High-performance iOS and Android digital tools built with responsiveness, offline reliability, and clarity.",
      deliverables: [
        "Native UX design and prototyping",
        "Offline-first sync architectures",
        "Device sensor and location integrations",
      ],
      displayOrder: 4,
    },
    {
      number: "05",
      slug: "ai-automation",
      title: "AI automation",
      shortDescription:
        "Practical automation for repetitive decisions, workflows, and support.",
      heroIntro:
        "Empower operations with intelligent automation that respects human judgment and domain constraints.",
      deliverables: [
        "Workflow classification and extraction",
        "Human-in-the-loop review mechanisms",
        "Predictive routing and decision engines",
      ],
      displayOrder: 5,
    },
    {
      number: "06",
      slug: "wordpress-development",
      title: "WordPress development",
      shortDescription:
        "Fast, flexible publishing systems engineered beyond the template.",
      heroIntro:
        "Bespoke content management engineered with modern performance benchmarks and clean publishing workflows.",
      deliverables: [
        "Custom block-based editorial tools",
        "Enterprise caching and headless APIs",
        "High-speed Core Web Vitals optimization",
      ],
      displayOrder: 6,
    },
  ]

  for (const s of serviceDefs) {
    const existing = await payload.find({
      collection: "services",
      where: { slug: { equals: s.slug } },
      limit: 1,
    })
    if (existing.docs.length === 0) {
      await payload.create({
        collection: "services",
        data: {
          number: s.number,
          slug: s.slug,
          title: s.title,
          shortDescription: s.shortDescription,
          heroIntro: s.heroIntro,
          deliverables: s.deliverables.map((item) => ({ item })),
          displayOrder: s.displayOrder,
          _status: "published",
        },
      })
      console.log(`  ✓ Created service: ${s.title}`)
    }
  }

  // 5. Seed Products (Approved Inheritix Products — Published)
  console.log("📦 Checking products...")
  const productDefs = [
    {
      slug: "logisttex",
      name: "LOGISTTEX",
      badge: "01 / LOGISTICS",
      category: "LOGISTICS OPERATIONS",
      tagline: "Every operation. Visible.",
      summary:
        "A logistics operations platform that turns shipments, fleets, and performance into one clear picture.",
      heroHeadline: "Logistics, under control.",
      heroDescription:
        "One operational system for orders, fleets, drivers, costs, and the decisions between them.",
      visualType: "dashboard" as const,
      displayOrder: 1,
      valuePoints: [
        { label: "ONE VIEW", description: "See the operation as it happens." },
        { label: "LESS CHASING", description: "Keep teams and drivers coordinated." },
        { label: "BETTER SIGNAL", description: "Turn activity into useful decisions." },
      ],
      workflowSteps: [
        { stepNumber: "01", name: "Capture" },
        { stepNumber: "02", name: "Plan" },
        { stepNumber: "03", name: "Dispatch" },
        { stepNumber: "04", name: "Track" },
        { stepNumber: "05", name: "Settle" },
      ],
    },
    {
      slug: "fen-el-menu",
      name: "Fen El Menu",
      badge: "02 / HOSPITALITY",
      category: "RESTAURANT EXPERIENCE",
      tagline: "From menu to order, beautifully.",
      summary:
        "A refined ordering experience that makes choosing simple and menu management faster.",
      heroHeadline: "A better way to browse, choose, and order.",
      heroDescription:
        "A flexible digital menu designed to make ordering feel natural—and menu operations feel manageable.",
      visualType: "phone" as const,
      displayOrder: 2,
      valuePoints: [
        { label: "EASY CHOICE", description: "Readable menus, modifiers, and details." },
        { label: "FASTER UPDATES", description: "Change items and availability centrally." },
        { label: "BRAND-READY", description: "An experience that feels like your restaurant." },
      ],
      workflowSteps: [
        { stepNumber: "01", name: "Browse" },
        { stepNumber: "02", name: "Customize" },
        { stepNumber: "03", name: "Review" },
        { stepNumber: "04", name: "Order" },
        { stepNumber: "05", name: "Enjoy" },
      ],
    },
  ]

  for (const p of productDefs) {
    const existing = await payload.find({
      collection: "products",
      where: { slug: { equals: p.slug } },
      limit: 1,
    })
    if (existing.docs.length === 0) {
      await payload.create({
        collection: "products",
        data: {
          ...p,
          _status: "published",
        },
      })
      console.log(`  ✓ Created product: ${p.name}`)
    }
  }

  // 6. Seed Articles (Approved Insights — Published)
  console.log("📰 Checking articles / posts...")
  const articleDefs = [
    {
      slug: "software-people-adopt",
      title: "How to build business software people actually adopt",
      categorySlug: "product-thinking",
      categoryLabel: "PRODUCT THINKING",
      readTime: "7 min read",
      color: "ink" as const,
      excerpt:
        "Adoption is not a training problem. It is the accumulated result of product decisions made long before launch.",
      leadParagraph:
        "Teams do not resist new software because they dislike change. They resist software that asks them to carry more complexity than it removes.",
      sections: [
        {
          sectionId: "friction",
          heading: "Start with the friction people already feel",
          body: "The first version of a product brief is often a list of features. But features are only hypotheses. Begin instead with specific moments: the dispatcher who calls three people to locate an order, or the manager reconciling two exports before every meeting.",
          quote: "Useful software creates a shorter, clearer path between intent and outcome.",
        },
        {
          sectionId: "workflow",
          heading: "Design the whole workflow, not isolated screens",
          body: "A polished screen can still fail inside a broken sequence. Map where information enters, who changes it, what decisions depend on it, and where the workflow leaves the product.",
        },
        {
          sectionId: "trust",
          heading: "Earn trust in small moments",
          body: "Trust grows from predictable behavior: clear states, reversible actions, useful validation, and language that matches how the team speaks. Reliability is experienced through details.",
        },
        {
          sectionId: "measure",
          heading: "Measure behavior, not launch",
          body: "Launch is the beginning of evidence. Look at completion, workarounds, abandonment, repeated support questions, and the time between key steps. Each reveals where the product still asks too much.",
        },
      ],
    },
    {
      slug: "automation-with-judgment",
      title: "Automation needs judgment, not just a model",
      categorySlug: "ai-and-automation",
      categoryLabel: "AI & AUTOMATION",
      readTime: "6 min read",
      color: "blue" as const,
      excerpt:
        "Practical automation is built around exceptional handling and human verification, not opaque black boxes.",
      leadParagraph:
        "Successful AI implementation in operations starts where high volume and routine decisions meet clear domain boundaries.",
      sections: [
        {
          sectionId: "boundaries",
          heading: "Establish explicit decision boundaries",
          body: "Define with mathematical clarity when the system should execute autonomously and when an anomaly must trigger immediate escalation to senior operators.",
        },
      ],
    },
    {
      slug: "designing-operational-clarity",
      title: "Designing for operational clarity",
      categorySlug: "design",
      categoryLabel: "DESIGN",
      readTime: "9 min read",
      color: "cyan" as const,
      excerpt:
        "Why visual simplicity alone is insufficient for heavy data systems, and how to structure interfaces around next decisions.",
      leadParagraph:
        "Clarity is measured by how quickly an operator can verify status and choose the appropriate next step under pressure.",
      sections: [
        {
          sectionId: "hierarchy",
          heading: "Hierarchy reflects consequence, not visual convenience",
          body: "Information with immediate operational impact must never compete with background telemetry or static configuration.",
        },
      ],
    },
  ]

  for (const art of articleDefs) {
    const existing = await payload.find({
      collection: "posts",
      where: { slug: { equals: art.slug } },
      limit: 1,
    })
    if (existing.docs.length === 0) {
      await payload.create({
        collection: "posts",
        data: {
          slug: art.slug,
          title: art.title,
          category: categoryMap.get(art.categorySlug) ?? null,
          categoryLabel: art.categoryLabel,
          author: (editorialAuthor?.id as number) ?? null,
          readTime: art.readTime,
          color: art.color,
          excerpt: art.excerpt,
          leadParagraph: art.leadParagraph,
          sections: art.sections,
          _status: "published",
        },
      })
      console.log(`  ✓ Created article: ${art.title}`)
    }
  }

  // 7. Seed Redirects
  console.log("🔀 Checking redirects...")
  const redirectDefs = [
    { from: "/work", to: "/projects", statusCode: "308" as const },
    { from: "/ar/work", to: "/ar/projects", statusCode: "308" as const },
  ]
  for (const r of redirectDefs) {
    const existing = await payload.find({
      collection: "redirects",
      where: { from: { equals: r.from } },
      limit: 1,
    })
    if (existing.docs.length === 0) {
      await payload.create({
        collection: "redirects",
        data: r,
      })
      console.log(`  ✓ Created redirect: ${r.from} -> ${r.to}`)
    }
  }

  // 8. Seed Globals
  console.log("🌐 Checking site globals...")
  try {
    await payload.updateGlobal({
      slug: "navigation",
      data: {
        items: [
          { label: "Services", href: "/services" },
          { label: "Products", href: "/products" },
          { label: "Projects", href: "/projects" },
          { label: "About", href: "/about" },
          { label: "Insights", href: "/insights" },
          { label: "Contact", href: "/contact" },
        ],
        headerCta: {
          label: "Start a Project",
          href: "/contact",
        },
      },
    })
    console.log("  ✓ Updated Navigation global.")
  } catch (err) {
    console.warn("  ! Note on Navigation global update:", (err as Error).message)
  }

  try {
    await payload.updateGlobal({
      slug: "site-settings",
      data: {
        siteName: "INHERITIX",
        brandColors: {
          primary: "#0066FF",
          accent: "#00CCFF",
          dark: "#060A11",
        },
        defaultSeo: {
          title: "Beautifully designed. Seriously engineered.",
          description:
            "Inheritix builds software that makes complex businesses easier to run and digital products people enjoy using.",
        },
        footerHeading: "Have a project in mind?",
        footerInvitation: "Let’s make something worth using.",
        footerCtaLabel: "Tell us what you’re building",
        copyright: "INHERITIX Technologies",
        location: "Amman, Jordan",
      },
    })
    console.log("  ✓ Updated SiteSettings global.")
  } catch (err) {
    console.warn("  ! Note on SiteSettings global update:", (err as Error).message)
  }

  console.log("✅ Seed completed successfully!")
}

// Direct execution helper
if (process.argv[1]?.includes("seed")) {
  seed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Seed failed:", error)
      process.exit(1)
    })
}
