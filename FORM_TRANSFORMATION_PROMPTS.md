# Quick Prompt Template for Form-to-Page Transformation

## 🎯 Use This Prompt for Any Form Component

```
Transform this [COMPONENT_NAME] from a floating modal/dialog to a full-page layout:

1. Remove modal overlay (fixed inset-0 bg-black bg-opacity-50)
2. Change to full page (min-h-screen bg-gray-50)
3. Make header sticky with shadow (sticky top-0 shadow-sm z-10)
4. Center content with max-width (max-w-4xl mx-auto p-6)
5. Use X icon from lucide-react for close button
6. Remove rounded corners from main container
7. Keep only ESC key handler, remove click-outside handlers

Follow the pattern from VisitForm.tsx
```

## 📝 Example Prompts

### For a specific file:
```
Transform all modal dialogs in src/pages/ApprovalsPage.tsx to full-page layouts 
following the pattern in FORM_TO_PAGE_TRANSFORMATION_GUIDE.md
```

### For multiple files:
```
Convert all Dialog components in the following files to full-page layouts:
- src/pages/ApprovalsPage.tsx
- src/pages/PRDetails.tsx

Use the FullPageDialog pattern from the transformation guide.
```

### For creating a reusable component:
```
Create a FullPageDialog component in src/components/ui/full-page-dialog.tsx 
that implements the full-page pattern with:
- Sticky header
- Close button (X icon)
- Centered content with configurable max-width
- ESC key handler
- Proper TypeScript types
```

### For reviewing existing components:
```
Search for all components using:
- "fixed inset-0 bg-black bg-opacity-50"
- "Dialog" or "Modal" imports
- "max-w-" with "rounded-lg"

List them for full-page transformation.
```

## 🔍 Search Patterns

Use these to find components that need transformation:

### VS Code Search Regex:
```regex
(fixed inset-0.*bg-black.*bg-opacity)|(Dialog.*open=)|(Modal.*isOpen)
```

### Grep Search:
```bash
grep -r "fixed inset-0.*bg-black" src/
grep -r "DialogContent" src/
grep -r "max-w-.*rounded" src/
```

## ✅ Component Transformation Checklist

When asking for transformation, specify:

- [ ] Component file path
- [ ] Whether to create inline or use FullPageDialog
- [ ] Max-width preference (2xl, 4xl, 7xl)
- [ ] Keep or remove any special features
- [ ] Mobile-specific requirements

## 🎨 Customization Options

### Background Variations:
```
- Light: bg-gray-50 (default)
- Lighter: bg-gray-100
- White: bg-white
- Gradient: bg-gradient-to-br from-gray-50 to-blue-50
```

### Max-Width Variations:
```
- Small forms: max-w-2xl (forms with <5 fields)
- Medium forms: max-w-4xl (typical forms)
- Large forms: max-w-7xl (complex multi-section forms)
```

### Header Variations:
```
- Simple: bg-white border-b
- Elevated: bg-white border-b shadow-md
- Branded: bg-gradient-to-r from-blue-600 to-blue-700 text-white
```

## 🚀 Batch Transformation Prompt

```
Please transform ALL modal/dialog components to full-page layouts:

1. Search for all files using Dialog, Modal, or floating overlays
2. For each file found:
   - Transform to full-page layout
   - Use max-w-4xl for medium forms, max-w-7xl for large forms
   - Add sticky header with shadow
   - Use X icon for close button
   - Keep ESC key handler
3. Report which files were updated
4. Create a summary of changes

Follow FORM_TO_PAGE_TRANSFORMATION_GUIDE.md pattern.
```

## 💡 Advanced Prompts

### With Animation:
```
Transform [COMPONENT] to full-page with slide-in animation from right.
Use Framer Motion or CSS transitions.
```

### With Loading State:
```
Transform [COMPONENT] to full-page and add loading skeleton 
that shows while data is being fetched.
```

### With Tabs/Steps:
```
Transform multi-step form in [COMPONENT] to full-page 
with tab navigation in sticky header.
```

---

**Quick Copy-Paste:**
```
Transform this component to a full-page layout like VisitForm.tsx: 
remove modal overlay, use min-h-screen bg-gray-50, sticky header, 
centered content with max-w-4xl, X close button, remove rounded corners.
```
