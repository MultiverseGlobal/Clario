# Expo and React Native Mobile Rule

Apply this rule whenever the project uses Expo, React Native, Expo Router, NativeWind, React Native Reanimated, or native mobile screens. Preserve the shared design language, but adapt implementation and interaction to mobile constraints rather than shrinking a web layout.

## Mobile-first order

Build in this order: working user flow, complete feedback, correct navigation and state, safe-area layout, accessibility, responsive adaptation, then animation and visual polish. Every interactive control must have a working action or an explicitly documented reason for being disabled.

## Project inspection

Before changing code, inspect `app/`, `components/`, `theme.config.js`, `tailwind.config.js`, `app.config.ts`, navigation layouts, theme providers, icon mappings, and existing screen containers. In Expo Router projects, preserve the root layout and route groups. If the project provides a `ScreenContainer`, use it for screens so content does not collide with the status bar, notch, home indicator, or tab bar.

## Navigation and user flow

Use platform-appropriate navigation and preserve predictable back behavior. Define entry, primary action, loading, success, failure, cancellation, retry, and return paths. Do not bury the core task in decorative onboarding or complex navigation. Tabs should represent top-level destinations; stacks should represent depth; modals and sheets should be reserved for focused temporary tasks.

## Safe areas and touch

Respect top and bottom safe areas. Keep primary touch targets around 44×44 points or larger where practical. Maintain enough spacing to prevent accidental taps. Do not rely on hover. Provide visible pressed feedback through opacity, scale, color, or haptics when appropriate. Use haptics sparingly because overuse reduces their meaning.

## Expo implementation conventions

Use the project’s existing theme and token source instead of duplicating colors. If the project uses NativeWind, keep semantic color tokens shared between Tailwind and runtime theme access. For Pressable interaction states, use the `style` callback when the project’s conventions require it; do not assume `className` handles pressed state correctly. Use `FlatList` or another virtualized list for long or dynamic lists rather than mapping large collections inside `ScrollView`. Keep reusable styles outside render functions where possible.

Add new tab icons to the project’s icon mapping before using them. Use the existing screen-container abstraction. Keep provider wiring in the root layout. Use `Platform` checks for native-only features such as haptics. Do not add a backend or persistence layer unless the product requirement needs cross-device sync or durable data.

## Mobile motion

Keep interaction feedback subtle and fast. Prefer timing-based transitions with restrained easing for common actions. Use springs only when their physical behavior helps the user understand manipulation. Avoid dramatic bounce, full-screen parallax, continuous background motion, and animations that delay the next action. Respect reduced motion and provide a static state that preserves meaning.

For gestures, define the gesture’s start, active, cancel, and completion states. Ensure a gesture has an alternative control path where practical. Keep gesture handlers safe across the UI and JavaScript threads, and test iOS, Android, and web targets when the app supports all three.

## Mobile accessibility

Use accessible labels for icon-only controls, semantic roles, readable type, strong focus or selection states where applicable, sufficient contrast, and non-color feedback. Test with larger text, screen readers, reduced motion, dark mode, and one-handed reach. Never communicate an essential state only through a tiny animation, color shift, vibration, or icon change.

## Offline, loading, and interruption

Mobile users lose connectivity, background the app, rotate the device, deny permissions, and receive interruptions. Design explicit loading, empty, offline, retry, permission, and interrupted states. Preserve draft work. Make network-dependent actions clear. Do not show fake numbers or pretend data while the real data is unavailable.

## Performance

Keep the first screen fast. Optimize image size and loading, avoid unnecessary re-renders, virtualize long lists, pause offscreen animation, and minimize expensive blur, shader, canvas, and 3D effects. Test on a lower-powered device or throttled environment, not only on a modern development machine.

## Cross-platform behavior

Use shared product semantics but respect platform conventions. Check typography, navigation, system bars, keyboard behavior, permission prompts, gestures, haptics, modal presentation, and back behavior on iOS and Android. If web is supported, provide a web-appropriate input and navigation fallback instead of assuming native gestures exist.

## Delivery gate

Before delivery, test core flows on iOS, Android, and web when supported; verify no dead-end buttons; test safe areas, keyboard, rotation, long content, slow network, offline behavior, reduced motion, large text, dark mode, and screen-reader labels. Report what was actually tested rather than claiming universal support without evidence.
