export type TeamMember = {
  name: string;
  role: string;
  focus: string;
  /** Optional headshot. Falls back to an initial when absent. */
  image?: string;
};

export const TEAM: TeamMember[] = [
  {
    name: "Vinay",
    role: "Manufacturing & Sourcing",
    focus: "Fabric, trims, and everything that happens before the cut.",
  },
  {
    name: "Surinder",
    role: "Factories & Supply Chain",
    focus: "Units, lead times, and getting the boxes out of Tamil Nadu.",
  },
  {
    name: "Nisha",
    role: "Finance",
    focus: "Costing, margins, and the numbers behind each run.",
  },
  {
    name: "Vidhan",
    role: "Design & Sales",
    focus: "Blocks, fits, and the shop floor.",
  },
  {
    name: "Parrv",
    role: "Brand & Technology",
    focus: "The name, the site, and how the two hold together.",
  },
];
