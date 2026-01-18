# Tartarus Design System

> Dark mythological aesthetic - the oracle's chamber

## Color Palette

### Core Blacks (Backgrounds)
| Variable | Hex | Usage |
|----------|-----|-------|
| `--tartarus-void` | `#0a0a0a` | Deepest background, main app bg |
| `--tartarus-deep` | `#111111` | Secondary bg, sidebars, inputs |
| `--tartarus-surface` | `#1a1a1a` | Cards, elevated surfaces |
| `--tartarus-elevated` | `#242424` | Hover states, highlighted areas |

### Teal (Primary - Flowing Energy)
| Variable | Hex | Usage |
|----------|-----|-------|
| `--tartarus-teal` | `#00CED1` | Primary action, links, active states |
| `--tartarus-teal-dim` | `#008B8B` | Secondary teal, borders |
| `--tartarus-teal-glow` | `rgba(0, 206, 209, 0.3)` | Glow effects |
| `--tartarus-teal-soft` | `rgba(0, 206, 209, 0.1)` | Subtle backgrounds |

### Gold (Secondary - Divine Accents)
| Variable | Hex | Usage |
|----------|-----|-------|
| `--tartarus-gold` | `#D4AF37` | Secondary action, Kronus branding |
| `--tartarus-gold-bright` | `#FFD700` | Highlights |
| `--tartarus-gold-dim` | `#B8860B` | Secondary gold, borders |
| `--tartarus-gold-glow` | `rgba(212, 175, 55, 0.3)` | Glow effects |
| `--tartarus-gold-soft` | `rgba(212, 175, 55, 0.1)` | Subtle backgrounds |

### Ivory (Text)
| Variable | Hex | Usage |
|----------|-----|-------|
| `--tartarus-ivory` | `#FFFFF0` | Primary text |
| `--tartarus-ivory-dim` | `#E8E4D9` | Secondary text |
| `--tartarus-ivory-muted` | `#A0998A` | Muted text, labels |
| `--tartarus-ivory-faded` | `#6B6560` | Placeholder text, disabled |

### Status Colors
| Variable | Hex | Usage |
|----------|-----|-------|
| `--tartarus-success` | `#2ECC71` | Success states |
| `--tartarus-warning` | `#F39C12` | Warning states |
| `--tartarus-error` | `#E74C3C` | Error states, destructive |

### Borders & Shadows
| Variable | Value | Usage |
|----------|-------|-------|
| `--tartarus-border` | `#2a2a2a` | Default borders |
| `--tartarus-border-light` | `#3a3a3a` | Lighter borders |
| `--tartarus-shadow` | `rgba(0, 0, 0, 0.5)` | Drop shadows |
| `--tartarus-glow-teal` | `0 0 20px rgba(0, 206, 209, 0.15)` | Teal glow |
| `--tartarus-glow-gold` | `0 0 20px rgba(212, 175, 55, 0.15)` | Gold glow |

---

## Typography

### Font Families
- **Sans**: `--font-geist-sans` (primary text)
- **Mono**: `--font-geist-mono` (code, technical content)

### Text Sizes (Tailwind)
| Class | Usage |
|-------|-------|
| `text-[9px]` | Tags, tiny labels |
| `text-[10px]` | Secondary labels, dates |
| `text-xs` (12px) | Badges, small text |
| `text-sm` (14px) | Body text, descriptions |
| `text-base` (16px) | Default body |
| `text-lg` (18px) | Card titles |
| `text-xl` (20px) | Page section titles |
| `text-2xl` (24px) | Page titles |

### Text Colors (CSS Variables)
```css
/* Primary text */
color: var(--tartarus-ivory);

/* Secondary/body text */
color: var(--tartarus-ivory-dim);

/* Muted labels */
color: var(--tartarus-ivory-muted);

/* Placeholder/disabled */
color: var(--tartarus-ivory-faded);

/* Links/actions */
color: var(--tartarus-teal);

/* Accent text */
color: var(--tartarus-gold);
```

---

## Components

### Buttons

#### Primary (Teal)
```tsx
<Button className="bg-[var(--tartarus-teal)] text-[var(--tartarus-void)] hover:bg-[var(--tartarus-teal-bright)]">
  Action
</Button>
```

#### Secondary (Gold) - Kronus branded
```tsx
<Button className="bg-[var(--tartarus-gold)] text-[var(--tartarus-void)] hover:bg-[var(--tartarus-gold-bright)]">
  <img src="/chronus-logo.png" className="h-4 w-4 mr-2" />
  Edit with Kronus
</Button>
```

#### Outline (Teal)
```tsx
<Button
  variant="outline"
  className="border-[var(--tartarus-teal-dim)] text-[var(--tartarus-teal)] hover:bg-[var(--tartarus-teal-soft)]"
>
  Outline
</Button>
```

#### Ghost
```tsx
<Button
  variant="ghost"
  className="text-[var(--tartarus-ivory-muted)] hover:bg-[var(--tartarus-elevated)]"
>
  Ghost
</Button>
```

#### Icon Button
```tsx
<Button
  variant="ghost"
  size="icon"
  className="h-8 w-8 text-[var(--tartarus-ivory-muted)]"
>
  <Icon className="h-4 w-4" />
</Button>
```

### Badges

#### Default (Teal)
```tsx
<Badge className="bg-[var(--tartarus-teal-soft)] text-[var(--tartarus-teal)]">
  Label
</Badge>
```

#### Gold
```tsx
<Badge className="bg-[var(--tartarus-gold-soft)] text-[var(--tartarus-gold)]">
  Featured
</Badge>
```

#### Colored (Dynamic Type Colors)
```tsx
// For document types, use barColor from getColorClasses()
<Badge className={`${getDocTypeColors(type).barColor} text-white`}>
  {type}
</Badge>
```

#### Tags (Small)
```tsx
<span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--tartarus-teal-soft)] text-[var(--tartarus-teal)]">
  tag-name
</span>
```

### Cards

#### Standard Card
```tsx
<Card className="bg-[var(--tartarus-surface)] border-[var(--tartarus-border)]">
  <CardHeader>...</CardHeader>
  <CardContent>...</CardContent>
</Card>
```

#### Card with Top Bar (Repository/Document cards)
```tsx
<Card className="overflow-hidden border-[var(--tartarus-border)]">
  {/* Decorative gradient bar */}
  <div className={`h-1 ${colorClass} shrink-0`} />
  <CardHeader>...</CardHeader>
  <CardContent>...</CardContent>
</Card>
```

#### Hover Card
```tsx
<Card className="group cursor-pointer hover:shadow-md border-[var(--tartarus-border)]">
  ...
</Card>
```

### Inputs

```tsx
<Input
  className="bg-[var(--tartarus-deep)] border-[var(--tartarus-border)] text-[var(--tartarus-ivory)] placeholder:text-[var(--tartarus-ivory-faded)]"
/>
```

### Select/Dropdown

```tsx
<Select>
  <SelectTrigger className="bg-[var(--tartarus-deep)] border-[var(--tartarus-border)] text-[var(--tartarus-ivory)]">
    <SelectValue />
  </SelectTrigger>
  <SelectContent className="bg-[var(--tartarus-surface)] border-[var(--tartarus-border)]">
    <SelectItem className="text-[var(--tartarus-ivory)] focus:bg-[var(--tartarus-teal-soft)] focus:text-[var(--tartarus-teal)]">
      Option
    </SelectItem>
  </SelectContent>
</Select>
```

---

## Page Layouts

### Dark Pages (Chat, Settings, Dashboard)
```tsx
<div className="bg-[var(--tartarus-void)]">
  {/* Header */}
  <header className="border-b border-[var(--tartarus-border)]">
    ...
  </header>

  {/* Content */}
  <main className="p-6">
    ...
  </main>
</div>
```

### Light Pages (Reader, Repository)
Use the `.journal-page` or `.tartarus-reader` class for light ivory backgrounds.

---

## Icon Conventions

### Icon Library: Lucide React

### Icon Sizes
| Size | Class | Usage |
|------|-------|-------|
| 12px | `h-3 w-3` | Inline with small text, tags |
| 16px | `h-4 w-4` | Buttons, badges, inline |
| 20px | `h-5 w-5` | Card icons |
| 24px | `h-6 w-6` | Section headers |
| 32px | `h-8 w-8` | Empty states |

### Common Icons
| Icon | Usage |
|------|-------|
| `FileText` | Documents, writings |
| `Code` | Prompts, technical |
| `Eye` / `EyeOff` | Toggle visibility |
| `Brain` | AI/Kronus features |
| `Calendar` | Dates |
| `Tag` | Tags, metadata |
| `Settings` | Configuration |
| `ChevronDown` / `ChevronUp` | Expand/collapse |
| `Plus` | Add new |
| `Trash2` | Delete |
| `Edit` | Edit mode |
| `Save` | Save changes |
| `X` | Close, cancel |
| `ArrowLeft` | Back navigation |

---

## Category Color System

For dynamic document types, skills, and categories:

```typescript
const CATEGORY_COLORS = [
  "violet", "pink", "blue", "orange", "emerald",
  "amber", "red", "cyan", "indigo", "teal", "rose", "lime"
];

function getColorClasses(color: string) {
  const colorMap = {
    violet: {
      color: "text-violet-700 dark:text-violet-400",
      bgColor: "bg-violet-100 dark:bg-violet-900/30",
      barColor: "bg-violet-500"
    },
    teal: {
      color: "text-teal-700 dark:text-teal-400",
      bgColor: "bg-teal-100 dark:bg-teal-900/30",
      barColor: "bg-teal-500"
    },
    // ... etc
  };
  return colorMap[color] || colorMap.teal; // Default to teal
}
```

---

## Spacing & Layout

### Standard Spacing (Tailwind)
| Class | Pixels | Usage |
|-------|--------|-------|
| `gap-1` | 4px | Tight spacing (tags) |
| `gap-2` | 8px | Icon + text |
| `gap-3` | 12px | Card elements |
| `gap-4` | 16px | Card grid |
| `gap-6` | 24px | Sections |
| `p-3` | 12px | Compact padding |
| `p-4` | 16px | Card padding |
| `p-6` | 24px | Page padding |

### Border Radius
| Variable | Value | Usage |
|----------|-------|-------|
| `--radius` | `0.625rem` (10px) | Default |
| `rounded-sm` | 4px | Small elements |
| `rounded` | 6px | Badges |
| `rounded-lg` | 8px | Cards |
| `rounded-full` | 9999px | Circular badges, avatars |

---

## Animation & Transitions

### Standard Transition
```css
transition-colors
transition-opacity
transition-all duration-200
```

### Hover Effects
```tsx
// Opacity reveal on parent hover
className="opacity-0 group-hover:opacity-100 transition-opacity"

// Color change
className="hover:text-[var(--tartarus-teal)]"

// Background change
className="hover:bg-[var(--tartarus-elevated)]"
```

### Glow Animation
```css
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 10px var(--tartarus-teal-glow); }
  50% { box-shadow: 0 0 20px var(--tartarus-teal-glow); }
}

.animate-pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}
```

---

## Theming Classes

### Dark Theme (Default)
- `.tartarus-page` - Full dark theme
- `.kronus-chamber` - Chat interface
- `bg-[var(--tartarus-void)]` - Main background

### Light Theme
- `.journal-page` - Ivory paper background
- `.tartarus-reader` - Reader pages
- `.kronus-chamber.kronus-light` - Light chat mode

---

## Do's and Don'ts

### DO
- Use CSS variables for all Tartarus colors
- Use Tailwind utilities for standard spacing/sizing
- Use `group` and `group-hover:` for parent-child hover effects
- Use semantic color names (teal for primary, gold for accent)
- Use `shrink-0` on fixed-size elements in flex containers

### DON'T
- Hardcode hex colors (use `--tartarus-*` variables)
- Mix emerald/violet with Tartarus palette inconsistently
- Use `dark:` prefix with Tartarus variables (they're already dark-aware)
- Create new color tokens without adding to this system
