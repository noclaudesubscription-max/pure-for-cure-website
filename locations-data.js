/* ════════════════════════════════════════════════════════════
   SEVA MEMORIES — LOCATIONS / ACTIVITIES CONFIGURATION
   ────────────────────────────────────────────────────────────
   This is the ONLY file you need to edit to add, remove, or
   reorder the location/activity cards shown in the "Seva
   Memories" section on the homepage. The homepage renders
   whatever is in this array — no other files need to change.

   To add a new location or relief activity: add another object
   below, and create a matching gallery-<slug>.html page (copy an
   existing gallery-*.html file as a starting point, it already
   reads its photos from the shared Supabase gallery_entries table
   filtered by LOC_SLUG).

   Fields:
     slug     Short id, also used as the Supabase `location` value
              inside the matching gallery-<slug>.html page.
     href     Page this card links to.
     icon     Font Awesome icon class (without the "fa-" prefix... )
              actually pass the full class, e.g. "fa-water".
     title    Card heading.
     subtitle Short line under the title (place/region).
     tag      Small label describing the type of activity.
════════════════════════════════════════════════════════════ */
const PFC_LOCATIONS = [
  {
    slug: 'borooah',
    href: 'gallery-borooah.html',
    icon: 'fa-ribbon',
    title: 'B. Borooah Cancer Hospital',
    subtitle: 'Guwahati, Assam',
    tag: 'Cancer Care & Support'
  },
  {
    slug: 'gmch',
    href: 'gallery-gmch.html',
    icon: 'fa-hospital-user',
    title: 'GMCH – Guwahati Medical College & Hospital',
    subtitle: 'Guwahati, Assam',
    tag: 'Government Medical College'
  },
  {
    slug: 'aiims',
    href: 'gallery-aiims.html',
    icon: 'fa-stethoscope',
    title: 'AIIMS Guwahati',
    subtitle: 'Guwahati, Assam',
    tag: 'Premier Medical Institute'
  },
  {
    // New relief activity — reuses the exact same gallery system as
    // every other location. Photos are added via the dashboard's
    // Gallery Manager (location: "assam-flood-relief") once available.
    slug: 'assam-flood-relief',
    href: 'gallery-assam.html',
    icon: 'fa-water',
    title: 'Assam Flood Relief',
    subtitle: 'Flood-affected areas, Assam',
    tag: 'Relief & Community Support'
  },
  {
    slug: 'other',
    href: 'gallery-other.html',
    icon: 'fa-map-marker-alt',
    title: 'Other Locations',
    subtitle: 'Across North East India',
    tag: 'Orphanages · Old Age Homes · Communities'
  },
];
