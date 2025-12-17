/**
 * Utility to fetch icons for recognized skills/technologies
 * Uses Simple Icons CDN and common tech icon mappings
 */

// Common tech name to Simple Icons slug mapping
const TECH_ICON_MAP: Record<string, string> = {
  "react": "react",
  "reactjs": "react",
  "next.js": "nextdotjs",
  "nextjs": "nextdotjs",
  "typescript": "typescript",
  "javascript": "javascript",
  "node.js": "nodedotjs",
  "nodejs": "nodedotjs",
  "python": "python",
  "docker": "docker",
  "kubernetes": "kubernetes",
  "aws": "amazonaws",
  "gcp": "googlecloud",
  "azure": "microsoftazure",
  "postgresql": "postgresql",
  "mongodb": "mongodb",
  "redis": "redis",
  "graphql": "graphql",
  "tailwindcss": "tailwindcss",
  "tailwind": "tailwindcss",
  "vue": "vuedotjs",
  "vue.js": "vuedotjs",
  "angular": "angular",
  "svelte": "svelte",
  "git": "git",
  "github": "github",
  "gitlab": "gitlab",
  "figma": "figma",
  "adobe": "adobe",
  "photoshop": "adobephotoshop",
  "illustrator": "adobeillustrator",
  "premiere": "adobepremierepro",
  "after effects": "adobeaftereffects",
  "linear": "linear",
  "slack": "slack",
  "notion": "notion",
  "vercel": "vercel",
  "netlify": "netlify",
  "supabase": "supabase",
  "firebase": "firebase",
  "openai": "openai",
  "anthropic": "anthropic",
  "claude": "anthropic",
  "gpt": "openai",
  "mcp": "openai", // Model Context Protocol
};

/**
 * Get icon URL for a skill/technology name
 * @param skillName - Name of the skill/technology
 * @returns Icon URL or null if not found
 */
export function getSkillIconUrl(skillName: string): string | null {
  const normalized = skillName.toLowerCase().trim();
  
  // Check direct mapping
  const slug = TECH_ICON_MAP[normalized];
  if (slug) {
    return `https://cdn.simpleicons.org/${slug}/8b4513`;
  }
  
  // Try to find partial match
  for (const [key, value] of Object.entries(TECH_ICON_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return `https://cdn.simpleicons.org/${value}/8b4513`;
    }
  }
  
  // Try direct slug format (kebab-case)
  const kebabCase = normalized.replace(/[^a-z0-9]+/g, "");
  if (kebabCase.length > 2) {
    return `https://cdn.simpleicons.org/${kebabCase}/8b4513`;
  }
  
  return null;
}

/**
 * Get icon URL with custom color
 */
export function getSkillIconUrlWithColor(skillName: string, color: string = "8b4513"): string | null {
  const normalized = skillName.toLowerCase().trim();
  const slug = TECH_ICON_MAP[normalized] || normalized.replace(/[^a-z0-9]+/g, "");
  if (slug.length < 2) return null;
  return `https://cdn.simpleicons.org/${slug}/${color.replace("#", "")}`;
}
