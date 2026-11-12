# ACCIVA-UI

<p align="left">
  <strong>Agent-first component library, logger, and API client layers for React & Next.js.</strong>
</p>

<p align="left">
  <img src="https://img.shields.io/badge/Node.js-24.x_LTS-339933?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Next.js-16.x-black?logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwind-css&logoColor=white" alt="Tailwind CSS v4" />
  <img src="https://img.shields.io/badge/Accessibility-WCAG_2.2_AA-green" alt="WCAG 2.2 AA" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript&logoColor=white" alt="TypeScript" />
</p>

---

## 🌟 Overview

**ACCIVA-UI** is a modern, agent-first component library designed for high performance, strict accessibility, and token-driven design. Every component ships as a machine-readable spec contract first (`.agents/components/<Name>.md`) and a React 19 implementation second, ensuring predictable AI code generation and clean architecture.

- 📱 **Mobile-First Always** — Clean touch ergonomics with 44px targets and fluid responsive scaling.
- ♿ **WCAG 2.2 AA Floor** — Screen reader accessibility, focus visible rings, keyboard navigation, and APCA contrast gating.
- 🎨 **OKLCH Design Tokens** — 26-step color ramps, automatic dark mode support, and customizable radius scales.
- ⚡ **Lightweight & Modular** — Tree-shakeable subpath exports for UI, Logger, and API client layers. Browser support: `dist` targets ES2020; the runtime floor is Popover API Baseline (2025-01-27) — Popover/Tooltip/DropdownMenu use it with no fallback.

---

## Contents

- [Installation in Other Projects](README/installation.md)
- [Setup & Usage](README/setup.md)
- [Component Catalog](README/catalog.md)
- [Development & Contributing](README/development.md)
- [Theming & Tokens](README/theming.md)

## 🍎 Apple (SwiftUI)

The SwiftUI package `AccivaUI` lives in `apple/`. To browse every component, open
`apple/Gallery.swiftpm` in Xcode (or Swift Playgrounds), pick an iPhone/iPad simulator and press Run.
The toolbar menu switches light/dark, Dynamic Type size and right-to-left.

## 📄 License

Private repository © [Jens Bouma](https://github.com/Jensbouma123). All rights reserved.
