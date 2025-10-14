# SapHari UX Style Guide

## 🎨 Design System Overview

SapHari uses a modern, clean design system built on a blue/white primary palette with bright accent colors for status indicators. The design emphasizes clarity, accessibility, and professional aesthetics suitable for IoT monitoring applications.

## 🎯 Core Design Principles

- **Clarity First**: Information hierarchy and visual clarity take precedence
- **Accessibility**: WCAG 2.1 AA compliance with proper contrast ratios
- **Consistency**: Unified component patterns across all interfaces
- **Performance**: Optimized for smooth interactions and fast loading
- **Responsive**: Mobile-first design that scales to all screen sizes

## 🎨 Color Palette

### Primary Colors
```css
/* Light Theme */
--primary: 214 100% 50%        /* #0066ff - Primary Blue */
--success: 142 76% 36%         /* #16a34a - Success Green */
--warning: 38 92% 50%          /* #f59e0b - Warning Amber */
--destructive: 0 84% 60%       /* #ef4444 - Error Red */

/* Dark Theme */
--primary: 214 100% 60%        /* #3b82f6 - Brighter Blue */
--success: 142 76% 46%         /* #22c55e - Brighter Green */
--warning: 38 92% 60%          /* #fbbf24 - Brighter Amber */
--destructive: 0 84% 70%       /* #f87171 - Brighter Red */
```

### Neutral Colors
```css
/* Light Theme */
--background: 0 0% 100%        /* Pure White */
--foreground: 222.2 84% 4.9%   /* Dark Gray */
--muted: 210 40% 98%           /* Light Gray */
--border: 214.3 31.8% 91.4%    /* Border Gray */

/* Dark Theme */
--background: 222 47% 7%       /* Dark Blue-Gray */
--foreground: 210 40% 98%      /* Light Gray */
--muted: 215 20% 25%           /* Medium Gray */
--border: 215 20% 30%          /* Border Gray */
```

## 📐 Typography Scale

### Font Families
- **Primary**: `system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif`
- **Monospace**: `ui-monospace, SFMono-Regular, Monaco, Consolas, Liberation Mono, Courier New, monospace`

### Type Scale
```css
h1: text-3xl font-bold tracking-tight     /* 30px */
h2: text-2xl font-semibold tracking-tight /* 24px */
h3: text-xl font-semibold tracking-tight  /* 20px */
h4: text-lg font-semibold tracking-tight  /* 18px */
body: text-base                           /* 16px */
small: text-sm                            /* 14px */
```

## 🧩 Component Patterns

### Buttons

#### Primary Button
```tsx
<Button className="shadow-sm hover:shadow-md">
  Primary Action
</Button>
```
- Blue background with white text
- Subtle shadow that increases on hover
- Rounded corners (rounded-xl)

#### Secondary Button
```tsx
<Button variant="outline" className="shadow-sm hover:shadow-md">
  Secondary Action
</Button>
```
- White background with blue border
- Hover state changes background to muted

#### Success/Warning/Destructive
```tsx
<Button variant="success">Success</Button>
<Button variant="warning">Warning</Button>
<Button variant="destructive">Delete</Button>
```

### Cards

#### Standard Card
```tsx
<Card className="rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-200">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    Card content goes here
  </CardContent>
</Card>
```

#### KPI Card
```tsx
<KPICard
  title="Total Users"
  value={1234}
  icon={<Users className="h-5 w-5" />}
  trend={{ value: 12, direction: 'up', period: 'vs last month' }}
  variant="success"
/>
```

### Status Indicators

#### Online/Offline Status
```tsx
<div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 text-success">
  <div className="h-2 w-2 bg-success rounded-full animate-pulse"></div>
  <span className="text-sm font-medium">Online</span>
</div>
```

#### Status Badges
```tsx
<Badge variant="outline" className="bg-success/10 text-success border-success/20">
  Active
</Badge>
```

### Tables

#### Modern Data Table
```tsx
<div className="rounded-xl border border-border/50 overflow-hidden">
  <Table>
    <TableHeader className="bg-muted/30">
      <TableRow className="border-border/50">
        <TableHead className="font-semibold">Column Header</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow className="hover:bg-muted/50 transition-colors">
        <TableCell>Table data</TableCell>
      </TableRow>
    </TableBody>
  </Table>
</div>
```

## 🎭 Animation & Transitions

### Micro-interactions
- **Duration**: 200ms for most transitions
- **Easing**: `ease-out` for natural feel
- **Hover Effects**: Subtle shadow increases and color changes
- **Focus States**: Ring outline with 2px width

### Loading States
```tsx
<div className="loading-spinner"></div>
```
- Spinning border animation
- Consistent across all loading states

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  .fade-in, .slide-in, .animate-pulse, .animate-spin {
    animation: none;
  }
}
```

## 📱 Responsive Design

### Breakpoints
```css
sm: 640px   /* Small devices */
md: 768px   /* Medium devices */
lg: 1024px  /* Large devices */
xl: 1280px  /* Extra large devices */
2xl: 1400px /* Maximum container width */
```

### Grid Systems
```tsx
{/* 4-column KPI grid */}
<div className="grid grid-cols-1 md:grid-cols-4 gap-6">

{/* 3-column action grid */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">

{/* 2-column layout */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
```

## ♿ Accessibility Guidelines

### Color Contrast
- **Normal Text**: Minimum 4.5:1 contrast ratio
- **Large Text**: Minimum 3:1 contrast ratio
- **Interactive Elements**: Clear focus indicators

### Focus Management
```css
*:focus-visible {
  outline: none;
  ring: 2px solid hsl(var(--ring));
  ring-offset: 2px solid hsl(var(--background));
}
```

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Logical tab order
- Escape key closes modals
- Enter/Space activates buttons

## 🎨 Layout Patterns

### Container System
```tsx
<div className="container-modern">
  {/* Max width: 1400px, responsive padding */}
</div>
```

### Spacing Scale
```css
space-y-2   /* 8px */
space-y-4   /* 16px */
space-y-6   /* 24px */
space-y-8   /* 32px */
gap-4       /* 16px */
gap-6       /* 24px */
```

### Border Radius
```css
rounded-lg   /* 8px */
rounded-xl   /* 12px */
rounded-2xl  /* 16px - Primary for cards */
```

## 🔧 Component Examples

### Master Dashboard Header
```tsx
<div className="border-b border-border/50 bg-gradient-to-r from-background to-muted/30">
  <div className="container-modern py-6">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="p-2 rounded-xl bg-primary/10">
          <Crown className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Master Dashboard</h1>
          <p className="text-sm text-muted-foreground">System-wide monitoring and control</p>
        </div>
      </div>
    </div>
  </div>
</div>
```

### Filter Section
```tsx
<div className="flex flex-wrap gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
  <div className="flex items-center gap-2 flex-1 min-w-64">
    <Search className="h-4 w-4 text-muted-foreground" />
    <Input placeholder="Search..." className="flex-1" />
  </div>
  <Select>
    <SelectTrigger className="w-36">
      <SelectValue placeholder="Filter" />
    </SelectTrigger>
  </Select>
</div>
```

### Quick Actions
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <Button variant="outline" className="h-24 flex flex-col items-center gap-3 hover:shadow-md transition-all duration-200">
    <div className="p-2 rounded-lg bg-primary/10">
      <Database className="h-6 w-6 text-primary" />
    </div>
    <span className="font-medium">Action Name</span>
  </Button>
</div>
```

## 🎯 Usage Guidelines

### Do's
- ✅ Use consistent spacing with the defined scale
- ✅ Apply hover effects to interactive elements
- ✅ Use semantic color variants (success, warning, destructive)
- ✅ Maintain proper contrast ratios
- ✅ Use rounded-2xl for cards and major containers
- ✅ Apply subtle shadows for depth

### Don'ts
- ❌ Mix different border radius values inconsistently
- ❌ Use colors outside the defined palette
- ❌ Create custom animations without considering reduced motion
- ❌ Ignore focus states for keyboard users
- ❌ Use text smaller than 14px for body content
- ❌ Create layouts that break on mobile devices

## 🔄 Dark Mode Support

The design system automatically adapts to dark mode using CSS custom properties. All components respect the user's system preference and provide appropriate contrast adjustments.

### Dark Mode Adjustments
- Brighter primary colors for better visibility
- Adjusted background and foreground colors
- Maintained contrast ratios
- Consistent component behavior

## 📊 Performance Considerations

- CSS custom properties for efficient theming
- Minimal JavaScript for animations
- Optimized component re-renders
- Lazy loading for heavy components
- Efficient bundle splitting

This style guide ensures consistency across the SapHari application while maintaining flexibility for future enhancements and customizations.
