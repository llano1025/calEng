# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server with Vite
- `npm run build` - Build for production (runs TypeScript compiler + Vite build)
- `npm run preview` - Preview production build locally

### Type Checking
- `tsc --noEmit` - Run TypeScript type checking without emitting files

## Code Architecture

### Project Structure
This is a React TypeScript application built with Vite that provides engineering calculators for multiple disciplines (Electrical, MVAC, ELV, Structural, Fluid Mechanics, Thermodynamics).

### Key Architecture Patterns

#### Main App Structure
- `App.tsx` - Main routing component that manages view states ('home' vs 'calculator')
- `DisciplineSelection.tsx` - Home screen component for selecting engineering disciplines
- Route-based rendering using conditional components based on `activeDiscipline` state

#### Calculator Organization
- **Specialized Calculators**: Custom components for complex disciplines
  - `ElectricalCalculator.tsx` - Electrical systems with sub-calculators
  - `MVACalculator.tsx` - MVAC systems 
  - `ELVCalculator.tsx` - Extra Low Voltage/Broadcast systems
- **Generic Calculator**: `GenericCalculator.tsx` - Formula-based calculator for simpler disciplines
- **Sub-calculators**: Located in `src/calculators/[discipline]/` directories with domain-specific logic

#### Data Structure
- `src/data/systems.tsx` - Central configuration defining all engineering disciplines, their icons, and formulas
- `src/data/cop_tables.tsx` - Lookup tables for electrical calculations (cable sizing, voltage drop)
- Each discipline has `formulas` object with calculation logic and input definitions

#### Component Patterns
- All calculators receive `onBack` prop for navigation
- Shared `Icons` component provides consistent iconography
- TypeScript interfaces define calculation inputs, results, and component props
- Responsive design using Tailwind CSS with mobile-first approach

#### Calculation Flow
1. User selects discipline → App sets `activeDiscipline` state
2. App renders appropriate calculator component
3. Calculator components handle their own state and calculations
4. Results displayed with proper units and formatting

### Key Dependencies
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Lucide React for icons

### Development Instructions
- If the user requests to create a new calculator, they will begin the chat with <new>. The UI design must follow the style of GeneratorSizingCalculator.tsx, including tab structure (if applicable), colors, symbols, icons, etc. The "Calculation Results" section must present detailed step-by-step outputs for clarity and transparency.  If applicable, all calculations should align with the methodologies specified in relevant international standards such as ISO, IEC, ASHRAE, CIBSE, IEE, IET, IEEE, and others. All calculations shall be in S.I. unit. Please carefully review the code to ensure accuracy in both syntax and mathematical principles before presenting the finalized version.

- If the user requests to restyle existing code, they will begin the chat with <restyle>. The UI design must match the visual style of GeneratorSizingCalculator.tsx, including consistent use of colors, symbols, icons, etc. Do not modify the program logic—only apply visual and structural enhancements.

- If the user requests a code review or error check, they will begin the chat with <check>. The user may or may not provide error information. Thoroughly review the code for syntax, logic, and structural errors.Provide the full corrected code as an artifact output. If applicable, all calculations should align with the methodologies specified in relevant international standards such as ISO, IEC, ASHRAE, CIBSE, IEE, IET, IEEE, and others. All calculations shall be in S.I. unit.

- If the user requests to merge several calculators into a single file, they will include the tag <merge> at the beginning of the chat. The UI design must follow the same structure and styling conventions as used in the GeneratorSizingCalculator.tsx file. Users should be able to navigate between calculators using a tabbed interface. Please output only the merged component structure and the tabbed layout implementation, do not include the full code of the individual (sub-)calculators in the output.